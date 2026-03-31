import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");
    const q = searchParams.get("q")?.toLowerCase();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

    let query: FirebaseFirestore.Query;

    if (clubId) {
      query = adminDb.collection("clubs").doc(clubId).collection("players");
    } else {
      query = adminDb.collectionGroup("players");
    }

    const snapshot = await query.limit(500).get();

    let players = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p) => (p as { status?: string }).status === "active");

    if (q) {
      players = players.filter((p) => {
        const player = p as { firstName?: string; lastName?: string };
        const full = `${player.firstName ?? ""} ${player.lastName ?? ""}`.toLowerCase();
        return full.includes(q);
      });
    }

    return NextResponse.json({ players: players.slice(0, limit) });
  } catch (error) {
    console.error("GET /api/players error:", error);
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}
