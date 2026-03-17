import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  try {
    const { squadId } = await params;
    const decoded = await verifyLeagueAdmin();

    const doc = await adminDb.collection("squads").doc(squadId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const squadData = doc.data()!;
    if (squadData.status !== "submitted") {
      return NextResponse.json({ error: "Only submitted squads can be reviewed" }, { status: 400 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    if (action === "reject" && !rejectionReason?.trim()) {
      return NextResponse.json({ error: "rejectionReason is required when rejecting" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt: now,
      reviewedBy: decoded.uid,
      updatedAt: now,
    };

    if (action === "reject") {
      updates.rejectionReason = rejectionReason.trim();
    } else {
      updates.rejectionReason = null;
    }

    await adminDb.collection("squads").doc(squadId).update(updates);

    const updated = await adminDb.collection("squads").doc(squadId).get();
    return NextResponse.json({ squad: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
