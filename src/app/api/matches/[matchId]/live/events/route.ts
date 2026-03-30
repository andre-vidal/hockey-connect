import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { LiveMatchEvent, LiveMatchState, ActivePenalty } from "@/types";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

async function verifyCanAddEvent(matchId: string) {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  const clubId: string | undefined = userDoc.data()?.clubId;

  if (roles.includes("league_admin") || roles.includes("root")) return decoded;

  const matchDoc = await adminDb.collection("matches").doc(matchId).get();
  if (!matchDoc.exists) throw new Error("Match not found");
  const matchData = matchDoc.data()!;

  if (roles.includes("match_official")) {
    return decoded;
  }

  if (roles.includes("team_admin") && clubId) {
    if (matchData.homeClubId === clubId || matchData.awayClubId === clubId) return decoded;
  }

  throw new Error("Forbidden");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await verifyAuthenticated();
    const { matchId } = await params;

    const snap = await adminRtdb.ref(`/liveMatches/${matchId}/events`).once("value");
    const eventsObj: Record<string, Omit<LiveMatchEvent, "id">> = snap.val() ?? {};
    const events: LiveMatchEvent[] = Object.entries(eventsObj)
      .map(([id, ev]) => ({ ...(ev as Omit<LiveMatchEvent, "id">), id }))
      .sort((a, b) => a.matchTimeMs - b.matchTimeMs);

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch events";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const decoded = await verifyCanAddEvent(matchId);

    const body = await request.json();
    const now = Date.now();

    // Read current live state
    const liveRef = adminRtdb.ref(`/liveMatches/${matchId}`);
    const snap = await liveRef.once("value");
    const data = snap.val();
    if (!data) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });

    const currentState: LiveMatchState = data.state;

    const eventData: Omit<LiveMatchEvent, "id"> = {
      type: body.type,
      intervalNumber: body.intervalNumber ?? currentState.currentInterval,
      matchTimeMs: body.matchTimeMs ?? currentState.intervalElapsedMs,
      teamId: body.teamId,
      teamSide: body.teamSide,
      playerId: body.playerId,
      playerName: body.playerName,
      playerJersey: body.playerJersey,
      secondaryPlayerId: body.secondaryPlayerId,
      secondaryPlayerName: body.secondaryPlayerName,
      cardType: body.cardType,
      penaltyDurationMs: body.penaltyDurationMs,
      stoppageReason: body.stoppageReason,
      stoppageDurationMs: body.stoppageDurationMs,
      notes: body.notes,
      createdAt: now,
      createdBy: decoded.uid,
    };

    // Clean undefined fields
    Object.keys(eventData).forEach((k) => {
      if ((eventData as Record<string, unknown>)[k] === undefined) {
        delete (eventData as Record<string, unknown>)[k];
      }
    });

    const updates: Record<string, unknown> = {};
    const eventRef = adminRtdb.ref(`/liveMatches/${matchId}/events`).push();
    const eventId = eventRef.key!;
    updates[`events/${eventId}`] = eventData;

    // Handle goal: increment score
    if (body.type === "goal") {
      const side: "home" | "away" = body.teamSide === "away" ? "away" : "home";
      const newScore = (currentState.score?.[side] ?? 0) + 1;
      updates[`state/score/${side}`] = newScore;
      updates["state/lastUpdatedBy"] = decoded.uid;
      updates["state/lastUpdatedAt"] = now;
    }

    // Handle green/yellow card: create active penalty
    if (body.type === "green_card" || body.type === "yellow_card") {
      const isGreen = body.type === "green_card";
      const defaultDuration = isGreen ? 120000 : 300000;
      let totalDurationMs: number = body.penaltyDurationMs ?? defaultDuration;
      // Clamp to valid range
      if (isGreen) totalDurationMs = Math.min(Math.max(totalDurationMs, 120000), 300000);
      else totalDurationMs = Math.min(Math.max(totalDurationMs, 300000), 600000);

      const penaltyRef = adminRtdb.ref(`/liveMatches/${matchId}/activePenalties`).push();
      const penalty: Omit<ActivePenalty, "id"> = {
        playerId: body.playerId ?? "",
        playerName: body.playerName ?? "",
        playerJersey: body.playerJersey,
        teamId: body.teamId ?? "",
        teamSide: body.teamSide ?? "home",
        cardType: isGreen ? "green" : "yellow",
        totalDurationMs,
        elapsedMs: 0,
        startedAt: currentState.isRunning ? now : null,
        isRunning: currentState.isRunning,
        eventId,
      };
      // Clean undefined
      Object.keys(penalty).forEach((k) => {
        if ((penalty as Record<string, unknown>)[k] === undefined) {
          delete (penalty as Record<string, unknown>)[k];
        }
      });
      updates[`activePenalties/${penaltyRef.key}`] = penalty;
    }

    await liveRef.update(updates);

    const newEvent: LiveMatchEvent = { ...eventData, id: eventId };
    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create event";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
