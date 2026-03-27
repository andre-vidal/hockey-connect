"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { UserProfile, OfficialType } from "@/types";
import { cn } from "@/lib/utils";

const OFFICIAL_TYPES: { value: OfficialType; label: string }[] = [
  { value: "umpire", label: "Umpire" },
  { value: "table_operator", label: "Table Operator" },
  { value: "technical_delegate", label: "Technical Delegate" },
  { value: "medical_officer", label: "Medical Officer" },
];

interface FormState {
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  officialTypes: OfficialType[];
  certificationLevel: string;
}

const defaultForm: FormState = {
  userId: "",
  displayName: "",
  email: "",
  phone: "",
  officialTypes: [],
  certificationLevel: "",
};

export default function NewOfficialPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => {});
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  function selectUser(user: UserProfile) {
    setForm((prev) => ({
      ...prev,
      userId: user.uid,
      displayName: user.displayName ?? "",
      email: user.email ?? "",
    }));
    setUserSearch(user.displayName ?? user.email ?? "");
  }

  function toggleType(type: OfficialType) {
    setForm((prev) => ({
      ...prev,
      officialTypes: prev.officialTypes.includes(type)
        ? prev.officialTypes.filter((t) => t !== type)
        : [...prev.officialTypes, type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create official");
      toast({ title: "Official registered", description: `${form.displayName} has been registered.` });
      router.push("/admin/officials");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create official", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell title="Add Official" description="Register a new match official.">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
          {/* User Selection */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select User</h2>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="userSearch">Search Users <span className="text-red-500">*</span></Label>
              <Input
                id="userSearch"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  if (!e.target.value) setForm((p) => ({ ...p, userId: "", displayName: "", email: "" }));
                }}
                placeholder="Search by name or email..."
              />
              {userSearch && !form.userId && filteredUsers.length > 0 && (
                <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm mt-1">
                  {filteredUsers.slice(0, 8).map((u) => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 text-left"
                    >
                      <span className="font-medium text-sm">{u.displayName || "No name"}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.userId && (
                <div className="mt-2 p-3 rounded-md bg-primary-50 border border-primary-200 text-sm">
                  <span className="font-medium text-primary-700">Selected:</span>{" "}
                  {form.displayName} ({form.email})
                  <button
                    type="button"
                    className="ml-3 text-xs text-red-600 hover:underline"
                    onClick={() => {
                      setForm((p) => ({ ...p, userId: "", displayName: "", email: "" }));
                      setUserSearch("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Official Details */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Official Details</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+27 82 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="certificationLevel">Certification Level</Label>
                <Input id="certificationLevel" value={form.certificationLevel} onChange={(e) => setForm((p) => ({ ...p, certificationLevel: e.target.value }))} placeholder="International, National, Provincial..." />
              </div>
            </div>
          </section>

          {/* Official Types */}
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
                      checked
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:bg-gray-50"
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
            <Button type="submit" disabled={saving}>{saving ? "Registering..." : "Register Official"}</Button>
            <Button type="button" variant="outline" asChild><Link href="/admin/officials">Cancel</Link></Button>
          </div>
        </form>
      </DashboardShell>
    </AuthGuard>
  );
}
