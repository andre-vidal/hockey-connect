"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { UpcomingMatchesWidget } from "@/components/match/UpcomingMatchesWidget";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function OfficialDashboardPage() {
  return (
    <AuthGuard requiredRoles={["match_official"]}>
      <DashboardShell title="Match Official Dashboard" description="Your upcoming matches and assignments">
        <UpcomingMatchesWidget
          title="Upcoming Assignments"
          viewAllHref="/official/matches"
          limit={5}
        />
      </DashboardShell>
    </AuthGuard>
  );
}
