import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const types = (searchParams.get("types") ?? "players,clubs,matches").split(",");

    if (q.length < 2) {
      return NextResponse.json({ players: [], clubs: [], matches: [] });
    }

    const results: {
      players: unknown[];
      clubs: unknown[];
      matches: unknown[];
    } = { players: [], clubs: [], matches: [] };

    const searches: Promise<void>[] = [];

    if (types.includes("clubs")) {
      searches.push(
        adminDb.collection("clubs").where("isArchived", "==", false).get().then((snap) => {
          results.clubs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => {
              const club = c as { name?: string; city?: string };
              return (
                club.name?.toLowerCase().includes(q) ||
                club.city?.toLowerCase().includes(q)
              );
            })
            .slice(0, 10);
        })
      );
    }

    if (types.includes("matches")) {
      searches.push(
        adminDb.collection("matches").orderBy("scheduledAt", "desc").limit(200).get().then((snap) => {
          results.matches = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => {
              const match = m as {
                homeTeamName?: string;
                awayTeamName?: string;
                venue?: string;
              };
              return (
                match.homeTeamName?.toLowerCase().includes(q) ||
                match.awayTeamName?.toLowerCase().includes(q) ||
                match.venue?.toLowerCase().includes(q)
              );
            })
            .slice(0, 10);
        })
      );
    }

    if (types.includes("players")) {
      searches.push(
        adminDb.collectionGroup("players").limit(500).get().then((snap) => {
          results.players = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => {
              const player = p as {
                firstName?: string;
                lastName?: string;
              };
              const full = `${player.firstName ?? ""} ${player.lastName ?? ""}`.toLowerCase();
              return full.includes(q);
            })
            .slice(0, 10);
        })
      );
    }

    await Promise.all(searches);

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
