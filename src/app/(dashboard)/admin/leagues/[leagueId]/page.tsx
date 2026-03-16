"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { League, Gender, LeagueStatus } from "@/types";
import { Trash2, CalendarPlus } from "lucide-react";

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

export default function EditLeaguePage() {
  const router = useRouter();
  const params = useParams<{ leagueId: string }>();
  const leagueId = params.leagueId;
  const { toast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [newSeason, setNewSeason] = useState({ currentSeason: "", startDate: "", endDate: "" });
  const [creatingseason, setCreatingSeason] = useState(false);

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const l: League = data.league;
        setForm({
          name: l.name,
          description: l.description ?? "",
          country: l.country,
          division: l.division ?? "",
          gender: l.gender,
          ageGroup: l.ageGroup ?? "",
          matchConfig: l.matchConfig,
          transferWindow: l.transferWindow,
          squadSetupWindow: l.squadSetupWindow,
          season: l.season,
          status: l.status,
        });
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [leagueId, toast]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update league");
      toast({ title: "League updated", description: "Changes saved successfully." });
      router.push("/admin/leagues");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete league");
      toast({ title: "League deleted", description: "The league has been removed." });
      router.push("/admin/leagues");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleCreateSeason() {
    if (!newSeason.currentSeason) {
      toast({ title: "Required", description: "Season name is required.", variant: "destructive" });
      return;
    }
    setCreatingSeason(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSeason),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create season");
      toast({ title: "Season created", description: `Season ${newSeason.currentSeason} is now active.`, variant: "success" });
      setForm((prev) => prev ? { ...prev, season: newSeason } : prev);
      setShowSeasonModal(false);
      setNewSeason({ currentSeason: "", startDate: "", endDate: "" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create season", variant: "destructive" });
    } finally {
      setCreatingSeason(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit League">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        </DashboardShell>
      </AuthGuard>
    );
  }

  if (!form) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="League not found">
          <Button asChild variant="outline"><Link href="/admin/leagues">Back to Leagues</Link></Button>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit League"
        description="Update league settings and configuration."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSeasonModal(true)}>
              <CalendarPlus className="h-4 w-4 mr-1" />
              New Season
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="division">Division</Label>
                <Input id="division" value={form.division} onChange={(e) => setField("division", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setField("gender", v as Gender)}>
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input id="ageGroup" value={form.ageGroup} onChange={(e) => setField("ageGroup", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v as LeagueStatus)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
                <Input id="numIntervals" type="number" min={1} value={form.matchConfig.numberOfIntervals} onChange={(e) => setField("matchConfig", { ...form.matchConfig, numberOfIntervals: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intervalDuration">Interval Duration (min)</Label>
                <Input id="intervalDuration" type="number" min={1} value={form.matchConfig.intervalDuration} onChange={(e) => setField("matchConfig", { ...form.matchConfig, intervalDuration: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="halfTimeDuration">Half-Time Duration (min)</Label>
                <Input id="halfTimeDuration" type="number" min={0} value={form.matchConfig.halfTimeDuration} onChange={(e) => setField("matchConfig", { ...form.matchConfig, halfTimeDuration: Number(e.target.value) })} />
              </div>
            </div>
          </section>

          {/* Transfer Window */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Transfer Window</h2>
            <Separator />
            <div className="flex items-center gap-3 mb-4">
              <Switch id="transferIsOpen" checked={form.transferWindow.isOpen} onCheckedChange={(v) => setField("transferWindow", { ...form.transferWindow, isOpen: v })} />
              <Label htmlFor="transferIsOpen">Window is Open</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Open Date</Label>
                <Input type="date" value={form.transferWindow.openDate} onChange={(e) => setField("transferWindow", { ...form.transferWindow, openDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Close Date</Label>
                <Input type="date" value={form.transferWindow.closeDate} onChange={(e) => setField("transferWindow", { ...form.transferWindow, closeDate: e.target.value })} />
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

          {/* Season */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Season</h2>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Season Name</Label>
                <Input value={form.season.currentSeason} onChange={(e) => setField("season", { ...form.season, currentSeason: e.target.value })} placeholder="2025/2026" />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.season.startDate} onChange={(e) => setField("season", { ...form.season, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.season.endDate} onChange={(e) => setField("season", { ...form.season, endDate: e.target.value })} />
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/leagues">Cancel</Link></Button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Delete League</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete League"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* New Season Modal */}
        <Modal open={showSeasonModal} onOpenChange={setShowSeasonModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Start New Season</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-gray-500 mt-1">
              The current season ({form.season.currentSeason || "none"}) will be archived.
            </p>
            <div className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Season Name <span className="text-red-500">*</span></Label>
                <Input value={newSeason.currentSeason} onChange={(e) => setNewSeason((p) => ({ ...p, currentSeason: e.target.value }))} placeholder="2026/2027" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={newSeason.startDate} onChange={(e) => setNewSeason((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={newSeason.endDate} onChange={(e) => setNewSeason((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => setShowSeasonModal(false)}>Cancel</Button>
              <Button onClick={handleCreateSeason} disabled={creatingseason}>
                {creatingseason ? "Creating..." : "Create Season"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
