# Test Suite

End-to-end tests using [Playwright](https://playwright.dev/). All tests run against a live Next.js dev server and a real Firebase project.

## Structure

```
tests/
├── e2e/
│   └── phase1/
│       ├── auth.spec.ts        — Login (email/password, Google, anonymous) + registration form validation
│       ├── maintenance.spec.ts — RTDB maintenance flag → redirect behaviour
│       └── middleware.spec.ts  — Route protection & auth redirect rules
├── fixtures/
│   └── auth.ts                 — Playwright fixture: pre-authenticated page (bypasses UI login)
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
| `TEST_USER_EMAIL` | Email of a pre-existing Firebase Auth account (no roles required) |
| `TEST_USER_PASSWORD` | Password for the test account |
| `FIREBASE_PROJECT_ID` | Firebase project ID (same as in `.env.local`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key (same as in `.env.local`) |

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

## Adding Tests for New Phases

1. Create a new directory under `tests/e2e/` matching the phase (e.g. `phase2/`).
2. Add spec files there. Import shared selectors from `helpers/selectors.ts` and extend it with new selectors as needed.
3. If a new spec needs an authenticated user, import `test` from `fixtures/auth` and use the `authenticatedPage` fixture.
