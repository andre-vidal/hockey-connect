import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return NextResponse.json({ error: "No session cookie" }, { status: 401 });

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();

    return NextResponse.json({
      uid: decoded.uid,
      firestoreDocExists: userDoc.exists,
      firestoreRoles: userDoc.data()?.roles ?? null,
      firestoreRolesType: typeof userDoc.data()?.roles,
      isArray: Array.isArray(userDoc.data()?.roles),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
