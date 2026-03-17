import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamArticlesPage() {
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell title="Articles" description="View news and announcements for your team.">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Articles will be available in a future update.</p>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
