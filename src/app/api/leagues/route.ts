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

async function verifyLeagueAdmin() {
  const decoded = await verifyAuthenticated();
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("leagues").orderBy("createdAt", "desc").get();
    const leagues = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((l) => (l as { status?: string }).status !== "archived");
    return NextResponse.json({ leagues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leagues";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const {
      name,
      description,
      country,
      division,
      gender,
      ageGroup,
      matchConfig,
      transferWindow,
      squadSetupWindow,
      season,
      status,
    } = body;

    if (!name || !country || !gender) {
      return NextResponse.json({ error: "name, country, and gender are required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("leagues").doc();

    const league = {
      name,
      description: description ?? "",
      country,
      division: division ?? "",
      gender,
      ageGroup: ageGroup ?? "",
      matchConfig: matchConfig ?? { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
      transferWindow: transferWindow ?? { isOpen: false, openDate: "", closeDate: "" },
      squadSetupWindow: squadSetupWindow ?? { isOpen: false, openDate: "", closeDate: "" },
      season: season ?? { currentSeason: "", startDate: "", endDate: "" },
      status: status ?? "active",
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(league);

    return NextResponse.json({ league: { id: docRef.id, ...league } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create league";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
