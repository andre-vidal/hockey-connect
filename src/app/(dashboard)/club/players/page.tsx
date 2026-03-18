"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Player } from "@/types";
import { Plus, Upload, Pencil, Mail, Send, Trash2 } from "lucide-react";

const STATUS_VARIANTS: Record<string, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  active: "success",
  inactive: "secondary",
  injured: "warning",
  suspended: "destructive",
};

export default function ClubPlayersPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [inviteTarget, setInviteTarget] = useState<Player | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.clubId) return;
    setLoading(true);
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`/api/clubs/${profile.clubId}/players${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(data.players);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile?.clubId, statusFilter]);

  async function handleDelete() {
    if (!deleteTarget || !profile?.clubId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clubs/${profile.clubId}/players/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to remove player");
      setPlayers((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast({ title: "Player removed", description: `${deleteTarget.firstName} ${deleteTarget.lastName} has been removed from the roster.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to remove", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function openInviteDialog(player: Player) {
    setInviteTarget(player);
    setInviteEmail(player.email ?? "");
    setInviteError(null);
  }

  function closeInviteDialog() {
    setInviteTarget(null);
    setInviteEmail("");
    setInviteError(null);
  }

  async function handleSendInvite() {
    if (!inviteTarget || !profile?.clubId) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      if (inviteEmail !== inviteTarget.email) {
        const emailRes = await fetch(`/api/clubs/${profile.clubId}/players/${inviteTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail }),
        });
        const emailData = await emailRes.json();
        if (!emailRes.ok) throw new Error(emailData.error ?? "Failed to update email");
        setInviteTarget(emailData.player);
        setPlayers((prev) => prev.map((p) => (p.id === inviteTarget.id ? emailData.player : p)));
      }
      const res = await fetch(`/api/clubs/${profile.clubId}/players/${inviteTarget.id}/invite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      setPlayers((prev) => prev.map((p) => (p.id === inviteTarget.id ? data.player : p)));
      closeInviteDialog();
      toast({ title: "Invite sent", description: `An invite email was sent to ${inviteEmail}.` });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  }

  const columns: Column<Player & Record<string, unknown>>[] = [
    {
      key: "lastName",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {row.firstName as string} {row.lastName as string}
        </span>
      ),
    },
    { key: "position", header: "Position", cell: (row) => <span className="capitalize">{(row.position as string) || "—"}</span> },
    { key: "jerseyNumber", header: "#", cell: (row) => row.jerseyNumber ?? "—" },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status as string] ?? "outline"} className="capitalize">
          {row.status as string}
        </Badge>
      ),
    },
    {
      key: "claimedByUserId",
      header: "Claimed",
      cell: (row) => (
        <Badge variant={row.claimedByUserId ? "success" : "outline"}>
          {row.claimedByUserId ? "Yes" : "Unclaimed"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/club/players/${row.id}`}>
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          {!row.claimedByUserId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInviteDialog(row as unknown as Player)}
            >
              <Send className="h-3 w-3 mr-1" />
              {row.inviteToken ? "Resend Invite" : "Send Invite"}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row as unknown as Player)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell
        title="Players"
        description="Manage your club roster."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/club/players/import">
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/club/players/invite">
                <Mail className="h-4 w-4 mr-1" />
                Invite Player
              </Link>
            </Button>
            <Button asChild>
              <Link href="/club/players/new">
                <Plus className="h-4 w-4 mr-1" />
                Add Player
              </Link>
            </Button>
          </div>
        }
      >
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="injured">Injured</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={players as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search players..."
          loading={loading}
          emptyMessage="No players found. Add players manually or import via CSV."
        />
      </DashboardShell>

      <Modal open={!!inviteTarget} onOpenChange={(open) => { if (!open) closeInviteDialog(); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {inviteTarget?.inviteToken ? "Resend Invite" : "Send Invite"} — {inviteTarget?.firstName} {inviteTarget?.lastName}
            </ModalTitle>
            <ModalDescription>
              {inviteTarget?.inviteToken
                ? "An invite has already been sent. You can resend it or update the email address first."
                : "Send an invite email so this player can register and claim their profile."}
            </ModalDescription>
          </ModalHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
              disabled={inviteLoading}
              placeholder="player@example.com"
            />
          </div>

          {inviteError && (
            <p className="mt-3 text-sm text-red-600">{inviteError}</p>
          )}

          <ModalFooter className="mt-6">
            <Button
              onClick={handleSendInvite}
              disabled={inviteLoading || !inviteEmail}
            >
              <Send className="h-4 w-4 mr-1" />
              {inviteTarget?.inviteToken ? "Resend" : "Send"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Remove Player</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 mt-2">
            Are you sure you want to remove <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> from the roster? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove Player"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AuthGuard>
  );
}
