# Test Suite

End-to-end tests using [Playwright](https://playwright.dev/). All tests run against a live Next.js dev server and a real Firebase project.

## Structure

Tests are organised by **user role** — each directory covers the functionality accessible to that actor.

```
tests/
├── e2e/
│   ├── public/                    — unauthenticated visitor (no session cookie)
│   │   ├── auth.spec.ts           — Login form, registration form, Google + anonymous sign-in
│   │   ├── maintenance.spec.ts    — RTDB maintenance flag → redirect behaviour
│   │   ├── routing.spec.ts        — Protected routes redirect to /login; public routes are accessible
│   │   └── security.spec.ts       — All admin API endpoints return 401 for unauthenticated requests
│   │
│   ├── authenticated/             — signed-in user with no roles assigned
│   │   ├── routing.spec.ts        — Authenticated visitor is redirected away from /login and /register
│   │   └── security.spec.ts       — All admin API endpoints return 403 for role-less users
│   │
│   ├── league_admin/              — user with the `league_admin` role
│   │   ├── leagues.spec.ts        — League CRUD + season management
│   │   ├── clubs.spec.ts          — Club CRUD + logo upload + archive
│   │   ├── tournaments.spec.ts    — Tournament CRUD + league linking
│   │   ├── officials.spec.ts      — Official registration (user search) + CRUD
│   │   └── users.spec.ts          — User list, invite modal, activate/deactivate
│   │
│   ├── club_admin/                — user with the `club_admin` role (scoped to one club)
│   │   ├── teams.spec.ts          — Team CRUD within own club
│   │   ├── players.spec.ts        — Player CRUD + invite within own club
│   │   ├── squads.spec.ts         — Squad creation and player management
│   │   ├── users.spec.ts          — Club user listing and role editing
│   │   └── security.spec.ts       — 403 for league-admin endpoints; cross-club isolation
│   │
│   └── team_admin/                — user with the `team_admin` role (scoped to assigned teams)
│       ├── teams.spec.ts          — Team list view (read-only; assignment managed by club admin)
│       ├── players.spec.ts        — Player roster view (read-only); status filter
│       ├── squads.spec.ts         — Squad creation, player management, submit for approval
│       └── security.spec.ts       — 403 for league/club-admin endpoints; cross-club isolation
│
├── fixtures/
│   ├── auth.ts                    — Playwright fixtures: authenticatedPage, leagueAdminPage,
│   │                                matchOfficialPage, teamAdminPage
│   └── assets/
│       └── test-logo.png          — Minimal 64×64 PNG used by club logo upload tests
└── helpers/
    ├── selectors.ts               — Centralised CSS selectors for all spec files
    └── firebase-cli.ts            — Firebase CLI wrapper: set/reset /maintenance/enabled in RTDB
```

## Setup

**1. Copy and fill in the test env file:**

```bash
cp .env.test.example .env.test
```

| Variable                       | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL`          | URL of the running app (default: `http://localhost:3000`)  |
| `TEST_USER_EMAIL`              | Email of a pre-existing Firebase Auth account (no roles)   |
| `TEST_USER_PASSWORD`           | Password for the no-role test account                      |
| `LEAGUE_ADMIN_EMAIL`           | Email of an account with the `league_admin` role           |
| `LEAGUE_ADMIN_PASSWORD`        | Password for the league admin account                      |
| `CLUB_ADMIN_EMAIL`             | Email of an account with the `club_admin` role             |
| `CLUB_ADMIN_PASSWORD`          | Password for the club admin account                        |
| `CLUB_ADMIN_CLUB_ID`           | Firestore ID of the club this admin manages                |
| `CLUB_ADMIN_OPEN_LEAGUE_ID`    | Firestore ID of a pre-seeded league (used for squad tests) |
| `CLUB_ADMIN_CLOSED_LEAGUE_ID`  | Firestore ID of a pre-seeded league (used for squad tests) |
| `MATCH_OFFICIAL_EMAIL`         | Email of an account with the `match_official` role         |
| `MATCH_OFFICIAL_PASSWORD`      | Password for the match official account                    |
| `TEAM_ADMIN_EMAIL`             | Email of an account with the `team_admin` role             |
| `TEAM_ADMIN_PASSWORD`          | Password for the team admin account                        |
| `TEAM_ADMIN_CLUB_ID`           | Firestore ID of the club this team admin belongs to        |
| `TEAM_ADMIN_OPEN_LEAGUE_ID`    | Firestore ID of a pre-seeded league (used for squad tests) |
| `ROOT_EMAIL`                   | Email of a developer/root account                          |
| `ROOT_PASSWORD`                | Password for the root account                              |
| `FIREBASE_PROJECT_ID`          | Firebase project ID (same as in `.env.local`)              |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key (same as in `.env.local`)             |

To create a role-specific test account: register an account on the webapp, then set `roles: ["<role>"]` on their `users/{uid}` Firestore document. Sign in once so the session cookie syncs the custom claim.

**2. Install Playwright browsers (first time only):**

```bash
npx playwright install chromium
```

**3. Ensure `firebase-tools` is installed and authenticated** (required by maintenance tests):

```bash
npm install -g firebase-tools
firebase login
```

## Running Tests

```bash
# Run all e2e tests (starts dev server automatically)
npx playwright test

# Run the playwright GUI
npx playwright test --ui

# Run a specific role directory
npx playwright test tests/e2e/league_admin/

# Run a specific spec file
npx playwright test tests/e2e/public/auth.spec.ts

# Open the HTML report after a run
npx playwright show-report
```

Tests run serially (`workers: 1`) because maintenance tests mutate shared RTDB state.

## Key Design Decisions

### Auth fixture (`fixtures/auth.ts`)

Two strategies are used depending on the test's needs:

**REST-only session** (`authenticatedPage`) — calls the Firebase Auth REST API to get an ID token, then POSTs it to `/api/auth/session`. Fast and sufficient for middleware/API tests that only check the session cookie.

**UI login session** (`leagueAdminPage`, `matchOfficialPage`, `teamAdminPage`) — navigates through the login form so both the httpOnly session cookie and the Firebase client auth state (`onAuthStateChanged`) are established. Required for dashboard pages that use `AuthGuard`, which reads roles from `AuthProvider` client-side.

### Maintenance tests

`setMaintenanceMode(true/false)` in `helpers/firebase-cli.ts` writes directly to `/maintenance/enabled` in RTDB via the Firebase CLI. The `MaintenanceProvider` subscribes to this path via `onValue()` and performs a client-side redirect. Tests use `page.waitForURL()` to account for this async redirect.

An `afterEach` hook always resets maintenance mode to `false` to prevent state leaking between tests.

### Selectors (`helpers/selectors.ts`)

All component selectors are centralised here. When markup changes, update this file once rather than hunting across spec files.

### Security tests

Security coverage is split by actor:

- `public/security.spec.ts` — unauthenticated requests → 401
- `authenticated/security.spec.ts` — role-less authenticated requests → 403
- `club_admin/security.spec.ts` — club admin cannot access league-admin-only endpoints (403) and cannot read/write another club's data (403)

CRUD spec files focus on happy-path and validation flows only.

## Table Action Column Standard

Every list page that supports edit and/or delete renders an `actions` column in the `DataTable`. The structure is always the same:

```tsx
{
  key: "actions",
  header: "Actions",
  cell: (row) => (
    <div className="flex items-center gap-2">
      {/* Only when edit is supported */}
      <Button asChild variant="outline" size="sm">
        <Link href={`/<section>/<resource>/${row.id}`}>
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Link>
      </Button>

      {/* Only when delete is supported */}
      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row)}>
        <Trash2 className="h-3 w-3 mr-1" />
        Delete
      </Button>
    </div>
  ),
},
```

**Delete confirmation modal** — all pages use the shared `Modal` component with inline state:

```tsx
const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);
const [deleting, setDeleting] = useState(false);

// In JSX:
<Modal open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
  <ModalContent>
    <ModalHeader><ModalTitle>Delete [Entity]</ModalTitle></ModalHeader>
    <p className="text-sm text-gray-600 mt-2">
      Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
    </p>
    <ModalFooter>
      <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
      <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
        {deleting ? "Deleting..." : "Delete [Entity]"}
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

### Testing table actions

**Testing edit navigation** — scope the row, then click Edit:

```typescript
const row = page.getByRole("row").filter({ hasText: name });
await row.locator(sel.editButton).click();           // or use Link-based navigation
await expect(page).toHaveURL(`/admin/leagues/${id}`);
```

**Testing delete with confirmation dialog** — always use a resource created via API in `try/finally`:

```typescript
const res = await page.request.post("/api/<resource>", { data: { ... } });
const { <resource>: { id } } = await res.json();

try {
  await page.goto("/<section>/<resource>");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Open the delete modal
  await row.locator(sel.deleteButton).click();

  // Confirm inside the modal
  await page.locator(sel.confirmDeleteButton).click();

  // Assert row is gone
  await expect(row).not.toBeVisible({ timeout: 10_000 });
} finally {
  // Safety net: clean up even if delete failed mid-test
  await page.request.delete(`/api/<resource>/${id}`).catch(() => {});
}
```

**Selector conventions** — centralise all selectors in `helpers/selectors.ts`. Action column selectors follow this naming:

| Selector key          | What it targets                                              |
| --------------------- | ------------------------------------------------------------ |
| `editButton`          | `'button:has-text("Edit")'` or link equivalent in the row   |
| `deleteButton`        | `'button:has-text("Delete")'` (the row-level trigger)        |
| `confirmDeleteButton` | `'button:has-text("Delete [Entity]")'` inside the modal      |

> If the action uses different wording (e.g. "Remove" for officials), name the selector accordingly: `confirmRemoveButton`.

**Do not test the cancel path** — dismissing the dialog and asserting the row still exists adds noise without meaningful coverage. Only test the confirm path.

## Test Patterns

**API-based setup/teardown** — Rather than using the UI to create test data before every test, edit/delete tests create resources via the API within the test body and clean up in a `finally` block. This is faster and keeps tests independent.

**Logo upload tests** — `league_admin/clubs.spec.ts` uses `tests/fixtures/assets/test-logo.png` (a 64×64 green PNG) with Playwright's `setInputFiles()` to simulate a file upload without requiring a real image.

**API response shape** — All POST endpoints return a nested object keyed by resource type. Always destructure one level deep:

```typescript
// Correct
const {
  league: { id },
} = await res.json();
const {
  tournament: { id },
} = await res.json();
const {
  official: { id },
} = await res.json();
const {
  club: { id },
} = await res.json();

// Wrong — id will be undefined
const { id } = await res.json();
```

**Pre-clean for shared accounts** — Tests that create records tied to a shared account (e.g. `LEAGUE_ADMIN_EMAIL`) must delete any stale records for that account before the test body runs:

```typescript
const preRes = await page.request.get("/api/officials");
const { officials: existing } = await preRes.json();
const stale = (existing as { email: string; id: string }[]).filter(
  (o) => o.email === adminEmail,
);
await Promise.all(
  stale.map((o) => page.request.delete(`/api/officials/${o.id}`)),
);
```

**Form validation — native HTML5** — All `new` forms rely on native browser validation (`required` attributes) rather than JS-level guards and toasts. Do **not** write tests that check for validation errors on missing required fields — the browser prevents submission and the experience is consistent across all forms without needing spec coverage.

**Scoping selectors to containers** — When the same text appears in more than one place, scope assertions to the container:

```typescript
// Wrong — matches both the trigger button and the dialog title
await expect(page.getByText("Invite Club Admin")).toBeVisible();

// Correct — scoped to the dialog
const dialog = page.getByRole("dialog");
await expect(
  dialog.getByText("Invite Club Admin", { exact: true }),
).toBeVisible();
```

## Adding Tests for New Roles

1. Create a new directory under `tests/e2e/` matching the role (e.g. `match_official/`).
2. Add spec files there. Import shared selectors from `helpers/selectors.ts` and extend it with new selectors as needed.
3. Add a fixture for the role in `fixtures/auth.ts` following the `leagueAdminPage` pattern.
4. Add the corresponding env vars to `.env.test.example`.
