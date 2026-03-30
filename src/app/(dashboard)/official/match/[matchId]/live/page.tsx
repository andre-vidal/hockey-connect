"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ScoreBoard } from "@/components/match/ScoreBoard";
import { MatchTimer } from "@/components/match/MatchTimer";
import { QuickActions } from "@/components/match/QuickActions";
import { EventEntryPanel } from "@/components/match/EventEntryPanel";
import { EventFeed } from "@/components/match/EventFeed";
import { PenaltyTimers } from "@/components/match/PenaltyTimers";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import { useTimer } from "@/hooks/useTimer";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Match, LiveMatchEvent, MatchEventType } from "@/types";
import { Loader2, Play } from "lucide-react";

interface RosterPlayer {
  id: string;
  name: string;
  jersey: number;
  teamId: string;
  teamSide: "home" | "away";
}

export default function OfficialLiveMatchPage() {
  return (
    <AuthGuard requiredRoles={["match_official"]}>
      <OfficialLiveMatchContent />
    </AuthGuard>
  );
}

function OfficialLiveMatchContent() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<MatchEventType | null>(null);
  const [editingEvent, setEditingEvent] = useState<LiveMatchEvent | null>(null);

  const { state, events, activePenalties, loading: rtdbLoading } = useRealtimeMatch(matchId);
  const { displayMs, stoppageMs } = useTimer(state);

  // Load match from API
  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMatch(data.match);
      })
      .catch((err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      })
      .finally(() => setMatchLoading(false));
  }, [matchId, toast]);

  // Load rosters once match is available
  useEffect(() => {
    if (!match) return;

    async function loadRosters() {
      if (!match) return;
      const results: RosterPlayer[] = [];

      try {
        const homeRes = await fetch(`/api/clubs/${match.homeClubId}/players`);
        if (homeRes.ok) {
          const homeData = await homeRes.json();
          const homePlayers: RosterPlayer[] = (homeData.players ?? []).map(
            (p: { id: string; firstName: string; lastName: string; jerseyNumber?: number }) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              jersey: p.jerseyNumber ?? 0,
              teamId: match.homeTeamId,
              teamSide: "home" as const,
            })
          );
          results.push(...homePlayers);
        }
      } catch {
        // Silently ignore - EventEntryPanel handles empty roster
      }

      try {
        const awayRes = await fetch(`/api/clubs/${match.awayClubId}/players`);
        if (awayRes.ok) {
          const awayData = await awayRes.json();
          const awayPlayers: RosterPlayer[] = (awayData.players ?? []).map(
            (p: { id: string; firstName: string; lastName: string; jerseyNumber?: number }) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              jersey: p.jerseyNumber ?? 0,
              teamId: match.awayTeamId,
              teamSide: "away" as const,
            })
          );
          results.push(...awayPlayers);
        }
      } catch {
        // Silently ignore
      }

      setRosterPlayers(results);
    }

    loadRosters();
  }, [match]);

  const callApi = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      setActionLoading(true);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        return data;
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Request failed",
          variant: "destructive",
        });
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [toast]
  );

  const handleAction = useCallback(
    async (action: string) => {
      const eventActions: MatchEventType[] = [
        "goal",
        "green_card",
        "yellow_card",
        "red_card",
        "penalty_corner",
        "penalty_stroke",
        "substitution",
      ];

      if (eventActions.includes(action as MatchEventType)) {
        setSelectedEventType(action as MatchEventType);
        setEditingEvent(null);
        setPanelOpen(true);
        return;
      }

      try {
        switch (action) {
          case "start_match":
            await callApi(`/api/matches/${matchId}/live`, { action: "start_live" });
            break;
          case "start_timer":
            await callApi(`/api/matches/${matchId}/live/timer`, { action: "start" });
            break;
          case "pause_timer":
            await callApi(`/api/matches/${matchId}/live/timer`, { action: "pause" });
            break;
          case "stoppage_start":
            await callApi(`/api/matches/${matchId}/live/timer`, { action: "start_stoppage" });
            break;
          case "stoppage_end":
            await callApi(`/api/matches/${matchId}/live/timer`, { action: "end_stoppage" });
            break;
          case "interval_end":
            await callApi(`/api/matches/${matchId}/live`, { action: "end_interval" });
            break;
          case "next_interval":
            await callApi(`/api/matches/${matchId}/live`, { action: "start_next_interval" });
            break;
          case "match_end":
            await callApi(`/api/matches/${matchId}/live`, { action: "complete" });
            break;
          default:
            break;
        }
      } catch {
        // Error already toasted by callApi
      }
    },
    [matchId, callApi]
  );

  const handleStartWarmup = async () => {
    try {
      await callApi(`/api/matches/${matchId}/live`, { action: "warmup" });
    } catch {
      // Error already toasted
    }
  };

  const handleSaveEvent = useCallback(
    async (eventData: Partial<LiveMatchEvent>) => {
      if (editingEvent) {
        const res = await fetch(`/api/matches/${matchId}/live/events/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update event");
        toast({ title: "Event updated" });
      } else {
        const res = await fetch(`/api/matches/${matchId}/live/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save event");
        toast({ title: "Event saved" });
      }
    },
    [matchId, editingEvent, toast]
  );

  const handleEditEvent = useCallback((event: LiveMatchEvent) => {
    setEditingEvent(event);
    setSelectedEventType(event.type);
    setPanelOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!confirm("Delete this event?")) return;
      try {
        const res = await fetch(`/api/matches/${matchId}/live/events/${eventId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to delete event");
        }
        toast({ title: "Event deleted" });
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to delete",
          variant: "destructive",
        });
      }
    },
    [matchId, toast]
  );

  const handleRemovePenalty = useCallback(
    async (penaltyId: string) => {
      try {
        const res = await fetch(`/api/matches/${matchId}/live/penalties/${penaltyId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to remove penalty");
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to remove penalty",
          variant: "destructive",
        });
      }
    },
    [matchId, toast]
  );

  const handleFinalize = async () => {
    if (!confirm("Finalize the match card? This will write results to Firestore.")) return;
    try {
      await callApi(`/api/matches/${matchId}/live/finalize`, {});
      toast({ title: "Match finalized", description: "Match card created successfully." });
    } catch {
      // Error already toasted
    }
  };

  const isLoading = matchLoading || rtdbLoading;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Match not found.</p>
      </div>
    );
  }

  // Pre-match: show initialization UI
  if (!state) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {match.homeTeamName} vs {match.awayTeamName}
          </h1>
          <p className="text-gray-500">Match has not started yet.</p>
        </div>
        <Button
          size="lg"
          onClick={handleStartWarmup}
          disabled={actionLoading}
          className="gap-2 bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Play className="h-5 w-5" />
          {actionLoading ? "Starting..." : "Start Warmup"}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Sticky top: ScoreBoard */}
      <div className="shrink-0 p-3 bg-white shadow-sm">
        <ScoreBoard
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
          homeScore={state.score.home}
          awayScore={state.score.away}
          status={state.status}
          currentInterval={state.currentInterval}
          matchConfig={match.matchConfig}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Timer */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <MatchTimer
              displayMs={displayMs}
              stoppageMs={stoppageMs}
              status={state.status}
              isRunning={state.isRunning}
              isOfficial
              onStart={() => handleAction("start_timer")}
              onPause={() => handleAction("pause_timer")}
              matchConfig={match.matchConfig}
              currentInterval={state.currentInterval}
            />
          </div>

          {/* Active Penalties */}
          {activePenalties.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <PenaltyTimers
                penalties={activePenalties}
                matchState={state}
                isOfficial
                onRemove={handleRemovePenalty}
                homeTeamName={match.homeTeamName}
                awayTeamName={match.awayTeamName}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <QuickActions
              matchState={state}
              matchConfig={match.matchConfig}
              onAction={handleAction}
              disabled={actionLoading}
            />
          </div>

          {/* Finalize button (when completed) */}
          {state.status === "completed" && (
            <Button
              onClick={handleFinalize}
              disabled={actionLoading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              size="lg"
            >
              {actionLoading ? "Finalizing..." : "Finalize Match Card"}
            </Button>
          )}

          {/* Event Feed */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Match Events</h3>
            <EventFeed
              events={events}
              isOfficial
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          </div>
        </div>
      </div>

      {/* Event Entry Panel (floating overlay) */}
      {state && (
        <EventEntryPanel
          open={panelOpen}
          onClose={() => {
            setPanelOpen(false);
            setEditingEvent(null);
            setSelectedEventType(null);
          }}
          eventType={selectedEventType}
          matchState={state}
          match={match}
          rosterPlayers={rosterPlayers}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
