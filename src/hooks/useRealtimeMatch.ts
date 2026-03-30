"use client";

import { useEffect, useState } from "react";
import { ref, onValue, off, rtdb } from "@/lib/firebase/rtdb";
import type { LiveMatchState, LiveMatchEvent, ActivePenalty } from "@/types";

interface UseRealtimeMatchResult {
  state: LiveMatchState | null;
  events: LiveMatchEvent[];
  activePenalties: ActivePenalty[];
  loading: boolean;
}

export function useRealtimeMatch(matchId: string): UseRealtimeMatchResult {
  const [state, setState] = useState<LiveMatchState | null>(null);
  const [events, setEvents] = useState<LiveMatchEvent[]>([]);
  const [activePenalties, setActivePenalties] = useState<ActivePenalty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    const matchRef = ref(rtdb, `/liveMatches/${matchId}`);

    onValue(matchRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setState(null);
        setEvents([]);
        setActivePenalties([]);
        setLoading(false);
        return;
      }

      // State
      setState(data.state ?? null);

      // Events: object keyed by ID → sorted array
      const eventsObj: Record<string, Omit<LiveMatchEvent, "id">> = data.events ?? {};
      const eventsArr: LiveMatchEvent[] = Object.entries(eventsObj)
        .map(([id, ev]) => ({ ...(ev as Omit<LiveMatchEvent, "id">), id }))
        .sort((a, b) => a.matchTimeMs - b.matchTimeMs);
      setEvents(eventsArr);

      // Active penalties: object keyed by ID → array
      const penaltiesObj: Record<string, Omit<ActivePenalty, "id">> = data.activePenalties ?? {};
      const penaltiesArr: ActivePenalty[] = Object.entries(penaltiesObj).map(
        ([id, p]) => ({ ...(p as Omit<ActivePenalty, "id">), id })
      );
      setActivePenalties(penaltiesArr);

      setLoading(false);
    });

    return () => {
      off(matchRef);
    };
  }, [matchId]);

  return { state, events, activePenalties, loading };
}
