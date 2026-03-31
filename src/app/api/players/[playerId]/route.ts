import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;

    const allSnap = await adminDb.collectionGroup("players").get();
    const doc = allSnap.docs.find((d) => d.id === playerId);

    if (!doc) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = { id: doc.id, ...doc.data() };

    // Fetch player's match stats across all matches
    const statsSnap = await adminDb
      .collection("matchStats")
      .get();

    const seasonStats = {
      matchesPlayed: 0,
      goals: 0, assists: 0, penaltyCorners: 0, penaltyStrokes: 0,
      greenCards: 0, yellowCards: 0, redCards: 0, saves: 0,
      tackles: 0, interceptions: 0, circleEntries: 0,
      shotsOnGoal: 0, shotsOffGoal: 0, freeHits: 0,
      longCorners: 0, turnovers: 0, aerials: 0, minutesPlayed: 0,
    };

    const matchHistory: unknown[] = [];

    for (const statDoc of statsSnap.docs) {
      const stats = statDoc.data();
      const ps = (stats.playerStats ?? []).find(
        (p: { playerId: string }) => p.playerId === playerId
      );
      if (ps) {
        seasonStats.matchesPlayed++;
        seasonStats.goals += ps.goals ?? 0;
        seasonStats.assists += ps.assists ?? 0;
        seasonStats.penaltyCorners += ps.penaltyCorners ?? 0;
        seasonStats.penaltyStrokes += ps.penaltyStrokes ?? 0;
        seasonStats.greenCards += ps.greenCards ?? 0;
        seasonStats.yellowCards += ps.yellowCards ?? 0;
        seasonStats.redCards += ps.redCards ?? 0;
        seasonStats.saves += ps.saves ?? 0;
        seasonStats.tackles += ps.tackles ?? 0;
        seasonStats.interceptions += ps.interceptions ?? 0;
        seasonStats.circleEntries += ps.circleEntries ?? 0;
        seasonStats.shotsOnGoal += ps.shotsOnGoal ?? 0;
        seasonStats.shotsOffGoal += ps.shotsOffGoal ?? 0;
        seasonStats.freeHits += ps.freeHits ?? 0;
        seasonStats.longCorners += ps.longCorners ?? 0;
        seasonStats.turnovers += ps.turnovers ?? 0;
        seasonStats.aerials += ps.aerials ?? 0;
        seasonStats.minutesPlayed += ps.minutesPlayed ?? 0;
        matchHistory.push({ matchId: statDoc.id, ...ps });
      }
    }

    return NextResponse.json({ player, seasonStats, matchHistory });
  } catch (error) {
    console.error("GET /api/players/[playerId] error:", error);
    return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
  }
}
