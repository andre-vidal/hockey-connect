"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LiveMatchEvent,
  LiveMatchState,
  Match,
  MatchEventType,
  StoppageReason,
} from "@/types";
import { formatMatchTime, getEventLabel } from "@/lib/matchUtils";
import { X, Search } from "lucide-react";

interface RosterPlayer {
  id: string;
  name: string;
  jersey: number;
  teamId: string;
  teamSide: "home" | "away";
}

interface EventEntryPanelProps {
  open: boolean;
  onClose: () => void;
  eventType: MatchEventType | null;
  matchState: LiveMatchState;
  match: Match;
  rosterPlayers: RosterPlayer[];
  onSave: (eventData: Partial<LiveMatchEvent>) => Promise<void>;
}

const STOPPAGE_REASONS: { value: StoppageReason; label: string }[] = [
  { value: "penalty_corner", label: "Penalty Corner" },
  { value: "injury", label: "Injury" },
  { value: "video_referral", label: "Video Referral" },
  { value: "other", label: "Other" },
];

const GREEN_CARD_DURATIONS = [2, 3, 5]; // minutes
const YELLOW_CARD_DURATIONS = [5, 10]; // minutes

function PlayerSelect({
  label,
  players,
  value,
  onChange,
  optional,
}: {
  label: string;
  players: RosterPlayer[];
  value: string;
  onChange: (id: string, name: string, jersey: number) => void;
  optional?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.jersey).includes(search)
  );

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="text-gray-400 ml-1">(optional)</span>}
      </label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
      </div>
      <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-md divide-y">
        {optional && (
          <button
            type="button"
            onClick={() => onChange("", "", 0)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
              value === "" && "bg-primary-50 text-primary-700 font-medium"
            )}
          >
            None
          </button>
        )}
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-500">No players found</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id, p.name, p.jersey);
                setSearch("");
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2",
                value === p.id && "bg-primary-50 text-primary-700 font-medium"
              )}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold shrink-0">
                {p.jersey}
              </span>
              <span className="truncate">{p.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function EventEntryPanel({
  open,
  onClose,
  eventType,
  matchState,
  match,
  rosterPlayers,
  onSave,
}: EventEntryPanelProps) {
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerJersey, setPlayerJersey] = useState(0);
  const [secondaryPlayerId, setSecondaryPlayerId] = useState("");
  const [secondaryPlayerName, setSecondaryPlayerName] = useState("");
  const [cardDurationMins, setCardDurationMins] = useState(5);
  const [stoppageReason, setStoppageReason] = useState<StoppageReason>("other");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when event type or panel opens
  useEffect(() => {
    if (open) {
      setTeamSide("home");
      setPlayerId("");
      setPlayerName("");
      setPlayerJersey(0);
      setSecondaryPlayerId("");
      setSecondaryPlayerName("");
      setCardDurationMins(eventType === "green_card" ? 2 : 5);
      setStoppageReason("other");
      setNotes("");
    }
  }, [open, eventType]);

  const homePlayers = rosterPlayers.filter((p) => p.teamSide === "home");
  const awayPlayers = rosterPlayers.filter((p) => p.teamSide === "away");
  const currentSidePlayers = teamSide === "home" ? homePlayers : awayPlayers;

  const handleSave = useCallback(async () => {
    if (!eventType) return;
    setSaving(true);
    try {
      const base: Partial<LiveMatchEvent> = {
        type: eventType,
        intervalNumber: matchState.currentInterval,
        matchTimeMs: matchState.intervalElapsedMs,
        teamSide,
        teamId: teamSide === "home" ? match.homeTeamId : match.awayTeamId,
      };

      if (playerId) {
        base.playerId = playerId;
        base.playerName = playerName;
        base.playerJersey = playerJersey;
      }

      if (secondaryPlayerId) {
        base.secondaryPlayerId = secondaryPlayerId;
        base.secondaryPlayerName = secondaryPlayerName;
      }

      if (eventType === "green_card") {
        base.cardType = "green";
        base.penaltyDurationMs = cardDurationMins * 60 * 1000;
      } else if (eventType === "yellow_card") {
        base.cardType = "yellow";
        base.penaltyDurationMs = cardDurationMins * 60 * 1000;
      } else if (eventType === "red_card") {
        base.cardType = "red";
      }

      if (eventType === "stoppage_start") {
        base.stoppageReason = stoppageReason;
        // Remove team info for stoppages
        delete base.teamSide;
        delete base.teamId;
      }

      if (notes.trim()) base.notes = notes.trim();

      await onSave(base);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [
    eventType,
    matchState,
    teamSide,
    match,
    playerId,
    playerName,
    playerJersey,
    secondaryPlayerId,
    secondaryPlayerName,
    cardDurationMins,
    stoppageReason,
    notes,
    onSave,
    onClose,
  ]);

  if (!open || !eventType) return null;

  const needsTeam = !["stoppage_start", "stoppage_end", "interval_end", "match_end"].includes(eventType);
  const needsPlayer = !["penalty_corner", "penalty_stroke", "stoppage_start", "stoppage_end", "interval_end", "match_end", "free_hit", "long_corner"].includes(eventType);
  const needsSecondary = eventType === "goal";
  const needsCardDuration = eventType === "green_card" || eventType === "yellow_card";
  const needsStoppageReason = eventType === "stoppage_start";
  const isPlayerOptional = ["shot_on_goal", "shot_off_goal", "circle_entry", "turnover", "aerial", "tackle", "interception", "substitution"].includes(eventType);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel — slides up from bottom, leaves ~40% of screen above it */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "65vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{getEventLabel(eventType)}</h3>
            <p className="text-xs text-gray-500">
              @ {formatMatchTime(matchState.intervalElapsedMs)} &middot; Interval {matchState.currentInterval}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {/* Team selector */}
          {needsTeam && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Team</label>
              <div className="grid grid-cols-2 gap-2">
                {(["home", "away"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      setTeamSide(side);
                      setPlayerId("");
                      setPlayerName("");
                      setPlayerJersey(0);
                    }}
                    className={cn(
                      "py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors truncate",
                      teamSide === side
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {side === "home" ? match.homeTeamName : match.awayTeamName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card duration */}
          {needsCardDuration && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Penalty Duration</label>
              <div className="flex gap-2 flex-wrap">
                {(eventType === "green_card" ? GREEN_CARD_DURATIONS : YELLOW_CARD_DURATIONS).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCardDurationMins(mins)}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                      cardDurationMins === mins
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary player */}
          {needsPlayer && (
            <PlayerSelect
              label={eventType === "substitution" ? "Player Out" : "Player"}
              players={needsTeam ? currentSidePlayers : rosterPlayers}
              value={playerId}
              onChange={(id, name, jersey) => {
                setPlayerId(id);
                setPlayerName(name);
                setPlayerJersey(jersey);
              }}
              optional={isPlayerOptional}
            />
          )}

          {/* Secondary player (assist or player in for substitution) */}
          {needsSecondary && (
            <PlayerSelect
              label="Assist"
              players={needsTeam ? currentSidePlayers : rosterPlayers}
              value={secondaryPlayerId}
              onChange={(id, name) => {
                setSecondaryPlayerId(id);
                setSecondaryPlayerName(name);
              }}
              optional
            />
          )}

          {/* Stoppage reason */}
          {needsStoppageReason && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Stoppage Reason</label>
              <select
                value={stoppageReason}
                onChange={(e) => setStoppageReason(e.target.value as StoppageReason)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                {STOPPAGE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add any notes..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-100 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Event"}
          </Button>
        </div>
      </div>
    </>
  );
}
