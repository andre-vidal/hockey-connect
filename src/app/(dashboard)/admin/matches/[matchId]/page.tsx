"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { Match, MatchStatus, Club, Team, MatchOfficial, OfficialType } from "@/types";

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "warmup", label: "Warmup" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "confirmed", label: "Confirmed" },
];

const statusVariant: Record<MatchStatus, "secondary" | "success" | "default" | "outline" | "warning"> = {
  scheduled: "secondary",
  warmup: "warning",
  live: "success",
  completed: "default",
  confirmed: "outline",
};

interface OfficialAssignment {
  officialId: string;
  userId: string;
  displayName: string;
  type: OfficialType;
}

export default function EditMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [officials, setOfficials] = useState<MatchOfficial[]>([]);

  // Form state
  const [venue, setVenue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<MatchStatus>("scheduled");
  const [notes, setNotes] = useState("");
  const [selectedOfficials, setSelectedOfficials] = useState<OfficialAssignment[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${matchId}`).then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
      fetch("/api/officials").then((r) => r.json()),
    ]).then(([matchData, cl, of]) => {
      if (matchData.error) throw new Error(matchData.error);
      const m: Match = matchData.match;
      setMatch(m);
      setVenue(m.venue);
      setScheduledAt(toLocalDateTimeInput(m.scheduledAt));
      setStatus(m.status);
      setNotes(m.notes ?? "");
      setSelectedOfficials(m.officials ?? []);

      const clubList: Club[] = cl.clubs ?? [];
      setClubs(clubList);
      setOfficials((of.officials ?? []).filter((o: MatchOfficial) => o.isActive));

      const allTeamFetches = clubList.map((c: Club) =>
        fetch(`/api/clubs/${c.id}/teams`).then((r) => r.json()).then((d) => d.teams ?? []).catch(() => [])
      );
      return Promise.all(allTeamFetches);
    }).then((allTeams) => {
      setTeams(allTeams.flat());
    }).catch((err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  function toLocalDateTimeInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toggleOfficial(official: MatchOfficial, type: OfficialType) {
    setSelectedOfficials((prev) => {
      const exists = prev.find((o) => o.officialId === official.id && o.type === type);
      if (exists) {
        return prev.filter((o) => !(o.officialId === official.id && o.type === type));
      }
      return [...prev, { officialId: official.id, userId: official.userId, displayName: official.displayName, type }];
    });
  }

  function isOfficialSelected(officialId: string, type: OfficialType) {
    return selectedOfficials.some((o) => o.officialId === officialId && o.type === type);
  }

  function getTeamName(teamId: string): string {
    const t = teams.find((t) => t.id === teamId);
    if (!t) return teamId;
    const club = clubs.find((c) => c.id === t.clubId);
    return `${club?.name ? club.name + " — " : ""}${t.name}`;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!venue || !scheduledAt) {
      toast({ title: "Validation error", description: "Venue and date/time are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue,
          scheduledAt: new Date(scheduledAt).toISOString(),
          status,
          notes,
          officials: selectedOfficials,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update match");
      toast({ title: "Match updated", description: "Changes saved successfully." });
      router.push("/admin/matches");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete match");
      toast({ title: "Match deleted", description: "The match has been removed." });
      router.push("/admin/matches");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
      setDeleting(false);
      setShowDelete(false);
    }
  }

  const umpires = officials.filter((o) => o.officialTypes.includes("umpire"));
  const tableOperators = officials.filter((o) => o.officialTypes.includes("table_operator"));

  if (loading) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit Match">
          <p className="text-sm text-gray-500">Loading...</p>
        </DashboardShell>
      </AuthGuard>
    );
  }

  if (!match) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Match Not Found">
          <p className="text-sm text-gray-500">This match does not exist.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/matches">Back to Matches</Link>
          </Button>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit Match"
        description={`${match.homeTeamName} vs ${match.awayTeamName}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[match.status]}>
              <span className="capitalize">{match.status}</span>
            </Badge>
            <Button asChild variant="outline">
              <Link href="/admin/matches">Cancel</Link>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
          {/* Teams (read-only) */}
          <Card>
            <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Home</p>
                  <p className="font-medium">{getTeamName(match.homeTeamId)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Away</p>
                  <p className="font-medium">{getTeamName(match.awayTeamId)}</p>
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
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as MatchStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                <p className="text-sm text-gray-500">No active officials registered.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/matches">Cancel</Link>
            </Button>
            {match.status === "scheduled" && (
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                onClick={() => setShowDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      </DashboardShell>

      <Modal open={showDelete} onOpenChange={setShowDelete}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Match</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to delete the match between{" "}
            <strong>{match.homeTeamName}</strong> and{" "}
            <strong>{match.awayTeamName}</strong>? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Match"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
