import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { LiveMatchEvent, LiveMatchState } from "@/types";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

async function verifyMatchOfficial() {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  if (roles.includes("league_admin") || roles.includes("root")) return decoded;
  if (roles.includes("match_official")) return decoded;
  throw new Error("Forbidden");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  try {
    const { matchId, eventId } = await params;
    const decoded = await verifyMatchOfficial();

    const body = await request.json();
    const now = Date.now();

    const liveRef = adminRtdb.ref(`/liveMatches/${matchId}`);
    const snap = await liveRef.once("value");
    const data = snap.val();
    if (!data) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });

    const currentState: LiveMatchState = data.state;
    const existingEvent: Omit<LiveMatchEvent, "id"> | null = data.events?.[eventId] ?? null;
    if (!existingEvent) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};

    // Handle score adjustment if goal type changed
    const wasGoal = existingEvent.type === "goal";
    const isNowGoal = body.type ? body.type === "goal" : wasGoal;
    const oldSide = existingEvent.teamSide;
    const newSide: "home" | "away" = body.teamSide ?? oldSide ?? "home";

    if (wasGoal && !isNowGoal) {
      // Remove the goal from score
      const side: "home" | "away" = oldSide === "away" ? "away" : "home";
      const newScore = Math.max(0, (currentState.score?.[side] ?? 1) - 1);
      updates[`state/score/${side}`] = newScore;
      updates["state/lastUpdatedBy"] = decoded.uid;
      updates["state/lastUpdatedAt"] = now;
    } else if (!wasGoal && isNowGoal) {
      // Add goal to score
      const newScore = (currentState.score?.[newSide] ?? 0) + 1;
      updates[`state/score/${newSide}`] = newScore;
      updates["state/lastUpdatedBy"] = decoded.uid;
      updates["state/lastUpdatedAt"] = now;
    } else if (wasGoal && isNowGoal && oldSide !== newSide) {
      // Goal moved to different side
      const oldSideKey: "home" | "away" = oldSide === "away" ? "away" : "home";
      updates[`state/score/${oldSideKey}`] = Math.max(0, (currentState.score?.[oldSideKey] ?? 1) - 1);
      updates[`state/score/${newSide}`] = (currentState.score?.[newSide] ?? 0) + 1;
      updates["state/lastUpdatedBy"] = decoded.uid;
      updates["state/lastUpdatedAt"] = now;
    }

    // Allowed event fields to update
    const allowedFields = ["type", "intervalNumber", "matchTimeMs", "teamId", "teamSide", "playerId", "playerName", "playerJersey", "secondaryPlayerId", "secondaryPlayerName", "cardType", "penaltyDurationMs", "stoppageReason", "stoppageDurationMs", "notes"];
    for (const field of allowedFields) {
      if (field in body) {
        updates[`events/${eventId}/${field}`] = body[field];
      }
    }
    updates[`events/${eventId}/editedAt`] = now;
    updates[`events/${eventId}/editedBy`] = decoded.uid;

    await liveRef.update(updates);

    const updatedSnap = await adminRtdb.ref(`/liveMatches/${matchId}/events/${eventId}`).once("value");
    const updated = updatedSnap.val();
    return NextResponse.json({ event: { ...updated, id: eventId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" || message === "Event not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  try {
    const { matchId, eventId } = await params;
    const decoded = await verifyMatchOfficial();

    const now = Date.now();
    const liveRef = adminRtdb.ref(`/liveMatches/${matchId}`);
    const snap = await liveRef.once("value");
    const data = snap.val();
    if (!data) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });

    const currentState: LiveMatchState = data.state;
    const existingEvent: Omit<LiveMatchEvent, "id"> | null = data.events?.[eventId] ?? null;
    if (!existingEvent) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    updates[`events/${eventId}`] = null; // Delete in RTDB via null

    // If was a goal, adjust score
    if (existingEvent.type === "goal") {
      const side: "home" | "away" = existingEvent.teamSide === "away" ? "away" : "home";
      const newScore = Math.max(0, (currentState.score?.[side] ?? 1) - 1);
      updates[`state/score/${side}`] = newScore;
      updates["state/lastUpdatedBy"] = decoded.uid;
      updates["state/lastUpdatedAt"] = now;
    }

    await liveRef.update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete event";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" || message === "Event not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
