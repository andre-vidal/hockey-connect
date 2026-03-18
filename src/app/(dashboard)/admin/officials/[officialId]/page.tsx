"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { MatchOfficial, OfficialType } from "@/types";
import { cn } from "@/lib/utils";

const OFFICIAL_TYPES: { value: OfficialType; label: string }[] = [
  { value: "umpire", label: "Umpire" },
  { value: "table_operator", label: "Table Operator" },
  { value: "technical_delegate", label: "Technical Delegate" },
  { value: "medical_officer", label: "Medical Officer" },
];

interface FormState {
  displayName: string;
  email: string;
  phone: string;
  officialTypes: OfficialType[];
  certificationLevel: string;
  isActive: boolean;
}

export default function EditOfficialPage() {
  const router = useRouter();
  const params = useParams<{ officialId: string }>();
  const officialId = params.officialId;
  const { toast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/officials/${officialId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const o: MatchOfficial = data.official;
        setForm({
          displayName: o.displayName,
          email: o.email,
          phone: o.phone ?? "",
          officialTypes: o.officialTypes,
          certificationLevel: o.certificationLevel ?? "",
          isActive: o.isActive,
        });
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [officialId, toast]);

  function toggleType(type: OfficialType) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            officialTypes: prev.officialTypes.includes(type)
              ? prev.officialTypes.filter((t) => t !== type)
              : [...prev.officialTypes, type],
          }
        : prev
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.officialTypes.length === 0) {
      toast({ title: "Validation Error", description: "Select at least one official type.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/officials/${officialId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update official");
      toast({ title: "Official updated", description: "Changes saved successfully." });
      router.push("/admin/officials");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRoles={["league_admin"]}>
        <DashboardShell title="Edit Official">
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
        <DashboardShell title="Official not found">
          <Button asChild variant="outline"><Link href="/admin/officials">Back to Officials</Link></Button>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit Official"
        description="Update official registration details."
      >
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => p ? { ...p, displayName: e.target.value } : p)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => p ? { ...p, email: e.target.value } : p)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => p ? { ...p, phone: e.target.value } : p)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="certificationLevel">Certification Level</Label>
                <Input
                  id="certificationLevel"
                  value={form.certificationLevel}
                  onChange={(e) => setForm((p) => p ? { ...p, certificationLevel: e.target.value } : p)}
                />
              </div>
              <div className="flex items-center gap-3 self-end pb-1">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => p ? { ...p, isActive: v } : p)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Official Types <span className="text-red-500">*</span></h2>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {OFFICIAL_TYPES.map(({ value, label }) => {
                const checked = form.officialTypes.includes(value);
                return (
                  <label
                    key={value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      checked ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(value)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    />
                    <span className={cn("text-sm font-medium", checked ? "text-primary-700" : "text-gray-700")}>
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/officials">Cancel</Link></Button>
          </div>
        </form>

      </DashboardShell>
    </AuthGuard>
  );
}
