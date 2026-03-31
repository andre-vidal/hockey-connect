import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId");

    let query = adminDb.collection("leagueStandings") as FirebaseFirestore.Query;

    if (leagueId) {
      query = query.where("leagueId", "==", leagueId);
    }

    const snapshot = await query.get();
    const standings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Sort by points desc, then goalDifference desc, then goalsFor desc
    standings.sort((a, b) => {
      const sa = a as unknown as { points: number; goalDifference: number; goalsFor: number };
      const sb = b as unknown as { points: number; goalDifference: number; goalsFor: number };
      if (sb.points !== sa.points) return sb.points - sa.points;
      if (sb.goalDifference !== sa.goalDifference) return sb.goalDifference - sa.goalDifference;
      return sb.goalsFor - sa.goalsFor;
    });

    return NextResponse.json({ standings });
  } catch (error) {
    console.error("GET /api/standings error:", error);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
