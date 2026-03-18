import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  return decoded.uid;
}

type Params = { params: Promise<{ clubId: string; playerId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { clubId, playerId } = await params;
    const uid = await verifySession();

    const playerRef = adminDb.collection(`clubs/${clubId}/players`).doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 400 });
    }

    const player = playerDoc.data()!;
    const body = await request.json();

    if (player.inviteToken !== body.token) {
      return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 });
    }

    if (player.claimedByUserId !== null) {
      return NextResponse.json({ error: "Player profile has already been claimed" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const existingRoles: string[] = userData?.roles ?? [];
    const newRoles = existingRoles.includes("player") ? existingRoles : [...existingRoles, "player"];

    await playerRef.update({
      claimedByUserId: uid,
      inviteToken: FieldValue.delete(),
    });
    await userRef.update({
      roles: newRoles,
      clubId,
    });

    await adminAuth.setCustomUserClaims(uid, { roles: newRoles });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to claim player profile";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
