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

function canAccessRoster(roles: string[], clubId: string | null, teamIds: string[], rosterClubId: string, rosterTeamId: string) {
  if (roles.includes("league_admin") || roles.includes("root") || roles.includes("match_official")) return true;
  if (roles.includes("club_admin") && clubId === rosterClubId) return true;
  if (roles.includes("team_admin") && clubId === rosterClubId && teamIds.includes(rosterTeamId)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const teamId = searchParams.get("teamId");

    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    let query = adminDb.collection("matchRosters").where("matchId", "==", matchId) as FirebaseFirestore.Query;
    if (teamId) query = query.where("teamId", "==", teamId);

    const snapshot = await query.get();
    const rosters = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter to accessible rosters
    const isAdmin = roles.includes("league_admin") || roles.includes("root") || roles.includes("match_official");
    if (!isAdmin) {
      return NextResponse.json({
        rosters: rosters.filter((r) => {
          const rec = r as Record<string, unknown>;
          return canAccessRoster(roles, userClubId, teamIds, rec.clubId as string, rec.teamId as string);
        }),
      });
    }

    return NextResponse.json({ rosters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch match rosters";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { decoded, roles, clubId: userClubId, teamIds } = await verifyAuth();
    const body = await request.json();
    const { matchId, teamId, clubId, squadId, players } = body;

    if (!matchId || !teamId || !clubId || !squadId) {
      return NextResponse.json({ error: "matchId, teamId, clubId, and squadId are required" }, { status: 400 });
    }

    if (!canAccessRoster(roles, userClubId, teamIds, clubId, teamId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the squad is approved
    const squadDoc = await adminDb.collection("squads").doc(squadId).get();
    if (!squadDoc.exists || squadDoc.data()?.status !== "approved") {
      return NextResponse.json({ error: "Squad must be approved before submitting a match roster" }, { status: 400 });
    }

    // Upsert: check if roster already exists for this match+team
    const existing = await adminDb
      .collection("matchRosters")
      .where("matchId", "==", matchId)
      .where("teamId", "==", teamId)
      .get();

    const now = new Date().toISOString();

    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      await docRef.update({ players: players ?? [], submittedAt: now, updatedAt: now });
      const updated = await docRef.get();
      return NextResponse.json({ roster: { id: updated.id, ...updated.data() } });
    }

    const docRef = adminDb.collection("matchRosters").doc();
    const roster = {
      matchId,
      teamId,
      clubId,
      squadId,
      players: players ?? [],
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(roster);
    return NextResponse.json({ roster: { id: docRef.id, ...roster } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit match roster";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
