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
  return { decoded, roles, clubId: data?.clubId ?? null };
}

function canManagePlayers(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === targetClubId) return true;
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    if (!canManagePlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, position, jerseyNumber } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "firstName, lastName, and email are required" }, { status: 400 });
    }

    // Generate a unique invite token
    const inviteToken = adminDb.collection("_tokens").doc().id;
    const now = new Date().toISOString();
    const docRef = adminDb.collection(`clubs/${clubId}/players`).doc();

    const player = {
      clubId,
      firstName,
      lastName,
      email,
      phone: "",
      dateOfBirth: "",
      gender: "",
      nationality: "",
      position: position ?? "",
      jerseyNumber: jerseyNumber ?? null,
      photoUrl: "",
      status: "active",
      claimedByUserId: null,
      inviteToken,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(player);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=player&clubId=${clubId}&playerId=${docRef.id}&token=${inviteToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendEmail({
        to: email,
        subject: "You've been added to Hockey Connect",
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Hockey Connect</h2>
          <p>Hi ${firstName},</p>
          <p>You've been added as a player. Click the link below to create your account and claim your player profile:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Create My Account</a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you didn't expect this, you can safely ignore this email.</p>
        </div>
      `,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    return NextResponse.json({ player: { id: docRef.id, ...player } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite player";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
