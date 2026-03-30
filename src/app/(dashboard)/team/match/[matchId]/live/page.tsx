"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ScoreBoard } from "@/components/match/ScoreBoard";
import { MatchTimer } from "@/components/match/MatchTimer";
import { EventFeed } from "@/components/match/EventFeed";
import { TeamStatsPanel } from "@/components/match/TeamStatsPanel";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import { useTimer } from "@/hooks/useTimer";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { Match } from "@/types";
import { Loader2 } from "lucide-react";

export default function TeamLiveMatchPage() {
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <TeamLiveMatchContent />
    </AuthGuard>
  );
}

function TeamLiveMatchContent() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { profile } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "stats">("feed");
  const [rosterPlayers, setRosterPlayers] = useState<{ id: string; name: string; jersey: number }[]>([]);

  const { state, events, loading: rtdbLoading } = useRealtimeMatch(matchId);
  const { displayMs, stoppageMs } = useTimer(state);

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

  // Determine team side
  const clubId = profile?.clubId;
  const teamSide: "home" | "away" =
    match && clubId === match.homeClubId ? "home" : "away";
  const myClubId = match ? (teamSide === "home" ? match.homeClubId : match.awayClubId) : "";
  const myTeamName = match ? (teamSide === "home" ? match.homeTeamName : match.awayTeamName) : "";

  // Load roster for my team
  useEffect(() => {
    if (!myClubId) return;
    fetch(`/api/clubs/${myClubId}/players`)
      .then((r) => r.json())
      .then((data) => {
        if (data.players) {
          setRosterPlayers(
            data.players.map((p: { id: string; firstName: string; lastName: string; jerseyNumber?: number }) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              jersey: p.jerseyNumber ?? 0,
            }))
          );
        }
      })
      .catch(() => {
        // Silently ignore
      });
  }, [myClubId]);

  const isLoading = matchLoading || rtdbLoading;

  if (isLoading) {
    return (
      <DashboardShell title="Live Match">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardShell>
    );
  }

  if (!match) {
    return (
      <DashboardShell title="Live Match">
        <p className="text-gray-500">Match not found.</p>
      </DashboardShell>
    );
  }

  if (!state) {
    return (
      <DashboardShell title="Live Match" description={`${match.homeTeamName} vs ${match.awayTeamName}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">Match has not started yet. Check back soon.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={`${match.homeTeamName} vs ${match.awayTeamName}`}
      description="Live match view"
    >
      <div className="space-y-4">
        {/* ScoreBoard */}
        <ScoreBoard
          homeTeamName={match.homeTeamName}
          awayTeamName={match.awayTeamName}
          homeScore={state.score.home}
          awayScore={state.score.away}
          status={state.status}
          currentInterval={state.currentInterval}
          matchConfig={match.matchConfig}
          isReadOnly
        />

        {/* Timer (read-only) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <MatchTimer
            displayMs={displayMs}
            stoppageMs={stoppageMs}
            status={state.status}
            isRunning={state.isRunning}
            matchConfig={match.matchConfig}
            currentInterval={state.currentInterval}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "feed"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Live Feed
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "stats"
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Record Stats
          </button>
        </div>

        {/* Tab content */}
        <div className="bg-white border border-gray-200 rounded-b-xl p-4">
          {activeTab === "feed" && (
            <EventFeed
              events={events}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          )}
          {activeTab === "stats" && (
            <TeamStatsPanel
              matchId={matchId}
              teamSide={teamSide}
              teamName={myTeamName}
              rosterPlayers={rosterPlayers}
              isVisible
            />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
