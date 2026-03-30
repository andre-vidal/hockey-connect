"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LiveMatchEvent } from "@/types";
import { formatMatchTime, getEventLabel, getEventIcon, getEventColorClass } from "@/lib/matchUtils";
import { Pencil, Trash2 } from "lucide-react";

interface EventFeedProps {
  events: LiveMatchEvent[];
  isOfficial?: boolean;
  onEdit?: (event: LiveMatchEvent) => void;
  onDelete?: (eventId: string) => void;
  homeTeamName: string;
  awayTeamName: string;
}

function CardBadge({ cardType }: { cardType: "green" | "yellow" | "red" }) {
  const classes = {
    green: "bg-green-500 text-white border-green-600",
    yellow: "bg-yellow-400 text-yellow-900 border-yellow-500",
    red: "bg-red-600 text-white border-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold border",
        classes[cardType]
      )}
    >
      {cardType.charAt(0).toUpperCase() + cardType.slice(1)}
    </span>
  );
}

function EventRow({
  event,
  isOfficial,
  onEdit,
  onDelete,
  homeTeamName,
  awayTeamName,
}: {
  event: LiveMatchEvent;
  isOfficial?: boolean;
  onEdit?: (event: LiveMatchEvent) => void;
  onDelete?: (eventId: string) => void;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const colorClass = getEventColorClass(event.type);
  const icon = getEventIcon(event.type);
  const label = getEventLabel(event.type);
  const teamName =
    event.teamSide === "home"
      ? homeTeamName
      : event.teamSide === "away"
      ? awayTeamName
      : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm transition-colors",
        colorClass
      )}
    >
      {/* Time */}
      <span className="font-mono text-xs font-semibold tabular-nums shrink-0 mt-0.5 w-10 text-right">
        {formatMatchTime(event.matchTimeMs)}
      </span>

      {/* Icon */}
      <span className="text-base shrink-0 mt-0.5">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{label}</span>
          {event.cardType && <CardBadge cardType={event.cardType} />}
          {event.penaltyDurationMs && event.penaltyDurationMs > 0 && (
            <span className="text-xs opacity-70">
              ({Math.round(event.penaltyDurationMs / 60000)} min)
            </span>
          )}
        </div>
        <div className="text-xs opacity-80 mt-0.5 space-y-0.5">
          {teamName && <span className="block">{teamName}</span>}
          {event.playerName && (
            <span className="block">
              {event.playerJersey != null && event.playerJersey > 0 && (
                <span className="font-bold mr-1">#{event.playerJersey}</span>
              )}
              {event.playerName}
            </span>
          )}
          {event.secondaryPlayerName && (
            <span className="block opacity-70">
              Assist: {event.secondaryPlayerName}
            </span>
          )}
          {event.stoppageDurationMs != null && event.stoppageDurationMs > 0 && (
            <span className="block">
              Duration: +{formatMatchTime(event.stoppageDurationMs)}
            </span>
          )}
          {event.notes && (
            <span className="block italic opacity-70">{event.notes}</span>
          )}
          {event.editedAt && (
            <span className="block opacity-50 text-xs">edited</span>
          )}
        </div>
      </div>

      {/* Interval badge */}
      <Badge variant="outline" className="text-xs shrink-0 self-start">
        I{event.intervalNumber}
      </Badge>

      {/* Official actions */}
      {isOfficial && (
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="p-1 rounded hover:bg-black/10 transition-colors"
              title="Edit event"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              className="p-1 rounded hover:bg-red-200 text-red-700 transition-colors"
              title="Delete event"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EventFeed({
  events,
  isOfficial,
  onEdit,
  onDelete,
  homeTeamName,
  awayTeamName,
}: EventFeedProps) {
  const sorted = [...events].sort((a, b) => b.matchTimeMs - a.matchTimeMs);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No events yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          isOfficial={isOfficial}
          onEdit={onEdit}
          onDelete={onDelete}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
        />
      ))}
    </div>
  );
}
