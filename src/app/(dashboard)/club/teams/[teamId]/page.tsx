"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Team, UserProfile } from "@/types";

export default function EditClubTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [teamAdmins, setTeamAdmins] = useState<UserProfile[]>([]);
  const [form, setForm] = useState({ name: "", gender: "", ageGroup: "", division: "", teamAdminId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!profile?.clubId) return;
    Promise.all([
      fetch(`/api/clubs/${profile.clubId}/teams/${teamId}`).then((r) => r.json()),
      fetch(`/api/users?role=team_admin`).then((r) => r.json()),
    ])
      .then(([teamData, usersData]) => {
        if (teamData.error) throw new Error(teamData.error);
        const t: Team = teamData.team;
        setTeam(t);
        setForm({
          name: t.name ?? "",
          gender: t.gender ?? "",
          ageGroup: t.ageGroup ?? "",
          division: t.division ?? "",
          teamAdminId: t.teamAdminId ?? "",
        });
        setTeamAdmins(usersData.users ?? []);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profile?.clubId, teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clubId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          gender: form.gender,
          ageGroup: form.ageGroup,
          division: form.division,
          teamAdminId: form.teamAdminId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Team updated" });
      router.push("/club/teams");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.clubId || !confirm("Delete this team? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Team deleted" });
      router.push("/club/teams");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRoles={["club_admin"]}>
        <DashboardShell title="Edit Team"><p className="text-sm text-gray-500">Loading...</p></DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title={team?.name ?? "Edit Team"} description="Update team details.">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Team Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input id="ageGroup" value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="division">Division</Label>
                <Input id="division" value={form.division} onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="teamAdminId">Team Admin</Label>
                <Select
                  value={form.teamAdminId || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, teamAdminId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="teamAdminId"><SelectValue placeholder="No team admin assigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No team admin —</SelectItem>
                    {teamAdmins.map((u) => (
                      <SelectItem key={u.uid} value={u.uid}>
                        {u.displayName || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                </div>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Team"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
