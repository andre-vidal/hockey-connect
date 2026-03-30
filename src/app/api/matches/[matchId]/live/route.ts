import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { LiveMatchState, LiveMatchEvent, ActivePenalty } from "@/types";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    await verifyAuthenticated();
    const { matchId } = await params;

    const snap = await adminRtdb.ref(`/liveMatches/${matchId}`).once("value");
    const data = snap.val() ?? {};

    const state: LiveMatchState | null = data.state ?? null;

    const eventsObj: Record<string, Omit<LiveMatchEvent, "id">> = data.events ?? {};
    const events: LiveMatchEvent[] = Object.entries(eventsObj)
      .map(([id, ev]) => ({ ...(ev as Omit<LiveMatchEvent, "id">), id }))
      .sort((a, b) => a.matchTimeMs - b.matchTimeMs);

    const penaltiesObj: Record<string, Omit<ActivePenalty, "id">> = data.activePenalties ?? {};
    const activePenalties: ActivePenalty[] = Object.entries(penaltiesObj).map(
      ([id, p]) => ({ ...(p as Omit<ActivePenalty, "id">), id })
    );

    return NextResponse.json({ state, events, activePenalties });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch live match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const decoded = await verifyMatchOfficial();

    const body = await request.json();
    const { action } = body as { action: "warmup" | "start_live" | "end_interval" | "start_next_interval" | "complete" };

    const matchDoc = await adminDb.collection("matches").doc(matchId).get();
    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const now = Date.now();
    const stateRef = adminRtdb.ref(`/liveMatches/${matchId}/state`);
    const snap = await stateRef.once("value");
    const currentState: LiveMatchState | null = snap.val();

    const baseUpdate = { lastUpdatedBy: decoded.uid, lastUpdatedAt: now };

    switch (action) {
      case "warmup": {
        const initialState: LiveMatchState = {
          status: "warmup",
          currentInterval: 1,
          intervalElapsedMs: 0,
          intervalStartedAt: null,
          isRunning: false,
          stoppageStartedAt: null,
          stoppageReason: null,
          score: { home: 0, away: 0 },
          ...baseUpdate,
        };
        await adminRtdb.ref(`/liveMatches/${matchId}`).set({ state: initialState, events: null, activePenalties: null });
        await adminDb.collection("matches").doc(matchId).update({ status: "warmup", updatedAt: new Date().toISOString(), updatedBy: decoded.uid });
        return NextResponse.json({ state: initialState });
      }

      case "start_live": {
        if (!currentState) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });
        const updates: Partial<LiveMatchState> = {
          status: "live",
          isRunning: true,
          intervalStartedAt: now,
          ...baseUpdate,
        };
        await stateRef.update(updates);
        await adminDb.collection("matches").doc(matchId).update({ status: "live", updatedAt: new Date().toISOString(), updatedBy: decoded.uid });
        return NextResponse.json({ state: { ...currentState, ...updates } });
      }

      case "end_interval": {
        if (!currentState) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });
        const elapsed = currentState.intervalElapsedMs +
          (currentState.isRunning && currentState.intervalStartedAt ? now - currentState.intervalStartedAt : 0);
        const updates: Partial<LiveMatchState> = {
          status: "interval_break",
          isRunning: false,
          intervalElapsedMs: elapsed,
          intervalStartedAt: null,
          ...baseUpdate,
        };
        await stateRef.update(updates);
        // Record interval_end event
        await adminRtdb.ref(`/liveMatches/${matchId}/events`).push({
          type: "interval_end",
          intervalNumber: currentState.currentInterval,
          matchTimeMs: elapsed,
          createdAt: now,
          createdBy: decoded.uid,
        });
        return NextResponse.json({ state: { ...currentState, ...updates } });
      }

      case "start_next_interval": {
        if (!currentState) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });
        const updates: Partial<LiveMatchState> = {
          status: "live",
          currentInterval: currentState.currentInterval + 1,
          intervalElapsedMs: 0,
          intervalStartedAt: now,
          isRunning: true,
          ...baseUpdate,
        };
        await stateRef.update(updates);
        return NextResponse.json({ state: { ...currentState, ...updates } });
      }

      case "complete": {
        if (!currentState) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });
        const elapsed = currentState.intervalElapsedMs +
          (currentState.isRunning && currentState.intervalStartedAt ? now - currentState.intervalStartedAt : 0);
        const updates: Partial<LiveMatchState> = {
          status: "completed",
          isRunning: false,
          intervalElapsedMs: elapsed,
          intervalStartedAt: null,
          ...baseUpdate,
        };
        await stateRef.update(updates);
        // Record match_end event
        await adminRtdb.ref(`/liveMatches/${matchId}/events`).push({
          type: "match_end",
          intervalNumber: currentState.currentInterval,
          matchTimeMs: elapsed,
          createdAt: now,
          createdBy: decoded.uid,
        });
        await adminDb.collection("matches").doc(matchId).update({ status: "completed", updatedAt: new Date().toISOString(), updatedBy: decoded.uid });
        return NextResponse.json({ state: { ...currentState, ...updates } });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update live match";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
