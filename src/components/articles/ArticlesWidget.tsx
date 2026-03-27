"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Article } from "@/types";
import { FileText, ChevronRight } from "lucide-react";

interface ArticlesWidgetProps {
  title?: string;
  viewAllHref: string;
  limit?: number;
  articleHrefPrefix: string;
}

export function ArticlesWidget({
  title = "Latest Articles",
  viewAllHref,
  limit = 5,
  articleHrefPrefix,
}: ArticlesWidgetProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles?status=published")
      .then((r) => r.json())
      .then((d) => setArticles((d.articles ?? []).slice(0, limit)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs text-gray-500 h-auto py-1">
          <Link href={viewAllHref}>
            View all <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
            <FileText className="h-8 w-8 mb-2" />
            <p className="text-sm">No articles published yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`${articleHrefPrefix}/${article.id}`}
                  className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-50 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600 truncate">
                      {article.title}
                    </p>
                    {article.publishedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(article.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 bg-green-50 text-green-700">
                    {article.visibility.includes("public") ? "Public" : "Members"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
