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
import { Match, MatchStatus } from "@/types";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning" | "destructive"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMatches(data.matches);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/matches/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete match");
      setMatches((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast({ title: "Match deleted", description: "The match has been removed." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<Match & Record<string, unknown>>[] = [
    {
      key: "scheduledAt",
      header: "Date & Time",
      sortable: true,
      cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.scheduledAt as string)}</span>,
    },
    {
      key: "homeTeamName",
      header: "Home",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.homeTeamName as string || "—"}</span>,
    },
    {
      key: "awayTeamName",
      header: "Away",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.awayTeamName as string || "—"}</span>,
    },
    {
      key: "venue",
      header: "Venue",
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status as MatchStatus]}>
          <span className="capitalize">{(row.status as string).replace("_", " ")}</span>
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/matches/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          {((row.status as MatchStatus) === "completed" || (row.status as MatchStatus) === "confirmed") && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/matches/${row.id}/card`}>
                <ClipboardList className="h-3 w-3 mr-1" />
                View Card
              </Link>
            </Button>
          )}
          {(row.status as MatchStatus) === "scheduled" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(row as unknown as Match)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Matches"
        description="Schedule and manage matches."
        actions={
          <Button asChild>
            <Link href="/admin/matches/new">
              <Plus className="h-4 w-4 mr-1" />
              New Match
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
          data={matches as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search matches..."
          loading={loading}
          emptyMessage="No matches scheduled. Create your first match to get started."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Match</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete the match between{" "}
            <strong>{deleteTarget?.homeTeamName}</strong> and{" "}
            <strong>{deleteTarget?.awayTeamName}</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Match"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
