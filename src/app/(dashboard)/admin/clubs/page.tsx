"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { Club } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/clubs${includeArchived ? "?includeArchived=true" : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClubs(data.clubs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [includeArchived]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete club");
      setClubs((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: "Club deleted", description: `${deleteTarget.name} has been removed.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<Club & Record<string, unknown>>[] = [
    {
      key: "logoUrl",
      header: "Logo",
      cell: (row) => (
        <Avatar className="h-8 w-8">
          {row.logoUrl ? <AvatarImage src={row.logoUrl as string} alt={row.name as string} /> : null}
          <AvatarFallback className="text-xs">
            {(row.name as string)?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name as string}</span>,
    },
    {
      key: "shortName",
      header: "Short Name",
    },
    {
      key: "city",
      header: "City",
      sortable: true,
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.isActive && <Badge variant="success">Active</Badge>}
          {row.isArchived && <Badge variant="outline">Archived</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/clubs/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as Club)}
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
        title="Clubs"
        description="Manage hockey clubs and their information."
        actions={
          <Button asChild>
            <Link href="/admin/clubs/new">
              <Plus className="h-4 w-4 mr-1" />
              New Club
            </Link>
          </Button>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Switch
            id="includeArchived"
            checked={includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="includeArchived" className="cursor-pointer">Include Archived Clubs</Label>
        </div>
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={clubs as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search clubs..."
          loading={loading}
          emptyMessage="No clubs found. Create your first club to get started."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Club</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Club"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
