"use client";

import { useEffect, useState } from "react";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Article } from "@/types";
import { FileText } from "lucide-react";

interface ArticleListPageProps {
  articleHrefPrefix: string;
}

export function ArticleListPage({ articleHrefPrefix }: ArticleListPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <FileText className="h-12 w-12 mb-3" />
        <p className="font-medium">No articles published yet.</p>
        <p className="text-sm mt-1">Check back soon for news and updates.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          href={`${articleHrefPrefix}/${article.id}`}
        />
      ))}
    </div>
  );
}

