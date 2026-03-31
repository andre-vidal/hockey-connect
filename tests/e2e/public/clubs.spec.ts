import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";

/**
 * Public — Clubs listing page (Phase 7)
 *
 * Covers:
 *   - /clubs renders without authentication
 *   - Seeded club appears in listing
 *   - Archived club is hidden from listing
 */

// ── /clubs listing page ───────────────────────────────────────────────────────

test.describe("public clubs listing page", () => {
  test("renders heading without authentication", async ({ page }) => {
    await page.goto("/clubs");
    await expect(page.getByRole("heading", { name: "Clubs" })).toBeVisible();
  });
});

authTest.describe("clubs listing page — data visibility", () => {
  authTest("seeded non-archived club appears in the listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `ListedClub ${Date.now()}`;
    const res = await adminPage.request.post("/api/clubs", {
      data: { name: uniqueName, country: "Testland" },
    });
    const { club } = await res.json();
    try {
      await page.goto("/clubs");
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminPage.request.patch(`/api/clubs/${club.id}`, { data: { isArchived: true } });
    }
  });

  authTest("archived club is not shown in the listing", async ({
    leagueAdminPage: adminPage,
    page,
  }) => {
    const uniqueName = `HiddenClub ${Date.now()}`;
    const res = await adminPage.request.post("/api/clubs", {
      data: { name: uniqueName, country: "Testland" },
    });
    const { club } = await res.json();
    await adminPage.request.patch(`/api/clubs/${club.id}`, { data: { isArchived: true } });
    await page.goto("/clubs");
    await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 5_000 });
  });
});
