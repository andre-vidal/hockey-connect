"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { UpcomingMatchesWidget } from "@/components/match/UpcomingMatchesWidget";
import { ArticlesWidget } from "@/components/articles/ArticlesWidget";
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
        <ArticlesWidget viewAllHref="/official/articles" articleHrefPrefix="/official/articles" limit={3} />
      </DashboardShell>
    </AuthGuard>
  );
}
