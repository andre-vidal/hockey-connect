"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { League, TournamentStatus } from "@/types";

interface FormState {
  name: string;
  description: string;
  leagueId: string;
  venue: string;
  startDate: string;
  endDate: string;
  matchConfig: { numberOfIntervals: number; intervalDuration: number; halfTimeDuration: number };
  squadSetupWindow: { isOpen: boolean; openDate: string; closeDate: string };
  status: TournamentStatus;
}

const defaultForm: FormState = {
  name: "",
  description: "",
  leagueId: "",
  venue: "",
  startDate: "",
  endDate: "",
  matchConfig: { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
  squadSetupWindow: { isOpen: false, openDate: "", closeDate: "" },
  status: "upcoming",
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);

  useEffect(() => {
    fetch("/api/leagues")
      .then((res) => res.json())
      .then((data) => setLeagues(data.leagues ?? []))
      .catch(() => {});
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.venue || !form.startDate || !form.endDate) {
      toast({ title: "Validation Error", description: "Name, venue, start date, and end date are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, leagueId: form.leagueId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create tournament");
      toast({ title: "Tournament created", description: `${form.name} has been created.` });
      router.push("/admin/tournaments");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create tournament", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell title="New Tournament" description="Create a new tournament or event.">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="National Championship 2026" required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leagueId">League (optional)</Label>
                <Select value={form.leagueId} onValueChange={(v) => setField("leagueId", v === "none" ? "" : v)}>
                  <SelectTrigger id="leagueId"><SelectValue placeholder="Select league..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No league</SelectItem>
                    {leagues.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venue">Venue <span className="text-red-500">*</span></Label>
                <Input id="venue" value={form.venue} onChange={(e) => setField("venue", e.target.value)} placeholder="National Stadium" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date <span className="text-red-500">*</span></Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v as TournamentStatus)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Match Config */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Match Configuration</h2>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Number of Intervals</Label>
                <Input type="number" min={1} value={form.matchConfig.numberOfIntervals} onChange={(e) => setField("matchConfig", { ...form.matchConfig, numberOfIntervals: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Interval Duration (min)</Label>
                <Input type="number" min={1} value={form.matchConfig.intervalDuration} onChange={(e) => setField("matchConfig", { ...form.matchConfig, intervalDuration: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Half-Time Duration (min)</Label>
                <Input type="number" min={0} value={form.matchConfig.halfTimeDuration} onChange={(e) => setField("matchConfig", { ...form.matchConfig, halfTimeDuration: Number(e.target.value) })} />
              </div>
            </div>
          </section>

          {/* Squad Setup Window */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Squad Setup Window</h2>
            <Separator />
            <div className="flex items-center gap-3 mb-4">
              <Switch id="squadIsOpen" checked={form.squadSetupWindow.isOpen} onCheckedChange={(v) => setField("squadSetupWindow", { ...form.squadSetupWindow, isOpen: v })} />
              <Label htmlFor="squadIsOpen">Window is Open</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Open Date</Label>
                <Input type="date" value={form.squadSetupWindow.openDate} onChange={(e) => setField("squadSetupWindow", { ...form.squadSetupWindow, openDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Close Date</Label>
                <Input type="date" value={form.squadSetupWindow.closeDate} onChange={(e) => setField("squadSetupWindow", { ...form.squadSetupWindow, closeDate: e.target.value })} />
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Tournament"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/tournaments">Cancel</Link></Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
