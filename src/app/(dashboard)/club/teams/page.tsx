"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Team } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ClubTeamsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile?.clubId) return;
    setLoading(true);
    fetch(`/api/clubs/${profile.clubId}/teams`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTeams(data.teams);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile?.clubId]);

  async function handleDelete() {
    if (!deleteTarget || !profile?.clubId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/teams/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete team");
      setTeams((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast({ title: "Team deleted", description: `${deleteTarget.name} has been removed.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<Team & Record<string, unknown>>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name as string}</span>,
    },
    {
      key: "gender",
      header: "Gender",
      cell: (row) => (
        <Badge variant="outline" className="capitalize">{row.gender as string}</Badge>
      ),
    },
    { key: "ageGroup", header: "Age Group", sortable: true },
    { key: "division", header: "Division", sortable: true },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/club/teams/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as Team)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title="Teams"
        description="Manage your club's teams."
        actions={
          <Button asChild>
            <Link href="/club/teams/new">
              <Plus className="h-4 w-4 mr-1" />
              New Team
            </Link>
          </Button>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}
        {!profile?.clubId && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-700">
            Your account is not linked to a club. Contact a league admin.
          </div>
        )}
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={teams as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search teams..."
          loading={loading}
          emptyMessage="No teams found. Create your first team to get started."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Team</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Team"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
