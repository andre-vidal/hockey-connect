import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { MatchCard, MatchCardEvent } from "@/types";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

export async function POST(
  request: NextRequest,
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

    if (card.homeClubId !== clubId && card.awayClubId !== clubId) throw new Error("Forbidden");

    const body = await request.json();
    const { disputedEvents } = body as { disputedEvents: { eventId: string; comment: string }[] };

    const now = new Date().toISOString();

    // Update disputed events
    const updatedEvents: MatchCardEvent[] = (card.events ?? []).map((ev) => {
      const dispute = disputedEvents?.find((d) => d.eventId === ev.eventId);
      if (dispute) {
        return { ...ev, disputed: true, disputeComment: dispute.comment };
      }
      return ev;
    });

    const updates = {
      events: updatedEvents,
      status: "disputed",
      disputedAt: now,
      disputedBy: decoded.uid,
      updatedAt: now,
    };

    await adminDb.collection("matchCards").doc(matchId).update(updates);

    const updatedDoc = await adminDb.collection("matchCards").doc(matchId).get();
    return NextResponse.json({ matchCard: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispute match card";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
