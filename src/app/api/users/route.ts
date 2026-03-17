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
  return { decoded, roles, clubId: data?.clubId ?? null };
}

export async function GET(request: NextRequest) {
  try {
    const { roles, clubId } = await verifyAuth();
    const isLeagueAdmin = roles.includes("league_admin") || roles.includes("root");
    const isClubAdmin = roles.includes("club_admin");

    if (!isLeagueAdmin && !isClubAdmin) throw new Error("Forbidden");

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    let query = adminDb.collection("users") as FirebaseFirestore.Query;

    if (isClubAdmin && !isLeagueAdmin) {
      // club_admin can only see users in their own club
      if (!clubId) return NextResponse.json({ users: [] });
      query = query.where("clubId", "==", clubId);
    }

    if (roleFilter) {
      query = query.where("roles", "array-contains", roleFilter);
    }

    if (isLeagueAdmin && !roleFilter) {
      query = query.orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    const allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter users by role hierarchy: callers can only see users at the same privilege level or below
    const users = allUsers.filter((u) => {
      const userRoles: string[] = (u as Record<string, unknown>).roles as string[] ?? [];
      if (roles.includes("root")) return true;
      if (isLeagueAdmin) return !userRoles.includes("root");
      if (isClubAdmin) return !userRoles.includes("root") && !userRoles.includes("league_admin");
      return false;
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
