import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, getAdminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days

    // Sync Firestore roles to custom claims so security rules can use them
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const roles: string[] = userDoc.exists ? (userDoc.data()?.roles ?? []) : [];
    await adminAuth.setCustomUserClaims(decoded.uid, { roles });

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ status: "success", roles });
    response.cookies.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: "success" });
  response.cookies.set("session", "", { maxAge: 0, path: "/" });
  return response;
}
