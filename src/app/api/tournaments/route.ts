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
    const snapshot = await adminDb
      .collection("tournaments")
      .orderBy("createdAt", "desc")
      .get();
    const tournaments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const {
      name,
      description,
      leagueId,
      venue,
      startDate,
      endDate,
      matchConfig,
      squadSetupWindow,
      status,
    } = body;

    if (!name || !venue || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, venue, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("tournaments").doc();

    const tournament = {
      name,
      description: description ?? "",
      leagueId: leagueId ?? null,
      venue,
      startDate,
      endDate,
      matchConfig: matchConfig ?? { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
      squadSetupWindow: squadSetupWindow ?? { isOpen: false, openDate: "", closeDate: "" },
      status: status ?? "upcoming",
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(tournament);

    return NextResponse.json({ tournament: { id: docRef.id, ...tournament } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tournament";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
