import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const data = userDoc.data();
  const roles: string[] = data?.roles ?? [];
  return { decoded, roles, clubId: data?.clubId ?? null, teamIds: (data?.teamIds as string[]) ?? [] };
}

function canAccess(roles: string[], clubId: string | null, teamIds: string[], squadClubId: string, squadTeamId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === squadClubId) return true;
  if (roles.includes("team_admin") && clubId === squadClubId && teamIds.includes(squadTeamId)) return true;
  return false;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  try {
    const { squadId } = await params;
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();

    const doc = await adminDb.collection("squads").doc(squadId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const squadData = doc.data()!;
    const isAdmin = roles.includes("league_admin") || roles.includes("root");

    if (!canAccess(roles, userClubId, teamIds, squadData.clubId, squadData.teamId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (squadData.status !== "draft" && squadData.status !== "rejected") {
      return NextResponse.json({ error: "Only draft or rejected squads can be submitted" }, { status: 400 });
    }

    if (!squadData.players || squadData.players.length === 0) {
      return NextResponse.json({ error: "Squad must have at least one player before submitting" }, { status: 400 });
    }

    // Check squad setup window is still open (for non-admins)
    if (!isAdmin) {
      if (squadData.leagueId) {
        const leagueDoc = await adminDb.collection("leagues").doc(squadData.leagueId).get();
        const window = leagueDoc.data()?.squadSetupWindow;
        if (window && !window.isOpen) {
          return NextResponse.json({ error: "Squad setup window is currently closed" }, { status: 400 });
        }
      }
      if (squadData.tournamentId) {
        const tournDoc = await adminDb.collection("tournaments").doc(squadData.tournamentId).get();
        const window = tournDoc.data()?.squadSetupWindow;
        if (window && !window.isOpen) {
          return NextResponse.json({ error: "Squad setup window is currently closed" }, { status: 400 });
        }
      }
    }

    const now = new Date().toISOString();
    await adminDb.collection("squads").doc(squadId).update({
      status: "submitted",
      submittedAt: now,
      rejectionReason: null,
      updatedAt: now,
    });

    const updated = await adminDb.collection("squads").doc(squadId).get();
    return NextResponse.json({ squad: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
