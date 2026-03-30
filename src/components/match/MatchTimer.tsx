"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LiveMatchStatus, MatchIntervalConfig } from "@/types";
import { formatMatchTime, getIntervalLabel } from "@/lib/matchUtils";
import { Play, Pause } from "lucide-react";

interface MatchTimerProps {
  displayMs: number;
  stoppageMs: number;
  status: LiveMatchStatus;
  isRunning: boolean;
  isOfficial?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  matchConfig: MatchIntervalConfig;
  currentInterval: number;
}

export function MatchTimer({
  displayMs,
  stoppageMs,
  status,
  isRunning,
  isOfficial,
  onStart,
  onPause,
  matchConfig,
  currentInterval,
}: MatchTimerProps) {
  const isLive = status === "live" && isRunning;
  const isStopped = status === "stoppage";
  const isBreak = status === "interval_break";
  const isCompleted = status === "completed";
  const isWarmup = status === "warmup";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Interval label */}
      <div className="flex items-center gap-2">
        {isLive && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
        <span
          className={cn(
            "text-sm font-semibold uppercase tracking-wider",
            isLive ? "text-green-600" :
            isStopped ? "text-orange-600" :
            isBreak ? "text-blue-600" :
            isCompleted ? "text-gray-500" :
            "text-gray-600"
          )}
        >
          {isWarmup
            ? "Warmup"
            : isBreak
            ? matchConfig.numberOfIntervals === 2 ? "Half Time" : "Break"
            : isCompleted
            ? "Full Time"
            : isStopped
            ? "Stoppage"
            : getIntervalLabel(currentInterval, matchConfig.numberOfIntervals)}
        </span>
      </div>

      {/* Main timer */}
      <div
        className={cn(
          "font-mono font-black tabular-nums leading-none",
          isStopped ? "text-orange-500" : isCompleted ? "text-gray-400" : "text-gray-900",
          "text-7xl sm:text-8xl"
        )}
      >
        {formatMatchTime(displayMs)}
      </div>

      {/* Stoppage time */}
      {isStopped && stoppageMs > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-orange-500 font-mono font-semibold text-2xl sm:text-3xl">
            +{formatMatchTime(stoppageMs)}
          </span>
          <span className="text-orange-400 text-sm">stoppage</span>
        </div>
      )}

      {/* Interval duration hint */}
      {!isCompleted && !isBreak && (
        <span className="text-xs text-gray-400">
          {matchConfig.intervalDuration} min {getIntervalLabel(currentInterval, matchConfig.numberOfIntervals)}
        </span>
      )}

      {/* Official controls */}
      {isOfficial && !isCompleted && (
        <div className="mt-1">
          {isRunning ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onPause}
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Pause className="h-5 w-5" />
              Pause
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onStart}
              disabled={isBreak || isWarmup}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-5 w-5" />
              {status === "stoppage" ? "Resume" : "Start"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
