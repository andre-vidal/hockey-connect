"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { UserProfile } from "@/types";

export default function NewClubTeamPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    gender: "",
    ageGroup: "",
    division: "",
    teamAdminId: "",
  });
  const [teamAdmins, setTeamAdmins] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users?role=team_admin")
      .then((r) => r.json())
      .then((data) => setTeamAdmins(data.users ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clubId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teamAdminId: form.teamAdminId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Team created",
        description: `${form.name} has been created.`,
      });
      router.push("/club/teams");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title="New Team"
        description="Create a new team for your club."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Senior Men's First XI"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                  required
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input
                  id="ageGroup"
                  value={form.ageGroup}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ageGroup: e.target.value }))
                  }
                  placeholder="e.g. Senior, U21, U18"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  value={form.division}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, division: e.target.value }))
                  }
                  placeholder="e.g. Premier League, Division 1"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="teamAdminId">Team Admin</Label>
                <Select
                  value={form.teamAdminId || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, teamAdminId: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger id="teamAdminId">
                    <SelectValue placeholder="No team admin assigned" />
                  </SelectTrigger>
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

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Team"}
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
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
