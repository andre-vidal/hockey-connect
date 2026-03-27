import type { APIRequestContext } from "@playwright/test";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const EMPTY_CONTENT = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Seeds a single article via the API. Requires league_admin credentials.
 */
export async function seedArticle(
  request: APIRequestContext,
  overrides: Partial<{
    title: string;
    status: string;
    visibility: string[];
  }> = {}
): Promise<{ id: string; [key: string]: unknown }> {
  const title = overrides.title ?? `Test Article ${uid()}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

  const res = await request.post("/api/articles", {
    data: {
      title,
      slug,
      content: EMPTY_CONTENT,
      excerpt: "Test excerpt",
      status: overrides.status ?? "draft",
      visibility: overrides.visibility ?? ["public"],
    },
  });
  const data = await res.json();
  return data.article;
}

/**
 * Deletes articles by ID. Silently ignores errors.
 */
export async function cleanupArticles(request: APIRequestContext, ids: string[]) {
  await Promise.all(
    ids.map((id) => request.delete(`/api/articles/${id}`).catch(() => {}))
  );
}
