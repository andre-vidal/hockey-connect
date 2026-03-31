import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Public — Leagues listing and detail pages, leagues API (Phase 7)
 *
 * Covers:
 *   - GET /api/leagues — now public (no auth required), shape, archived excluded
 *   - /leagues listing page renders, cards show, archived excluded
 *   - /leagues/[leagueId] detail page — tabs, standings, results, scorers, back link, not-found
 */

// ── GET /api/leagues (public) ─────────────────────────────────────────────────

test.describe("GET /api/leagues — public access", () => {
  test("returns 200 without a session cookie", async ({ page }) => {
    const res = await page.request.get("/api/leagues");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.leagues)).toBe(true);
  });

  test("response entries include required league fields", async ({ page }) => {
    const res = await page.request.get("/api/leagues");
    const body = await res.json();
    if (body.leagues.length > 0) {
      const l = body.leagues[0] as Record<string, unknown>;
      for (const field of ["id", "name", "country", "gender", "status"]) {
        expect(l, `missing field: ${field}`).toHaveProperty(field);
      }
    }
  });
});

authTest.describe("GET /api/leagues — visibility", () => {
  authTest("archived league is excluded from the public listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const res = await adminPage.request.post("/api/leagues", {
      data: { name: `ArchivedLeague ${Date.now()}`, country: "Testland", gender: "male", status: "archived" },
    });
    const { league } = await res.json();
    try {
      const listRes = await page.request.get("/api/leagues");
      const body = await listRes.json();
      const ids = (body.leagues as Array<{ id: string }>).map((l) => l.id);
      expect(ids).not.toContain(league.id);
    } finally {
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
    }
  });

  authTest("newly created active league appears in the public listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const res = await adminPage.request.post("/api/leagues", {
      data: { name: `ActivePublicLeague ${Date.now()}`, country: "Testland", gender: "female", status: "active" },
    });
    const { league } = await res.json();
    try {
      const listRes = await page.request.get("/api/leagues");
      const body = await listRes.json();
      const ids = (body.leagues as Array<{ id: string }>).map((l) => l.id);
      expect(ids).toContain(league.id);
    } finally {
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
    }
  });
});

// ── /leagues listing page ─────────────────────────────────────────────────────

test.describe("public leagues listing page", () => {
  test("renders heading without authentication", async ({ page }) => {
    await page.goto("/leagues");
    await expect(page.getByRole("heading", { name: "Leagues" })).toBeVisible();
  });
});

authTest.describe("leagues listing page — data visibility", () => {
  authTest("seeded active league appears as a card", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `PublicLeague ${Date.now()}`;
    const res = await adminPage.request.post("/api/leagues", {
      data: { name: uniqueName, country: "Testland", gender: "male", status: "active" },
    });
    const { league } = await res.json();
    try {
      await page.goto("/leagues");
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
    }
  });

  authTest("clicking a league card navigates to the detail page", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `ClickableLeague ${Date.now()}`;
    const res = await adminPage.request.post("/api/leagues", {
      data: { name: uniqueName, country: "Testland", gender: "male", status: "active" },
    });
    const { league } = await res.json();
    try {
      await page.goto("/leagues");
      await page.getByText(uniqueName).click();
      await expect(page).toHaveURL(`/leagues/${league.id}`);
    } finally {
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
    }
  });

  authTest("archived league is not visible in the listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `ArchivedListingLeague ${Date.now()}`;
    const res = await adminPage.request.post("/api/leagues", {
      data: { name: uniqueName, country: "Testland", gender: "male", status: "archived" },
    });
    const { league } = await res.json();
    try {
      await page.goto("/leagues");
      await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 5_000 });
    } finally {
      await adminPage.request.delete(`/api/leagues/${league.id}`).catch(() => {});
    }
  });
});

// ── /leagues/[leagueId] detail page ──────────────────────────────────────────

test.describe("league detail page — not found", () => {
  test("shows not-found state for a nonexistent league ID", async ({ page }) => {
    await page.goto("/leagues/nonexistent-league-xyz");
    await expect(page.getByText("League not found.")).toBeVisible({ timeout: 10_000 });
  });
});

authTest.describe("league detail page — structure", () => {
  authTest("renders league name as heading", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await expect(page.getByRole("heading", { name: fx.league.name })).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });

  authTest("shows Standings, Results, and Top Scorers tabs", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await expect(page.getByRole("button", { name: "Standings" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Results" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Top Scorers" })).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });

  authTest("Back link navigates to /leagues", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await page.getByRole("link", { name: "All Leagues" }).click();
      await expect(page).toHaveURL("/leagues");
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });
});

authTest.describe("league detail page — standings tab", () => {
  authTest("shows 'No standings data yet.' for a league with no confirmed matches", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await expect(page.getByText("No standings data yet.")).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });
});

authTest.describe("league detail page — results tab", () => {
  authTest("shows 'No completed matches yet.' for a new league", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await page.getByRole("button", { name: "Results" }).click();
      await expect(page.getByText("No completed matches yet.")).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, []);
    }
  });

  authTest("completed match appears under the Results tab", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, {
      venue: "Results Tab Venue",
      status: "completed",
    });
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await page.getByRole("button", { name: "Results" }).click();
      await expect(page.getByText("Results Tab Venue")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  authTest("clicking a result row navigates to the match result page", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { status: "completed" });
    try {
      await page.goto(`/leagues/${fx.league.id}`);
      await page.getByRole("button", { name: "Results" }).click();
      await page.locator(`a[href="/matches/${match.id}"]`).first().click();
      await expect(page).toHaveURL(`/matches/${match.id}`);
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});
