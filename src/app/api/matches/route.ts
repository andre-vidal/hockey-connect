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

export async function GET() {
  try {
    await verifyAuthenticated();
    const snapshot = await adminDb
      .collection("matches")
      .orderBy("scheduledAt", "asc")
      .get();
    const matches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch matches";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const {
      leagueId,
      tournamentId,
      homeTeamId,
      homeTeamName,
      homeClubId,
      awayTeamId,
      awayTeamName,
      awayClubId,
      venue,
      scheduledAt,
      officials,
      matchConfig,
      notes,
    } = body;

    if (!homeTeamId || !awayTeamId || !venue || !scheduledAt) {
      return NextResponse.json(
        { error: "homeTeamId, awayTeamId, venue, and scheduledAt are required" },
        { status: 400 }
      );
    }

    if (!leagueId && !tournamentId) {
      return NextResponse.json(
        { error: "Either leagueId or tournamentId is required" },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: "Home team and away team must be different" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("matches").doc();

    const match = {
      leagueId: leagueId ?? null,
      tournamentId: tournamentId ?? null,
      homeTeamId,
      homeTeamName: homeTeamName ?? "",
      homeClubId: homeClubId ?? "",
      awayTeamId,
      awayTeamName: awayTeamName ?? "",
      awayClubId: awayClubId ?? "",
      venue,
      scheduledAt,
      status: "scheduled",
      officials: officials ?? [],
      result: null,
      matchConfig: matchConfig ?? { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
      matchCardConfirmed: false,
      notes: notes ?? "",
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(match);

    return NextResponse.json({ match: { id: docRef.id, ...match } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
