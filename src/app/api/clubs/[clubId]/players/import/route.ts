import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, getAdminDb } from "@/lib/firebase/admin";

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

function canManagePlayers(roles: string[], clubId: string | null, targetClubId: string) {
  if (roles.includes("league_admin") || roles.includes("root")) return true;
  if (roles.includes("club_admin") && clubId === targetClubId) return true;
  return false;
}


function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });

  return { headers, rows };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { decoded, roles, clubId: userClubId } = await verifyAuth();

    if (!canManagePlayers(roles, userClubId, clubId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { csvText, preview } = body;

    if (!csvText) {
      return NextResponse.json({ error: "csvText is required" }, { status: 400 });
    }

    const { headers, rows } = parseCSV(csvText);

    // Validate headers
    const requiredCols = ["firstName", "lastName"];
    const missingRequired = requiredCols.filter((c) => !headers.includes(c));
    if (missingRequired.length > 0) {
      return NextResponse.json({
        error: `Missing required columns: ${missingRequired.join(", ")}`,
        headers,
      }, { status: 400 });
    }

    // Validate rows
    const errors: { row: number; message: string }[] = [];
    const valid: Record<string, string>[] = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2; // 1-indexed, +1 for header
      if (!row.firstName?.trim()) {
        errors.push({ row: rowNum, message: "firstName is required" });
        return;
      }
      if (!row.lastName?.trim()) {
        errors.push({ row: rowNum, message: "lastName is required" });
        return;
      }
      valid.push(row);
    });

    // If preview mode, just return parsed data without writing
    if (preview) {
      return NextResponse.json({ headers, rows, errors, validCount: valid.length });
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: "CSV contains validation errors", errors }, { status: 400 });
    }

    // Bulk write
    const now = new Date().toISOString();
    const batch = getAdminDb().batch();
    const created: Array<{ id: string }> = [];

    for (const row of valid) {
      const docRef = adminDb.collection(`clubs/${clubId}/players`).doc();
      const player = {
        clubId,
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || "",
        dateOfBirth: row.dateOfBirth?.trim() || "",
        gender: row.gender?.trim() || "",
        nationality: row.nationality?.trim() || "",
        position: row.position?.trim() || "",
        jerseyNumber: row.jerseyNumber ? parseInt(row.jerseyNumber, 10) || null : null,
        photoUrl: "",
        status: "active",
        claimedByUserId: null,
        createdAt: now,
        updatedAt: now,
        createdBy: decoded.uid,
      };
      batch.set(docRef, player);
      created.push({ id: docRef.id });
    }

    await batch.commit();
    return NextResponse.json({ imported: created.length, ids: created.map((c) => c.id) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import players";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
