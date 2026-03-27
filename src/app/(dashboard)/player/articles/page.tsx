import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleListPage } from "@/components/articles/ArticleListPage";

export default function PlayerArticlesPage() {
  return (
    <AuthGuard requiredRoles={["player"]}>
      <DashboardShell title="Articles" description="News and announcements from the league.">
        <ArticleListPage articleHrefPrefix="/player/articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
