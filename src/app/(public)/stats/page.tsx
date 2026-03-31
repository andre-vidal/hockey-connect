"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { LeagueStandingsTable } from "@/components/stats/LeagueStandingsTable";
import { PlayerLeaderboard } from "@/components/stats/PlayerLeaderboard";
import type { LeaderboardPlayer, LeaderboardStat } from "@/components/stats/PlayerLeaderboard";
import { STAT_LABELS } from "@/components/stats/PlayerLeaderboard";
import { League, LeagueStanding } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "standings" | "scorers" | "leaderboards";

const LEADERBOARD_STATS: LeaderboardStat[] = [
  "goals", "assists", "penaltyCorners", "saves", "tackles",
];

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("standings");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data) => {
        const list: League[] = data.leagues ?? [];
        setLeagues(list);
        if (list.length > 0) setSelectedLeague(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;
    setLoadingStandings(true);
    fetch(`/api/standings?leagueId=${selectedLeague}`)
      .then((r) => r.json())
      .then((data) => setStandings(data.standings ?? []))
      .catch(() => {})
      .finally(() => setLoadingStandings(false));
  }, [selectedLeague]);

  useEffect(() => {
    if (tab !== "scorers" && tab !== "leaderboards") return;
    setLoadingPlayers(true);
    const url = selectedLeague
      ? `/api/stats/players?leagueId=${selectedLeague}&limit=20`
      : `/api/stats/players?limit=20`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setPlayers(data.players ?? []))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false));
  }, [tab, selectedLeague]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Statistics" description="League tables, player stats, and leaderboards">
          {/* League selector */}
          {leagues.length > 1 && (
            <div className="mb-4">
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {(["standings", "scorers", "leaderboards"] as Tab[]).map((t) => (
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

          {tab === "standings" && (
            <div>
              {loadingStandings ? (
                <p className="text-sm text-gray-400">Loading standings…</p>
              ) : (
                <LeagueStandingsTable standings={standings} />
              )}
            </div>
          )}

          {tab === "scorers" && (
            <div className="max-w-lg">
              {loadingPlayers ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <PlayerLeaderboard
                  players={players}
                  stat="goals"
                  title="Top Goal Scorers"
                />
              )}
            </div>
          )}

          {tab === "leaderboards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingPlayers ? (
                <p className="text-sm text-gray-400 col-span-3">Loading…</p>
              ) : (
                LEADERBOARD_STATS.map((stat) => (
                  <div key={stat} className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">{STAT_LABELS[stat]}</h3>
                    <PlayerLeaderboard players={players} stat={stat} limit={5} />
                  </div>
                ))
              )}
            </div>
          )}
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
