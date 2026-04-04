import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// Lower number = more privileged
const ROLE_LEVEL: Record<string, number> = {
  root: 0,
  league_admin: 1,
  match_official: 2,
  club_admin: 2,
  team_admin: 3,
  player: 4,
  public: 5,
};

function minLevel(roles: string[]): number {
  if (roles.length === 0) return 99;
  return Math.min(...roles.map((r) => ROLE_LEVEL[r] ?? 99));
}

async function verifyAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const data = userDoc.data();
  const roles: string[] = data?.roles ?? [];
  const isLeagueAdmin = roles.includes("league_admin") || roles.includes("root");
  const isClubAdmin = roles.includes("club_admin");
  if (!isLeagueAdmin && !isClubAdmin) throw new Error("Forbidden");
  return { callerUid: decoded.uid, roles, isLeagueAdmin, isClubAdmin };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { callerUid, roles: callerRoles, isLeagueAdmin } = await verifyAuth();
    const { uid } = await params;

    const doc = await adminDb.collection("users").doc(uid).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRoles: string[] = doc.data()?.roles ?? [];
    const callerLvl = minLevel(callerRoles);
    const targetLvl = minLevel(targetRoles);

    // Caller can only edit users at the same privilege level or below (not more privileged)
    // A user may always edit themselves
    if (callerUid !== uid && targetLvl < callerLvl) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { isActive, roles: newRoles, clubId } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
      await adminAuth.updateUser(uid, { disabled: !isActive });
    }

    if (Array.isArray(newRoles)) {
      // Caller can only assign roles at their own level or below
      const forbidden = (newRoles as string[]).filter((r) => (ROLE_LEVEL[r] ?? 99) < callerLvl);
      if (forbidden.length > 0) {
        return NextResponse.json(
          { error: `Cannot assign roles with higher privilege: ${forbidden.join(", ")}` },
          { status: 403 }
        );
      }
      updates.roles = newRoles;
      // Refresh custom claims so security rules stay in sync
      await adminAuth.setCustomUserClaims(uid, { roles: newRoles });
    }

    // Only root and league_admin can change clubId
    if (clubId !== undefined && isLeagueAdmin) {
      updates.clubId = clubId || null;
    }

    await adminDb.collection("users").doc(uid).update(updates);
    const updated = await adminDb.collection("users").doc(uid).get();
    return NextResponse.json({ user: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { callerUid, roles: callerRoles } = await verifyAuth();
    const isLeagueAdmin = callerRoles.includes("league_admin") || callerRoles.includes("root");
    if (!isLeagueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await params;

    if (callerUid === uid) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const doc = await adminDb.collection("users").doc(uid).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRoles: string[] = doc.data()?.roles ?? [];
    const callerLvl = minLevel(callerRoles);
    const targetLvl = minLevel(targetRoles);

    if (targetLvl < callerLvl) {
      return NextResponse.json({ error: "Cannot delete a user with higher privilege" }, { status: 403 });
    }

    await adminAuth.deleteUser(uid);
    await adminDb.collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
