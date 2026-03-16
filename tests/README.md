# Test Suite

End-to-end tests using [Playwright](https://playwright.dev/). All tests run against a live Next.js dev server and a real Firebase project.

## Structure

```
tests/
├── e2e/
│   ├── phase1/
│   │   ├── auth.spec.ts        — Login (email/password, Google, anonymous) + registration form validation
│   │   ├── maintenance.spec.ts — RTDB maintenance flag → redirect behaviour
│   │   └── middleware.spec.ts  — Route protection & auth redirect rules
│   └── phase2/
│       ├── leagues.spec.ts     — League CRUD + season management + security
│       ├── clubs.spec.ts       — Club CRUD + logo upload + archive + security
│       ├── tournaments.spec.ts — Tournament CRUD + league linking + security
│       ├── officials.spec.ts   — Official registration (user search) + CRUD + security
│       └── users.spec.ts       — User list, invite modal, activate/deactivate + security
├── fixtures/
│   ├── auth.ts                 — Playwright fixtures: authenticatedPage (no roles), leagueAdminPage
│   └── assets/
│       └── test-logo.png       — Minimal 64×64 PNG used by club logo upload tests
└── helpers/
    ├── selectors.ts            — Centralised CSS selectors for all spec files
    └── firebase-cli.ts         — Firebase CLI wrapper: set/reset /maintenance/enabled in RTDB
```

## Setup

**1. Copy and fill in the test env file:**

```bash
cp .env.test.example .env.test
```

| Variable | Description |
|---|---|
| `PLAYWRIGHT_BASE_URL` | URL of the running app (default: `http://localhost:3000`) |
| `TEST_USER_EMAIL` | Email of a pre-existing Firebase Auth account (no roles) |
| `TEST_USER_PASSWORD` | Password for the test account |
| `LEAGUE_ADMIN_EMAIL` | Email of a Firebase Auth account with the `league_admin` role |
| `LEAGUE_ADMIN_PASSWORD` | Password for the league admin test account |
| `FIREBASE_PROJECT_ID` | Firebase project ID (same as in `.env.local`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key (same as in `.env.local`) |

To create the `LEAGUE_ADMIN` test account: create a user in Firebase Auth, then set `roles: ["league_admin"]` on their `users/{uid}` Firestore document. Sign in once so the session cookie syncs the custom claim.

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

# Run a specific spec file
npx playwright test tests/e2e/phase1/auth.spec.ts

# Open the HTML report after a run
npx playwright show-report
```

Tests run serially (`workers: 1`) because maintenance tests mutate shared RTDB state.

## Key Design Decisions

### Auth fixture (`fixtures/auth.ts`)
Establishes a server-recognised session without going through the login UI:
1. Calls the Firebase Auth REST API to exchange credentials for an ID token.
2. POSTs the token to `/api/auth/session` so the app sets the `session` httpOnly cookie.

This is necessary for middleware tests, which check the cookie — not client-side Firebase auth state.

### Maintenance tests
`setMaintenanceMode(true/false)` in `helpers/firebase-cli.ts` writes directly to `/maintenance/enabled` in RTDB via the Firebase CLI. The `MaintenanceProvider` subscribes to this path via `onValue()` and performs a client-side redirect. Tests use `page.waitForURL()` to account for this async redirect.

An `afterEach` hook always resets maintenance mode to `false` to prevent state leaking between tests.

### Selectors (`helpers/selectors.ts`)
All component selectors are centralised here. When markup changes, update this file once rather than hunting across spec files.

## Phase 2 Test Patterns

Phase 2 tests use two additional conventions:

**API-based setup/teardown** — Rather than using the UI to create test data before every test, most edit/delete tests call the API directly via `page.request` within the test body and clean up in a `finally` block. This is faster and keeps tests independent.

**Security tests** — Each spec file has a `security` describe block that sends raw API requests from unauthenticated (`page`) and plain-user (`authenticatedPage`) sessions, asserting `401` and `403` responses respectively.

**Logo upload tests** — `clubs.spec.ts` uses `tests/fixtures/assets/test-logo.png` (a 64×64 green PNG) with Playwright's `setInputFiles()` to simulate a file upload without requiring a real image.

## Adding Tests for New Phases

1. Create a new directory under `tests/e2e/` matching the phase (e.g. `phase3/`).
2. Add spec files there. Import shared selectors from `helpers/selectors.ts` and extend it with new selectors as needed.
3. If a new spec needs a role-specific session, add a fixture to `fixtures/auth.ts` following the `leagueAdminPage` pattern and add the corresponding env vars to `.env.test.example`.
