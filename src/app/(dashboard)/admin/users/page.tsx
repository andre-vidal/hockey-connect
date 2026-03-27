"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { useRole } from "@/hooks/useRole";
import { UserProfile, Club, UserRole } from "@/types";
import { UserPlus, Pencil } from "lucide-react";

const ALL_ROLES: UserRole[] = [
  "root",
  "league_admin",
  "match_official",
  "club_admin",
  "team_admin",
  "player",
  "public",
];

// Lower = more privileged
const ROLE_LEVEL: Record<UserRole, number> = {
  root: 0,
  league_admin: 1,
  match_official: 2,
  club_admin: 2,
  team_admin: 3,
  player: 4,
  public: 5,
};

const roleColors: Record<
  UserRole,
  "default" | "secondary" | "warning" | "success" | "outline"
> = {
  root: "default",
  league_admin: "default",
  match_official: "warning",
  club_admin: "success",
  team_admin: "success",
  player: "secondary",
  public: "outline",
};

function callerMinLevel(roles: UserRole[]): number {
  if (roles.length === 0) return 99;
  return Math.min(...roles.map((r) => ROLE_LEVEL[r] ?? 99));
}

interface EditForm {
  roles: UserRole[];
  isActive: boolean;
  clubId: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { roles: myRoles, isRoot, isLeagueAdmin } = useRole();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    displayName: "",
    clubId: "",
  });
  const [inviting, setInviting] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    roles: [],
    isActive: true,
    clubId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/clubs").then((r) => r.json()),
    ])
      .then(([uData, cData]) => {
        if (uData.error) throw new Error(uData.error);
        setUsers(uData.users ?? []);
        setClubs(cData.clubs ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(user: UserProfile) {
    setEditTarget(user);
    setEditForm({
      roles: user.roles ?? [],
      isActive: user.isActive,
      clubId: user.clubId ?? "",
    });
  }

  function toggleEditRole(role: UserRole) {
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  }

  const handleSave = useCallback(async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        roles: editForm.roles,
        isActive: editForm.isActive,
      };
      if (isLeagueAdmin || isRoot) {
        payload.clubId = editForm.clubId || null;
      }
      const res = await fetch(`/api/users/${editTarget.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editTarget.uid
            ? {
                ...u,
                roles: editForm.roles,
                isActive: editForm.isActive,
                clubId: editForm.clubId || null,
              }
            : u,
        ),
      );
      toast({ title: "User updated" });
      setEditTarget(null);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editTarget, editForm, isLeagueAdmin, isRoot, toast]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      toast({
        title: "Invite sent",
        description: `Invitation sent to ${inviteForm.email}.`,
      });
      setShowInviteModal(false);
      setInviteForm({ email: "", displayName: "", clubId: "" });
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {});
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to invite",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  }

  // Roles the current user is allowed to assign (same level or below)
  const myLevel = callerMinLevel(myRoles);
  const assignableRoles = ALL_ROLES.filter((r) => ROLE_LEVEL[r] >= myLevel);

  const columns: Column<UserProfile & Record<string, unknown>>[] = [
    {
      key: "displayName",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {(row.displayName as string) || "—"}
        </span>
      ),
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
            <Badge
              key={role}
              variant={roleColors[role]}
              className="text-xs capitalize"
            >
              {role.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "clubId",
      header: "Club",
      cell: (row) => {
        const club = clubs.find((c) => c.id === (row.clubId as string));
        return (
          <span className="text-sm text-gray-600">
            {club?.name ?? (row.clubId ? "—" : "None")}
          </span>
        );
      },
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
      cell: (row) => {
        const user = row as unknown as UserProfile;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(user)}
            title="Edit user"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  return (
    <AuthGuard requiredRoles={["league_admin", "club_admin"]}>
      <DashboardShell
        title="Users"
        description="Manage registered users and their access."
        actions={
          isLeagueAdmin || isRoot ? (
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Invite Club Admin
            </Button>
          ) : undefined
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={users as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search users..."
          loading={loading}
          emptyMessage="No users found."
        />

        {/* Edit User Modal */}
        <Modal
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Edit User</ModalTitle>
            </ModalHeader>
            <div className="space-y-5 mt-4">
              {/* Name / email (read-only) */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  {editTarget?.displayName || editTarget?.email}
                </p>
                {editTarget?.displayName && (
                  <p className="text-xs text-gray-400">{editTarget.email}</p>
                )}
              </div>

              {/* Roles multi-select */}
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
                  {assignableRoles.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={editForm.roles.includes(role)}
                        onChange={() => toggleEditRole(role)}
                      />
                      <span className="text-sm capitalize">
                        {role.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Club assignment — only editable by league_admin / root */}
              <div className="space-y-1">
                <Label htmlFor="editClub">
                  Club
                  {!isLeagueAdmin && !isRoot && (
                    <span className="ml-2 text-xs text-gray-400">
                      (managed by League Admin)
                    </span>
                  )}
                </Label>
                <Select
                  value={editForm.clubId || "none"}
                  onValueChange={(v) =>
                    setEditForm((f) => ({
                      ...f,
                      clubId: v === "none" ? "" : v,
                    }))
                  }
                  disabled={!isLeagueAdmin && !isRoot}
                >
                  <SelectTrigger id="editClub">
                    <SelectValue placeholder="No club assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No club</SelectItem>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="editActive">Active</Label>
                <Switch
                  id="editActive"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm((f) => ({ ...f, isActive: checked }))
                  }
                />
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Invite Modal */}
        <Modal open={showInviteModal} onOpenChange={setShowInviteModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Invite Club Admin</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="admin@club.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteName">
                  Display Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="inviteName"
                  value={inviteForm.displayName}
                  onChange={(e) =>
                    setInviteForm((p) => ({
                      ...p,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteClub">
                  Club <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={inviteForm.clubId}
                  onValueChange={(v) =>
                    setInviteForm((p) => ({ ...p, clubId: v }))
                  }
                  required
                >
                  <SelectTrigger id="inviteClub">
                    <SelectValue placeholder="Select a club..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ModalFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviting}>
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
