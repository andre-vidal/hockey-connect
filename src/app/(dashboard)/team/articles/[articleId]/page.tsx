"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleDetailPage } from "@/components/articles/ArticleDetailPage";

export default function TeamArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  return (
    <AuthGuard requiredRoles={["team_admin"]}>
      <DashboardShell title="" description="">
        <ArticleDetailPage articleId={articleId} backHref="/team/articles" backLabel="Back to Articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
