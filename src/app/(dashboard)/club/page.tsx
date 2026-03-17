import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClubDashboardPage() {
  return (
    <DashboardShell title="Club Dashboard" description="Manage your club's teams, players, and squads.">
      <Card>
        <CardHeader>
          <CardTitle>Club Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Use the navigation to manage your teams, players, and squad submissions.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
