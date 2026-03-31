import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const doc = await adminDb.collection("matchStats").doc(matchId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 });
    }
    return NextResponse.json({ stats: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("GET /api/matches/[matchId]/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch match stats" }, { status: 500 });
  }
}
