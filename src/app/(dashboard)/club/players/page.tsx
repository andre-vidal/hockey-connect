"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Player } from "@/types";
import { Plus, Upload, Pencil, Mail } from "lucide-react";

const STATUS_VARIANTS: Record<string, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  active: "success",
  inactive: "secondary",
  injured: "warning",
  suspended: "destructive",
};

export default function ClubPlayersPage() {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!profile?.clubId) return;
    setLoading(true);
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`/api/clubs/${profile.clubId}/players${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(data.players);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile?.clubId, statusFilter]);

  const columns: Column<Player & Record<string, unknown>>[] = [
    {
      key: "lastName",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {row.firstName as string} {row.lastName as string}
        </span>
      ),
    },
    { key: "position", header: "Position", cell: (row) => <span className="capitalize">{(row.position as string) || "—"}</span> },
    { key: "jerseyNumber", header: "#", cell: (row) => row.jerseyNumber ?? "—" },
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
      key: "claimedByUserId",
      header: "Claimed",
      cell: (row) => (
        <Badge variant={row.claimedByUserId ? "success" : "outline"}>
          {row.claimedByUserId ? "Yes" : "Unclaimed"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/club/players/${row.id}`}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title="Players"
        description="Manage your club roster."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/club/players/import">
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/club/players/invite">
                <Mail className="h-4 w-4 mr-1" />
                Invite Player
              </Link>
            </Button>
            <Button asChild>
              <Link href="/club/players/new">
                <Plus className="h-4 w-4 mr-1" />
                Add Player
              </Link>
            </Button>
          </div>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="injured">Injured</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={players as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search players..."
          loading={loading}
          emptyMessage="No players found. Add players manually or import via CSV."
        />
      </DashboardShell>
    </AuthGuard>
  );
}
