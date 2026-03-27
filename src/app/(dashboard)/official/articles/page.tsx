import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleListPage } from "@/components/articles/ArticleListPage";

export default function OfficialArticlesPage() {
  return (
    <AuthGuard requiredRoles={["match_official"]}>
      <DashboardShell title="Articles" description="News and announcements from the league.">
        <ArticleListPage articleHrefPrefix="/official/articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
