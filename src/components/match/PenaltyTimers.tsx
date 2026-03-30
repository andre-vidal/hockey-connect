"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ActivePenalty, LiveMatchState } from "@/types";
import { formatMatchTime } from "@/lib/matchUtils";
import { X, AlertCircle } from "lucide-react";

interface PenaltyTimersProps {
  penalties: ActivePenalty[];
  matchState: LiveMatchState | null;
  isOfficial?: boolean;
  onRemove?: (penaltyId: string) => void;
  homeTeamName: string;
  awayTeamName: string;
}

function computeRemainingMs(penalty: ActivePenalty): number {
  const { totalDurationMs, elapsedMs, isRunning, startedAt } = penalty;
  const additional = isRunning && startedAt != null ? Date.now() - startedAt : 0;
  return Math.max(0, totalDurationMs - (elapsedMs + additional));
}

function PenaltyCard({
  penalty,
  isOfficial,
  onRemove,
  homeTeamName,
  awayTeamName,
}: {
  penalty: ActivePenalty;
  isOfficial?: boolean;
  onRemove?: (id: string) => void;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemainingMs(penalty));
  const isExpired = remainingMs <= 0;

  useEffect(() => {
    // Recalculate immediately when penalty prop changes
    setRemainingMs(computeRemainingMs(penalty));
  }, [penalty]);

  useEffect(() => {
    if (isExpired || !penalty.isRunning) return;

    const interval = setInterval(() => {
      const rem = computeRemainingMs(penalty);
      setRemainingMs(rem);
    }, 500);

    return () => clearInterval(interval);
  }, [penalty, isExpired]);

  const teamName = penalty.teamSide === "home" ? homeTeamName : awayTeamName;

  const cardColors = {
    green: {
      badge: "bg-green-500 text-white",
      border: isExpired ? "border-gray-300 bg-gray-50" : "border-green-300 bg-green-50",
      timer: isExpired ? "text-gray-400" : "text-green-700",
    },
    yellow: {
      badge: "bg-yellow-400 text-yellow-900",
      border: isExpired ? "border-gray-300 bg-gray-50" : "border-yellow-300 bg-yellow-50",
      timer: isExpired ? "text-gray-400" : "text-yellow-700",
    },
  };

  const colors = cardColors[penalty.cardType];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        colors.border,
        isExpired && "opacity-60"
      )}
    >
      {/* Card type badge */}
      <span
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded font-bold text-xs shrink-0",
          colors.badge
        )}
      >
        {penalty.cardType === "green" ? "G" : "Y"}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {penalty.playerJersey != null && (
            <span className="text-xs font-bold text-gray-500">#{penalty.playerJersey}</span>
          )}
          <span className="text-sm font-semibold text-gray-900 truncate">
            {penalty.playerName}
          </span>
        </div>
        <span className="text-xs text-gray-500 truncate block">{teamName}</span>
      </div>

      {/* Timer */}
      <div className="text-right shrink-0">
        {isExpired ? (
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            <Badge variant="destructive" className="text-xs">EXPIRED</Badge>
          </div>
        ) : (
          <span className={cn("font-mono font-bold text-lg tabular-nums", colors.timer)}>
            {formatMatchTime(remainingMs)}
          </span>
        )}
      </div>

      {/* Remove button */}
      {isOfficial && onRemove && (
        <button
          onClick={() => onRemove(penalty.id)}
          className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors shrink-0"
          title="Dismiss penalty"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function PenaltyTimers({
  penalties,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matchState,
  isOfficial,
  onRemove,
  homeTeamName,
  awayTeamName,
}: PenaltyTimersProps) {
  if (penalties.length === 0) {
    return null;
  }

  // Group by team side for display
  const homePenalties = penalties.filter((p) => p.teamSide === "home");
  const awayPenalties = penalties.filter((p) => p.teamSide === "away");

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Active Penalties ({penalties.length})
      </h4>
      <div
        className="space-y-2 overflow-y-auto"
        style={{ maxHeight: penalties.length > 4 ? "16rem" : undefined }}
      >
        {/* Home penalties first, then away */}
        {[...homePenalties, ...awayPenalties].map((penalty) => (
          <PenaltyCard
            key={penalty.id}
            penalty={penalty}
            isOfficial={isOfficial}
            onRemove={onRemove}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        ))}
      </div>
    </div>
  );
}
