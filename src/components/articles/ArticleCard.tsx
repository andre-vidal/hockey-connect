import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Article, ArticleStatus } from "@/types";
import { Calendar, User } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  href: string;
  showStatus?: boolean;
}

const statusColors: Record<ArticleStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

export function ArticleCard({ article, href, showStatus = false }: ArticleCardProps) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
        {article.headerImageUrl && (
          <div className="relative h-40 w-full bg-gray-100">
            <Image
              src={article.headerImageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 line-clamp-2 leading-snug">
              {article.title}
            </h3>
            {showStatus && (
              <Badge className={statusColors[article.status]} variant="outline">
                {article.status}
              </Badge>
            )}
          </div>
          {article.excerpt && (
            <p className="text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.authorName}
            </span>
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {publishedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
