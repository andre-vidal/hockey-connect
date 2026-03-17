import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClubMatchesPage() {
  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="Matches" description="View and manage your club's matches.">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Match management will be available in a future update.</p>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
