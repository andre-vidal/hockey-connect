"use client";

import { useEffect, useState } from "react";
import type { LiveMatchState } from "@/types";

interface UseTimerResult {
  displayMs: number;
  stoppageMs: number;
}

export function useTimer(state: LiveMatchState | null): UseTimerResult {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!state?.isRunning && state?.status !== "stoppage") return;

    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [state?.isRunning, state?.status]);

  if (!state) return { displayMs: 0, stoppageMs: 0 };

  const now = Date.now();
  // Suppress unused-variable warning for tick — it exists only to trigger re-renders
  void tick;

  let displayMs = state.intervalElapsedMs;
  if (state.isRunning && state.intervalStartedAt !== null) {
    displayMs += now - state.intervalStartedAt;
  }

  let stoppageMs = 0;
  if (state.status === "stoppage" && state.stoppageStartedAt !== null) {
    stoppageMs = now - state.stoppageStartedAt;
  }

  return { displayMs, stoppageMs };
}
