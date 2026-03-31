"use client";

import { LeagueStanding } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  standings: LeagueStanding[];
  highlightTeamId?: string;
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-500 text-white",
    D: "bg-yellow-400 text-white",
    L: "bg-red-500 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
        colors[result] ?? "bg-gray-200 text-gray-500"
      )}
    >
      {result}
    </span>
  );
}

export function LeagueStandingsTable({ standings, highlightTeamId }: Props) {
  if (standings.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No standings data yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 font-medium w-8">#</th>
            <th className="text-left px-3 py-2 text-gray-500 font-medium">Team</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-10">P</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-10">W</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-10">D</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-10">L</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-12">GF</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-12">GA</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium w-12">GD</th>
            <th className="text-center px-2 py-2 text-gray-700 font-bold w-10">Pts</th>
            <th className="text-center px-2 py-2 text-gray-500 font-medium hidden sm:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-gray-100 last:border-0",
                row.teamId === highlightTeamId
                  ? "bg-primary-50 font-semibold"
                  : "hover:bg-gray-50"
              )}
            >
              <td className="px-3 py-2 text-gray-400 text-center">{i + 1}</td>
              <td className="px-3 py-2">
                <span className="font-medium text-gray-900">{row.teamName ?? row.teamId}</span>
                {row.clubName && (
                  <span className="ml-1 text-xs text-gray-400">({row.clubName})</span>
                )}
              </td>
              <td className="px-2 py-2 text-center text-gray-700">{row.played}</td>
              <td className="px-2 py-2 text-center text-green-700">{row.won}</td>
              <td className="px-2 py-2 text-center text-yellow-600">{row.drawn}</td>
              <td className="px-2 py-2 text-center text-red-600">{row.lost}</td>
              <td className="px-2 py-2 text-center text-gray-700">{row.goalsFor}</td>
              <td className="px-2 py-2 text-center text-gray-700">{row.goalsAgainst}</td>
              <td
                className={cn(
                  "px-2 py-2 text-center font-medium",
                  row.goalDifference > 0
                    ? "text-green-700"
                    : row.goalDifference < 0
                    ? "text-red-600"
                    : "text-gray-500"
                )}
              >
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="px-2 py-2 text-center font-bold text-gray-900">{row.points}</td>
              <td className="px-2 py-2 text-center hidden sm:table-cell">
                <span className="flex gap-0.5 justify-center">
                  {(row.form ?? []).slice(-5).map((r, j) => (
                    <FormBadge key={j} result={r} />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
