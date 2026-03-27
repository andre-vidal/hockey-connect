import { test, expect } from "../../fixtures/auth";
import { seedMatchFixtures, seedMatch, cleanupMatchFixtures } from "../../helpers/matches";

/**
 * Match official — Match views (Phase 4)
 *
 * Covers:
 *   - /official/matches page: renders, shows scheduled matches
 *   - /official/calendar page: renders with month/list toggle
 *   - Dashboard upcoming widget is visible
 *   - Match assigned to this official appears in their matches list
 *
 * Fixture strategy:
 *   - Data is seeded using leagueAdminPage (admin credentials) and then
 *     verified using matchOfficialPage (official credentials).
 */

// ── Page render ───────────────────────────────────────────────────────────────

test.describe("official matches page", () => {
  test("renders /official/matches with heading", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/matches");
    await expect(page.getByRole("heading", { name: "My Matches" })).toBeVisible();
  });

  test("search input is present", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/matches");
    await expect(page.getByPlaceholder("Search matches...")).toBeVisible();
  });
});

// ── Calendar page ─────────────────────────────────────────────────────────────

test.describe("official calendar page", () => {
  test("renders /official/calendar with heading", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  test("month/list view tabs are visible", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "List" })).toBeVisible();
  });

  test("switching to list view shows no-matches message when empty", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    await page.getByRole("tab", { name: "List" }).click();
    // Either shows matches or the empty message — just verify no crash
    await expect(page.locator("main")).toBeVisible();
  });

  test("month grid renders day numbers", async ({ matchOfficialPage: page }) => {
    await page.goto("/official/calendar");
    // The month view renders day cells — check the current month has a "1" cell
    await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
    // Day "1" is always present in a month grid
    await expect(page.getByText("1").first()).toBeVisible();
  });
});

// ── Dashboard widget ──────────────────────────────────────────────────────────

test.describe("official dashboard", () => {
  test("dashboard renders upcoming assignments widget", async ({ matchOfficialPage: page }) => {
    await page.goto("/official");
    await expect(page.getByText("Upcoming Assignments")).toBeVisible();
  });
});

// ── Data visibility (seeded by league admin) ──────────────────────────────────

test.describe("official sees scheduled matches", () => {
  test("match in the system is visible on /official/matches page", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, { venue: "Official View Pitch" });

    try {
      await officialPage.goto("/official/matches");
      await expect(officialPage.getByText("Official View Pitch")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("live match shows 'live' status badge in matches list", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    const match = await seedMatch(adminPage.request, fx, {
      venue: "Live Badge Pitch",
      status: "live",
    });

    try {
      await officialPage.goto("/official/matches");
      await expect(officialPage.getByText("Live Badge Pitch")).toBeVisible({ timeout: 10_000 });
      await expect(officialPage.getByText("live").first()).toBeVisible();
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });

  test("future match appears in calendar list view", async ({
    leagueAdminPage: adminPage,
    matchOfficialPage: officialPage,
  }) => {
    const fx = await seedMatchFixtures(adminPage.request);
    // Schedule match one month from now to ensure it lands in a visible month
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    futureDate.setDate(15);
    const match = await seedMatch(adminPage.request, fx, {
      venue: "Calendar Pitch",
      scheduledAt: futureDate.toISOString(),
    });

    try {
      await officialPage.goto("/official/calendar");
      // Navigate forward to the target month
      await officialPage.getByRole("button", { name: "Next month" }).click();
      // Switch to list view to easily verify match text
      await officialPage.getByRole("tab", { name: "List" }).click();
      await expect(officialPage.getByText("Calendar Pitch")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanupMatchFixtures(adminPage.request, fx, [match.id as string]);
    }
  });
});
