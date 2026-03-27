"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Team } from "@/types";

export default function TeamsPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  ];

  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell
        title="Teams"
        description="View your assigned teams."
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
    </AuthGuard>
  );
}
