"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { UserRole } from "@/types";

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

export default function NewArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({ type: "doc", content: [] });
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [visibility, setVisibility] = useState<UserRole[]>(["public"]);
  const [headerImageUrl, setHeaderImageUrl] = useState("");

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(val));
    }
  }

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
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content,
          excerpt,
          headerImageUrl: headerImageUrl || null,
          headerImagePath: null,
          status,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create article");
      toast({ title: "Article created", description: status === "published" ? "Article is now live." : "Saved as draft." });
      router.push("/admin/articles");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create article", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="New Article"
        description="Write and publish a new article."
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
                  onChange={(e) => handleTitleChange(e.target.value)}
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
                <p className="text-xs text-gray-400 mt-1">URL-friendly identifier. Auto-generated from title.</p>
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
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
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
              {saving ? "Saving..." : status === "published" ? "Publish Article" : "Save Draft"}
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
