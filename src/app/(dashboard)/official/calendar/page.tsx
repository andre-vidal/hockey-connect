"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchCalendar } from "@/components/match/MatchCalendar";
import { Match } from "@/types";

export default function OfficialCalendarPage() {
  return (
    <AuthGuard requiredRoles={["match_official"]}>
      <OfficialCalendarContent />
    </AuthGuard>
  );
}

function OfficialCalendarContent() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="Calendar" description="Match schedule and event calendar.">
      {loading ? (
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <MatchCalendar matches={matches} />
      )}
    </DashboardShell>
  );
}
