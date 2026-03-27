"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Article } from "@/types";
import { ArrowLeft, Calendar, User } from "lucide-react";

interface ArticleDetailPageProps {
  articleId: string;
  backHref: string;
  backLabel?: string;
}

function ArticleContent({ content }: { content: Record<string, unknown> }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ HTMLAttributes: { class: "text-primary-600 underline" } }),
    ],
    content,
    editable: false,
  });

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none"
    />
  );
}

export function ArticleDetailPage({ articleId, backHref, backLabel = "Back" }: ArticleDetailPageProps) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setArticle(d.article);
      })
      .catch((err) => {
        if (err.message === "Article not found" || err.message === "Forbidden") {
          router.replace(backHref);
        } else {
          setError(err.message);
        }
      });
  }, [articleId, backHref, router]);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${80 + Math.random() * 20}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-gray-500">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Link>
      </Button>

      {article.headerImageUrl && (
        <div className="relative h-64 w-full rounded-xl overflow-hidden mb-6 bg-gray-100">
          <Image
            src={article.headerImageUrl}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-3">{article.title}</h1>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
        <span className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          {article.authorName}
        </span>
        {publishedDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {publishedDate}
          </span>
        )}
      </div>

      <div className="border-t border-gray-100 pt-6">
        <ArticleContent content={article.content} />
      </div>
    </div>
  );
}
