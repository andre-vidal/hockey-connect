"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Player } from "@/types";

export default function ViewTeamPlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.clubId) return;
    fetch(`/api/clubs/${profile.clubId}/players/${playerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayer(data.player);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [profile?.clubId, playerId]);

  if (loading) {
    return (
      <AuthGuard requiredRoles={["team_admin"]}>
        <DashboardShell title="Player"><p className="text-sm text-gray-500">Loading...</p></DashboardShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell
        title={player ? `${player.firstName} ${player.lastName}` : "Player"}
        description="Player details (read-only)."
      >
        {player ? (
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Player Details
                <Badge variant={player.claimedByUserId ? "success" : "outline"}>
                  {player.claimedByUserId ? "Claimed" : "Unclaimed"}
                </Badge>
                <Badge variant={player.status === "active" ? "success" : "secondary"} className="capitalize">
                  {player.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Name</dt><dd>{player.firstName} {player.lastName}</dd></div>
                {player.email && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Email</dt><dd>{player.email}</dd></div>}
                {player.phone && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Phone</dt><dd>{player.phone}</dd></div>}
                {player.dateOfBirth && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Date of Birth</dt><dd>{player.dateOfBirth}</dd></div>}
                {player.gender && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Gender</dt><dd className="capitalize">{player.gender}</dd></div>}
                {player.nationality && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Nationality</dt><dd>{player.nationality}</dd></div>}
                {player.position && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Position</dt><dd className="capitalize">{player.position}</dd></div>}
                {player.jerseyNumber !== undefined && <div className="flex gap-2"><dt className="w-32 font-medium text-gray-500">Jersey #</dt><dd>{player.jerseyNumber}</dd></div>}
              </dl>
              <div className="mt-6">
                <Button variant="outline" onClick={() => router.back()}>Back</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-gray-500">Player not found.</p>
        )}
      </DashboardShell>
    </AuthGuard>
  );
}
