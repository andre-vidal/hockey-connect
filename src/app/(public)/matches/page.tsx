"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Match, MatchStatus } from "@/types";
import { Calendar, MapPin } from "lucide-react";

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PublicMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Match & Record<string, unknown>>[] = [
    {
      key: "scheduledAt",
      header: "Date & Time",
      sortable: true,
      cell: (row) => (
        <span className="flex items-center gap-1 whitespace-nowrap text-sm">
          <Calendar className="h-3 w-3 text-gray-400" />
          {formatDateTime(row.scheduledAt as string)}
        </span>
      ),
    },
    {
      key: "homeTeamName",
      header: "Match",
      cell: (row) => (
        <span className="font-medium">
          {row.homeTeamName as string} <span className="text-gray-400 font-normal">vs</span> {row.awayTeamName as string}
        </span>
      ),
    },
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <span className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-gray-400" />
          {row.venue as string}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={statusVariant[row.status as MatchStatus]}>
          <span className="capitalize">{row.status as string}</span>
        </Badge>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (row) => {
        const result = row.result as { homeScore: number; awayScore: number } | null;
        if (!result) return <span className="text-gray-400 text-sm">—</span>;
        return (
          <span className="font-mono font-semibold text-sm">
            {result.homeScore} – {result.awayScore}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Matches" description="Upcoming and recent matches">
          <DataTable
            columns={columns as Column<Record<string, unknown>>[]}
            data={matches as unknown as Record<string, unknown>[]}
            searchable
            searchPlaceholder="Search matches..."
            loading={loading}
            emptyMessage="No matches scheduled yet."
          />
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
