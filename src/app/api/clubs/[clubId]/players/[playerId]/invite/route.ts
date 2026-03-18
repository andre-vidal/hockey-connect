import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

async function verifyAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const data = userDoc.data();
  const roles: string[] = data?.roles ?? [];
  return { roles, clubId: data?.clubId ?? null };
}

function canManagePlayers(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === targetClubId) return true;
  return false;
}

type Params = { params: Promise<{ clubId: string; playerId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { clubId, playerId } = await params;
    const { roles, clubId: userClubId } = await verifyAuth();

    if (!canManagePlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const playerRef = adminDb.collection(`clubs/${clubId}/players`).doc(playerId);
    const playerDoc = await playerRef.get();

    if (!playerDoc.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const player = playerDoc.data()!;

    if (!player.email) {
      return NextResponse.json({ error: "Player has no email address" }, { status: 400 });
    }

    const inviteToken = adminDb.collection("_tokens").doc().id;
    const now = new Date().toISOString();

    await playerRef.update({ inviteToken, updatedAt: now });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=player&clubId=${clubId}&playerId=${playerId}&token=${inviteToken}&email=${encodeURIComponent(player.email)}`;

    await sendEmail({
      to: player.email,
      subject: "You've been invited to Hockey Connect",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Hockey Connect</h2>
          <p>Hi ${player.firstName},</p>
          <p>You've been added as a player. Click the link below to create your account and claim your player profile:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Create My Account</a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you didn't expect this, you can safely ignore this email.</p>
        </div>
      `,
    });

    const updated = await playerRef.get();
    return NextResponse.json({ player: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invite";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
