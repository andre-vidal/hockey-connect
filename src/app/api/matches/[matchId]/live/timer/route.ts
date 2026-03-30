import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { LiveMatchState, ActivePenalty, StoppageReason } from "@/types";

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

function pausePenalties(penalties: Record<string, ActivePenalty>, now: number): Record<string, Partial<ActivePenalty>> {
  const updates: Record<string, Partial<ActivePenalty>> = {};
  for (const [id, p] of Object.entries(penalties)) {
    if (p.isRunning && p.startedAt !== null) {
      updates[id] = {
        elapsedMs: p.elapsedMs + (now - p.startedAt),
        isRunning: false,
        startedAt: null,
      };
    }
  }
  return updates;
}

function resumePenalties(penalties: Record<string, ActivePenalty>, now: number): Record<string, Partial<ActivePenalty>> {
  const updates: Record<string, Partial<ActivePenalty>> = {};
  for (const [id, p] of Object.entries(penalties)) {
    if (!p.isRunning) {
      updates[id] = {
        isRunning: true,
        startedAt: now,
      };
    }
  }
  return updates;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const decoded = await verifyMatchOfficial();

    const body = await request.json();
    const { action, stoppageReason } = body as {
      action: "start" | "pause" | "start_stoppage" | "end_stoppage";
      stoppageReason?: StoppageReason;
    };

    const now = Date.now();
    const liveRef = adminRtdb.ref(`/liveMatches/${matchId}`);
    const snap = await liveRef.once("value");
    const data = snap.val();
    if (!data) return NextResponse.json({ error: "Live state not initialized" }, { status: 400 });

    const currentState: LiveMatchState = data.state;
    const penaltiesObj: Record<string, ActivePenalty> = data.activePenalties ?? {};
    const baseUpdate = { lastUpdatedBy: decoded.uid, lastUpdatedAt: now };

    switch (action) {
      case "start": {
        const stateUpdates: Partial<LiveMatchState> = {
          isRunning: true,
          intervalStartedAt: now,
          status: "live",
          ...baseUpdate,
        };
        const penaltyUpdates = resumePenalties(penaltiesObj, now);
        const updates: Record<string, unknown> = { "state/isRunning": true, "state/intervalStartedAt": now, "state/status": "live", "state/lastUpdatedBy": decoded.uid, "state/lastUpdatedAt": now };
        for (const [id, p] of Object.entries(penaltyUpdates)) {
          for (const [k, v] of Object.entries(p)) {
            updates[`activePenalties/${id}/${k}`] = v;
          }
        }
        await liveRef.update(updates);
        return NextResponse.json({ state: { ...currentState, ...stateUpdates } });
      }

      case "pause": {
        const elapsed = currentState.intervalElapsedMs +
          (currentState.isRunning && currentState.intervalStartedAt ? now - currentState.intervalStartedAt : 0);
        const penaltyUpdates = pausePenalties(penaltiesObj, now);
        const updates: Record<string, unknown> = {
          "state/isRunning": false,
          "state/intervalElapsedMs": elapsed,
          "state/intervalStartedAt": null,
          "state/lastUpdatedBy": decoded.uid,
          "state/lastUpdatedAt": now,
        };
        for (const [id, p] of Object.entries(penaltyUpdates)) {
          for (const [k, v] of Object.entries(p)) {
            updates[`activePenalties/${id}/${k}`] = v;
          }
        }
        await liveRef.update(updates);
        return NextResponse.json({
          state: { ...currentState, isRunning: false, intervalElapsedMs: elapsed, intervalStartedAt: null, ...baseUpdate },
        });
      }

      case "start_stoppage": {
        const elapsed = currentState.intervalElapsedMs +
          (currentState.isRunning && currentState.intervalStartedAt ? now - currentState.intervalStartedAt : 0);
        const penaltyUpdates = pausePenalties(penaltiesObj, now);
        const updates: Record<string, unknown> = {
          "state/isRunning": false,
          "state/intervalElapsedMs": elapsed,
          "state/intervalStartedAt": null,
          "state/stoppageStartedAt": now,
          "state/stoppageReason": stoppageReason ?? "other",
          "state/status": "stoppage",
          "state/lastUpdatedBy": decoded.uid,
          "state/lastUpdatedAt": now,
        };
        for (const [id, p] of Object.entries(penaltyUpdates)) {
          for (const [k, v] of Object.entries(p)) {
            updates[`activePenalties/${id}/${k}`] = v;
          }
        }
        // Add stoppage_start event
        const eventRef = adminRtdb.ref(`/liveMatches/${matchId}/events`).push();
        updates[`events/${eventRef.key}`] = {
          type: "stoppage_start",
          intervalNumber: currentState.currentInterval,
          matchTimeMs: elapsed,
          stoppageReason: stoppageReason ?? "other",
          createdAt: now,
          createdBy: decoded.uid,
        };
        await liveRef.update(updates);
        return NextResponse.json({
          state: { ...currentState, isRunning: false, intervalElapsedMs: elapsed, intervalStartedAt: null, stoppageStartedAt: now, stoppageReason: stoppageReason ?? "other", status: "stoppage", ...baseUpdate },
        });
      }

      case "end_stoppage": {
        const stoppageDurationMs = currentState.stoppageStartedAt ? now - currentState.stoppageStartedAt : 0;
        const penaltyUpdates = resumePenalties(penaltiesObj, now);
        const updates: Record<string, unknown> = {
          "state/isRunning": true,
          "state/intervalStartedAt": now,
          "state/stoppageStartedAt": null,
          "state/stoppageReason": null,
          "state/status": "live",
          "state/lastUpdatedBy": decoded.uid,
          "state/lastUpdatedAt": now,
        };
        for (const [id, p] of Object.entries(penaltyUpdates)) {
          for (const [k, v] of Object.entries(p)) {
            updates[`activePenalties/${id}/${k}`] = v;
          }
        }
        // Add stoppage_end event
        const eventRef = adminRtdb.ref(`/liveMatches/${matchId}/events`).push();
        updates[`events/${eventRef.key}`] = {
          type: "stoppage_end",
          intervalNumber: currentState.currentInterval,
          matchTimeMs: currentState.intervalElapsedMs,
          stoppageDurationMs,
          createdAt: now,
          createdBy: decoded.uid,
        };
        await liveRef.update(updates);
        return NextResponse.json({
          state: { ...currentState, isRunning: true, intervalStartedAt: now, stoppageStartedAt: null, stoppageReason: null, status: "live", ...baseUpdate },
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to control timer";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
