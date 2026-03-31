"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchStatsView } from "@/components/stats/MatchStatsView";
import { Badge } from "@/components/ui/badge";
import { Match, MatchStats, MatchStatus } from "@/types";
import { ArrowLeft, Calendar, MapPin, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
}

export default function MatchResultPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${matchId}`).then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      }),
      fetch(`/api/matches/${matchId}/stats`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([matchData, statsData]) => {
        if (matchData) setMatch(matchData.match ?? null);
        if (statsData) setStats(statsData.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-3">Match not found.</p>
            <Link href="/matches" className="text-sm text-primary-600 hover:underline">Back to matches</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isLive = match.status === "live" || match.status === "warmup";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell
          title="Match"
          description={formatDateTime(match.scheduledAt)}
          actions={
            <Link href="/matches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              All Matches
            </Link>
          }
        >
          {/* Score card */}
          <div className="bg-gray-900 rounded-xl text-white p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={statusVariant[match.status]} className="capitalize">
                {isLive && <Radio className="h-3 w-3 mr-1 animate-pulse" />}
                {match.status}
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-12">
              <div className="text-center flex-1">
                <p className="text-sm text-gray-400 mb-1">Home</p>
                <p className="font-bold text-lg sm:text-xl leading-tight">{match.homeTeamName}</p>
              </div>

              <div className="text-center shrink-0">
                {match.result ? (
                  <p className="font-mono font-bold text-4xl sm:text-5xl tracking-tighter">
                    <span className={cn(match.result.homeScore > match.result.awayScore ? "text-white" : "text-gray-400")}>
                      {match.result.homeScore}
                    </span>
                    <span className="text-gray-600 mx-1">–</span>
                    <span className={cn(match.result.awayScore > match.result.homeScore ? "text-white" : "text-gray-400")}>
                      {match.result.awayScore}
                    </span>
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-gray-500">vs</p>
                )}
              </div>

              <div className="text-center flex-1">
                <p className="text-sm text-gray-400 mb-1">Away</p>
                <p className="font-bold text-lg sm:text-xl leading-tight">{match.awayTeamName}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateTime(match.scheduledAt)}
              </span>
            </div>
          </div>

          {/* Live view link */}
          {isLive && (
            <div className="mb-4">
              <Link
                href={`/matches/${matchId}/live`}
                className="inline-flex items-center gap-2 text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-4 py-2 hover:bg-green-100 transition-colors"
              >
                <Radio className="h-4 w-4 animate-pulse" />
                Watch Live
              </Link>
            </div>
          )}

          {/* Match stats */}
          {stats ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5 max-w-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Match Statistics</h3>
              <MatchStatsView stats={stats} match={match} />
            </div>
          ) : (
            (match.status === "completed" || match.status === "confirmed") && (
              <p className="text-sm text-gray-400">Statistics not yet available.</p>
            )
          )}
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
