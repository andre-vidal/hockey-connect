import { test, expect } from "@playwright/test";

/**
 * Public visitor (unauthenticated) — API security
 *
 * Verifies that all write (and sensitive read) API endpoints reject
 * requests carrying no session cookie with HTTP 401.
 */

test.describe("unauthenticated — leagues API", () => {
  test("GET /api/leagues → 401", async ({ page }) => {
    const res = await page.request.get("/api/leagues");
    expect(res.status()).toBe(401);
  });

  test("POST /api/leagues → 401", async ({ page }) => {
    const res = await page.request.post("/api/leagues", {
      data: { name: "Should fail", country: "X", gender: "male" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("unauthenticated — clubs API", () => {
  test("POST /api/clubs → 401", async ({ page }) => {
    const res = await page.request.post("/api/clubs", { data: { name: "Fail" } });
    expect(res.status()).toBe(401);
  });
});

test.describe("unauthenticated — tournaments API", () => {
  test("POST /api/tournaments → 401", async ({ page }) => {
    const res = await page.request.post("/api/tournaments", {
      data: { name: "Fail", venue: "V", startDate: "2026-01-01", endDate: "2026-01-02" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("unauthenticated — officials API", () => {
  test("POST /api/officials → 401", async ({ page }) => {
    const res = await page.request.post("/api/officials", {
      data: { userId: "x", displayName: "X", email: "x@x.com", officialTypes: ["umpire"] },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("unauthenticated — users API", () => {
  test("GET /api/users → 401", async ({ page }) => {
    const res = await page.request.get("/api/users");
    expect(res.status()).toBe(401);
  });

  test("POST /api/users/invite → 401", async ({ page }) => {
    const res = await page.request.post("/api/users/invite", {
      data: { email: "x@x.com", displayName: "X" },
    });
    expect(res.status()).toBe(401);
  });
});
