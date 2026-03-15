"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tournament, TournamentStatus } from "@/types";
import { Plus, Pencil } from "lucide-react";

const statusVariant: Record<TournamentStatus, "secondary" | "success" | "default" | "outline"> = {
  upcoming: "secondary",
  active: "success",
  completed: "default",
  cancelled: "outline",
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTournaments(data.tournaments);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Tournament & Record<string, unknown>>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "venue",
      header: "Venue",
      sortable: true,
    },
    {
      key: "startDate",
      header: "Start Date",
      cell: (row) => row.startDate ? new Date(row.startDate as string).toLocaleDateString() : "—",
    },
    {
      key: "endDate",
      header: "End Date",
      cell: (row) => row.endDate ? new Date(row.endDate as string).toLocaleDateString() : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status as TournamentStatus]}>
          <span className="capitalize">{row.status as string}</span>
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/tournaments/${row.id}`}>
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
        title="Tournaments"
        description="Manage hockey tournaments and events."
        actions={
          <Button asChild>
            <Link href="/admin/tournaments/new">
              <Plus className="h-4 w-4 mr-1" />
              New Tournament
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
          data={tournaments as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search tournaments..."
          loading={loading}
          emptyMessage="No tournaments found. Create your first tournament to get started."
        />
      </DashboardShell>
    </AuthGuard>
  );
}
