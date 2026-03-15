"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchOfficial, OfficialType } from "@/types";
import { Plus, Pencil } from "lucide-react";

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
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/officials/${row.id}`}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Link>
        </Button>
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
    </AuthGuard>
  );
}
