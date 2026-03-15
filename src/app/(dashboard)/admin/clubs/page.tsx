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
import { Club } from "@/types";
import { Plus, Pencil } from "lucide-react";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

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
      header: "Active",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "isArchived",
      header: "Archived",
      cell: (row) => (
        row.isArchived ? <Badge variant="outline">Archived</Badge> : null
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/clubs/${row.id}`}>
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
    </AuthGuard>
  );
}
