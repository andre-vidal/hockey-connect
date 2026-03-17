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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { roles, clubId: userClubId } = await verifyAuth();

    if (!canReadPlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = adminDb.collection(`clubs/${clubId}/players`) as FirebaseFirestore.Query;
    if (status) query = query.where("status", "==", status);

    const snapshot = await query.get();
    const players = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aName = `${(a as Record<string, unknown>).lastName} ${(a as Record<string, unknown>).firstName}`;
        const bName = `${(b as Record<string, unknown>).lastName} ${(b as Record<string, unknown>).firstName}`;
        return aName.localeCompare(bName);
      });

    return NextResponse.json({ players });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    if (!canWritePlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, dateOfBirth, gender, nationality, position, jerseyNumber, photoUrl } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection(`clubs/${clubId}/players`).doc();

    const player = {
      clubId,
      firstName,
      lastName,
      email: email ?? null,
      phone: phone ?? "",
      dateOfBirth: dateOfBirth ?? "",
      gender: gender ?? "",
      nationality: nationality ?? "",
      position: position ?? "",
      jerseyNumber: jerseyNumber ?? null,
      photoUrl: photoUrl ?? "",
      status: "active",
      claimedByUserId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(player);
    return NextResponse.json({ player: { id: docRef.id, ...player } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create player";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
