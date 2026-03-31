"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LeagueStandingsTable } from "@/components/stats/LeagueStandingsTable";
import { PlayerLeaderboard } from "@/components/stats/PlayerLeaderboard";
import type { LeaderboardPlayer } from "@/components/stats/PlayerLeaderboard";
import { Badge } from "@/components/ui/badge";
import { League, LeagueStanding, Match } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";

type Tab = "standings" | "results" | "scorers";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [tab, setTab] = useState<Tab>("standings");
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/leagues/${leagueId}`).then((r) => r.json()),
      fetch(`/api/standings?leagueId=${leagueId}`).then((r) => r.json()),
      fetch(`/api/matches`).then((r) => r.json()),
    ])
      .then(([leagueData, standingsData, matchesData]) => {
        setLeague(leagueData.league ?? null);
        setStandings(standingsData.standings ?? []);
        const all: Match[] = matchesData.matches ?? [];
        setMatches(
          all
            .filter((m) => m.leagueId === leagueId)
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => {
    if (tab !== "scorers") return;
    fetch(`/api/stats/players?leagueId=${leagueId}&limit=20`)
      .then((r) => r.json())
      .then((data) => setPlayers(data.players ?? []))
      .catch(() => {});
  }, [tab, leagueId]);

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

  if (!league) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">League not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const completedMatches = matches.filter((m) => m.status === "confirmed" || m.status === "completed");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell
          title={league.name}
          description={[league.country, league.division, league.season?.currentSeason].filter(Boolean).join(" · ")}
          actions={
            <Link href="/leagues" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              All Leagues
            </Link>
          }
        >
          {/* League meta */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant={league.status === "active" ? "success" : "secondary"}>{league.status}</Badge>
            <Badge variant="outline">{league.gender}</Badge>
            {league.ageGroup && <Badge variant="outline">{league.ageGroup}</Badge>}
            <Badge variant="outline">
              {league.matchConfig.numberOfIntervals}×{league.matchConfig.intervalDuration}min
            </Badge>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {(["standings", "results", "scorers"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
                  tab === t
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {t === "scorers" ? "Top Scorers" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "standings" && <LeagueStandingsTable standings={standings} />}

          {tab === "results" && (
            <div className="space-y-2">
              {completedMatches.length === 0 && (
                <p className="text-sm text-gray-500">No completed matches yet.</p>
              )}
              {completedMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-400 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 flex items-center gap-1 w-24 shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(m.scheduledAt)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{m.homeTeamName}</span>
                      <span className="mx-2 text-gray-400">vs</span>
                      <span className="font-medium">{m.awayTeamName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.result && (
                      <span className="font-mono font-bold text-sm">
                        {m.result.homeScore} – {m.result.awayScore}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {m.venue}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tab === "scorers" && (
            <div className="max-w-lg">
              <PlayerLeaderboard players={players} stat="goals" title="Top Goal Scorers" />
            </div>
          )}
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
