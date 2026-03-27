import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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

function canReadTeams(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if ((roles.includes("club_admin") || roles.includes("team_admin")) && clubId === targetClubId) return true;
  return false;
}

function canWriteTeams(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === targetClubId) return true;
  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();

    if (!canReadTeams(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await adminDb.collection(`clubs/${clubId}/teams`).get();
    let teams = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // team_admin only sees their assigned teams
    if (roles.includes("team_admin") && !roles.includes("club_admin") && !roles.includes("league_admin") && !roles.includes("root")) {
      teams = teams.filter((t) => teamIds.includes((t as Record<string, unknown>).id as string));
    }

    teams.sort((a, b) => {
      const aName = (a as Record<string, unknown>).name as string ?? "";
      const bName = (b as Record<string, unknown>).name as string ?? "";
      return aName.localeCompare(bName);
    });

    return NextResponse.json({ teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch teams";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    if (!canWriteTeams(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, gender, ageGroup, division, leagueId, teamAdminId } = body;

    if (!name || !gender) {
      return NextResponse.json({ error: "name and gender are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection(`clubs/${clubId}/teams`).doc();

    const team = {
      clubId,
      name,
      gender,
      ageGroup: ageGroup ?? "",
      division: division ?? "",
      leagueId: leagueId ?? null,
      teamAdminId: teamAdminId ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(team);

    // Sync teamIds on the assigned admin's profile
    if (teamAdminId) {
      await adminDb.collection("users").doc(teamAdminId).update({
        teamIds: FieldValue.arrayUnion(docRef.id),
      });
    }

    return NextResponse.json({ team: { id: docRef.id, ...team } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create team";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
