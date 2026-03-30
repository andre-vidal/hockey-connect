"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScoreBoard } from "@/components/match/ScoreBoard";
import { MatchTimer } from "@/components/match/MatchTimer";
import { EventFeed } from "@/components/match/EventFeed";
import { useRealtimeMatch } from "@/hooks/useRealtimeMatch";
import { useTimer } from "@/hooks/useTimer";
import { Match } from "@/types";
import { Loader2, ArrowLeft } from "lucide-react";

export default function PublicLiveMatchPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);

  const { state, events, loading: rtdbLoading } = useRealtimeMatch(matchId);
  const { displayMs, stoppageMs } = useTimer(state);

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setMatch(data.match);
      })
      .catch(() => {
        // Public endpoint may fail if auth is required — show RTDB data only
      })
      .finally(() => setMatchLoading(false));
  }, [matchId]);

  const homeTeamName = match?.homeTeamName ?? "Home";
  const awayTeamName = match?.awayTeamName ?? "Away";

  const isLoading = matchLoading || rtdbLoading;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Back link */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Matches
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && !state && (
          <div className="text-center py-16">
            <p className="text-gray-500">
              {match
                ? `${match.homeTeamName} vs ${match.awayTeamName} — match has not started yet.`
                : "Match is not currently live."}
            </p>
          </div>
        )}

        {!isLoading && state && (
          <>
            {/* ScoreBoard */}
            <ScoreBoard
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeScore={state.score.home}
              awayScore={state.score.away}
              status={state.status}
              currentInterval={state.currentInterval}
              matchConfig={match?.matchConfig ?? { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 }}
              isReadOnly
            />

            {/* Timer (read-only) */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <MatchTimer
                displayMs={displayMs}
                stoppageMs={stoppageMs}
                status={state.status}
                isRunning={state.isRunning}
                matchConfig={match?.matchConfig ?? { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 }}
                currentInterval={state.currentInterval}
              />
            </div>

            {/* Event Feed */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Match Events</h3>
              <EventFeed
                events={events}
                homeTeamName={homeTeamName}
                awayTeamName={awayTeamName}
              />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
