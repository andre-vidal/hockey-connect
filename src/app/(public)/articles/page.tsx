import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArticleListPage } from "@/components/articles/ArticleListPage";

export default function PublicArticlesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="News" description="Latest articles and announcements.">
          <ArticleListPage articleHrefPrefix="/articles" />
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
