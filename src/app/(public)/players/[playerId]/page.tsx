"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PlayerComparisonWidget } from "@/components/stats/PlayerComparisonWidget";
import { Badge } from "@/components/ui/badge";
import { Player, PlayerSeasonStats } from "@/types";
import { ArrowLeft, Trophy, Target, Shield } from "lucide-react";

interface PlayerProfileData {
  player: Player;
  seasonStats: PlayerSeasonStats;
  matchHistory: Array<{
    matchId: string;
    goals: number;
    assists: number;
    penaltyCorners: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed: number;
  }>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon?: React.ElementType }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      {Icon && <Icon className="h-5 w-5 text-primary-500 mx-auto mb-1" />}
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [data, setData] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setData({
            player: d.player,
            seasonStats: { ...d.seasonStats, playerId, playerName: `${d.player.firstName} ${d.player.lastName}`, teamId: "" },
            matchHistory: d.matchHistory ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId]);

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

  if (notFound || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-3">Player not found.</p>
            <Link href="/players" className="text-sm text-primary-600 hover:underline">Back to players</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { player, seasonStats, matchHistory } = data;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell
          title={`${player.firstName} ${player.lastName}`}
          description={[player.position, player.jerseyNumber ? `#${player.jerseyNumber}` : null].filter(Boolean).join(" · ")}
          actions={
            <Link href="/players" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              All Players
            </Link>
          }
        >
          {/* Player header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl shrink-0">
              {player.firstName[0]}{player.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap gap-2 mt-1">
                {player.position && <Badge variant="outline">{player.position}</Badge>}
                <Badge variant={player.status === "active" ? "success" : "secondary"}>{player.status}</Badge>
                {player.nationality && <Badge variant="outline">{player.nationality}</Badge>}
                {player.gender && <Badge variant="outline">{player.gender}</Badge>}
              </div>
            </div>
          </div>

          {/* Highlight stats */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Matches" value={seasonStats.matchesPlayed} />
            <StatCard label="Goals" value={seasonStats.goals} icon={Trophy} />
            <StatCard label="Assists" value={seasonStats.assists} icon={Target} />
            <StatCard label="Cards" value={seasonStats.greenCards + seasonStats.yellowCards + seasonStats.redCards} icon={Shield} />
          </div>

          {/* Full season stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Season Statistics</h3>
              <PlayerComparisonWidget playerA={seasonStats} />
            </div>

            {/* Match history */}
            {matchHistory.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Match History</h3>
                <div className="space-y-2">
                  {matchHistory.slice(0, 10).map((mh) => (
                    <Link
                      key={mh.matchId}
                      href={`/matches/${mh.matchId}`}
                      className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded"
                    >
                      <span className="text-xs text-gray-500 font-mono truncate w-28">{mh.matchId.slice(0, 8)}…</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-700">{mh.goals}G {mh.assists}A</span>
                        {mh.yellowCards > 0 && (
                          <span className="inline-block w-3 h-4 bg-yellow-400 rounded-sm" title="Yellow card" />
                        )}
                        {mh.redCards > 0 && (
                          <span className="inline-block w-3 h-4 bg-red-500 rounded-sm" title="Red card" />
                        )}
                        <span className="text-gray-400">{mh.minutesPlayed}m</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
