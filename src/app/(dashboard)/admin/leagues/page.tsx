"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { League, LeagueStatus } from "@/types";
import { Plus, Pencil } from "lucide-react";

const statusVariant: Record<LeagueStatus, "success" | "secondary" | "outline"> = {
  active: "success",
  inactive: "secondary",
  archived: "outline",
};

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/leagues/${row.id}`}>
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
    </AuthGuard>
  );
}
