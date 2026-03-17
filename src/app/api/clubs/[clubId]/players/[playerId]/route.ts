import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const data = userDoc.data();
  const roles: string[] = data?.roles ?? [];
  return { decoded, roles, clubId: data?.clubId ?? null };
}

function canWritePlayers(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === targetClubId) return true;
  return false;
}

function canReadPlayers(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if ((roles.includes("club_admin") || roles.includes("team_admin")) && clubId === targetClubId) return true;
  return false;
}

type Params = { params: Promise<{ clubId: string; playerId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { clubId, playerId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    const doc = await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = doc.data()!;

    // Player can access their own claimed record
    if (data.claimedByUserId === decoded.uid) {
      return NextResponse.json({ player: { id: doc.id, ...data } });
    }

    if (!canReadPlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ player: { id: doc.id, ...data } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch player";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { clubId, playerId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    const doc = await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const playerData = doc.data()!;
    const isOwn = playerData.claimedByUserId === decoded.uid;
    const isAdmin = canWritePlayers(roles, userClubId, clubId);

    if (!isAdmin && !isOwn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    const allowedSelfFields = ["phone", "nationality", "position", "photoUrl", "dateOfBirth", "gender"];
    let updates: Record<string, unknown>;

    if (isAdmin) {
      const { firstName, lastName, email, phone, dateOfBirth, gender, nationality, position, jerseyNumber, photoUrl, status } = body;
      updates = {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(gender !== undefined && { gender }),
        ...(nationality !== undefined && { nationality }),
        ...(position !== undefined && { position }),
        ...(jerseyNumber !== undefined && { jerseyNumber }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(status !== undefined && { status }),
        updatedAt: now,
      };
    } else {
      updates = { updatedAt: now };
      for (const field of allowedSelfFields) {
        if (body[field] !== undefined) updates[field] = body[field];
      }
    }

    await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).update(updates);
    const updated = await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).get();
    return NextResponse.json({ player: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update player";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { clubId, playerId } = await params;
    const { roles, clubId: userClubId } = await verifyAuth();

    if (!canWritePlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await adminDb.collection(`clubs/${clubId}/players`).doc(playerId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete player";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
