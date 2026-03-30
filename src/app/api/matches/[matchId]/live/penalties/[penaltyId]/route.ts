import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";
import type { ActivePenalty } from "@/types";

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

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string; penaltyId: string }> }
) {
  try {
    const { matchId, penaltyId } = await params;
    await verifyMatchOfficial(matchId);

    const penaltyRef = adminRtdb.ref(`/liveMatches/${matchId}/activePenalties/${penaltyId}`);
    const snap = await penaltyRef.once("value");
    const penalty: ActivePenalty | null = snap.val();
    if (!penalty) return NextResponse.json({ error: "Penalty not found" }, { status: 404 });

    const now = Date.now();
    const currentElapsed = penalty.elapsedMs + (penalty.isRunning && penalty.startedAt ? now - penalty.startedAt : 0);

    if (currentElapsed >= penalty.totalDurationMs) {
      // Penalty expired — remove it
      await penaltyRef.remove();
      return NextResponse.json({ success: true, expired: true });
    }

    // Not yet expired, just mark as not running
    await penaltyRef.update({ isRunning: false, elapsedMs: currentElapsed, startedAt: null });
    return NextResponse.json({ success: true, expired: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update penalty";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string; penaltyId: string }> }
) {
  try {
    const { matchId, penaltyId } = await params;
    await verifyMatchOfficial(matchId);

    const penaltyRef = adminRtdb.ref(`/liveMatches/${matchId}/activePenalties/${penaltyId}`);
    const snap = await penaltyRef.once("value");
    if (!snap.val()) return NextResponse.json({ error: "Penalty not found" }, { status: 404 });

    await penaltyRef.remove();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete penalty";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
