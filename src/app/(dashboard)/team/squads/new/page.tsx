"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { League, Team, Tournament } from "@/types";

export default function NewSquadPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm] = useState({
    teamId: "",
    leagueId: "",
    tournamentId: "",
    season: "",
  });
  const [competitionType, setCompetitionType] = useState<
    "league" | "tournament"
  >("league");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.clubId) return;
    Promise.all([
      fetch(`/api/clubs/${profile.clubId}/teams`).then((r) => r.json()),
      fetch("/api/leagues").then((r) => r.json()),
      fetch("/api/tournaments").then((r) => r.json()),
    ])
      .then(([teamsData, leaguesData, tournamentsData]) => {
        setTeams(teamsData.teams ?? []);
        setLeagues(leaguesData.leagues ?? []);
        setTournaments(tournamentsData.tournaments ?? []);
      })
      .catch((err) =>
        toast({
          title: "Error loading data",
          description: err.message,
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingData(false));
  }, [profile?.clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clubId) return;
    setSaving(true);
    try {
      const payload = {
        teamId: form.teamId,
        clubId: profile.clubId,
        leagueId: competitionType === "league" ? form.leagueId : null,
        tournamentId:
          competitionType === "tournament" ? form.tournamentId : null,
        season: form.season,
        players: [],
      };
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Squad created",
        description: "Add players to your squad.",
      });
      router.push(`/team/squads/${data.squad.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create squad",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell
        title="New Squad"
        description="Create a squad for a league or tournament submission."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Squad Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="teamId">Team *</Label>
                  <Select
                    value={form.teamId}
                    onValueChange={(v) => setForm((f) => ({ ...f, teamId: v }))}
                    required
                  >
                    <SelectTrigger id="teamId">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Competition Type *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        competitionType === "league" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCompetitionType("league")}
                    >
                      League
                    </Button>
                    <Button
                      type="button"
                      variant={
                        competitionType === "tournament" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCompetitionType("tournament")}
                    >
                      Tournament
                    </Button>
                  </div>
                </div>

                {competitionType === "league" ? (
                  <div className="space-y-1">
                    <Label htmlFor="leagueId">League *</Label>
                    <Select
                      value={form.leagueId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, leagueId: v }))
                      }
                      required
                    >
                      <SelectTrigger id="leagueId">
                        <SelectValue placeholder="Select league" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="tournamentId">Tournament *</Label>
                    <Select
                      value={form.tournamentId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, tournamentId: v }))
                      }
                      required
                    >
                      <SelectTrigger id="tournamentId">
                        <SelectValue placeholder="Select tournament" />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="season">Season</Label>
                  <Input
                    id="season"
                    value={form.season}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, season: e.target.value }))
                    }
                    placeholder="e.g. 2025/2026"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create Squad"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
