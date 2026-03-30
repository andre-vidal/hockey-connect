import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  return adminAuth.verifySessionCookie(session, true);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const decoded = await verifyAuthenticated();
    const { matchId } = await params;

    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userDoc.data();
    const roles: string[] = userData?.roles ?? [];
    const clubId: string | undefined = userData?.clubId;

    // Load match card
    const cardDoc = await adminDb.collection("matchCards").doc(matchId).get();
    if (!cardDoc.exists) {
      return NextResponse.json({ error: "Match card not found" }, { status: 404 });
    }
    const matchCard = { id: cardDoc.id, ...cardDoc.data() };

    // League admin or root: full access
    if (roles.includes("league_admin") || roles.includes("root")) {
      return NextResponse.json({ matchCard });
    }

    // Match official: any official can view any match card
    if (roles.includes("match_official")) {
      return NextResponse.json({ matchCard });
    }

    // Team admin or player: check club matches home/away
    if ((roles.includes("team_admin") || roles.includes("player")) && clubId) {
      const card = cardDoc.data()!;
      if (card.homeClubId === clubId || card.awayClubId === clubId) {
        return NextResponse.json({ matchCard });
      }
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch match card";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
