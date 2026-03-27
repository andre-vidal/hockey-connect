"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArticleEditor } from "@/components/articles/ArticleEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Article, ArticleStatus, UserRole } from "@/types";

const VISIBILITY_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "public", label: "Public (everyone)" },
  { value: "player", label: "Players" },
  { value: "team_admin", label: "Team Admins" },
  { value: "club_admin", label: "Club Admins" },
  { value: "match_official", label: "Match Officials" },
  { value: "league_admin", label: "League Admins only" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default function EditArticlePage() {
  const router = useRouter();
  const { articleId } = useParams<{ articleId: string }>();
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({ type: "doc", content: [] });
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [visibility, setVisibility] = useState<UserRole[]>(["public"]);
  const [headerImageUrl, setHeaderImageUrl] = useState("");

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const a: Article = data.article;
        setArticle(a);
        setTitle(a.title);
        setSlug(a.slug);
        setExcerpt(a.excerpt ?? "");
        setContent(a.content);
        setStatus(a.status);
        setVisibility(a.visibility);
        setHeaderImageUrl(a.headerImageUrl ?? "");
      })
      .catch((err) => setLoadError(err.message));
  }, [articleId]);

  function toggleVisibility(role: UserRole) {
    setVisibility((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !slug) {
      toast({ title: "Validation error", description: "Title and slug are required.", variant: "destructive" });
      return;
    }
    if (visibility.length === 0) {
      toast({ title: "Validation error", description: "Select at least one visibility option.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content,
          excerpt,
          headerImageUrl: headerImageUrl || null,
          status,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update article");
      toast({ title: "Article updated" });
      router.push("/admin/articles");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update article", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit Article" description="">
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{loadError}</div>
        </DashboardShell>
      </AuthGuard>
    );
  }

  if (!article) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit Article" description="">
          <div className="space-y-4 max-w-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit Article"
        description={`Editing: ${article.title}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/articles">Cancel</Link>
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle>Article Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Article title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="article-slug"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Changing the slug will break existing links.</p>
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt (optional)</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Short summary shown in article listings..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="headerImageUrl">Header Image URL (optional)</Label>
                <Input
                  id="headerImageUrl"
                  placeholder="https://..."
                  value={headerImageUrl}
                  onChange={(e) => setHeaderImageUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader><CardTitle>Content</CardTitle></CardHeader>
            <CardContent>
              <ArticleEditor content={content} onChange={setContent} />
            </CardContent>
          </Card>

          {/* Publishing */}
          <Card>
            <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <p className="text-xs text-gray-400 mb-2">Who can read this article.</p>
                <div className="grid grid-cols-2 gap-2">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibility.includes(opt.value)}
                        onChange={() => toggleVisibility(opt.value)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/articles">Cancel</Link>
            </Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
