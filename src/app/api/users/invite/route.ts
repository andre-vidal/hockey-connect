import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();
    const { email, displayName, clubId } = body;

    if (!email || !displayName) {
      return NextResponse.json({ error: "email and displayName are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const placeholderUid = adminDb.collection("users").doc().id;

    const userDoc = {
      uid: placeholderUid,
      email,
      displayName,
      photoURL: null,
      roles: ["team_admin"],
      clubId: clubId ?? null,
      isActive: true,
      isAnonymous: false,
      createdAt: now,
      updatedAt: now,
      invitedBy: decoded.uid,
    };

    await adminDb.collection("users").doc(placeholderUid).set(userDoc);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=true&clubId=${clubId ?? ""}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: "You've been invited to Hockey Connect",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Hockey Connect</h2>
          <p>Hi ${displayName},</p>
          <p>You've been invited to join Hockey Connect as a Club Admin.</p>
          <p>Click the link below to complete your registration:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ user: userDoc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invite";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
