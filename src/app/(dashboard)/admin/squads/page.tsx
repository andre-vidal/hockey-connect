"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { Squad } from "@/types";
import { CheckCircle, XCircle } from "lucide-react";

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "warning" | "success" | "destructive"> = {
  draft: "outline",
  submitted: "warning",
  approved: "success",
  rejected: "destructive",
};

export default function AdminSquadsPage() {
  const { toast } = useToast();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("submitted");

  // Review modal
  const [reviewing, setReviewing] = useState<Squad | null>(null);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchSquads = useCallback(() => {
    setLoading(true);
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    fetch(`/api/squads${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSquads(data.squads);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [statusFilter, toast]);

  useEffect(() => { fetchSquads(); }, [fetchSquads]);

  const openReview = (squad: Squad, defaultAction: "approve" | "reject") => {
    setReviewing(squad);
    setAction(defaultAction);
    setRejectionReason("");
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/squads/${reviewing.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: rejectionReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: action === "approve" ? "Squad approved" : "Squad rejected",
        description: action === "reject" ? `Reason: ${rejectionReason}` : undefined,
      });
      setReviewing(null);
      fetchSquads();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to review", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const columns: Column<Squad & Record<string, unknown>>[] = [
    {
      key: "clubId",
      header: "Club",
      cell: (row) => <span className="font-mono text-xs">{(row.clubId as string).slice(0, 8)}…</span>,
    },
    {
      key: "teamId",
      header: "Team",
      cell: (row) => <span className="font-mono text-xs">{(row.teamId as string).slice(0, 8)}…</span>,
    },
    {
      key: "leagueId",
      header: "League / Tournament",
      cell: (row) => (row.leagueId as string) || (row.tournamentId as string) || "—",
    },
    { key: "season", header: "Season", cell: (row) => (row.season as string) || "—" },
    {
      key: "players",
      header: "Players",
      cell: (row) => (row.players as unknown[])?.length ?? 0,
    },
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
      key: "submittedAt",
      header: "Submitted",
      cell: (row) => row.submittedAt ? new Date(row.submittedAt as string).toLocaleDateString() : "—",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-1">
          {(row.status as string) === "submitted" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => openReview(row as unknown as Squad, "approve")}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => openReview(row as unknown as Squad, "reject")}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell
        title="Squad Approvals"
        description="Review and approve squad submissions from team admins."
      >
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns as Column<Record<string, unknown>>[]}
          data={squads as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search squads..."
          loading={loading}
          emptyMessage={`No ${statusFilter !== "all" ? statusFilter : ""} squads found.`}
        />

        {/* Review modal */}
        <Modal open={!!reviewing} onOpenChange={(open) => { if (!open) setReviewing(null); }}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Review Squad</ModalTitle>
            </ModalHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>Decision</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={action === "approve" ? "default" : "outline"}
                    onClick={() => setAction("approve")}
                    className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={action === "reject" ? "destructive" : "outline"}
                    onClick={() => setAction("reject")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              {action === "reject" && (
                <div className="space-y-1">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the squad is being rejected..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
                <Button
                  onClick={submitReview}
                  disabled={submittingReview || (action === "reject" && !rejectionReason.trim())}
                  variant={action === "reject" ? "destructive" : "default"}
                >
                  {submittingReview ? "Submitting..." : `Confirm ${action === "approve" ? "Approval" : "Rejection"}`}
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      </DashboardShell>
    </AuthGuard>
  );
}
