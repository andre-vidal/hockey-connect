"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type LeaderboardStat =
  | "goals"
  | "assists"
  | "penaltyCorners"
  | "penaltyStrokes"
  | "saves"
  | "tackles"
  | "interceptions"
  | "yellowCards"
  | "redCards";

const STAT_LABELS: Record<LeaderboardStat, string> = {
  goals: "Goals",
  assists: "Assists",
  penaltyCorners: "Penalty Corners",
  penaltyStrokes: "Penalty Strokes",
  saves: "Saves",
  tackles: "Tackles",
  interceptions: "Interceptions",
  yellowCards: "Yellow Cards",
  redCards: "Red Cards",
};

export interface LeaderboardPlayer {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName?: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  penaltyCorners: number;
  penaltyStrokes: number;
  saves: number;
  tackles: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
}

interface Props {
  players: LeaderboardPlayer[];
  stat: LeaderboardStat;
  title?: string;
  limit?: number;
}

export function PlayerLeaderboard({ players, stat, title, limit = 10 }: Props) {
  const rows = players.slice(0, limit);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No data yet.</p>;
  }

  const maxVal = rows[0]?.[stat] ?? 1;

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>}
      <div className="space-y-1">
        {rows.map((player, i) => {
          const val = player[stat] as number;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={player.playerId} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/players/${player.playerId}`}
                  className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
                >
                  {player.playerName}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold w-6 text-right",
                      i === 0 ? "text-primary-600" : "text-gray-700"
                    )}
                  >
                    {val}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STAT_LABELS };
