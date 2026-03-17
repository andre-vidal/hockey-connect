"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Squad } from "@/types";
import { Plus, Pencil } from "lucide-react";

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "warning" | "success" | "destructive"> = {
  draft: "outline",
  submitted: "warning",
  approved: "success",
  rejected: "destructive",
};

export default function SquadsPage() {
  const { profile } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.clubId) return;
    setLoading(true);
    fetch(`/api/squads?clubId=${profile.clubId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSquads(data.squads);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile?.clubId]);

  const columns: Column<Squad & Record<string, unknown>>[] = [
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status as string] ?? "outline"} className="capitalize">
          {row.status as string}
        </Badge>
      ),
    },
    {
      key: "leagueId",
      header: "League / Tournament",
      cell: (row) => (row.leagueId as string) || (row.tournamentId as string) || "—",
    },
    { key: "season", header: "Season", cell: (row) => (row.season as string) || "—" },
    {
      key: "players",
      header: "Players",
      cell: (row) => {
        const players = row.players as unknown[];
        return players?.length ?? 0;
      },
    },
    {
      key: "rejectionReason",
      header: "Rejection Reason",
      cell: (row) => (row.rejectionReason as string) || "—",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/team/squads/${row.id}`}>
            <Pencil className="h-3 w-3 mr-1" />
            Manage
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell
        title="Squads"
        description="Manage squad submissions for leagues and tournaments."
        actions={
          <Button asChild>
            <Link href="/team/squads/new">
              <Plus className="h-4 w-4 mr-1" />
              New Squad
            </Link>
          </Button>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={squads as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search squads..."
          loading={loading}
          emptyMessage="No squads found. Create a squad to submit for a league or tournament."
        />
      </DashboardShell>
    </AuthGuard>
  );
}
