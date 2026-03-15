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
import { League, Tournament, TournamentStatus } from "@/types";
import { Trash2 } from "lucide-react";

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

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params.tournamentId;
  const { toast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${tournamentId}`).then((r) => r.json()),
      fetch("/api/leagues").then((r) => r.json()),
    ])
      .then(([tData, lData]) => {
        if (tData.error) throw new Error(tData.error);
        const t: Tournament = tData.tournament;
        setForm({
          name: t.name,
          description: t.description ?? "",
          leagueId: t.leagueId ?? "",
          venue: t.venue,
          startDate: t.startDate,
          endDate: t.endDate,
          matchConfig: t.matchConfig,
          squadSetupWindow: t.squadSetupWindow,
          status: t.status,
        });
        setLeagues(lData.leagues ?? []);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [tournamentId, toast]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, leagueId: form.leagueId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update tournament");
      toast({ title: "Tournament updated", description: "Changes saved successfully." });
      router.push("/admin/tournaments");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete tournament");
      toast({ title: "Tournament deleted", description: "The tournament has been removed." });
      router.push("/admin/tournaments");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit Tournament">
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
        <DashboardShell title="Tournament not found">
          <Button asChild variant="outline"><Link href="/admin/tournaments">Back to Tournaments</Link></Button>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit Tournament"
        description="Update tournament details and configuration."
        actions={
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
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
                <Label htmlFor="leagueId">League (optional)</Label>
                <Select value={form.leagueId || "none"} onValueChange={(v) => setField("leagueId", v === "none" ? "" : v)}>
                  <SelectTrigger id="leagueId"><SelectValue /></SelectTrigger>
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
                <Input id="venue" value={form.venue} onChange={(e) => setField("venue", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
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
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/tournaments">Cancel</Link></Button>
          </div>
        </form>

        <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Delete Tournament</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Tournament"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
