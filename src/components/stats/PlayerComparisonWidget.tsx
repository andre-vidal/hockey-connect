"use client";

import { useState } from "react";
import { PlayerSeasonStats } from "@/types";
import { cn } from "@/lib/utils";

type StatKey = keyof Omit<PlayerSeasonStats, "playerId" | "playerName" | "teamId" | "teamName" | "clubId" | "clubName" | "leagueId">;

const COMPARE_STATS: { key: StatKey; label: string }[] = [
  { key: "matchesPlayed", label: "Matches" },
  { key: "goals", label: "Goals" },
  { key: "assists", label: "Assists" },
  { key: "penaltyCorners", label: "Penalty Corners" },
  { key: "penaltyStrokes", label: "Penalty Strokes" },
  { key: "shotsOnGoal", label: "Shots on Goal" },
  { key: "saves", label: "Saves" },
  { key: "tackles", label: "Tackles" },
  { key: "interceptions", label: "Interceptions" },
  { key: "yellowCards", label: "Yellow Cards" },
  { key: "redCards", label: "Red Cards" },
  { key: "minutesPlayed", label: "Minutes Played" },
];

interface Props {
  playerA: PlayerSeasonStats;
  playerB?: PlayerSeasonStats | null;
}

export function PlayerComparisonWidget({ playerA, playerB }: Props) {
  const [showComparison] = useState(!!playerB);

  if (!showComparison || !playerB) {
    return (
      <div className="grid grid-cols-1 gap-3">
        {COMPARE_STATS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-900">{playerA[key]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="grid grid-cols-3 text-sm font-semibold pb-2 border-b border-gray-200">
        <span className="text-primary-600 truncate">{playerA.playerName}</span>
        <span className="text-center text-xs text-gray-400 uppercase tracking-wide">Stat</span>
        <span className="text-blue-600 text-right truncate">{playerB.playerName}</span>
      </div>

      {COMPARE_STATS.map(({ key, label }) => {
        const aVal = playerA[key] as number;
        const bVal = playerB[key] as number;
        return (
          <div key={key} className="grid grid-cols-3 items-center py-2 border-b border-gray-100 last:border-0">
            <span
              className={cn(
                "text-sm font-bold",
                aVal > bVal ? "text-primary-600" : aVal < bVal ? "text-gray-400" : "text-gray-700"
              )}
            >
              {aVal}
            </span>
            <span className="text-xs text-gray-500 text-center">{label}</span>
            <span
              className={cn(
                "text-sm font-bold text-right",
                bVal > aVal ? "text-blue-600" : bVal < aVal ? "text-gray-400" : "text-gray-700"
              )}
            >
              {bVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}
