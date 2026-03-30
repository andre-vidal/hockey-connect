"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MatchEventType } from "@/types";
import { getEventLabel, getEventIcon } from "@/lib/matchUtils";
import { Search, X } from "lucide-react";

interface RosterPlayer {
  id: string;
  name: string;
  jersey: number;
}

interface TeamStatsPanelProps {
  matchId: string;
  teamSide: "home" | "away";
  teamName: string;
  rosterPlayers: RosterPlayer[];
  isVisible: boolean;
}

const STAT_EVENT_TYPES: MatchEventType[] = [
  "substitution",
  "shot_on_goal",
  "shot_off_goal",
  "circle_entry",
  "turnover",
  "free_hit",
  "long_corner",
  "tackle",
  "interception",
  "aerial",
];

export function TeamStatsPanel({
  matchId,
  teamSide,
  teamName,
  rosterPlayers,
  isVisible,
}: TeamStatsPanelProps) {
  const [pendingType, setPendingType] = useState<MatchEventType | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<RosterPlayer | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const filteredPlayers = rosterPlayers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.jersey).includes(search)
  );

  const handleSelectType = (type: MatchEventType) => {
    setPendingType(type);
    setSearch("");
    setSelectedPlayer(null);
    setSelectedPlayerOut(null);
  };

  const handleCancel = () => {
    setPendingType(null);
    setSearch("");
    setSelectedPlayer(null);
    setSelectedPlayerOut(null);
  };

  const handleConfirm = useCallback(async () => {
    if (!pendingType) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: pendingType,
        teamSide,
      };
      if (selectedPlayer) {
        body.playerId = selectedPlayer.id;
        body.playerName = selectedPlayer.name;
        body.playerJersey = selectedPlayer.jersey;
      }
      if (pendingType === "substitution" && selectedPlayerOut) {
        body.secondaryPlayerId = selectedPlayerOut.id;
        body.secondaryPlayerName = selectedPlayerOut.name;
      }

      const res = await fetch(`/api/matches/${matchId}/live/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSavedMessage(`${getEventLabel(pendingType)} recorded`);
        setTimeout(() => setSavedMessage(""), 2000);
      }
    } finally {
      setSaving(false);
      handleCancel();
    }
  }, [matchId, pendingType, teamSide, selectedPlayer, selectedPlayerOut]);

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">{teamName} Stats</h3>
        {savedMessage && (
          <span className="text-xs text-green-600 font-medium animate-pulse">
            {savedMessage}
          </span>
        )}
      </div>

      {/* Mini-form for selected action */}
      {pendingType ? (
        <div className="space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {getEventIcon(pendingType)} {getEventLabel(pendingType)}
            </span>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Player selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-medium">
              {pendingType === "substitution" ? "Player In" : "Player (optional)"}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>
            <div className="max-h-28 overflow-y-auto border border-gray-200 rounded-md divide-y bg-white">
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50",
                  selectedPlayer === null && "bg-primary-50 text-primary-700 font-medium"
                )}
              >
                None
              </button>
              {filteredPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(p);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-1.5",
                    selectedPlayer?.id === p.id && "bg-primary-50 text-primary-700 font-medium"
                  )}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold shrink-0">
                    {p.jersey}
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player Out for substitution */}
          {pendingType === "substitution" && (
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 font-medium">Player Out</label>
              <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-md divide-y bg-white">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerOut(null)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50",
                    selectedPlayerOut === null && "bg-primary-50 text-primary-700 font-medium"
                  )}
                >
                  None
                </button>
                {rosterPlayers
                  .filter((p) => p.id !== selectedPlayer?.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlayerOut(p)}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-1.5",
                        selectedPlayerOut?.id === p.id && "bg-primary-50 text-primary-700 font-medium"
                      )}
                    >
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs font-bold shrink-0">
                        {p.jersey}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1 text-xs h-8">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={saving} className="flex-1 text-xs h-8">
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      ) : (
        /* Stat buttons grid */
        <div className="grid grid-cols-2 gap-2">
          {STAT_EVENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleSelectType(type)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors text-left"
            >
              <span className="text-base shrink-0">{getEventIcon(type)}</span>
              <span className="text-xs font-medium leading-tight">{getEventLabel(type)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
