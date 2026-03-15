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
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin")) throw new Error("Forbidden");
  return decoded;
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("officials").orderBy("createdAt", "desc").get();
    const officials = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ officials });
  } catch (error) {
    console.error("GET /api/officials error:", error);
    return NextResponse.json({ error: "Failed to fetch officials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const { userId, playerId, displayName, email, phone, officialTypes, certificationLevel } = body;

    if (!userId || !displayName || !email || !officialTypes) {
      return NextResponse.json(
        { error: "userId, displayName, email, and officialTypes are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("officials").doc();

    const official = {
      userId,
      playerId: playerId ?? null,
      displayName,
      email,
      phone: phone ?? "",
      officialTypes: officialTypes ?? [],
      certificationLevel: certificationLevel ?? "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(official);

    return NextResponse.json({ official: { id: docRef.id, ...official } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create official";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
