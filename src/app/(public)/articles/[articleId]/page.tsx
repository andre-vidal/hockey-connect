"use client";

import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArticleDetailPage } from "@/components/articles/ArticleDetailPage";

export default function PublicArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="" description="">
          <ArticleDetailPage articleId={articleId} backHref="/articles" backLabel="Back to News" />
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
