import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

async function verifyLeagueAdmin() {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await verifyAuthenticated();
    const { matchId } = await params;
    const doc = await adminDb.collection("matches").doc(matchId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    return NextResponse.json({ match: { id: doc.id, ...doc.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch match";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const decoded = await verifyLeagueAdmin();
    const { matchId } = await params;

    const doc = await adminDb.collection("matches").doc(matchId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      "leagueId",
      "tournamentId",
      "homeTeamId",
      "homeTeamName",
      "homeClubId",
      "awayTeamId",
      "awayTeamName",
      "awayClubId",
      "venue",
      "scheduledAt",
      "status",
      "officials",
      "result",
      "matchConfig",
      "matchCardConfirmed",
      "notes",
    ];

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: decoded.uid };
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }

    await adminDb.collection("matches").doc(matchId).update(updates);

    const updated = await adminDb.collection("matches").doc(matchId).get();
    return NextResponse.json({ match: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { matchId } = await params;

    const doc = await adminDb.collection("matches").doc(matchId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = doc.data();
    if (matchData?.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled matches can be deleted" },
        { status: 400 }
      );
    }

    await adminDb.collection("matches").doc(matchId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
