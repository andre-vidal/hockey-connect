import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

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
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const doc = await adminDb.collection("tournaments").doc(tournamentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json({ tournament: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("GET /api/tournaments/[tournamentId] error:", error);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { tournamentId } = await params;
    const body = await request.json();

    const doc = await adminDb.collection("tournaments").doc(tournamentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const updates = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;

    await adminDb.collection("tournaments").doc(tournamentId).update(updates);

    const updated = await adminDb.collection("tournaments").doc(tournamentId).get();
    return NextResponse.json({ tournament: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tournament";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { tournamentId } = await params;

    const doc = await adminDb.collection("tournaments").doc(tournamentId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    await adminDb.collection("tournaments").doc(tournamentId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tournament";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
