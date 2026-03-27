"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { League, Tournament, Club, Team, MatchOfficial, OfficialType } from "@/types";

interface OfficialAssignment {
  officialId: string;
  userId: string;
  displayName: string;
  type: OfficialType;
}

interface FormState {
  context: "league" | "tournament";
  leagueId: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  scheduledAt: string;
  notes: string;
  officials: OfficialAssignment[];
  matchConfig: { numberOfIntervals: number; intervalDuration: number; halfTimeDuration: number };
}

const defaultForm: FormState = {
  context: "league",
  leagueId: "",
  tournamentId: "",
  homeTeamId: "",
  awayTeamId: "",
  venue: "",
  scheduledAt: "",
  notes: "",
  officials: [],
  matchConfig: { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
};

export default function NewMatchPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [officials, setOfficials] = useState<MatchOfficial[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/leagues").then((r) => r.json()),
      fetch("/api/tournaments").then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
      fetch("/api/officials").then((r) => r.json()),
    ]).then(([lg, tr, cl, of]) => {
      setLeagues(lg.leagues ?? []);
      setTournaments(tr.tournaments ?? []);
      setClubs(cl.clubs ?? []);
      setOfficials((of.officials ?? []).filter((o: MatchOfficial) => o.isActive));
    }).catch(() => {});
  }, []);

  // Fetch teams whenever home/away club selection changes (via league/tournament)
  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => {
        const clubList: Club[] = data.clubs ?? [];
        const allTeamFetches = clubList.map((c) =>
          fetch(`/api/clubs/${c.id}/teams`).then((r) => r.json()).then((d) => d.teams ?? []).catch(() => [])
        );
        return Promise.all(allTeamFetches);
      })
      .then((allTeams) => {
        setTeams(allTeams.flat());
      })
      .catch(() => {});
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleOfficial(official: MatchOfficial, type: OfficialType) {
    setForm((prev) => {
      const exists = prev.officials.find((o) => o.officialId === official.id && o.type === type);
      if (exists) {
        return { ...prev, officials: prev.officials.filter((o) => !(o.officialId === official.id && o.type === type)) };
      }
      return {
        ...prev,
        officials: [
          ...prev.officials,
          { officialId: official.id, userId: official.userId, displayName: official.displayName, type },
        ],
      };
    });
  }

  function isOfficialSelected(officialId: string, type: OfficialType) {
    return form.officials.some((o) => o.officialId === officialId && o.type === type);
  }

  function getTeamClubId(teamId: string): string {
    const t = teams.find((t) => t.id === teamId);
    return t?.clubId ?? "";
  }

  function getTeamName(teamId: string): string {
    const t = teams.find((t) => t.id === teamId);
    if (!t) return "";
    const club = clubs.find((c) => c.id === t.clubId);
    return `${club?.name ? club.name + " — " : ""}${t.name}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.homeTeamId || !form.awayTeamId || !form.venue || !form.scheduledAt) {
      toast({ title: "Validation error", description: "Home team, away team, venue, and date/time are required.", variant: "destructive" });
      return;
    }
    if (form.homeTeamId === form.awayTeamId) {
      toast({ title: "Validation error", description: "Home and away teams must be different.", variant: "destructive" });
      return;
    }
    if (form.context === "league" && !form.leagueId) {
      toast({ title: "Validation error", description: "Please select a league.", variant: "destructive" });
      return;
    }
    if (form.context === "tournament" && !form.tournamentId) {
      toast({ title: "Validation error", description: "Please select a tournament.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const homeTeam = teams.find((t) => t.id === form.homeTeamId);
      const awayTeam = teams.find((t) => t.id === form.awayTeamId);

      const payload = {
        leagueId: form.context === "league" ? form.leagueId : null,
        tournamentId: form.context === "tournament" ? form.tournamentId : null,
        homeTeamId: form.homeTeamId,
        homeTeamName: getTeamName(form.homeTeamId),
        homeClubId: getTeamClubId(form.homeTeamId),
        awayTeamId: form.awayTeamId,
        awayTeamName: getTeamName(form.awayTeamId),
        awayClubId: getTeamClubId(form.awayTeamId),
        venue: form.venue,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        officials: form.officials,
        matchConfig: form.matchConfig,
        notes: form.notes,
      };

      // Auto-fill matchConfig from league/tournament if not customized
      if (form.context === "league" && form.leagueId) {
        const league = leagues.find((l) => l.id === form.leagueId);
        if (league) payload.matchConfig = league.matchConfig;
      } else if (form.context === "tournament" && form.tournamentId) {
        const tournament = tournaments.find((t) => t.id === form.tournamentId);
        if (tournament) payload.matchConfig = tournament.matchConfig;
      }

      void homeTeam; void awayTeam;

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create match");
      toast({ title: "Match created", description: "The match has been scheduled." });
      router.push("/admin/matches");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create match", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const umpires = officials.filter((o) => o.officialTypes.includes("umpire"));
  const tableOperators = officials.filter((o) => o.officialTypes.includes("table_operator"));

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="New Match"
        description="Schedule a new match."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/matches">Cancel</Link>
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          {/* Context: League or Tournament */}
          <Card>
            <CardHeader><CardTitle>Competition</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="context">Type</Label>
                  <Select value={form.context} onValueChange={(v) => setField("context", v as "league" | "tournament")}>
                    <SelectTrigger id="context">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league">League</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.context === "league" ? (
                  <div>
                    <Label htmlFor="leagueId">League</Label>
                    <Select value={form.leagueId} onValueChange={(v) => setField("leagueId", v)}>
                      <SelectTrigger id="leagueId">
                        <SelectValue placeholder="Select league" />
                      </SelectTrigger>
                      <SelectContent>
                        {leagues.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="tournamentId">Tournament</Label>
                    <Select value={form.tournamentId} onValueChange={(v) => setField("tournamentId", v)}>
                      <SelectTrigger id="tournamentId">
                        <SelectValue placeholder="Select tournament" />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="homeTeamId">Home Team</Label>
                  <Select value={form.homeTeamId} onValueChange={(v) => setField("homeTeamId", v)}>
                    <SelectTrigger id="homeTeamId">
                      <SelectValue placeholder="Select home team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{getTeamName(t.id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="awayTeamId">Away Team</Label>
                  <Select value={form.awayTeamId} onValueChange={(v) => setField("awayTeamId", v)}>
                    <SelectTrigger id="awayTeamId">
                      <SelectValue placeholder="Select away team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams
                        .filter((t) => t.id !== form.homeTeamId)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>{getTeamName(t.id)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledAt">Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setField("scheduledAt", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    placeholder="e.g. National Hockey Stadium"
                    value={form.venue}
                    onChange={(e) => setField("venue", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Officials */}
          <Card>
            <CardHeader><CardTitle>Match Officials</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {umpires.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Umpires</p>
                  <div className="grid grid-cols-2 gap-2">
                    {umpires.map((o) => (
                      <label key={o.id + "-umpire"} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOfficialSelected(o.id, "umpire")}
                          onChange={() => toggleOfficial(o, "umpire")}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{o.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {umpires.length > 0 && tableOperators.length > 0 && <Separator />}

              {tableOperators.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Table Operators</p>
                  <div className="grid grid-cols-2 gap-2">
                    {tableOperators.map((o) => (
                      <label key={o.id + "-table_operator"} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOfficialSelected(o.id, "table_operator")}
                          onChange={() => toggleOfficial(o, "table_operator")}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{o.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {umpires.length === 0 && tableOperators.length === 0 && (
                <p className="text-sm text-gray-500">No active officials registered. Add officials in the Officials section first.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Match"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/matches">Cancel</Link>
            </Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
