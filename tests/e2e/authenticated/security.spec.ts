import { test, expect } from "../../fixtures/auth";

/**
 * Authenticated user (no roles) — API security
 *
 * Verifies that a signed-in user without any admin role is rejected
 * with HTTP 403 when attempting to access admin-only endpoints.
 */

test.describe("authenticated (no roles) — leagues API", () => {
  test("POST /api/leagues → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Should fail", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/leagues/:id → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.delete("/api/leagues/nonexistent-id");
    expect(res.status()).toBe(403);
  });
});

test.describe("authenticated (no roles) — clubs API", () => {
  test("POST /api/clubs → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/clubs", { data: { name: "Fail" } });
    expect(res.status()).toBe(403);
  });

  test("DELETE /api/clubs/:id → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.delete("/api/clubs/nonexistent-id");
    expect(res.status()).toBe(403);
  });
});

test.describe("authenticated (no roles) — tournaments API", () => {
  test("POST /api/tournaments → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/tournaments", {
      data: { name: "Fail", venue: "V", startDate: "2026-01-01", endDate: "2026-01-02" },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("authenticated (no roles) — officials API", () => {
  test("POST /api/officials → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/officials", {
      data: { userId: "x", displayName: "X", email: "x@x.com", officialTypes: ["umpire"] },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("authenticated (no roles) — users API", () => {
  test("GET /api/users → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(403);
  });

  test("POST /api/users/invite → 403", async ({ authenticatedPage: page }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(403);
  });
});
