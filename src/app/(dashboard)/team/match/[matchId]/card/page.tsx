"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchCardView } from "@/components/match/MatchCardView";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { MatchCard } from "@/types";
import { Loader2 } from "lucide-react";

export default function TeamMatchCardPage() {
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <TeamMatchCardContent />
    </AuthGuard>
  );
}

function TeamMatchCardContent() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { profile } = useAuth();
  const { toast } = useToast();

  const [matchCard, setMatchCard] = useState<MatchCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatchCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/matchcard`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load match card");
      setMatchCard(data.matchCard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match card");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatchCard();
  }, [loadMatchCard]);

  const handleConfirm = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/matchcard/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm match card");
      toast({ title: "Match card confirmed", description: "Your confirmation has been recorded." });
      await loadMatchCard();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to confirm",
        variant: "destructive",
      });
    }
  }, [matchId, toast, loadMatchCard]);

  const handleDispute = useCallback(
    async (disputedEvents: { eventId: string; comment: string }[]) => {
      try {
        const res = await fetch(`/api/matches/${matchId}/matchcard/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disputedEvents }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to submit dispute");
        toast({ title: "Dispute submitted", description: "Your dispute has been recorded." });
        await loadMatchCard();
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to submit dispute",
          variant: "destructive",
        });
      }
    },
    [matchId, toast, loadMatchCard]
  );

  return (
    <DashboardShell title="Match Card" description="Review and confirm the official match record.">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          {error.includes("not found") || error.includes("finalized")
            ? "Match card will be available once the match is finalized by the official."
            : error}
        </div>
      )}

      {!loading && matchCard && (
        <MatchCardView
          matchCard={matchCard}
          userRole="team_admin"
          userClubId={profile?.clubId ?? undefined}
          onConfirm={handleConfirm}
          onDispute={handleDispute}
        />
      )}
    </DashboardShell>
  );
}
