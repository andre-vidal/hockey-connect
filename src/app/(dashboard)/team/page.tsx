import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamDashboardPage() {
  return (
    <DashboardShell title="Team Dashboard" description="Manage your players, squads, and matches">
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Set up your team by adding players and building your squad.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
