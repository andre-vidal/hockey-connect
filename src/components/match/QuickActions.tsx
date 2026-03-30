"use client";

import { cn } from "@/lib/utils";
import { LiveMatchState, MatchIntervalConfig } from "@/types";
import {
  Target,
  Square,
  Flag,
  Zap,
  Clock,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface QuickActionsProps {
  matchState: LiveMatchState;
  matchConfig: MatchIntervalConfig;
  onAction: (action: string, data?: Record<string, unknown>) => void;
  disabled?: boolean;
}

interface ActionButton {
  action: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  data?: Record<string, unknown>;
}

export function QuickActions({ matchState, matchConfig, onAction, disabled }: QuickActionsProps) {
  const { status, currentInterval } = matchState;
  const { numberOfIntervals } = matchConfig;
  const isLastInterval = currentInterval >= numberOfIntervals;

  const isLiveOrStoppage = status === "live" || status === "stoppage";
  const isIntervalBreak = status === "interval_break";
  const isWarmup = status === "warmup";

  const coreActions: ActionButton[] = [
    {
      action: "goal",
      label: "Goal",
      icon: <Target className="h-6 w-6" />,
      colorClass: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 active:bg-green-200",
    },
    {
      action: "yellow_card",
      label: "Yellow Card",
      icon: <Square className="h-6 w-6 fill-yellow-400 text-yellow-500" />,
      colorClass: "bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100 active:bg-yellow-200",
    },
    {
      action: "green_card",
      label: "Green Card",
      icon: <Square className="h-6 w-6 fill-green-400 text-green-500" />,
      colorClass: "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-200",
    },
    {
      action: "red_card",
      label: "Red Card",
      icon: <Square className="h-6 w-6 fill-red-500 text-red-600" />,
      colorClass: "bg-red-50 border-red-200 text-red-800 hover:bg-red-100 active:bg-red-200",
    },
    {
      action: "penalty_corner",
      label: "Penalty Corner",
      icon: <Flag className="h-6 w-6" />,
      colorClass: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 active:bg-blue-200",
    },
    {
      action: "penalty_stroke",
      label: "Penalty Stroke",
      icon: <Zap className="h-6 w-6" />,
      colorClass: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 active:bg-purple-200",
    },
  ];

  const stoppageAction: ActionButton =
    status === "stoppage"
      ? {
          action: "stoppage_end",
          label: "End Stoppage",
          icon: <AlertTriangle className="h-6 w-6" />,
          colorClass: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 active:bg-orange-200",
        }
      : {
          action: "stoppage_start",
          label: "Stoppage",
          icon: <Clock className="h-6 w-6" />,
          colorClass: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 active:bg-orange-200",
        };

  const substitutionAction: ActionButton = {
    action: "substitution",
    label: "Substitution",
    icon: <RefreshCw className="h-6 w-6" />,
    colorClass: "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100 active:bg-gray-200",
  };

  // Interval/match control actions
  const intervalAction: ActionButton | null = isLiveOrStoppage
    ? {
        action: "interval_end",
        label: isLastInterval ? "End Match" : "End Interval",
        icon: isLastInterval
          ? <CheckCircle className="h-6 w-6" />
          : <ChevronRight className="h-6 w-6" />,
        colorClass: isLastInterval
          ? "bg-gray-800 border-gray-900 text-white hover:bg-gray-700 active:bg-gray-900"
          : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 active:bg-gray-300",
      }
    : null;

  const nextIntervalAction: ActionButton | null = isIntervalBreak
    ? isLastInterval
      ? {
          action: "match_end",
          label: "End Match",
          icon: <CheckCircle className="h-6 w-6" />,
          colorClass: "bg-gray-800 border-gray-900 text-white hover:bg-gray-700 active:bg-gray-900",
        }
      : {
          action: "next_interval",
          label: "Start Next Interval",
          icon: <ChevronRight className="h-6 w-6" />,
          colorClass: "bg-primary-600 border-primary-700 text-white hover:bg-primary-700 active:bg-primary-800",
        }
    : null;

  const warmupStartAction: ActionButton | null = isWarmup
    ? {
        action: "start_match",
        label: "Start Match",
        icon: <ChevronRight className="h-6 w-6" />,
        colorClass: "bg-primary-600 border-primary-700 text-white hover:bg-primary-700 active:bg-primary-800",
      }
    : null;

  const allActions: ActionButton[] = [
    ...(isLiveOrStoppage ? coreActions : []),
    ...(isLiveOrStoppage ? [stoppageAction, substitutionAction] : []),
    ...(intervalAction ? [intervalAction] : []),
    ...(nextIntervalAction ? [nextIntervalAction] : []),
    ...(warmupStartAction ? [warmupStartAction] : []),
  ];

  if (allActions.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-4">
        No actions available in current match state.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {allActions.map((btn) => (
        <button
          key={btn.action}
          disabled={disabled}
          onClick={() => onAction(btn.action, btn.data)}
          className={cn(
            "flex flex-col items-center justify-center gap-2 h-20 sm:h-24 rounded-xl border-2 font-semibold text-sm transition-colors select-none touch-manipulation",
            btn.colorClass,
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          {btn.icon}
          <span className="text-xs sm:text-sm leading-tight text-center">{btn.label}</span>
        </button>
      ))}
    </div>
  );
}
