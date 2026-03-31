"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { League } from "@/types";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data) => setLeagues(data.leagues ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Leagues" description="Browse all active leagues and competitions">
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {!loading && leagues.length === 0 && (
            <p className="text-sm text-gray-500">No leagues available.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{league.name}</h3>
                  <Badge variant={league.status === "active" ? "success" : "secondary"}>
                    {league.status}
                  </Badge>
                </div>
                {league.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{league.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span>{league.country}</span>
                  {league.division && <span>· {league.division}</span>}
                  <span>· {league.gender}</span>
                  {league.season?.currentSeason && <span>· {league.season.currentSeason}</span>}
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
