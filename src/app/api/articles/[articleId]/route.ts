import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

async function getCallerRoles(): Promise<{ uid: string | null; roles: UserRole[] }> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return { uid: null, roles: ["public"] };
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const roles: UserRole[] = userDoc.data()?.roles ?? [];
    return { uid: decoded.uid, roles: roles.length > 0 ? roles : ["public"] };
  } catch {
    return { uid: null, roles: ["public"] };
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;
    const { roles } = await getCallerRoles();
    const isAdmin = roles.includes("league_admin") || roles.includes("root" as UserRole);

    const doc = await adminDb.collection("articles").doc(articleId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const article = { id: doc.id, ...doc.data() } as unknown as Record<string, unknown> & { visibility: UserRole[]; status: string };

    // Non-admins can only read published articles they have visibility into
    if (!isAdmin) {
      if (article.status !== "published") {
        return NextResponse.json({ error: "Article not found" }, { status: 404 });
      }
      const visible = article.visibility?.some((v: UserRole) => roles.includes(v) || v === "public");
      if (!visible) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch article";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const decoded = await verifyLeagueAdmin();
    const { articleId } = await params;
    const body = await request.json();

    const doc = await adminDb.collection("articles").doc(articleId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const existing = doc.data()!;
    const { title, slug, content, excerpt, headerImageUrl, headerImagePath, status, visibility } = body;

    // If slug changed, ensure uniqueness
    if (slug && slug !== existing.slug) {
      const slugCheck = await adminDb.collection("articles").where("slug", "==", slug).get();
      if (!slugCheck.empty) {
        return NextResponse.json({ error: "An article with this slug already exists" }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const wasPublished = existing.status === "published";
    const becomingPublished = status === "published" && !wasPublished;

    const updates: Record<string, unknown> = { updatedAt: now, updatedBy: decoded.uid };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (excerpt !== undefined) updates.excerpt = excerpt;
    if (headerImageUrl !== undefined) updates.headerImageUrl = headerImageUrl;
    if (headerImagePath !== undefined) updates.headerImagePath = headerImagePath;
    if (status !== undefined) updates.status = status;
    if (visibility !== undefined) updates.visibility = visibility;
    if (becomingPublished) updates.publishedAt = now;

    await adminDb.collection("articles").doc(articleId).update(updates);

    const updated = await adminDb.collection("articles").doc(articleId).get();
    return NextResponse.json({ article: { id: updated.id, ...updated.data() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update article";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    await verifyLeagueAdmin();
    const { articleId } = await params;

    const doc = await adminDb.collection("articles").doc(articleId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await adminDb.collection("articles").doc(articleId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete article";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
