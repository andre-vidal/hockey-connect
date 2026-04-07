"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Player, Club, Position } from "@/types";
import { Search } from "lucide-react";

const POSITIONS: Position[] = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
  "utility",
];

const positionVariant: Record<string, "secondary" | "outline"> = {
  goalkeeper: "secondary",
  default: "outline",
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [query, setQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");

  // Fetch clubs once for the dropdown
  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => {});
  }, []);

  // Fetch players whenever club or name query changes
  useEffect(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (clubFilter && clubFilter !== "__unassigned__") params.set("clubId", clubFilter);
    if (query) params.set("q", query);

    const doFetch = () => {
      setSearching(true);
      fetch(`/api/players?${params}`)
        .then((r) => r.json())
        .then((data) => setPlayers(data.players ?? []))
        .catch(() => {})
        .finally(() => {
          setSearching(false);
          setLoading(false);
        });
    };

    if (query) {
      const timer = setTimeout(doFetch, 300);
      return () => clearTimeout(timer);
    } else {
      doFetch();
    }
  }, [query, clubFilter]);

  // Club (unassigned) and position filters are applied client-side
  const filtered = useMemo(() => {
    let result = players;
    if (clubFilter === "__unassigned__") result = result.filter((p) => !p.clubId);
    if (positionFilter) result = result.filter((p) => p.position === positionFilter);
    return result;
  }, [players, clubFilter, positionFilter]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Players" description="Browse player profiles and stats">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Name search */}
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Club filter */}
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All clubs</option>
              <option value="__unassigned__">Unassigned</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Position filter */}
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All positions</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {(loading || searching) && (
            <p className="text-sm text-gray-400">Loading…</p>
          )}

          {!loading && !searching && filtered.length === 0 && (
            <p className="text-sm text-gray-500">No players found.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-400 hover:shadow-sm transition-all"
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {player.firstName[0]}{player.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {player.firstName} {player.lastName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {player.position && (
                      <Badge
                        variant={positionVariant[player.position] ?? "outline"}
                        className="text-xs"
                      >
                        {player.position}
                      </Badge>
                    )}
                    {player.jerseyNumber && (
                      <span className="text-xs text-gray-400">
                        #{player.jerseyNumber}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
