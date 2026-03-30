"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchCardView } from "@/components/match/MatchCardView";
import { useToast } from "@/hooks/useToast";
import { MatchCard } from "@/types";
import { Loader2 } from "lucide-react";

export default function OfficialMatchCardPage() {
  return (
    <AuthGuard requiredRoles={["match_official"]}>
      <OfficialMatchCardContent />
    </AuthGuard>
  );
}

function OfficialMatchCardContent() {
  const params = useParams();
  const matchId = params.matchId as string;
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

  void toast;

  return (
    <DashboardShell title="Match Card" description="Official record for this match.">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          {error.includes("not found") || error.includes("finalized")
            ? "Match card will be available once the match has been finalized."
            : error}
        </div>
      )}

      {!loading && matchCard && (
        <MatchCardView
          matchCard={matchCard}
          userRole="match_official"
        />
      )}
    </DashboardShell>
  );
}
