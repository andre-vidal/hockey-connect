import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Swords, FileText } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <DashboardShell title="League Admin Dashboard" description="Manage your leagues, clubs, and competitions">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Leagues", value: "—", icon: Trophy, color: "text-blue-600 bg-blue-50" },
          { label: "Registered Clubs", value: "—", icon: Users, color: "text-green-600 bg-green-50" },
          { label: "Scheduled Matches", value: "—", icon: Swords, color: "text-purple-600 bg-purple-50" },
          { label: "Published Articles", value: "—", icon: FileText, color: "text-orange-600 bg-orange-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No recent activity. Start by creating a league or club.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
