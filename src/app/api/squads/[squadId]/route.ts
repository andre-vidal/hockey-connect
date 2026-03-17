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

type Params = { params: Promise<{ squadId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { squadId } = await params;
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();

    const doc = await adminDb.collection("squads").doc(squadId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = doc.data()!;

    if (!canAccess(roles, userClubId, teamIds, data.clubId, data.teamId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ squad: { id: doc.id, ...data } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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

    if (!isAdmin && squadData.status !== "draft") {
      return NextResponse.json({ error: "Only draft squads can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const { players, season, leagueId, tournamentId } = body;
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updatedAt: now };
    if (players !== undefined) updates.players = players;
    if (season !== undefined) updates.season = season;
    if (leagueId !== undefined) updates.leagueId = leagueId;
    if (tournamentId !== undefined) updates.tournamentId = tournamentId;

    await adminDb.collection("squads").doc(squadId).update(updates);
    const updated = await adminDb.collection("squads").doc(squadId).get();
    return NextResponse.json({ squad: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
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

    if (!isAdmin && squadData.status !== "draft") {
      return NextResponse.json({ error: "Only draft squads can be deleted" }, { status: 400 });
    }

    await adminDb.collection("squads").doc(squadId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
