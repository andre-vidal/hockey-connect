"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { Club } from "@/types";
import { uploadFile } from "@/lib/firebase/storage";
import { Trash2, Archive } from "lucide-react";

interface FormState {
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  foundedYear: string;
  logoUrl: string;
  isActive: boolean;
  isArchived: boolean;
}

export default function EditClubPage() {
  const router = useRouter();
  const params = useParams<{ clubId: string }>();
  const clubId = params.clubId;
  const { toast } = useToast();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clubs/${clubId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const c: Club = data.club;
        setForm({
          name: c.name,
          shortName: c.shortName ?? "",
          primaryColor: c.primaryColor ?? "#16a34a",
          secondaryColor: c.secondaryColor ?? "#ffffff",
          email: c.email ?? "",
          phone: c.phone ?? "",
          website: c.website ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          country: c.country ?? "",
          foundedYear: c.foundedYear ? String(c.foundedYear) : "",
          logoUrl: c.logoUrl ?? "",
          isActive: c.isActive,
          isArchived: c.isArchived,
        });
        if (c.logoUrl) setLogoPreview(c.logoUrl);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [clubId, toast]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      let logoUrl = form.logoUrl;
      if (logoFile) {
        logoUrl = await uploadFile(`clubs/${clubId}/logo`, logoFile);
      }

      const res = await fetch(`/api/clubs/${clubId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          logoUrl,
          foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update club");
      toast({ title: "Club updated", description: "Changes saved successfully." });
      router.push("/admin/clubs");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete club");
      toast({ title: "Club deleted", description: "The club has been removed." });
      router.push("/admin/clubs");
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
        <DashboardShell title="Edit Club">
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
        <DashboardShell title="Club not found">
          <Button asChild variant="outline"><Link href="/admin/clubs">Back to Clubs</Link></Button>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Edit Club"
        description="Update club information and settings."
        actions={
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        }
      >
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Club Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortName">Short Name</Label>
                <Input id="shortName" value={form.shortName} onChange={(e) => setField("shortName", e.target.value)} maxLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input id="foundedYear" type="number" value={form.foundedYear} onChange={(e) => setField("foundedYear", e.target.value)} min={1800} max={2100} />
              </div>
            </div>
          </section>

          {/* Status */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Status</h2>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => setField("isActive", v)}
                  disabled={form.isArchived}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isArchived"
                  checked={form.isArchived}
                  onCheckedChange={(v) => {
                    setField("isArchived", v);
                    if (v) setField("isActive", false);
                  }}
                />
                <Label htmlFor="isArchived" className="flex items-center gap-1.5">
                  <Archive className="h-4 w-4" />
                  Archive Club
                </Label>
              </div>
            </div>
          </section>

          {/* Logo */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Club Logo</h2>
            <Separator />
            <div className="flex items-start gap-6">
              {logoPreview && (
                <div className="relative h-24 w-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <Image src={logoPreview} alt="Logo preview" fill className="object-contain p-1" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="logo">Upload New Logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                <p className="text-xs text-gray-500">Leave blank to keep the current logo.</p>
              </div>
            </div>
          </section>

          {/* Colors */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Club Colors</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <Input id="primaryColor" type="color" value={form.primaryColor} onChange={(e) => setField("primaryColor", e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                  <Input value={form.primaryColor} onChange={(e) => setField("primaryColor", e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <Input id="secondaryColor" type="color" value={form.secondaryColor} onChange={(e) => setField("secondaryColor", e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                  <Input value={form.secondaryColor} onChange={(e) => setField("secondaryColor", e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={form.website} onChange={(e) => setField("website", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Location</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/clubs">Cancel</Link></Button>
          </div>
        </form>

        <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Delete Club</ModalTitle>
            </ModalHeader>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <strong>{form.name}</strong>? This action cannot be undone.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Club"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
