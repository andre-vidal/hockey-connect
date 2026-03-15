"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { UserProfile, Club, UserRole } from "@/types";
import { UserPlus, ToggleLeft, ToggleRight } from "lucide-react";

const roleColors: Record<UserRole, "default" | "secondary" | "warning" | "success" | "outline"> = {
  root: "default",
  league_admin: "default",
  match_official: "warning",
  team_admin: "success",
  player: "secondary",
  public: "outline",
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", displayName: "", clubId: "" });
  const [inviting, setInviting] = useState(false);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

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

  async function toggleUserActive(user: UserProfile) {
    setTogglingUid(user.uid);
    try {
      const res = await fetch(`/api/users/${user.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isActive: !u.isActive } : u))
      );
      toast({
        title: "User updated",
        description: `${user.displayName ?? user.email} has been ${!user.isActive ? "activated" : "deactivated"}.`,
      });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update user", variant: "destructive" });
    } finally {
      setTogglingUid(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.displayName) {
      toast({ title: "Required", description: "Email and display name are required.", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      toast({ title: "Invite sent", description: `Invitation sent to ${inviteForm.email}.` });
      setShowInviteModal(false);
      setInviteForm({ email: "", displayName: "", clubId: "" });
      // Refresh users list
      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => {});
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to invite", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  }

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
      key: "clubId",
      header: "Club ID",
      cell: (row) => <span className="text-xs text-gray-500 font-mono">{(row.clubId as string) || "—"}</span>,
    },
    {
      key: "isActive",
      header: "Active",
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
        const isToggling = togglingUid === user.uid;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleUserActive(user)}
            disabled={isToggling}
            title={user.isActive ? "Deactivate user" : "Activate user"}
          >
            {user.isActive ? (
              <ToggleRight className="h-4 w-4 text-green-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-gray-400" />
            )}
            <span className="ml-1.5">{user.isActive ? "Deactivate" : "Activate"}</span>
          </Button>
        );
      },
    },
  ];

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Users"
        description="Manage registered users and their access."
        actions={
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Invite Club Admin
          </Button>
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

        {/* Invite Modal */}
        <Modal open={showInviteModal} onOpenChange={setShowInviteModal}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Invite Club Admin</ModalTitle>
            </ModalHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@club.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteName">Display Name <span className="text-red-500">*</span></Label>
                <Input
                  id="inviteName"
                  value={inviteForm.displayName}
                  onChange={(e) => setInviteForm((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteClub">Club</Label>
                <Select
                  value={inviteForm.clubId || "none"}
                  onValueChange={(v) => setInviteForm((p) => ({ ...p, clubId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="inviteClub">
                    <SelectValue placeholder="Select a club..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No club</SelectItem>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ModalFooter>
                <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
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
