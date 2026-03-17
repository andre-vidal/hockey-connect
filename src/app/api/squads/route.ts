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

export async function GET(request: NextRequest) {
  try {
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const clubId = searchParams.get("clubId");
    const leagueId = searchParams.get("leagueId");
    const tournamentId = searchParams.get("tournamentId");
    const status = searchParams.get("status");

    const isAdmin = roles.includes("league_admin") || roles.includes("root");
    const isClubAdmin = roles.includes("club_admin");
    const isTeamAdmin = roles.includes("team_admin");

    let query = adminDb.collection("squads") as FirebaseFirestore.Query;

    if (teamId) query = query.where("teamId", "==", teamId);
    if (leagueId) query = query.where("leagueId", "==", leagueId);
    if (tournamentId) query = query.where("tournamentId", "==", tournamentId);
    if (status) query = query.where("status", "==", status);

    if (isAdmin) {
      if (clubId) query = query.where("clubId", "==", clubId);
    } else if (isClubAdmin) {
      const targetClubId = clubId ?? userClubId;
      if (!targetClubId) return NextResponse.json({ squads: [] });
      query = query.where("clubId", "==", targetClubId);
    } else if (isTeamAdmin) {
      // team_admin: filter to their assigned teams within their club
      if (!userClubId) return NextResponse.json({ squads: [] });
      query = query.where("clubId", "==", userClubId);
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await query.get();
    let squads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Further filter team_admin to their assigned teams only
    if (isTeamAdmin && !isAdmin && !isClubAdmin) {
      squads = squads.filter((s) => teamIds.includes((s as Record<string, unknown>).teamId as string));
    }

    return NextResponse.json({ squads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch squads";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { decoded, roles, clubId: userClubId, teamIds } = await verifyAuth();
    const body = await request.json();
    const { teamId, clubId, leagueId, tournamentId, season, players } = body;

    if (!teamId || !clubId) {
      return NextResponse.json({ error: "teamId and clubId are required" }, { status: 400 });
    }
    if (!leagueId && !tournamentId) {
      return NextResponse.json({ error: "leagueId or tournamentId is required" }, { status: 400 });
    }

    const isAdmin = roles.includes("league_admin") || roles.includes("root");
    const isClubAdmin = roles.includes("club_admin") && userClubId === clubId;
    const isTeamAdmin = roles.includes("team_admin") && userClubId === clubId && teamIds.includes(teamId);

    if (!isAdmin && !isClubAdmin && !isTeamAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check squad setup window is open (for non-admins)
    if (!isAdmin && leagueId) {
      const leagueDoc = await adminDb.collection("leagues").doc(leagueId).get();
      const window = leagueDoc.data()?.squadSetupWindow;
      if (window && !window.isOpen) {
        return NextResponse.json({ error: "Squad setup window is currently closed" }, { status: 400 });
      }
    }
    if (!isAdmin && tournamentId) {
      const tournDoc = await adminDb.collection("tournaments").doc(tournamentId).get();
      const window = tournDoc.data()?.squadSetupWindow;
      if (window && !window.isOpen) {
        return NextResponse.json({ error: "Squad setup window is currently closed" }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("squads").doc();

    const squad = {
      teamId,
      clubId,
      leagueId: leagueId ?? null,
      tournamentId: tournamentId ?? null,
      season: season ?? "",
      status: "draft",
      players: players ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(squad);
    return NextResponse.json({ squad: { id: docRef.id, ...squad } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create squad";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
