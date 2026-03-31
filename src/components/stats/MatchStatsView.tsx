"use client";

import { MatchStats, Match } from "@/types";
import { cn } from "@/lib/utils";

interface StatRowProps {
  label: string;
  home: number;
  away: number;
}

function StatRow({ label, home, away }: StatRowProps) {
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  const awayPct = 100 - homePct;

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-semibold text-gray-900 w-8 text-left">{home}</span>
        <span className="text-xs text-gray-500 flex-1 text-center">{label}</span>
        <span className="font-semibold text-gray-900 w-8 text-right">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div
          className="bg-primary-500 transition-all"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-blue-400 transition-all"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  stats: MatchStats;
  match?: Match;
}

export function MatchStatsView({ stats, match }: Props) {
  const h = stats.homeTeamStats;
  const a = stats.awayTeamStats;

  const homeLabel = match?.homeTeamName ?? "Home";
  const awayLabel = match?.awayTeamName ?? "Away";

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200">
        <span className={cn("text-primary-600")}>{homeLabel}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Team Stats</span>
        <span className="text-blue-600">{awayLabel}</span>
      </div>

      <StatRow label="Goals" home={h.goals} away={a.goals} />
      <StatRow label="Penalty Corners" home={h.penaltyCorners} away={a.penaltyCorners} />
      <StatRow label="Penalty Strokes" home={h.penaltyStrokes} away={a.penaltyStrokes} />
      <StatRow label="Shots on Goal" home={h.shotsOnGoal} away={a.shotsOnGoal} />
      <StatRow label="Shots off Goal" home={h.shotsOffGoal} away={a.shotsOffGoal} />
      <StatRow label="Circle Entries" home={h.circleEntries} away={a.circleEntries} />
      <StatRow label="Free Hits" home={h.freeHits} away={a.freeHits} />
      <StatRow label="Long Corners" home={h.longCorners} away={a.longCorners} />
      <StatRow label="Turnovers" home={h.turnovers} away={a.turnovers} />
      <StatRow label="Green Cards" home={h.greenCards} away={a.greenCards} />
      <StatRow label="Yellow Cards" home={h.yellowCards} away={a.yellowCards} />
      <StatRow label="Red Cards" home={h.redCards} away={a.redCards} />
    </div>
  );
}
