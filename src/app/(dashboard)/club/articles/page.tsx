import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleListPage } from "@/components/articles/ArticleListPage";

export default function ClubArticlesPage() {
  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="Articles" description="News and announcements from the league.">
        <ArticleListPage articleHrefPrefix="/club/articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
