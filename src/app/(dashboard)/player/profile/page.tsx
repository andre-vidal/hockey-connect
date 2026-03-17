"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Player } from "@/types";

export default function PlayerProfilePage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [player, setPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState({ phone: "", dateOfBirth: "", gender: "", nationality: "", position: "", photoUrl: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.clubId || !profile?.uid) return;

    // Find the player record claimed by this user
    fetch(`/api/clubs/${profile.clubId}/players`)
      .then((r) => r.json())
      .then((data) => {
        const found: Player | undefined = (data.players as Player[])?.find(
          (p) => p.claimedByUserId === profile.uid
        );
        if (found) {
          setPlayer(found);
          setForm({
            phone: found.phone ?? "",
            dateOfBirth: found.dateOfBirth ?? "",
            gender: found.gender ?? "",
            nationality: found.nationality ?? "",
            position: found.position ?? "",
            photoUrl: found.photoUrl ?? "",
          });
        }
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profile?.clubId, profile?.uid]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !profile?.clubId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayer(data.player);
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRoles={["player", "club_admin", "team_admin", "match_official"]}>
        <DashboardShell title="My Profile"><p className="text-sm text-gray-500">Loading...</p></DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["player", "club_admin", "team_admin", "match_official"]}>
      <DashboardShell title="My Profile" description="Manage your player profile information.">
        {!player ? (
          <Card className="max-w-lg">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">
                No player profile is linked to your account. Contact your team admin to be added to the roster.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {player.firstName} {player.lastName}
                <Badge variant="outline" className="capitalize">{player.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Jersey #</span>
                  <p className="font-medium">{player.jerseyNumber ?? "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Position</span>
                  <p className="font-medium capitalize">{player.position || "—"}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={set("phone")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                      <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input id="nationality" value={form.nationality} onChange={set("nationality")} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="position">Preferred Position</Label>
                  <Select value={form.position} onValueChange={(v) => setForm((f) => ({ ...f, position: v }))}>
                    <SelectTrigger id="position"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                      <SelectItem value="defender">Defender</SelectItem>
                      <SelectItem value="midfielder">Midfielder</SelectItem>
                      <SelectItem value="forward">Forward</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}
