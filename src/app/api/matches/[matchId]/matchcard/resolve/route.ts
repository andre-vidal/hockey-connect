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

async function verifyLeagueAdmin() {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const decoded = await verifyLeagueAdmin();
    const { matchId } = await params;

    const cardDoc = await adminDb.collection("matchCards").doc(matchId).get();
    if (!cardDoc.exists) return NextResponse.json({ error: "Match card not found" }, { status: 404 });

    const card = cardDoc.data() as Omit<MatchCard, "id">;
    const body = await request.json();
    const { resolutionNotes, force } = body as { resolutionNotes: string; force: boolean };

    const now = new Date().toISOString();
    const newStatus = force ? "confirmed" : "resolved";

    const updates: Record<string, unknown> = {
      status: newStatus,
      resolvedAt: now,
      resolvedBy: decoded.uid,
      resolutionNotes: resolutionNotes ?? "",
      updatedAt: now,
    };

    await adminDb.collection("matchCards").doc(matchId).update(updates);

    if (force) {
      // Trigger stats aggregation
      const resolvedCard: MatchCard = { id: matchId, ...card, ...updates } as MatchCard;
      await aggregateAndSaveStats(resolvedCard);
    }

    const updatedDoc = await adminDb.collection("matchCards").doc(matchId).get();
    return NextResponse.json({ matchCard: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to resolve match card";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
