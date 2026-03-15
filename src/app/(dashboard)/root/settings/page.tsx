"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { AppSettings } from "@/types";

export default function RootSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSettings(data.settings);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: settings.siteName,
          siteDescription: settings.siteDescription,
          maintenanceMode: settings.maintenanceMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      setSettings(data.settings);
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRoles={["root"]}>
        <DashboardShell title="Settings">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        </DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["root"]}>
      <DashboardShell title="Settings" description="Manage application-wide settings.">
        {settings && (
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">General</h2>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings((p) => p ? { ...p, siteName: e.target.value } : p)}
                    placeholder="Hockey Connect"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings((p) => p ? { ...p, siteDescription: e.target.value } : p)}
                    placeholder="The platform for hockey leagues and tournaments."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Maintenance Mode</h2>
              <Separator />
              <div className="flex items-start gap-4 p-4 rounded-lg border border-orange-200 bg-orange-50">
                <Switch
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(v) => setSettings((p) => p ? { ...p, maintenanceMode: v } : p)}
                />
                <div>
                  <Label htmlFor="maintenanceMode" className="font-medium cursor-pointer">
                    Enable Maintenance Mode
                  </Label>
                  <p className="text-sm text-gray-600 mt-0.5">
                    When enabled, all users will be redirected to the maintenance page. Synced to Firebase Realtime Database.
                  </p>
                </div>
              </div>
              {settings.maintenanceMode && (
                <div className="rounded-md bg-orange-100 border border-orange-300 px-4 py-3 text-sm text-orange-800 font-medium">
                  Warning: Maintenance mode is currently ON. All public and dashboard routes are inaccessible to regular users.
                </div>
              )}
            </section>

            {settings.updatedAt && (
              <p className="text-xs text-gray-400">
                Last updated: {new Date(settings.updatedAt).toLocaleString()}
              </p>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}
