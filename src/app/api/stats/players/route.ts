import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { MatchStats, PlayerMatchStats } from "@/types";

export const dynamic = "force-dynamic";

type StatKey = keyof Omit<PlayerMatchStats, "playerId" | "playerName" | "teamId" | "teamSide">;

const VALID_SORT_KEYS: StatKey[] = [
  "goals", "assists", "penaltyCorners", "penaltyStrokes",
  "greenCards", "yellowCards", "redCards", "saves",
  "tackles", "interceptions", "circleEntries",
  "shotsOnGoal", "shotsOffGoal", "freeHits", "longCorners",
  "turnovers", "aerials", "minutesPlayed",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId");
    const sortBy = (searchParams.get("sort") ?? "goals") as StatKey;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

    if (!VALID_SORT_KEYS.includes(sortBy)) {
      return NextResponse.json({ error: "Invalid sort key" }, { status: 400 });
    }

    let query = adminDb.collection("matchStats") as FirebaseFirestore.Query;
    if (leagueId) {
      query = query.where("leagueId", "==", leagueId);
    }

    const snapshot = await query.get();

    // Aggregate per-player stats across all matches
    const playerMap = new Map<string, {
      playerId: string;
      playerName: string;
      teamId: string;
      matchesPlayed: number;
      goals: number; assists: number; penaltyCorners: number; penaltyStrokes: number;
      greenCards: number; yellowCards: number; redCards: number; saves: number;
      tackles: number; interceptions: number; circleEntries: number;
      shotsOnGoal: number; shotsOffGoal: number; freeHits: number;
      longCorners: number; turnovers: number; aerials: number; minutesPlayed: number;
    }>();

    for (const doc of snapshot.docs) {
      const stats = doc.data() as MatchStats;
      for (const ps of stats.playerStats) {
        const existing = playerMap.get(ps.playerId);
        if (!existing) {
          playerMap.set(ps.playerId, {
            playerId: ps.playerId,
            playerName: ps.playerName,
            teamId: ps.teamId,
            matchesPlayed: 1,
            goals: ps.goals, assists: ps.assists, penaltyCorners: ps.penaltyCorners,
            penaltyStrokes: ps.penaltyStrokes, greenCards: ps.greenCards,
            yellowCards: ps.yellowCards, redCards: ps.redCards, saves: ps.saves,
            tackles: ps.tackles, interceptions: ps.interceptions,
            circleEntries: ps.circleEntries, shotsOnGoal: ps.shotsOnGoal,
            shotsOffGoal: ps.shotsOffGoal, freeHits: ps.freeHits,
            longCorners: ps.longCorners, turnovers: ps.turnovers,
            aerials: ps.aerials, minutesPlayed: ps.minutesPlayed,
          });
        } else {
          existing.matchesPlayed++;
          existing.goals += ps.goals;
          existing.assists += ps.assists;
          existing.penaltyCorners += ps.penaltyCorners;
          existing.penaltyStrokes += ps.penaltyStrokes;
          existing.greenCards += ps.greenCards;
          existing.yellowCards += ps.yellowCards;
          existing.redCards += ps.redCards;
          existing.saves += ps.saves;
          existing.tackles += ps.tackles;
          existing.interceptions += ps.interceptions;
          existing.circleEntries += ps.circleEntries;
          existing.shotsOnGoal += ps.shotsOnGoal;
          existing.shotsOffGoal += ps.shotsOffGoal;
          existing.freeHits += ps.freeHits;
          existing.longCorners += ps.longCorners;
          existing.turnovers += ps.turnovers;
          existing.aerials += ps.aerials;
          existing.minutesPlayed += ps.minutesPlayed;
        }
      }
    }

    const players = Array.from(playerMap.values())
      .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
      .slice(0, limit);

    return NextResponse.json({ players });
  } catch (error) {
    console.error("GET /api/stats/players error:", error);
    return NextResponse.json({ error: "Failed to fetch player stats" }, { status: 500 });
  }
}
