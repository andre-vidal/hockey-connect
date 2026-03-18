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
import { MatchOfficial, OfficialType } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const typeLabels: Record<OfficialType, string> = {
  umpire: "Umpire",
  table_operator: "Table Operator",
  technical_delegate: "Technical Delegate",
  medical_officer: "Medical Officer",
};

export default function OfficialsPage() {
  const [officials, setOfficials] = useState<MatchOfficial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchOfficial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/officials")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOfficials(data.officials);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/officials/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete official");
      setOfficials((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      toast({ title: "Official removed", description: `${deleteTarget.displayName} has been removed.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const columns: Column<MatchOfficial & Record<string, unknown>>[] = [
    {
      key: "displayName",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.displayName as string}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
    },
    {
      key: "officialTypes",
      header: "Types",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.officialTypes as OfficialType[])?.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {typeLabels[t]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "certificationLevel",
      header: "Certification Level",
      cell: (row) => (row.certificationLevel as string) || "—",
    },
    {
      key: "isActive",
      header: "Active",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/officials/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as MatchOfficial)}
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
        title="Match Officials"
        description="Manage registered match officials."
        actions={
          <Button asChild>
            <Link href="/admin/officials/new">
              <Plus className="h-4 w-4 mr-1" />
              Add Official
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
          data={officials as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search officials..."
          loading={loading}
          emptyMessage="No officials registered yet."
        />
      </DashboardShell>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Remove Official</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to remove <strong>{deleteTarget?.displayName}</strong> as an official? This cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove Official"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
