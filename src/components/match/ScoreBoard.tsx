"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LiveMatchStatus, MatchIntervalConfig } from "@/types";
import { getIntervalLabel } from "@/lib/matchUtils";

interface ScoreBoardProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: LiveMatchStatus;
  currentInterval: number;
  matchConfig: MatchIntervalConfig;
  isReadOnly?: boolean;
}

function StatusBadge({ status, currentInterval, matchConfig }: {
  status: LiveMatchStatus;
  currentInterval: number;
  matchConfig: MatchIntervalConfig;
}) {
  const { numberOfIntervals } = matchConfig;

  if (status === "warmup") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm px-3 py-1">
        WARMUP
      </Badge>
    );
  }

  if (status === "live") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <Badge className="bg-green-100 text-green-800 border-green-200 text-sm px-3 py-1">
          LIVE &middot; {getIntervalLabel(currentInterval, numberOfIntervals)}
        </Badge>
      </div>
    );
  }

  if (status === "stoppage") {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-sm px-3 py-1">
        STOPPAGE
      </Badge>
    );
  }

  if (status === "interval_break") {
    const isHalfTime = numberOfIntervals === 2 || currentInterval === Math.ceil(numberOfIntervals / 2);
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1">
        {isHalfTime && numberOfIntervals === 2 ? "HT" : "INTERVAL"}
      </Badge>
    );
  }

  if (status === "completed") {
    return (
      <Badge variant="secondary" className="text-sm px-3 py-1">
        COMPLETED
      </Badge>
    );
  }

  return null;
}

export function ScoreBoard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  status,
  currentInterval,
  matchConfig,
}: ScoreBoardProps) {
  return (
    <div className="w-full bg-gray-900 text-white rounded-xl px-4 py-6 sm:py-8">
      {/* Status row */}
      <div className="flex justify-center mb-4">
        <StatusBadge status={status} currentInterval={currentInterval} matchConfig={matchConfig} />
      </div>

      {/* Score row */}
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Home team */}
        <div className="flex-1 text-center min-w-0">
          <p
            className="text-sm sm:text-base font-medium text-gray-300 truncate"
            title={homeTeamName}
          >
            {homeTeamName}
          </p>
          <p className="text-6xl sm:text-8xl font-black tabular-nums leading-none mt-1">
            {homeScore}
          </p>
        </div>

        {/* Separator */}
        <div className="flex flex-col items-center shrink-0">
          <span className="text-4xl sm:text-6xl font-light text-gray-500 leading-none">:</span>
        </div>

        {/* Away team */}
        <div className="flex-1 text-center min-w-0">
          <p
            className="text-sm sm:text-base font-medium text-gray-300 truncate"
            title={awayTeamName}
          >
            {awayTeamName}
          </p>
          <p className="text-6xl sm:text-8xl font-black tabular-nums leading-none mt-1">
            {awayScore}
          </p>
        </div>
      </div>

      {/* Interval label */}
      <div className="flex justify-center mt-4">
        <span
          className={cn(
            "text-xs sm:text-sm font-medium",
            status === "completed" ? "text-gray-500" : "text-gray-400"
          )}
        >
          {status === "completed"
            ? "Full Time"
            : status === "interval_break"
            ? matchConfig.numberOfIntervals === 2
              ? "Half Time"
              : `After ${getIntervalLabel(currentInterval, matchConfig.numberOfIntervals)}`
            : status === "warmup"
            ? "Pre-Match"
            : getIntervalLabel(currentInterval, matchConfig.numberOfIntervals)}
        </span>
      </div>
    </div>
  );
}
