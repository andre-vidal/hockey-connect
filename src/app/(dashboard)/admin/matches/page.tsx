import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function AdminMatchesPage() {
  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell title="Matches" description="Schedule and manage matches">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Match scheduling coming in Phase 4</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;ll be able to schedule matches, assign officials, and manage the calendar here.
            </p>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
