"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { UserProfile, UserRole } from "@/types";
import { Pencil } from "lucide-react";

// Roles a club_admin can assign (same level or below)
const ASSIGNABLE_ROLES: UserRole[] = ["match_official", "club_admin", "team_admin", "player", "public"];

const roleColors: Record<UserRole, "default" | "secondary" | "warning" | "success" | "outline"> = {
  root: "default",
  league_admin: "default",
  match_official: "warning",
  club_admin: "success",
  team_admin: "success",
  player: "secondary",
  public: "outline",
};

interface EditForm {
  roles: UserRole[];
  isActive: boolean;
}

export default function ClubUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ roles: [], isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUsers(data.users ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(user: UserProfile) {
    setEditTarget(user);
    setEditForm({ roles: user.roles ?? [], isActive: user.isActive });
  }

  function toggleRole(role: UserRole) {
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  }

  const handleSave = useCallback(async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editTarget.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: editForm.roles, isActive: editForm.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editTarget.uid
            ? { ...u, roles: editForm.roles, isActive: editForm.isActive }
            : u
        )
      );
      toast({ title: "User updated" });
      setEditTarget(null);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [editTarget, editForm, toast]);

  const columns: Column<UserProfile & Record<string, unknown>>[] = [
    {
      key: "displayName",
      header: "Name",
      sortable: true,
      cell: (row) => <span className="font-medium">{(row.displayName as string) || "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.roles as UserRole[])?.map((role) => (
            <Badge key={role} variant={roleColors[role]} className="text-xs capitalize">
              {role.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "secondary"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEdit(row as unknown as UserProfile)}
          title="Edit user"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="Club Users" description="Manage users belonging to your club.">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={users as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search users..."
          loading={loading}
          emptyMessage="No users found for your club."
        />

        <Modal open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Edit User</ModalTitle>
            </ModalHeader>
            <div className="space-y-5 mt-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">{editTarget?.displayName || editTarget?.email}</p>
                {editTarget?.displayName && (
                  <p className="text-xs text-gray-400">{editTarget.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
                  {ASSIGNABLE_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={editForm.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <span className="text-sm capitalize">{role.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="editActive">Active</Label>
                <Switch
                  id="editActive"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm((f) => ({ ...f, isActive: checked }))}
                />
              </div>
            </div>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
