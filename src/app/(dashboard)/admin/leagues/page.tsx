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
import { League, LeagueStatus } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const statusVariant: Record<LeagueStatus, "success" | "secondary" | "outline"> = {
  active: "success",
  inactive: "secondary",
  archived: "outline",
};

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/leagues")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setLeagues(data.leagues);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete league");
      setLeagues((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      toast({ title: "League deleted", description: `${deleteTarget.name} has been removed.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<League & Record<string, unknown>>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
    },
    {
      key: "gender",
      header: "Gender",
      cell: (row) => (
        <span className="capitalize">{row.gender as string}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status as LeagueStatus]}>
          <span className="capitalize">{row.status as string}</span>
        </Badge>
      ),
    },
    {
      key: "season",
      header: "Season",
      cell: (row) => {
        const season = row.season as League["season"];
        return <span>{season?.currentSeason ?? "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/leagues/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as League)}
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
        title="Leagues"
        description="Manage hockey leagues and their configurations."
        actions={
          <Button asChild>
            <Link href="/admin/leagues/new">
              <Plus className="h-4 w-4 mr-1" />
              New League
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
          data={leagues as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search leagues..."
          loading={loading}
          emptyMessage="No leagues found. Create your first league to get started."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete League</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete League"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
