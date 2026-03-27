"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleDetailPage } from "@/components/articles/ArticleDetailPage";

export default function PlayerArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  return (
    <AuthGuard requiredRoles={["player"]}>
      <DashboardShell title="" description="">
        <ArticleDetailPage articleId={articleId} backHref="/player/articles" backLabel="Back to Articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
