import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin")) throw new Error("Forbidden");
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    let query = adminDb.collection("clubs") as FirebaseFirestore.Query;

    if (!includeArchived) {
      query = query.where("isArchived", "==", false);
    }

    const snapshot = await query.get();
    const clubs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aName = (a as unknown as { name: string }).name ?? "";
        const bName = (b as unknown as { name: string }).name ?? "";
        return aName.localeCompare(bName);
      });
    return NextResponse.json({ clubs });
  } catch (error) {
    console.error("GET /api/clubs error:", error);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const { name, shortName, logoUrl, primaryColor, secondaryColor, email, phone, website, address, city, country, foundedYear, id: providedId } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const docRef = providedId
      ? adminDb.collection("clubs").doc(providedId)
      : adminDb.collection("clubs").doc();

    const club = {
      name,
      shortName: shortName ?? "",
      logoUrl: logoUrl ?? "",
      primaryColor: primaryColor ?? "",
      secondaryColor: secondaryColor ?? "",
      email: email ?? "",
      phone: phone ?? "",
      website: website ?? "",
      address: address ?? "",
      city: city ?? "",
      country: country ?? "",
      foundedYear: foundedYear ?? null,
      isActive: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      createdBy: decoded.uid,
    };

    await docRef.set(club);

    return NextResponse.json({ club: { id: docRef.id, ...club } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create club";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
