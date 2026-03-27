"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ArticleDetailPage } from "@/components/articles/ArticleDetailPage";

export default function ClubArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  return (
    <AuthGuard requiredRoles={["club_admin"]}>
      <DashboardShell title="" description="">
        <ArticleDetailPage articleId={articleId} backHref="/club/articles" backLabel="Back to Articles" />
      </DashboardShell>
    </AuthGuard>
  );
}
