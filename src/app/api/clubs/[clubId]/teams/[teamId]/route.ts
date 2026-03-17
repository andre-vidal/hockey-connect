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

function isLeagueOrRoot(roles: string[]) {
  return roles.includes("league_admin") || roles.includes("root");
}

type Params = { params: Promise<{ clubId: string; teamId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { clubId, teamId } = await params;
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();

    const sameClub = userClubId === clubId;
    const canRead = isLeagueOrRoot(roles)
      || (roles.includes("club_admin") && sameClub)
      || (roles.includes("team_admin") && sameClub && teamIds.includes(teamId));

    if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ team: { id: doc.id, ...doc.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch team";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { clubId, teamId } = await params;
    const { roles, clubId: userClubId, teamIds } = await verifyAuth();

    const sameClub = userClubId === clubId;
    const canUpdateAdmin = isLeagueOrRoot(roles) || (roles.includes("club_admin") && sameClub);
    const canUpdate = canUpdateAdmin
      || (roles.includes("team_admin") && sameClub && teamIds.includes(teamId));

    if (!canUpdate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { name, gender, ageGroup, division, leagueId, teamAdminId } = body;
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      updatedAt: now,
      ...(name !== undefined && { name }),
      ...(gender !== undefined && { gender }),
      ...(ageGroup !== undefined && { ageGroup }),
      ...(division !== undefined && { division }),
      ...(leagueId !== undefined && { leagueId }),
    };

    // Only club_admin and above can change the assigned team admin
    if (canUpdateAdmin && teamAdminId !== undefined) {
      const previousAdminId = doc.data()?.teamAdminId ?? null;
      updates.teamAdminId = teamAdminId || null;

      // Sync teamIds on affected users
      if (previousAdminId && previousAdminId !== teamAdminId) {
        await adminDb.collection("users").doc(previousAdminId).update({
          teamIds: FieldValue.arrayRemove(teamId),
        });
      }
      if (teamAdminId && teamAdminId !== previousAdminId) {
        await adminDb.collection("users").doc(teamAdminId).update({
          teamIds: FieldValue.arrayUnion(teamId),
        });
      }
    }

    await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).update(updates);
    const updated = await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).get();
    return NextResponse.json({ team: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update team";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { clubId, teamId } = await params;
    const { roles, clubId: userClubId } = await verifyAuth();

    const canDelete = isLeagueOrRoot(roles) || (roles.includes("club_admin") && userClubId === clubId);
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const doc = await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).get();
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Remove teamId from assigned admin's teamIds
    const adminId = doc.data()?.teamAdminId;
    if (adminId) {
      await adminDb.collection("users").doc(adminId).update({
        teamIds: FieldValue.arrayRemove(teamId),
      });
    }

    await adminDb.collection(`clubs/${clubId}/teams`).doc(teamId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete team";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
