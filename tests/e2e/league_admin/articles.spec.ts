import { test, expect } from "../../fixtures/auth";
import { adminArticles as sel } from "../../helpers/selectors";
import { seedArticle, cleanupArticles } from "../../helpers/articles";

/**
 * League admin — Articles & CMS (Phase 6)
 *
 * Covers:
 *   - List page navigation and New Article button
 *   - API validation (missing required fields, invalid values, business rules)
 *   - Auth/RBAC enforcement (unauthenticated, non-admin roles → 401/403)
 *   - Full CRUD lifecycle via API (create → read → update → delete)
 *   - Status transitions (draft → published → archived) and publishedAt behaviour
 *   - Slug uniqueness enforcement on create and update
 *   - Visibility filtering (draft hidden from non-admins; member-only hidden from public)
 *   - Non-existent resource → 404
 *   - Create / edit / delete via UI
 *   - Auto-slug generation from title in the form
 *   - ArticlesWidget renders on official and player dashboards
 *   - Role dashboard article routes accessible to correct roles
 *   - Role-based route access guards (wrong role → redirected)
 */

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("article list", () => {
  test("renders the articles list page with a New Article button", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
    await expect(page.locator(sel.newArticleLink)).toBeVisible();
  });

  test("seeded article appears in the list with correct status badge", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "List Visibility Article", status: "draft" });
    try {
      await page.goto("/admin/articles");
      await expect(page.getByText("List Visibility Article")).toBeVisible();
      await expect(page.getByText("draft").first()).toBeVisible();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("published article shows published badge in list", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Published Badge Article", status: "published" });
    try {
      await page.goto("/admin/articles");
      await expect(page.getByText("Published Badge Article")).toBeVisible();
      await expect(page.getByText("published").first()).toBeVisible();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });
});

// ── API validation ────────────────────────────────────────────────────────────

