"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Match, MatchStatus } from "@/types";
import { Calendar, MapPin, ChevronRight } from "lucide-react";

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

interface Props {
  /** Filter matches by teamId (for team admin / official views) */
  teamId?: string;
  /** Filter matches by officialId */
  officialId?: string;
  /** Link to navigate to for "View all" */
  viewAllHref?: string;
  /** Max number of upcoming matches to show */
  limit?: number;
  title?: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function UpcomingMatchesWidget({ teamId, officialId, viewAllHref, limit = 5, title = "Upcoming Matches" }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((data) => {
        const now = new Date();
        let list: Match[] = (data.matches ?? []).filter((m: Match) =>
          ["scheduled", "warmup", "live"].includes(m.status) && new Date(m.scheduledAt) >= now
        );
        if (teamId) {
          list = list.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
        }
        if (officialId) {
          list = list.filter((m) => m.officials.some((o) => o.officialId === officialId));
        }
        list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setMatches(list.slice(0, limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId, officialId, limit]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {viewAllHref && (
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href={viewAllHref}>
              View all <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-md animate-pulse" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming matches.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const { date, time } = formatDateTime(match.scheduledAt);
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {match.homeTeamName} <span className="text-gray-400 font-normal">vs</span> {match.awayTeamName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {date} at {time}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {match.venue}
                      </span>
                    </div>
                  </div>
                  <Badge variant={statusVariant[match.status]} className="ml-2 shrink-0">
                    <span className="capitalize">{match.status}</span>
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
