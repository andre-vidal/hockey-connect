import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfficialDashboardPage() {
  return (
    <DashboardShell title="Match Official Dashboard" description="Your upcoming matches and assignments">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No upcoming match assignments.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
