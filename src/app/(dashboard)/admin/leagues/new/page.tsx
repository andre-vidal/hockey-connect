"use client";

import { useState } from "react";
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
import { Gender, LeagueStatus } from "@/types";

interface FormState {
  name: string;
  description: string;
  country: string;
  division: string;
  gender: Gender;
  ageGroup: string;
  matchConfig: { numberOfIntervals: number; intervalDuration: number; halfTimeDuration: number };
  transferWindow: { isOpen: boolean; openDate: string; closeDate: string };
  squadSetupWindow: { isOpen: boolean; openDate: string; closeDate: string };
  season: { currentSeason: string; startDate: string; endDate: string };
  status: LeagueStatus;
}

const defaultForm: FormState = {
  name: "",
  description: "",
  country: "",
  division: "",
  gender: "male",
  ageGroup: "",
  matchConfig: { numberOfIntervals: 2, intervalDuration: 35, halfTimeDuration: 10 },
  transferWindow: { isOpen: false, openDate: "", closeDate: "" },
  squadSetupWindow: { isOpen: false, openDate: "", closeDate: "" },
  season: { currentSeason: "", startDate: "", endDate: "" },
  status: "active",
};

export default function NewLeaguePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create league");
      toast({ title: "League created", description: `${form.name} has been created.` });
      router.push("/admin/leagues");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create league", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="New League"
        description="Create a new league and configure its settings."
      >
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Premier League" required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Optional description..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="South Africa" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="division">Division</Label>
                <Input id="division" value={form.division} onChange={(e) => setField("division", e.target.value)} placeholder="Division 1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                <Select value={form.gender} onValueChange={(v) => setField("gender", v as Gender)}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input id="ageGroup" value={form.ageGroup} onChange={(e) => setField("ageGroup", e.target.value)} placeholder="Under 18" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v as LeagueStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
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
                <Label htmlFor="numIntervals">Number of Intervals</Label>
                <Input
                  id="numIntervals"
                  type="number"
                  min={1}
                  value={form.matchConfig.numberOfIntervals}
                  onChange={(e) => setField("matchConfig", { ...form.matchConfig, numberOfIntervals: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intervalDuration">Interval Duration (min)</Label>
                <Input
                  id="intervalDuration"
                  type="number"
                  min={1}
                  value={form.matchConfig.intervalDuration}
                  onChange={(e) => setField("matchConfig", { ...form.matchConfig, intervalDuration: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="halfTimeDuration">Half-Time Duration (min)</Label>
                <Input
                  id="halfTimeDuration"
                  type="number"
                  min={0}
                  value={form.matchConfig.halfTimeDuration}
                  onChange={(e) => setField("matchConfig", { ...form.matchConfig, halfTimeDuration: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>

          {/* Transfer Window */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Transfer Window</h2>
            <Separator />
            <div className="flex items-center gap-3 mb-4">
              <Switch
                id="transferIsOpen"
                checked={form.transferWindow.isOpen}
                onCheckedChange={(v) => setField("transferWindow", { ...form.transferWindow, isOpen: v })}
              />
              <Label htmlFor="transferIsOpen">Window is Open</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="transferOpen">Open Date</Label>
                <Input id="transferOpen" type="date" value={form.transferWindow.openDate} onChange={(e) => setField("transferWindow", { ...form.transferWindow, openDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transferClose">Close Date</Label>
                <Input id="transferClose" type="date" value={form.transferWindow.closeDate} onChange={(e) => setField("transferWindow", { ...form.transferWindow, closeDate: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Squad Setup Window */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Squad Setup Window</h2>
            <Separator />
            <div className="flex items-center gap-3 mb-4">
              <Switch
                id="squadIsOpen"
                checked={form.squadSetupWindow.isOpen}
                onCheckedChange={(v) => setField("squadSetupWindow", { ...form.squadSetupWindow, isOpen: v })}
              />
              <Label htmlFor="squadIsOpen">Window is Open</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="squadOpen">Open Date</Label>
                <Input id="squadOpen" type="date" value={form.squadSetupWindow.openDate} onChange={(e) => setField("squadSetupWindow", { ...form.squadSetupWindow, openDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="squadClose">Close Date</Label>
                <Input id="squadClose" type="date" value={form.squadSetupWindow.closeDate} onChange={(e) => setField("squadSetupWindow", { ...form.squadSetupWindow, closeDate: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Season */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Season</h2>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentSeason">Season Name</Label>
                <Input id="currentSeason" value={form.season.currentSeason} onChange={(e) => setField("season", { ...form.season, currentSeason: e.target.value })} placeholder="2025/2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seasonStart">Start Date</Label>
                <Input id="seasonStart" type="date" value={form.season.startDate} onChange={(e) => setField("season", { ...form.season, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seasonEnd">End Date</Label>
                <Input id="seasonEnd" type="date" value={form.season.endDate} onChange={(e) => setField("season", { ...form.season, endDate: e.target.value })} />
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create League"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/leagues">Cancel</Link>
            </Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
