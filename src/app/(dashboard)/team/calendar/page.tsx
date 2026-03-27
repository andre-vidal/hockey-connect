"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchCalendar } from "@/components/match/MatchCalendar";
import { Match } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

export default function TeamCalendarPage() {
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <TeamCalendarContent />
    </AuthGuard>
  );
}

function TeamCalendarContent() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((data) => {
        const teamIds = profile?.teamIds ?? [];
        const clubId = profile?.clubId;
        let list: Match[] = data.matches ?? [];
        if (teamIds.length > 0) {
          list = list.filter((m) => teamIds.includes(m.homeTeamId) || teamIds.includes(m.awayTeamId));
        } else if (clubId) {
          list = list.filter((m) => m.homeClubId === clubId || m.awayClubId === clubId);
        }
        setMatches(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  return (
    <DashboardShell title="Calendar" description="Your team's upcoming schedule.">
      {loading ? (
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <MatchCalendar matches={matches} />
      )}
    </DashboardShell>
  );
}
