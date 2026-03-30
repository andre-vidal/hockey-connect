"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MatchCard, MatchCardEvent, MatchCardStatus } from "@/types";
import { formatMatchTime, getEventLabel, getEventIcon } from "@/lib/matchUtils";
import { CheckCircle, AlertTriangle, Flag } from "lucide-react";

interface DisputedEventEntry {
  eventId: string;
  comment: string;
}

interface MatchCardViewProps {
  matchCard: MatchCard;
  userRole: string;
  userClubId?: string;
  onConfirm?: () => void;
  onDispute?: (disputedEvents: DisputedEventEntry[]) => void;
  onResolve?: (notes: string, force: boolean) => void;
}

function statusConfig(status: MatchCardStatus): { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" } {
  const map: Record<MatchCardStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
    pending_review: { label: "Pending Review", variant: "warning" },
    confirmed: { label: "Confirmed", variant: "success" },
    disputed: { label: "Disputed", variant: "destructive" },
    resolved: { label: "Resolved", variant: "secondary" },
  };
  return map[status];
}

function EventsTable({
  events,
  disputeMode,
  disputedSet,
  onToggleDispute,
}: {
  events: MatchCardEvent[];
  disputeMode: boolean;
  disputedSet: Set<string>;
  onToggleDispute: (eventId: string) => void;
}) {
  const sorted = [...events].sort((a, b) => a.matchTimeMs - b.matchTimeMs);

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No events recorded</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-2 text-xs text-gray-500 font-medium w-12">Time</th>
            <th className="text-left pb-2 text-xs text-gray-500 font-medium">Event</th>
            <th className="text-left pb-2 text-xs text-gray-500 font-medium">Team</th>
            <th className="text-left pb-2 text-xs text-gray-500 font-medium">Player</th>
            {disputeMode && <th className="text-left pb-2 text-xs text-gray-500 font-medium w-10">Flag</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((event) => {
            const isDisputed = disputedSet.has(event.eventId) || event.disputed;
            return (
              <tr
                key={event.eventId}
                className={cn(
                  "transition-colors",
                  isDisputed && "bg-red-50",
                  disputeMode && !event.disputed && "hover:bg-gray-50 cursor-pointer"
                )}
                onClick={disputeMode && !event.disputed ? () => onToggleDispute(event.eventId) : undefined}
              >
                <td className="py-2 pr-3 font-mono text-xs text-gray-600">
                  {formatMatchTime(event.matchTimeMs)}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span>{getEventIcon(event.type)}</span>
                    <span className="font-medium">{getEventLabel(event.type)}</span>
                    {event.cardType && (
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-bold",
                          event.cardType === "green" && "bg-green-500 text-white",
                          event.cardType === "yellow" && "bg-yellow-400 text-yellow-900",
                          event.cardType === "red" && "bg-red-600 text-white"
                        )}
                      >
                        {event.cardType.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-gray-600">
                  {event.teamSide ? (event.teamSide === "home" ? "Home" : "Away") : "—"}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-700">
                  {event.playerName ? (
                    <span>
                      {event.playerJersey != null && (
                        <span className="font-bold mr-1">#{event.playerJersey}</span>
                      )}
                      {event.playerName}
                    </span>
                  ) : (
                    "—"
                  )}
                  {event.disputeComment && (
                    <p className="text-red-600 italic text-xs mt-0.5">{event.disputeComment}</p>
                  )}
                </td>
                {disputeMode && (
                  <td className="py-2">
                    {!event.disputed && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer",
                          disputedSet.has(event.eventId)
                            ? "border-red-500 bg-red-500"
                            : "border-gray-300"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleDispute(event.eventId); }}
                      >
                        {disputedSet.has(event.eventId) && (
                          <Flag className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}
                    {event.disputed && (
                      <Flag className="h-4 w-4 text-red-500" />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MatchCardView({
  matchCard,
  userRole,
  userClubId,
  onConfirm,
  onDispute,
  onResolve,
}: MatchCardViewProps) {
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputedEvents, setDisputedEvents] = useState<Map<string, string>>(new Map()); // eventId → comment
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);

  const status = matchCard.status;
  const { label, variant } = statusConfig(status);

  const isTeamAdmin = userRole === "team_admin" || userRole === "club_admin";
  const isLeagueAdmin = userRole === "league_admin" || userRole === "root";

  const isHomeClub = userClubId === matchCard.homeClubId;
  const isAwayClub = userClubId === matchCard.awayClubId;
  const hasConfirmed =
    (isHomeClub && matchCard.homeTeamConfirmedAt) ||
    (isAwayClub && matchCard.awayTeamConfirmedAt);

  const canAct = isTeamAdmin && status === "pending_review" && !hasConfirmed;
  const canLeagueAct = isLeagueAdmin && status === "disputed";

  const toggleDispute = (eventId: string) => {
    setDisputedEvents((prev) => {
      const next = new Map(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        if (commentingOn === eventId) setCommentingOn(null);
      } else {
        next.set(eventId, "");
        setCommentingOn(eventId);
      }
      return next;
    });
  };

  const handleDisputeSubmit = () => {
    const entries: DisputedEventEntry[] = Array.from(disputedEvents.entries()).map(([eventId, comment]) => ({
      eventId,
      comment,
    }));
    onDispute?.(entries);
    setDisputeMode(false);
    setDisputedEvents(new Map());
  };

  return (
    <div className="space-y-6">
      {/* Match header */}
      <div className="bg-gray-900 text-white rounded-xl px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <Badge className={cn(
            "text-xs",
            variant === "success" && "bg-green-100 text-green-800",
            variant === "warning" && "bg-yellow-100 text-yellow-800",
            variant === "destructive" && "bg-red-100 text-red-800",
            variant === "secondary" && "bg-gray-100 text-gray-800",
          )}>
            {label}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-sm text-gray-300 truncate">{matchCard.homeTeamName}</p>
            <p className="text-5xl font-black mt-1">{matchCard.finalScore.home}</p>
          </div>
          <div className="text-2xl font-light text-gray-500">:</div>
          <div className="flex-1 text-center">
            <p className="text-sm text-gray-300 truncate">{matchCard.awayTeamName}</p>
            <p className="text-5xl font-black mt-1">{matchCard.finalScore.away}</p>
          </div>
        </div>
      </div>

      {/* Confirmation status */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: matchCard.homeTeamName, confirmedAt: matchCard.homeTeamConfirmedAt },
          { label: matchCard.awayTeamName, confirmedAt: matchCard.awayTeamConfirmedAt },
        ].map((team) => (
          <div
            key={team.label}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border text-sm",
              team.confirmedAt
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-gray-200 bg-gray-50 text-gray-500"
            )}
          >
            {team.confirmedAt ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
            )}
            <span className="truncate text-xs font-medium">{team.label}</span>
          </div>
        ))}
      </div>

      {/* Dispute info */}
      {matchCard.disputedAt && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Disputed</p>
            {matchCard.resolutionNotes && (
              <p className="text-xs mt-0.5 text-red-700">{matchCard.resolutionNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Events */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Match Events</h4>
        <EventsTable
          events={matchCard.events}
          disputeMode={disputeMode}
          disputedSet={new Set(disputedEvents.keys())}
          onToggleDispute={toggleDispute}
        />
      </div>

      {/* Comment box for flagged event */}
      {commentingOn && (
        <div className="border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">
            Add comment for flagged event:
          </p>
          <textarea
            value={disputedEvents.get(commentingOn) ?? ""}
            onChange={(e) => {
              setDisputedEvents((prev) => {
                const next = new Map(prev);
                next.set(commentingOn, e.target.value);
                return next;
              });
            }}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            placeholder="Describe the dispute..."
          />
          <button
            onClick={() => setCommentingOn(null)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Done
          </button>
        </div>
      )}

      {/* Team admin actions */}
      {canAct && !disputeMode && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDisputeMode(true)} className="flex-1 gap-2">
            <Flag className="h-4 w-4" />
            Dispute
          </Button>
          <Button onClick={onConfirm} className="flex-1 gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirm
          </Button>
        </div>
      )}

      {/* Dispute mode actions */}
      {canAct && disputeMode && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Click on events to flag them, then submit your dispute.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDisputeMode(false);
                setDisputedEvents(new Map());
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisputeSubmit}
              disabled={disputedEvents.size === 0}
              className="flex-1 gap-2"
            >
              <Flag className="h-4 w-4" />
              Submit Dispute ({disputedEvents.size})
            </Button>
          </div>
        </div>
      )}

      {/* League admin resolve actions */}
      {canLeagueAct && !showResolveForm && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { setShowResolveForm(true); }}
            className="flex-1"
          >
            Resolve
          </Button>
          <Button
            onClick={() => onResolve?.("Force confirmed by league admin.", true)}
            className="flex-1 gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Force Confirm
          </Button>
        </div>
      )}

      {canLeagueAct && showResolveForm && (
        <div className="space-y-3 border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-sm text-gray-900">Resolution Notes</h5>
          <textarea
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            rows={3}
            placeholder="Describe the resolution..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowResolveForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onResolve?.(resolveNotes, false)}
              disabled={!resolveNotes.trim()}
              className="flex-1"
            >
              Submit Resolution
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
