"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match, MatchStatus } from "@/types";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "list";

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  matches: Match[];
  /** Optional href prefix for match links. If provided, each match links to `{matchLinkPrefix}/{matchId}` */
  matchLinkPrefix?: string;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function MatchCalendar({ matches, matchLinkPrefix }: Props) {
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  // Build calendar grid for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (Date | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to full weeks
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  function matchesForDay(day: Date) {
    return matches.filter((m) => isSameDay(new Date(m.scheduledAt), day));
  }

  // For list view: group matches by date
  const sortedMatches = [...matches].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const groupedByDate: { date: string; matches: Match[] }[] = [];
  for (const match of sortedMatches) {
    const dateKey = new Date(match.scheduledAt).toDateString();
    const existing = groupedByDate.find((g) => g.date === dateKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      groupedByDate.push({ date: dateKey, matches: [match] });
    }
  }

  function renderMatchBadge(match: Match, compact = false) {
    const content = compact ? (
      <span className="truncate text-xs">{match.homeTeamName} v {match.awayTeamName}</span>
    ) : (
      <div>
        <p className="font-medium text-sm">{match.homeTeamName} vs {match.awayTeamName}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(match.scheduledAt)}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.venue}</span>
        </div>
      </div>
    );

    const inner = (
      <div className={cn(
        "rounded p-1 cursor-pointer transition-colors",
        compact ? "bg-primary-100 text-primary-800 hover:bg-primary-200" : "flex items-center justify-between gap-2 border border-gray-100 bg-gray-50 hover:bg-gray-100 p-3 rounded-lg"
      )}>
        {content}
        {!compact && (
          <Badge variant={statusVariant[match.status]}>
            <span className="capitalize">{match.status}</span>
          </Badge>
        )}
      </div>
    );

    if (matchLinkPrefix) {
      return (
        <Link key={match.id} href={`${matchLinkPrefix}/${match.id}`}>
          {inner}
        </Link>
      );
    }
    return <div key={match.id}>{inner}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value="month">
              <Calendar className="h-4 w-4 mr-1" />
              Month
            </TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "month" && (
        <div className="border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 divide-x divide-y">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-24 bg-gray-50" />;
              }
              const dayMatches = matchesForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="h-24 p-1 overflow-hidden hover:bg-gray-50">
                  <div className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                    isToday ? "bg-primary-600 text-white" : "text-gray-700"
                  )}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayMatches.slice(0, 2).map((m) => renderMatchBadge(m, true))}
                    {dayMatches.length > 2 && (
                      <span className="text-xs text-gray-400">+{dayMatches.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-6">
          {groupedByDate.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No matches scheduled.</p>
          ) : (
            groupedByDate.map(({ date, matches: dayMatches }) => (
              <div key={date}>
                <p className="text-sm font-semibold text-gray-600 mb-2">{formatDate(dayMatches[0].scheduledAt)}</p>
                <div className="space-y-2">
                  {dayMatches.map((m) => renderMatchBadge(m, false))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
