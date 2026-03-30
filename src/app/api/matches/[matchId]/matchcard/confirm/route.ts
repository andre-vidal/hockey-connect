import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { aggregateAndSaveStats } from "@/lib/matchStatsAggregator";
import type { MatchCard } from "@/types";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const decoded = await verifyAuthenticated();
    const { matchId } = await params;

    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userDoc.data();
    const roles: string[] = userData?.roles ?? [];
    const clubId: string | undefined = userData?.clubId;

    if (!roles.includes("team_admin")) throw new Error("Forbidden");
    if (!clubId) throw new Error("Forbidden");

    const cardDoc = await adminDb.collection("matchCards").doc(matchId).get();
    if (!cardDoc.exists) return NextResponse.json({ error: "Match card not found" }, { status: 404 });

    const card = cardDoc.data() as Omit<MatchCard, "id">;
    const now = new Date().toISOString();

    let side: "home" | "away" | null = null;
    if (card.homeClubId === clubId) side = "home";
    else if (card.awayClubId === clubId) side = "away";
    else throw new Error("Forbidden");

    const updates: Record<string, unknown> = { updatedAt: now };
    if (side === "home") {
      updates.homeTeamConfirmedAt = now;
      updates.homeTeamConfirmedBy = decoded.uid;
    } else {
      updates.awayTeamConfirmedAt = now;
      updates.awayTeamConfirmedBy = decoded.uid;
    }

    const homeConfirmed = side === "home" ? now : card.homeTeamConfirmedAt;
    const awayConfirmed = side === "away" ? now : card.awayTeamConfirmedAt;

    if (homeConfirmed && awayConfirmed) {
      updates.status = "confirmed";
      await adminDb.collection("matchCards").doc(matchId).update(updates);
      // Aggregate stats
      const updatedCard: MatchCard = { id: matchId, ...card, ...updates } as MatchCard;
      await aggregateAndSaveStats(updatedCard);
    } else {
      await adminDb.collection("matchCards").doc(matchId).update(updates);
    }

    const updatedDoc = await adminDb.collection("matchCards").doc(matchId).get();
    return NextResponse.json({ matchCard: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to confirm match card";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
