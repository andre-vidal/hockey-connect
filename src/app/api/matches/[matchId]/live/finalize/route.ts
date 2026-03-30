import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { LiveMatchEvent, LiveMatchState, MatchCardEvent, MatchCard } from "@/types";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

async function verifyMatchOfficial(matchId: string) {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  if (roles.includes("league_admin") || roles.includes("root")) return decoded;

  const matchDoc = await adminDb.collection("matches").doc(matchId).get();
  if (!matchDoc.exists) throw new Error("Match not found");
  const officials: { userId: string }[] = matchDoc.data()?.officials ?? [];
  if (!officials.some((o) => o.userId === decoded.uid)) throw new Error("Forbidden");
  return decoded;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const decoded = await verifyMatchOfficial(matchId);

    const now = new Date().toISOString();

    // Read RTDB state
    const snap = await adminRtdb.ref(`/liveMatches/${matchId}`).once("value");
    const data = snap.val();
    if (!data) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });

    const state: LiveMatchState = data.state;
    const eventsObj: Record<string, Omit<LiveMatchEvent, "id">> = data.events ?? {};

    // Convert events to MatchCardEvent[]
    const events: MatchCardEvent[] = Object.entries(eventsObj).map(([id, ev]) => {
      const e = ev as Omit<LiveMatchEvent, "id">;
      const cardEvent: MatchCardEvent = {
        eventId: id,
        type: e.type,
        intervalNumber: e.intervalNumber,
        matchTimeMs: e.matchTimeMs,
      };
      if (e.teamId !== undefined) cardEvent.teamId = e.teamId;
      if (e.teamSide !== undefined) cardEvent.teamSide = e.teamSide;
      if (e.playerId !== undefined) cardEvent.playerId = e.playerId;
      if (e.playerName !== undefined) cardEvent.playerName = e.playerName;
      if (e.playerJersey !== undefined) cardEvent.playerJersey = e.playerJersey;
      if (e.secondaryPlayerId !== undefined) cardEvent.secondaryPlayerId = e.secondaryPlayerId;
      if (e.secondaryPlayerName !== undefined) cardEvent.secondaryPlayerName = e.secondaryPlayerName;
      if (e.cardType !== undefined) cardEvent.cardType = e.cardType;
      if (e.stoppageDurationMs !== undefined) cardEvent.stoppageDurationMs = e.stoppageDurationMs;
      if (e.notes !== undefined) cardEvent.notes = e.notes;
      return cardEvent;
    }).sort((a, b) => a.matchTimeMs - b.matchTimeMs);

    // Read match from Firestore
    const matchDoc = await adminDb.collection("matches").doc(matchId).get();
    if (!matchDoc.exists) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    const matchData = matchDoc.data()!;

    const matchCard: Omit<MatchCard, "id"> = {
      matchId,
      homeTeamId: matchData.homeTeamId,
      homeTeamName: matchData.homeTeamName,
      homeClubId: matchData.homeClubId,
      awayTeamId: matchData.awayTeamId,
      awayTeamName: matchData.awayTeamName,
      awayClubId: matchData.awayClubId,
      finalScore: state.score ?? { home: 0, away: 0 },
      events,
      status: "pending_review",
      createdAt: now,
      updatedAt: now,
    };

    // Write to Firestore matchCards collection
    await adminDb.collection("matchCards").doc(matchId).set(matchCard);

    // Update match status and result
    await adminDb.collection("matches").doc(matchId).update({
      status: "completed",
      result: {
        homeScore: state.score?.home ?? 0,
        awayScore: state.score?.away ?? 0,
      },
      updatedAt: now,
      updatedBy: decoded.uid,
    });

    return NextResponse.json({ matchCard: { id: matchId, ...matchCard } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finalize match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
