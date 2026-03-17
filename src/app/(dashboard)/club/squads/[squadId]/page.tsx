"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Player, Squad, SquadPlayer, Position } from "@/types";
import { Plus, Trash2, Send } from "lucide-react";

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "warning" | "success" | "destructive"> = {
  draft: "outline",
  submitted: "warning",
  approved: "success",
  rejected: "destructive",
};

const POSITIONS: Position[] = ["goalkeeper", "defender", "midfielder", "forward", "utility"];

export default function ClubSquadDetailPage() {
  const { squadId } = useParams<{ squadId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [squad, setSquad] = useState<Squad | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedJersey, setSelectedJersey] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<Position | "">("");

  useEffect(() => {
    if (!profile?.clubId) return;
    Promise.all([
      fetch(`/api/squads/${squadId}`).then((r) => r.json()),
      fetch(`/api/clubs/${profile.clubId}/players?status=active`).then((r) => r.json()),
    ])
      .then(([squadData, playersData]) => {
        if (squadData.error) throw new Error(squadData.error);
        setSquad(squadData.squad);
        setAllPlayers(playersData.players ?? []);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profile?.clubId, squadId]);

  const squadPlayerIds = new Set(squad?.players.map((p) => p.playerId) ?? []);
  const availablePlayers = allPlayers.filter((p) => !squadPlayerIds.has(p.id));

  const addPlayer = async () => {
    if (!selectedPlayerId || !selectedJersey || !selectedPosition || !squad) return;
    const newPlayer: SquadPlayer = {
      playerId: selectedPlayerId,
      jerseyNumber: parseInt(selectedJersey, 10),
      position: selectedPosition as Position,
    };
    const updatedPlayers = [...squad.players, newPlayer];
    setSaving(true);
    try {
      const res = await fetch(`/api/squads/${squadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: updatedPlayers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSquad(data.squad);
      setSelectedPlayerId("");
      setSelectedJersey("");
      setSelectedPosition("");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to add player", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!squad) return;
    const updatedPlayers = squad.players.filter((p) => p.playerId !== playerId);
    setSaving(true);
    try {
      const res = await fetch(`/api/squads/${squadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: updatedPlayers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSquad(data.squad);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to remove player", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/squads/${squadId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSquad(data.squad);
      toast({ title: "Squad submitted", description: "Awaiting league admin approval." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = (playerId: string) => {
    const p = allPlayers.find((pl) => pl.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : playerId;
  };

  const isEditable = squad?.status === "draft" || squad?.status === "rejected";

  if (loading) {
    return (
      <AuthGuard requiredRoles={["club_admin"]}>
        <DashboardShell title="Squad"><p className="text-sm text-gray-500">Loading...</p></DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title="Squad Management"
        description={squad ? `${squad.leagueId ?? squad.tournamentId ?? "Squad"} — ${squad.season ?? ""}` : ""}
        actions={
          <div className="flex items-center gap-3">
            {squad && (
              <Badge variant={STATUS_VARIANTS[squad.status] ?? "outline"} className="capitalize text-sm">
                {squad.status}
              </Badge>
            )}
            {isEditable && squad && squad.players.length > 0 && (
              <Button onClick={handleSubmit} disabled={submitting}>
                <Send className="h-4 w-4 mr-1" />
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
          </div>
        }
      >
        {squad?.status === "rejected" && squad.rejectionReason && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <strong>Rejected:</strong> {squad.rejectionReason}. Please make the required changes and resubmit.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Squad Players ({squad?.players.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {squad?.players.length === 0 ? (
                <p className="text-sm text-gray-500">No players added yet.</p>
              ) : (
                <div className="space-y-2">
                  {squad?.players.map((sp) => (
                    <div key={sp.playerId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 w-8 text-center">#{sp.jerseyNumber}</span>
                        <div>
                          <p className="font-medium">{getPlayerName(sp.playerId)}</p>
                          <p className="text-xs text-gray-500 capitalize">{sp.position}</p>
                        </div>
                      </div>
                      {isEditable && (
                        <Button variant="ghost" size="sm" onClick={() => removePlayer(sp.playerId)} disabled={saving} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Player</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availablePlayers.length === 0 ? (
                  <p className="text-sm text-gray-500">All active players have been added to this squad.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label>Player</Label>
                      <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                        <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                        <SelectContent>
                          {availablePlayers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}{p.jerseyNumber ? ` (#${p.jerseyNumber})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Position</Label>
                      <Select value={selectedPosition} onValueChange={(v) => setSelectedPosition(v as Position)}>
                        <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                        <SelectContent>
                          {POSITIONS.map((pos) => (
                            <SelectItem key={pos} value={pos} className="capitalize">{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Jersey Number</Label>
                      <Input type="number" min="1" max="99" value={selectedJersey} onChange={(e) => setSelectedJersey(e.target.value)} placeholder="e.g. 10" />
                    </div>

                    <Button onClick={addPlayer} disabled={saving || !selectedPlayerId || !selectedJersey || !selectedPosition} className="w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Squad
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
