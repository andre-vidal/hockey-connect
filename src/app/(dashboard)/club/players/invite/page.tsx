"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Mail } from "lucide-react";

export default function InviteClubPlayerPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", position: "", jerseyNumber: "" });
  const [saving, setSaving] = useState(false);

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
      };
      const res = await fetch(`/api/clubs/${profile.clubId}/players/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Invite sent",
        description: `${form.firstName} ${form.lastName} will receive an email to claim their profile.`,
      });
      router.push("/club/players");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send invite", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="Invite Player" description="Invite a player via email to join your roster.">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Player Invitation
            </CardTitle>
            <CardDescription>
              A player record will be created immediately in &quot;unclaimed&quot; state. The player will receive
              an email with a link to create their account and claim the profile.
            </CardDescription>
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
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} required placeholder="player@example.com" />
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

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving || !form.firstName || !form.lastName || !form.email}>
                  {saving ? "Sending..." : "Send Invitation"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
