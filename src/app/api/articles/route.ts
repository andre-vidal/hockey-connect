import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

async function getCallerRoles(): Promise<UserRole[]> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return ["public"];
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const roles: UserRole[] = userDoc.data()?.roles ?? [];
    return roles.length > 0 ? roles : ["public"];
  } catch {
    return ["public"];
  }
}

async function verifyLeagueAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifySessionCookie(session, true);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const roles = userDoc.data()?.roles ?? [];
  if (!roles.includes("league_admin") && !roles.includes("root")) throw new Error("Forbidden");
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    const callerRoles = await getCallerRoles();
    const isAdmin = callerRoles.includes("league_admin") || callerRoles.includes("root" as UserRole);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter for admin

    let query = adminDb.collection("articles").orderBy("publishedAt", "desc");

    if (isAdmin) {
      // Admin can filter by status
      if (status) {
        query = adminDb.collection("articles").where("status", "==", status).orderBy("publishedAt", "desc");
      }
    } else {
      // Non-admins only see published articles visible to their roles
      query = adminDb
        .collection("articles")
        .where("status", "==", "published")
        .orderBy("publishedAt", "desc");
    }

    const snapshot = await query.get();
    let articles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as unknown as Array<Record<string, unknown> & { visibility: UserRole[] }>;

    // Filter by visibility (Firestore array-contains can only check one value, so filter client-side)
    if (!isAdmin) {
      articles = articles.filter((a) =>
        a.visibility?.some((v: UserRole) => callerRoles.includes(v) || v === "public")
      );
    }

    return NextResponse.json({ articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyLeagueAdmin();
    const body = await request.json();

    const { title, slug, content, excerpt, headerImageUrl, headerImagePath, status, visibility } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ error: "title, slug, and content are required" }, { status: 400 });
    }

    if (!["draft", "published", "archived"].includes(status)) {
      return NextResponse.json({ error: "status must be draft, published, or archived" }, { status: 400 });
    }

    if (!Array.isArray(visibility) || visibility.length === 0) {
      return NextResponse.json({ error: "visibility must be a non-empty array" }, { status: 400 });
    }

    // Ensure slug is unique
    const existing = await adminDb.collection("articles").where("slug", "==", slug).get();
    if (!existing.empty) {
      return NextResponse.json({ error: "An article with this slug already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const docRef = adminDb.collection("articles").doc();

    // Get author display name
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const authorName = userDoc.data()?.displayName ?? decoded.email ?? "Unknown";

    const article = {
      title,
      slug,
      content,
      excerpt: excerpt ?? "",
      headerImageUrl: headerImageUrl ?? null,
      headerImagePath: headerImagePath ?? null,
      status,
      visibility,
      authorId: decoded.uid,
      authorName,
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(article);
    return NextResponse.json({ article: { id: docRef.id, ...article } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create article";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
