import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, getAdminDb } from "@/lib/firebase/admin";
import { deleteCollection } from "@/lib/firestoreUtils";

export const dynamic = "force-dynamic";

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const doc = await adminDb.collection("clubs").doc(clubId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }
    return NextResponse.json({ club: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("GET /api/clubs/[clubId] error:", error);
    return NextResponse.json({ error: "Failed to fetch club" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { clubId } = await params;
    const body = await request.json();

    const doc = await adminDb.collection("clubs").doc(clubId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const updates = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;

    // If archiving, also set isActive to false
    if (updates.isArchived === true) {
      updates.isActive = false;
    }

    await adminDb.collection("clubs").doc(clubId).update(updates);

    const updated = await adminDb.collection("clubs").doc(clubId).get();
    return NextResponse.json({ club: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update club";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { clubId } = await params;

    const doc = await adminDb.collection("clubs").doc(clubId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // 1. Delete all players in the club subcollection
    await deleteCollection(
      adminDb.collection(`clubs/${clubId}/players`)
    );

    // 2. For each team, delete associated squads then the team itself
    const teamsSnap = await adminDb.collection(`clubs/${clubId}/teams`).get();
    for (const teamDoc of teamsSnap.docs) {
      const squadsSnap = await adminDb
        .collection("squads")
        .where("teamId", "==", teamDoc.id)
        .get();
      if (!squadsSnap.empty) {
        const batch = getAdminDb().batch();
        squadsSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await teamDoc.ref.delete();
    }

    // 3. Delete the club document itself
    await adminDb.collection("clubs").doc(clubId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete club";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
