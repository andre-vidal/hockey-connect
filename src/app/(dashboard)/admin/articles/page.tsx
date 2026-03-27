"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { Article, ArticleStatus } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const statusVariant: Record<ArticleStatus, "secondary" | "success" | "default" | "outline" | "warning" | "destructive"> = {
  draft: "warning",
  published: "success",
  archived: "secondary",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/articles")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setArticles(data.articles);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete article");
      setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast({ title: "Article deleted" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<Article & Record<string, unknown>>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate max-w-xs">{row.title as string}</p>
          <p className="text-xs text-gray-400 font-mono">{row.slug as string}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <Badge variant={statusVariant[row.status as ArticleStatus]}>
          <span className="capitalize">{row.status as string}</span>
        </Badge>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      cell: (row) => {
        const vis = row.visibility as string[];
        return (
          <span className="text-sm text-gray-600">
            {vis.includes("public") ? "Public" : vis.join(", ")}
          </span>
        );
      },
    },
    {
      key: "authorName",
      header: "Author",
      sortable: true,
    },
    {
      key: "publishedAt",
      header: "Published",
      sortable: true,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.publishedAt as string | null)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/articles/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as Article)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Articles"
        description="Publish and manage articles for your league."
        actions={
          <Button asChild>
            <Link href="/admin/articles/new">
              <Plus className="h-4 w-4 mr-1" />
              New Article
            </Link>
          </Button>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={articles as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search articles..."
          loading={loading}
          emptyMessage="No articles yet. Create your first article to get started."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Article</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Article"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
