"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { uploadFile } from "@/lib/firebase/storage";

// Generate a client-side ID by using a random string
function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

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
}

const defaultForm: FormState = {
  name: "",
  shortName: "",
  primaryColor: "#16a34a",
  secondaryColor: "#ffffff",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  country: "",
  foundedYear: "",
  logoUrl: "",
};

export default function NewClubPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const clubId = useState(() => generateId())[0];

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let logoUrl = form.logoUrl;

      if (logoFile) {
        setUploadingLogo(true);
        try {
          logoUrl = await uploadFile(`clubs/${clubId}/logo`, logoFile);
        } finally {
          setUploadingLogo(false);
        }
      }

      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: clubId,
          logoUrl,
          foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create club");
      toast({ title: "Club created", description: `${form.name} has been created.` });
      router.push("/admin/clubs");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create club", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell title="New Club" description="Create a new hockey club.">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Club Name <span className="text-red-500">*</span></Label>
                <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Springfield Hockey Club" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortName">Short Name</Label>
                <Input id="shortName" value={form.shortName} onChange={(e) => setField("shortName", e.target.value)} placeholder="SHC" maxLength={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="foundedYear">Founded Year</Label>
                <Input id="foundedYear" type="number" value={form.foundedYear} onChange={(e) => setField("foundedYear", e.target.value)} placeholder="1995" min={1800} max={2100} />
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
                <Label htmlFor="logo">Upload Logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                <p className="text-xs text-gray-500">PNG, JPG, SVG up to 5MB. Will be uploaded to Firebase Storage.</p>
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
                  <Input value={form.primaryColor} onChange={(e) => setField("primaryColor", e.target.value)} placeholder="#16a34a" className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <Input id="secondaryColor" type="color" value={form.secondaryColor} onChange={(e) => setField("secondaryColor", e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                  <Input value={form.secondaryColor} onChange={(e) => setField("secondaryColor", e.target.value)} placeholder="#ffffff" className="flex-1" />
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
                <Input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="club@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+27 11 000 0000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://club.example.com" />
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
                <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="123 Main Street" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Johannesburg" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="South Africa" />
              </div>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving || uploadingLogo}>
              {uploadingLogo ? "Uploading logo..." : saving ? "Creating..." : "Create Club"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/clubs">Cancel</Link>
            </Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