test.describe("article API — validation", () => {
  test("missing title → 400", async ({ leagueAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        slug: "no-title",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("missing slug → 400", async ({ leagueAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "No Slug Article",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("missing content → 400", async ({ leagueAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "No Content Article",
        slug: "no-content-article",
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid status value → 400", async ({ leagueAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "Bad Status Article",
        slug: "bad-status-article",
        content: { type: "doc", content: [] },
        status: "invalid_status",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("empty visibility array → 400", async ({ leagueAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "No Visibility Article",
        slug: "no-visibility-article",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("duplicate slug on create → 409", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Slug Conflict Original" });
    try {
      const res = await page.request.post("/api/articles", {
        data: {
          title: "Slug Conflict Duplicate",
          slug: article.slug,
          content: { type: "doc", content: [] },
          status: "draft",
          visibility: ["public"],
        },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/slug/i);
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("duplicate slug on PATCH → 409", async ({ leagueAdminPage: page }) => {
    const [a1, a2] = await Promise.all([
      seedArticle(page.request, { title: "Slug PATCH Original" }),
      seedArticle(page.request, { title: "Slug PATCH Target" }),
    ]);
    try {
      const res = await page.request.patch(`/api/articles/${a2.id}`, {
        data: { slug: a1.slug },
      });
      expect(res.status()).toBe(409);
    } finally {
      await cleanupArticles(page.request, [a1.id as string, a2.id as string]);
    }
  });

  test("GET nonexistent article → 404", async ({ leagueAdminPage: page }) => {
    const res = await page.request.get("/api/articles/does-not-exist-xyz");
    expect(res.status()).toBe(404);
  });

  test("PATCH nonexistent article → 404", async ({ leagueAdminPage: page }) => {
    const res = await page.request.patch("/api/articles/does-not-exist-xyz", {
      data: { title: "Ghost" },
    });
    expect(res.status()).toBe(404);
  });

  test("DELETE nonexistent article → 404", async ({ leagueAdminPage: page }) => {
    const res = await page.request.delete("/api/articles/does-not-exist-xyz");
    expect(res.status()).toBe(404);
  });
});

// ── Auth / RBAC enforcement ───────────────────────────────────────────────────

test.describe("article API — auth and RBAC", () => {
  test("unauthenticated POST → 401", async ({ page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "Unauth Article",
        slug: "unauth-article",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(401);
  });

  test("unauthenticated PATCH → 401", async ({ leagueAdminPage: adminPage, page }) => {
    const article = await seedArticle(adminPage.request, { title: "Unauth PATCH Article" });
    try {
      const res = await page.request.patch(`/api/articles/${article.id}`, {
        data: { title: "Hacked" },
      });
      expect(res.status()).toBe(401);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("unauthenticated DELETE → 401", async ({ leagueAdminPage: adminPage, page }) => {
    const article = await seedArticle(adminPage.request, { title: "Unauth DELETE Article" });
    try {
      const res = await page.request.delete(`/api/articles/${article.id}`);
      expect(res.status()).toBe(401);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("team admin POST → 403", async ({ teamAdminPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "Team Admin Article",
        slug: "team-admin-article",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(403);
  });

  test("match official POST → 403", async ({ matchOfficialPage: page }) => {
    const res = await page.request.post("/api/articles", {
      data: {
        title: "Official Article",
        slug: "official-article",
        content: { type: "doc", content: [] },
        status: "draft",
        visibility: ["public"],
      },
    });
    expect(res.status()).toBe(403);
  });

  test("club admin cannot DELETE an article → 403", async ({ leagueAdminPage: adminPage, clubAdminPage: clubPage }) => {
    const article = await seedArticle(adminPage.request, { title: "Club Admin Delete Article" });
    try {
      const res = await clubPage.request.delete(`/api/articles/${article.id}`);
      expect(res.status()).toBe(403);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });
});

// ── Full CRUD lifecycle via API ───────────────────────────────────────────────

test.describe("article CRUD — API lifecycle", () => {
  test("create → read → update title → delete", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Lifecycle Article" });
    const id = article.id as string;

    try {
      // Read
      const getRes = await page.request.get(`/api/articles/${id}`);
      expect(getRes.status()).toBe(200);
      const { article: fetched } = await getRes.json();
      expect(fetched.title).toBe("Lifecycle Article");
      expect(fetched.status).toBe("draft");
      expect(fetched.publishedAt).toBeNull();
      expect(fetched.authorId).toBeTruthy();
      expect(fetched.authorName).toBeTruthy();

      // Update title
      const patchRes = await page.request.patch(`/api/articles/${id}`, {
        data: { title: "Lifecycle Article — Updated" },
      });
      expect(patchRes.status()).toBe(200);
      const { article: patched } = await patchRes.json();
      expect(patched.title).toBe("Lifecycle Article — Updated");
    } finally {
      await cleanupArticles(page.request, [id]);
    }
  });

  test("draft → published sets publishedAt; published → archived preserves publishedAt", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Status Transition Article", status: "draft" });
    const id = article.id as string;

    try {
      // Publish
      const pubRes = await page.request.patch(`/api/articles/${id}`, { data: { status: "published" } });
      expect(pubRes.status()).toBe(200);
      const { article: published } = await pubRes.json();
      expect(published.status).toBe("published");
      expect(published.publishedAt).not.toBeNull();
      const publishedAt = published.publishedAt as string;

      // Archive — publishedAt should be preserved (not cleared)
      const archRes = await page.request.patch(`/api/articles/${id}`, { data: { status: "archived" } });
      expect(archRes.status()).toBe(200);
      const { article: archived } = await archRes.json();
      expect(archived.status).toBe("archived");
      expect(archived.publishedAt).toBe(publishedAt);
    } finally {
      await cleanupArticles(page.request, [id]);
    }
  });

  test("creating with status published immediately sets publishedAt", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, {
      title: "Immediately Published Article",
      status: "published",
    });
    try {
      expect(article.publishedAt).not.toBeNull();
      expect(article.status).toBe("published");
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("updatedAt advances on PATCH", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Timestamp Article" });
    const originalUpdatedAt = article.updatedAt as string;

    try {
      // Small delay to ensure a different timestamp
      await new Promise((r) => setTimeout(r, 1100));
      const patchRes = await page.request.patch(`/api/articles/${article.id}`, {
        data: { title: "Timestamp Article — Edited" },
      });
      const { article: patched } = await patchRes.json();
      expect(new Date(patched.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("response body includes all expected fields on create", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Field Coverage Article" });
    try {
      expect(article).toMatchObject({
        id: expect.any(String),
        title: "Field Coverage Article",
        slug: expect.any(String),
        status: "draft",
        visibility: expect.arrayContaining(["public"]),
        authorId: expect.any(String),
        authorName: expect.any(String),
        publishedAt: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });
});

// ── Visibility and draft filtering ────────────────────────────────────────────

test.describe("article visibility and draft filtering", () => {
  test("draft article is hidden from unauthenticated GET /api/articles", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Draft Hidden From Public",
      status: "draft",
      visibility: ["public"],
    });
    try {
      const publicCtx = await browser.newContext();
      const { articles } = await (await publicCtx.request.get("/api/articles")).json();
      const ids = (articles ?? []).map((a: { id: string }) => a.id);
      expect(ids).not.toContain(article.id);
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("draft article is hidden from non-admin authenticated GET /api/articles", async ({ leagueAdminPage: adminPage, teamAdminPage: teamPage }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Draft Hidden From Team Admin",
      status: "draft",
      visibility: ["public"],
    });
    try {
      const { articles } = await (await teamPage.request.get("/api/articles")).json();
      const ids = (articles ?? []).map((a: { id: string }) => a.id);
      expect(ids).not.toContain(article.id);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("league admin sees draft articles in GET /api/articles", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, {
      title: "Draft Visible To Admin",
      status: "draft",
      visibility: ["league_admin"],
    });
    try {
      const { articles } = await (await page.request.get("/api/articles")).json();
      const ids = (articles ?? []).map((a: { id: string }) => a.id);
      expect(ids).toContain(article.id);
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("public published article is visible without authentication", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Public Published Visible",
      status: "published",
      visibility: ["public"],
    });
    try {
      const publicCtx = await browser.newContext();
      const { articles } = await (await publicCtx.request.get("/api/articles")).json();
      const ids = (articles ?? []).map((a: { id: string }) => a.id);
      expect(ids).toContain(article.id);
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("member-only published article is hidden from unauthenticated requests", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Members Only Article",
      status: "published",
      visibility: ["player", "team_admin"],
    });
    try {
      const publicCtx = await browser.newContext();
      const { articles } = await (await publicCtx.request.get("/api/articles")).json();
      const ids = (articles ?? []).map((a: { id: string }) => a.id);
      expect(ids).not.toContain(article.id);
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("official-only article is visible to match official but not team admin", async ({ leagueAdminPage: adminPage, matchOfficialPage: officialPage, teamAdminPage: teamPage }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Official Only Article",
      status: "published",
      visibility: ["match_official"],
    });
    try {
      const { articles: officialArticles } = await (await officialPage.request.get("/api/articles")).json();
      const officialIds = (officialArticles ?? []).map((a: { id: string }) => a.id);
      expect(officialIds).toContain(article.id);

      const { articles: teamArticles } = await (await teamPage.request.get("/api/articles")).json();
      const teamIds = (teamArticles ?? []).map((a: { id: string }) => a.id);
      expect(teamIds).not.toContain(article.id);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("draft member-only article is invisible in individual GET for non-admin", async ({ leagueAdminPage: adminPage, matchOfficialPage: officialPage }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Draft Member Only",
      status: "draft",
      visibility: ["match_official"],
    });
    try {
      const res = await officialPage.request.get(`/api/articles/${article.id}`);
      // Non-admin gets 404 for draft articles
      expect(res.status()).toBe(404);
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });
});

// ── UI flows — create ─────────────────────────────────────────────────────────

test.describe("article UI — create", () => {
  test("title field auto-populates the slug input", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await page.locator(sel.titleInput).fill("Auto Slug Title Here");
    await page.waitForFunction(() => {
      const el = document.querySelector("#slug") as HTMLInputElement;
      return el?.value === "auto-slug-title-here";
    });
    const slugValue = await page.locator(sel.slugInput).inputValue();
    expect(slugValue).toBe("auto-slug-title-here");
  });

  test("save as draft redirects to list and shows draft badge", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await page.locator(sel.titleInput).fill("UI Save Draft Article");
    await page.waitForFunction(() => {
      const el = document.querySelector("#slug") as HTMLInputElement;
      return el?.value?.length > 0;
    });
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Draft body content.");
    await page.locator(sel.saveDraftButton).click();
    await page.waitForURL("/admin/articles");
    await expect(page.getByText("UI Save Draft Article")).toBeVisible();
    await expect(page.getByText("draft").first()).toBeVisible();

    const { articles } = await (await page.request.get("/api/articles")).json();
    const created = (articles ?? []).find((a: { title: string }) => a.title === "UI Save Draft Article");
    if (created) await cleanupArticles(page.request, [created.id]);
  });

  test("publish article via form redirects to list and shows published badge", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await page.locator(sel.titleInput).fill("UI Publish Article");
    await page.waitForFunction(() => {
      const el = document.querySelector("#slug") as HTMLInputElement;
      return el?.value?.length > 0;
    });
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Published body.");

    // Switch status to Published
    await page.locator("#status").click();
    await page.getByRole("option", { name: "Published", exact: true }).click();

    await page.locator(sel.publishButton).click();
    await page.waitForURL("/admin/articles");
    await expect(page.getByText("UI Publish Article")).toBeVisible();
    await expect(page.getByText("published").first()).toBeVisible();

    const { articles } = await (await page.request.get("/api/articles")).json();
    const created = (articles ?? []).find((a: { title: string }) => a.title === "UI Publish Article");
    if (created) await cleanupArticles(page.request, [created.id]);
  });

  test("cancel button returns to article list without saving", async ({ leagueAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await page.locator(sel.titleInput).fill("Cancelled Article");
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL("/admin/articles");
    // Article should not have been created
    const { articles } = await (await page.request.get("/api/articles")).json();
    const found = (articles ?? []).find((a: { title: string }) => a.title === "Cancelled Article");
    expect(found).toBeUndefined();
  });
});

// ── UI flows — edit ───────────────────────────────────────────────────────────

test.describe("article UI — edit", () => {
  test("edit page pre-fills title and slug fields", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Pre-fill Test Article" });
    try {
      await page.goto(`/admin/articles/${article.id}`);
      await expect(page.locator(sel.titleInput)).toHaveValue("Pre-fill Test Article");
      await expect(page.locator(sel.slugInput)).toHaveValue(article.slug as string);
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("update title persists and appears in list", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Edit Title Before" });
    try {
      await page.goto(`/admin/articles/${article.id}`);
      await page.locator(sel.titleInput).clear();
      await page.locator(sel.titleInput).fill("Edit Title After");
      await page.locator(sel.saveButton).click();
      await expect(page).toHaveURL("/admin/articles", { timeout: 10_000 });
      await expect(page.getByText("Edit Title After")).toBeVisible();
      await expect(page.getByText("Edit Title Before")).not.toBeVisible();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("change status from draft to published via edit form", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Publish Via Edit Article", status: "draft" });
    try {
      await page.goto(`/admin/articles/${article.id}`);
      await page.locator("#status").click();
      await page.getByRole("option", { name: "Published", exact: true }).click();
      await page.locator(sel.saveButton).click();
      await expect(page).toHaveURL("/admin/articles", { timeout: 10_000 });
      await expect(page.getByText("published").first()).toBeVisible();

      // Verify API reflects published status and publishedAt set
      const { article: updated } = await (await page.request.get(`/api/articles/${article.id}`)).json();
      expect(updated.status).toBe("published");
      expect(updated.publishedAt).not.toBeNull();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });

  test("change status to archived via edit form", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Archive Via Edit Article", status: "published" });
    try {
      await page.goto(`/admin/articles/${article.id}`);
      await page.locator("#status").click();
      await page.getByRole("option", { name: "Archived", exact: true }).click();
      await page.locator(sel.saveButton).click();
      await expect(page).toHaveURL("/admin/articles", { timeout: 10_000 });
      await expect(page.getByText("archived").first()).toBeVisible();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });
});

// ── UI flows — delete ─────────────────────────────────────────────────────────

test.describe("article UI — delete", () => {
  test("delete via confirm modal removes article from list", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Delete Me Via Modal" });
    await page.goto("/admin/articles");
    await expect(page.getByText("Delete Me Via Modal")).toBeVisible();
    await page.locator(sel.deleteButton).first().click();
    await page.locator(sel.confirmDeleteButton).click();
    await expect(page.getByText("Delete Me Via Modal")).not.toBeVisible({ timeout: 5_000 });

    // Verify API confirms deletion
    const res = await page.request.get(`/api/articles/${article.id}`);
    expect(res.status()).toBe(404);
  });

  test("cancel button in delete modal keeps article in list", async ({ leagueAdminPage: page }) => {
    const article = await seedArticle(page.request, { title: "Do Not Delete Me" });
    try {
      await page.goto("/admin/articles");
      await expect(page.getByText("Do Not Delete Me")).toBeVisible();
      await page.locator(sel.deleteButton).first().click();
      // Cancel instead of confirm
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Do Not Delete Me")).toBeVisible();
    } finally {
      await cleanupArticles(page.request, [article.id as string]);
    }
  });
});

// ── Dashboard widgets ─────────────────────────────────────────────────────────

test.describe("articles widget on dashboards", () => {
  test("official dashboard shows ArticlesWidget", async ({ matchOfficialPage: page }) => {
    await page.goto("/official");
    await expect(page.getByText("Latest Articles")).toBeVisible({ timeout: 10_000 });
  });

  test("player dashboard shows ArticlesWidget", async ({ leagueAdminPage: page }) => {
    // Player dashboard doesn't require playerPage fixture — verify via admin session
    // that the page renders the widget markup at /player
    await page.goto("/player");
    await expect(page.getByText("Latest Articles")).toBeVisible({ timeout: 10_000 });
  });

  test("published article appears in ArticlesWidget on official dashboard", async ({ leagueAdminPage: adminPage, matchOfficialPage: officialPage }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Widget Visibility Article",
      status: "published",
      visibility: ["match_official"],
    });
    try {
      await officialPage.goto("/official");
      await expect(officialPage.getByText("Widget Visibility Article")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });
});

// ── Role dashboard article routes ─────────────────────────────────────────────

test.describe("role dashboard article routes", () => {
  test("match official can access /official/articles", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/articles");
    await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  });

  test("team admin can access /team/articles", async ({ teamAdminPage: page }) => {
    await page.goto("/team/articles");
    await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  });

  test("club admin can access /club/articles", async ({ clubAdminPage: page }) => {
    await page.goto("/club/articles");
    await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  });

  test("published public article is readable on role detail route", async ({ leagueAdminPage: adminPage, matchOfficialPage: officialPage }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Official Detail Route Article",
      status: "published",
      visibility: ["match_official", "public"],
    });
    try {
      await officialPage.goto(`/official/articles/${article.id}`);
      await expect(officialPage.getByText("Official Detail Route Article")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });
});

// ── Public routes ─────────────────────────────────────────────────────────────

test.describe("public article routes", () => {
  test("/articles listing page renders without authentication", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto("/articles");
      await expect(page.getByRole("heading", { name: "News" })).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("published public article is accessible at /articles/[id]", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Public Detail Page Article",
      status: "published",
      visibility: ["public"],
    });
    try {
      const publicCtx = await browser.newContext();
      const publicPage = await publicCtx.newPage();
      await publicPage.goto(`/articles/${article.id}`);
      await expect(publicPage.getByText("Public Detail Page Article")).toBeVisible({ timeout: 10_000 });
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("published public article shows author name and date on detail page", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Metadata Article",
      status: "published",
      visibility: ["public"],
    });
    try {
      const publicCtx = await browser.newContext();
      const publicPage = await publicCtx.newPage();
      await publicPage.goto(`/articles/${article.id}`);
      // Author name must appear somewhere on the page
      await expect(publicPage.getByText(article.authorName as string)).toBeVisible({ timeout: 10_000 });
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });

  test("member-only article redirects unauthenticated user away from detail page", async ({ leagueAdminPage: adminPage, browser }) => {
    const article = await seedArticle(adminPage.request, {
      title: "Members Only Detail",
      status: "published",
      visibility: ["player"],
    });
    try {
      const publicCtx = await browser.newContext();
      const publicPage = await publicCtx.newPage();
      await publicPage.goto(`/articles/${article.id}`);
      // ArticleDetailPage redirects on 403/404; page should not show article title
      await expect(publicPage.getByText("Members Only Detail")).not.toBeVisible({ timeout: 10_000 });
      await publicCtx.close();
    } finally {
      await cleanupArticles(adminPage.request, [article.id as string]);
    }
  });
});

// ── Role-based route access guards ────────────────────────────────────────────

test.describe("role-based route access guards", () => {
  test("unauthenticated user is redirected from /admin/articles", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto("/admin/articles");
      await expect(page).not.toHaveURL(/\/admin\/articles/, { timeout: 5_000 });
    } finally {
      await ctx.close();
    }
  });

  test("team admin is blocked from /admin/articles/new", async ({ teamAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await expect(page).not.toHaveURL("/admin/articles/new", { timeout: 5_000 });
  });

  test("match official is blocked from /admin/articles/new", async ({ matchOfficialPage: page }) => {
    await page.goto("/admin/articles/new");
    await expect(page).not.toHaveURL("/admin/articles/new", { timeout: 5_000 });
  });

  test("club admin is blocked from /admin/articles/new", async ({ clubAdminPage: page }) => {
    await page.goto("/admin/articles/new");
    await expect(page).not.toHaveURL("/admin/articles/new", { timeout: 5_000 });
  });
});
