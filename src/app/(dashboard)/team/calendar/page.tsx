import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamCalendarPage() {
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell title="Calendar" description="View your team's upcoming schedule.">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">The calendar will be available in a future update.</p>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
