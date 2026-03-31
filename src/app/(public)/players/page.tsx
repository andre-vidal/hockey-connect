"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Player } from "@/types";
import { Search } from "lucide-react";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/players?limit=50")
      .then((r) => r.json())
      .then((data) => setPlayers(data.players ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!query) {
      fetch("/api/players?limit=50")
        .then((r) => r.json())
        .then((data) => setPlayers(data.players ?? []))
        .catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/players?q=${encodeURIComponent(query)}&limit=50`)
        .then((r) => r.json())
        .then((data) => setPlayers(data.players ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const positionVariant: Record<string, "secondary" | "outline"> = {
    goalkeeper: "secondary",
    default: "outline",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Players" description="Browse player profiles and stats">
          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {(loading || searching) && <p className="text-sm text-gray-400">Loading…</p>}

          {!loading && !searching && players.length === 0 && (
            <p className="text-sm text-gray-500">No players found.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.map((player) => (
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
                      <Badge variant={positionVariant[player.position] ?? "outline"} className="text-xs">
                        {player.position}
                      </Badge>
                    )}
                    {player.jerseyNumber && (
                      <span className="text-xs text-gray-400">#{player.jerseyNumber}</span>
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
