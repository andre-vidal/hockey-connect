"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditClubPlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [player, setPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "",
    gender: "", nationality: "", position: "", jerseyNumber: "", status: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.clubId) return;
    fetch(`/api/clubs/${profile.clubId}/players/${playerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const p: Player = data.player;
        setPlayer(p);
        setForm({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email ?? "",
          phone: p.phone ?? "",
          dateOfBirth: p.dateOfBirth ?? "",
          gender: p.gender ?? "",
          nationality: p.nationality ?? "",
          position: p.position ?? "",
          jerseyNumber: p.jerseyNumber?.toString() ?? "",
          status: p.status,
        });
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profile?.clubId, playerId]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clubId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        jerseyNumber: form.jerseyNumber ? parseInt(form.jerseyNumber, 10) : null,
        email: form.email || null,
      };
      const res = await fetch(`/api/clubs/${profile.clubId}/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Player updated" });
      router.push("/club/players");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.clubId || !confirm("Remove this player from the roster? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/players/${playerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Player removed" });
      router.push("/club/players");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRoles={["club_admin"]}>
        <DashboardShell title="Edit Player"><p className="text-sm text-gray-500">Loading...</p></DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title={player ? `${player.firstName} ${player.lastName}` : "Edit Player"}
        description="Update player details and status."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Player Details
              {player && (
                <Badge variant={player.claimedByUserId ? "success" : "outline"}>
                  {player.claimedByUserId ? "Claimed" : "Unclaimed"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={form.firstName} onChange={set("firstName")} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={form.lastName} onChange={set("lastName")} required />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={set("phone")} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="position">Position</Label>
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
                <div className="space-y-1">
                  <Label htmlFor="jerseyNumber">Jersey Number</Label>
                  <Input id="jerseyNumber" type="number" min="1" max="99" value={form.jerseyNumber} onChange={set("jerseyNumber")} />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="injured">Injured</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                </div>
                <Button type="button" variant="destructive" onClick={handleDelete}>Remove</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
