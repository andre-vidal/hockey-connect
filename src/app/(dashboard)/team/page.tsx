import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamDashboardPage() {
  return (
    <DashboardShell title="Team Dashboard" description="View your team details and manage squad submissions.">
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Use the navigation to view your team, players, and manage squad submissions.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
