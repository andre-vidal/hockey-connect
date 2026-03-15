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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const decoded = await verifyLeagueAdmin();
    const { leagueId } = await params;
    const body = await request.json();

    const { currentSeason, startDate, endDate } = body;

    if (!currentSeason || !startDate || !endDate) {
      return NextResponse.json(
        { error: "currentSeason, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const leagueDoc = await adminDb.collection("leagues").doc(leagueId).get();
    if (!leagueDoc.exists) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const leagueData = leagueDoc.data()!;
    const previousSeason = leagueData.season;

    // Archive the previous season
    if (previousSeason?.currentSeason) {
      await adminDb
        .collection("leagues")
        .doc(leagueId)
        .collection("archivedSeasons")
        .doc(previousSeason.currentSeason)
        .set({
          ...previousSeason,
          archivedAt: new Date().toISOString(),
          archivedBy: decoded.uid,
        });
    }

    const newSeason = { currentSeason, startDate, endDate };
    await adminDb.collection("leagues").doc(leagueId).update({
      season: newSeason,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ season: newSeason }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create season";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
