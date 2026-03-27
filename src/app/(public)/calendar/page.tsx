"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchCalendar } from "@/components/match/MatchCalendar";
import { Match } from "@/types";

export default function PublicCalendarPage() {
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
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Calendar" description="Upcoming events and match schedule">
          {loading ? (
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <MatchCalendar matches={matches} />
          )}
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
