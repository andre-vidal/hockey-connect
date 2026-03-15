import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, adminRtdb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function GET() {
  try {
    const doc = await adminDb.collection("settings").doc("app").get();
    if (!doc.exists) {
      // Return default settings if none exist yet
      const defaults = {
        id: "app",
        siteName: "Hockey Connect",
        siteDescription: "The platform for hockey leagues and tournaments.",
        maintenanceMode: false,
        updatedAt: new Date().toISOString(),
        updatedBy: "",
      };
      return NextResponse.json({ settings: defaults });
    }
    return NextResponse.json({ settings: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const { siteName, siteDescription, maintenanceMode } = body;

    const updates = {
      siteName,
      siteDescription,
      maintenanceMode: Boolean(maintenanceMode),
      updatedAt: new Date().toISOString(),
      updatedBy: decoded.uid,
    };

    await adminDb.collection("settings").doc("app").set(updates, { merge: true });
    await adminRtdb.ref("/maintenance").set({ enabled: Boolean(maintenanceMode) });

    const updated = await adminDb.collection("settings").doc("app").get();
    return NextResponse.json({ settings: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
