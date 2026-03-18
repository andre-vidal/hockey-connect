import { test, expect } from "../../fixtures/auth";
import { clubPlayers as sel } from "../../helpers/selectors";

/**
 * Club admin — Player CRUD + invite
 *
 * Tests create, edit, remove, and invite from the perspective of a user with
 * the `club_admin` role. All operations are scoped to the club admin's own
 * club (CLUB_ADMIN_CLUB_ID).
 *
 * API endpoints under test: /api/clubs/[clubId]/players
 */

const uid = () => Date.now().toString(36);

function clubId(): string {
  const id = process.env.CLUB_ADMIN_CLUB_ID;
  if (!id) throw new Error("CLUB_ADMIN_CLUB_ID must be set in .env.test");
  return id;
}

// ── List & navigation ─────────────────────────────────────────────────────────

test.describe("players list", () => {
  test("renders the players list with an Add Player link", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players");
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
    await expect(page.locator(sel.addPlayerLink)).toBeVisible();
  });

  test("Invite Player and Import CSV links are visible", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players");
    await expect(page.locator(sel.invitePlayerLink)).toBeVisible();
    await expect(page.getByRole("link", { name: "Import CSV" })).toBeVisible();
  });

  test("status filter dropdown is present", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players");
    // The status filter select should be visible
    await expect(page.getByRole("combobox")).toBeVisible();
  });
});

// ── Create ────────────────────────────────────────────────────────────────────

test.describe("create player", () => {
  test("valid required fields → redirects to list and player appears", async ({ clubAdminPage: page }) => {
    const firstName = `Test${uid()}`;
    const lastName = "Player";

    await page.goto("/club/players/new");
    await page.locator(sel.firstNameInput).fill(firstName);
    await page.locator(sel.lastNameInput).fill(lastName);
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/club/players", { timeout: 10_000 });
    await expect(page.getByText(`${firstName} ${lastName}`, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    const { players } = await res.json();
    const created = players.find(
      (p: { firstName: string; lastName: string; id: string }) =>
        p.firstName === firstName && p.lastName === lastName
    );
    if (created) await page.request.delete(`/api/clubs/${clubId()}/players/${created.id}`);
  });

  test("missing first name → shows validation error on submit", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players/new");
    await page.locator(sel.lastNameInput).fill("Player");

    await page.locator(sel.submitButton).click();
    await expect(page.getByText("Validation Error")).toBeVisible();
  });

  test("missing last name → shows validation error on submit", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players/new");
    await page.locator(sel.firstNameInput).fill(`Test${uid()}`);

    await page.locator(sel.submitButton).click();
    await expect(page.getByText("Validation Error")).toBeVisible();
  });

  test("player with email → email saved via API", async ({ clubAdminPage: page }) => {
    const firstName = `EmailTest${uid()}`;
    const lastName = "Player";
    const email = `player.${uid()}@example.com`;

    await page.goto("/club/players/new");
    await page.locator(sel.firstNameInput).fill(firstName);
    await page.locator(sel.lastNameInput).fill(lastName);
    await page.locator(sel.emailInput).fill(email);
    await page.locator(sel.submitButton).click();

    await expect(page).toHaveURL("/club/players", { timeout: 10_000 });

    // Verify email was saved
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    const { players } = await res.json();
    const created = players.find(
      (p: { firstName: string; email?: string; id: string }) => p.firstName === firstName
    );
    expect(created?.email).toBe(email);

    if (created) await page.request.delete(`/api/clubs/${clubId()}/players/${created.id}`);
  });
});

// ── Edit ──────────────────────────────────────────────────────────────────────

test.describe("edit player", () => {
  test("save changes → updated name appears in list", async ({ clubAdminPage: page }) => {
    const firstName = `Edit${uid()}`;
    const updatedFirst = `${firstName}Updated`;

    const res = await page.request.post(`/api/clubs/${clubId()}/players`, {
      data: { firstName, lastName: "Player" },
    });
    const { player: { id } } = await res.json();

    try {
      await page.goto(`/club/players/${id}`);
      await page.locator(sel.firstNameInput).fill(updatedFirst);
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/club/players", { timeout: 10_000 });
      await expect(page.getByText(`${updatedFirst} Player`, { exact: true })).toBeVisible();
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/players/${id}`);
    }
  });

  test("change status → badge updates in list", async ({ clubAdminPage: page }) => {
    const firstName = `Status${uid()}`;

    const res = await page.request.post(`/api/clubs/${clubId()}/players`, {
      data: { firstName, lastName: "Player" },
    });
    const { player: { id } } = await res.json();

    try {
      await page.goto(`/club/players/${id}`);

      // Change status to "Injured"
      await page.locator(sel.statusTrigger).click();
      await page.getByRole("option", { name: "Injured", exact: true }).click();
      await page.locator(sel.saveButton).click();

      await expect(page).toHaveURL("/club/players", { timeout: 10_000 });

      // The player row should now show the "Injured" badge
      const row = page.getByRole("row", { name: new RegExp(`${firstName}`, "i") });
      await expect(row.getByText("Injured")).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/clubs/${clubId()}/players/${id}`);
    }
  });
});

// ── Remove ────────────────────────────────────────────────────────────────────

test.describe("remove player", () => {
  test("confirm remove → player removed from list", async ({ clubAdminPage: page }) => {
    const firstName = `Remove${uid()}`;

    await page.request.post(`/api/clubs/${clubId()}/players`, {
      data: { firstName, lastName: "Player" },
    });

    await page.goto("/club/players");
    const row = page.getByRole("row").filter({ hasText: firstName });
    await row.locator(sel.removeButton).click();
    await page.locator(sel.confirmRemoveButton).click();

    await expect(row).not.toBeVisible({ timeout: 10_000 });
  });
});

// ── Invite player ─────────────────────────────────────────────────────────────

test.describe("invite player", () => {
  test("submitting with missing required fields → shows validation error", async ({ clubAdminPage: page }) => {
    await page.goto("/club/players/invite");

    // Nothing filled — submit shows validation error
    await page.locator(sel.inviteSubmitButton).click();
    await expect(page.getByText("Validation Error")).toBeVisible();

    // First name + last name filled but email missing — still shows error
    await page.locator("#firstName").fill("Jane");
    await page.locator("#lastName").fill("Doe");
    await page.locator(sel.inviteSubmitButton).click();
    await expect(page.getByText("Validation Error")).toBeVisible();
  });

  test("valid invite → success toast and redirects to players list", async ({ clubAdminPage: page }) => {
    const firstName = `Invite${uid()}`;
    const lastName = "Player";
    const email = `invite.${uid()}@example.com`;

    await page.goto("/club/players/invite");

    await page.locator("#firstName").fill(firstName);
    await page.locator("#lastName").fill(lastName);
    await page.locator("#email").fill(email);
    await page.locator(sel.inviteSubmitButton).click();

    await expect(page.getByText("Invite sent", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL("/club/players", { timeout: 10_000 });
    await expect(page.getByText(`${firstName} ${lastName}`, { exact: true })).toBeVisible();

    // Cleanup
    const res = await page.request.get(`/api/clubs/${clubId()}/players`);
    const { players } = await res.json();
    const created = players.find(
      (p: { firstName: string; lastName: string; id: string }) =>
        p.firstName === firstName && p.lastName === lastName,
    );
    if (created) await page.request.delete(`/api/clubs/${clubId()}/players/${created.id}`);
  });
});
