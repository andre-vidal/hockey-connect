# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build (validates TypeScript + Next.js compilation)
npm run lint      # ESLint
npm run start     # Start production server
```

After editing `.env.local`, restart the dev server — Next.js does not hot-reload env changes.

## Architecture

### Tech Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Firebase**: Firestore (structured data), Realtime Database (live match state), Storage (images), Auth (email/password, Google, anonymous)
- **Firebase Admin SDK**: server-side only, used in API route handlers
- **Resend**: transactional email
- **Radix UI** primitives + **class-variance-authority** for UI components

### Data Split: Firestore vs RTDB
- **Firestore**: users, clubs, leagues, tournaments, teams, squads, players, matches (finalized), articles, notifications, transfers
- **Realtime Database**: live match state (timer, score, events), maintenance mode flag (`/maintenance/enabled`), match official presence

### RBAC
Five roles: `league_admin`, `match_official`, `team_admin`, `player`, `public`. Roles are stored on the Firestore `users/{uid}` document under a `roles: string[]` field. Firebase Auth custom claims mirror these roles for use in Firestore/RTDB security rules. Multiple roles per user are supported (e.g. a player who is also a match official).

### Auth Flow
1. Client signs in via `src/lib/firebase/auth.ts` (wraps Firebase client SDK)
2. On sign-in, call `POST /api/auth/session` with the Firebase ID token → server creates an httpOnly session cookie via Admin SDK
3. `src/middleware.ts` reads the `session` cookie to protect dashboard routes. It cannot use Firebase Admin SDK (Edge runtime limitation) — it only checks cookie presence, not validity
4. `AuthProvider` (`src/providers/AuthProvider.tsx`) is the client-side source of truth: listens to `onAuthStateChanged`, fetches the Firestore user profile, and exposes `user`, `profile`, `roles`, `hasRole()`, `hasAnyRole()`
5. `AuthGuard` component does client-side role enforcement within dashboard pages

### Maintenance Mode
`MaintenanceProvider` (`src/providers/MaintenanceProvider.tsx`) subscribes to `/maintenance/enabled` in RTDB. When `true`, it immediately redirects all users to `/maintenance`. Toggle via Firebase console or CLI:
```bash
firebase database:set /maintenance '{"enabled": true}' --project YOUR_PROJECT_ID
```

### Route Structure
```
/                                          → public landing page
/(auth)/login|register                     → auth pages (redirect away if already logged in)
/(public)/leagues|clubs|players|matches
         |articles|stats|calendar          → public pages (no auth required)
/(dashboard)/                              → requires auth (AuthGuard)
    root/                                  → developer only
    root/settings
    admin/                                 → league_admin only
    admin/leagues | /leagues/new | /leagues/[leagueId]
    admin/clubs   | /clubs/new   | /clubs/[clubId]
    admin/tournaments | /tournaments/new   | /tournaments/[tournamentId]
    admin/officials   | /officials/new     | /officials/[officialId]
    admin/matches
    admin/users
    official/                              → match_official only
    team/                                  → team_admin only
    player/                                → player (+ team_admin, official, admin)
/api/auth/session                          → POST: create session cookie, DELETE: clear it
/maintenance                               → maintenance mode page
```

### Firebase Admin SDK — Lazy Initialization
`src/lib/firebase/admin.ts` exports proxy objects (`adminAuth`, `adminDb`, `adminRtdb`) that call `getAdminApp()` lazily at invocation time. This prevents the Admin SDK from attempting to parse credentials during Next.js build-time static analysis. All API routes that use admin must include `export const dynamic = "force-dynamic"`.

### UI Components
All primitives live in `src/components/ui/` and are built on Radix UI with Tailwind. Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional classes. The primary brand color is `primary-600` (green, configured in `tailwind.config.ts`).

### Implementation Plan
The full phased build plan is in `.claude/hockey-connect-plan.md`. Phase 1 (scaffolding, auth, base UI) is complete. Phases 2–8 cover league CRUD, player/squad management, match scheduling, live match engine, CMS, public stats, and notifications/transfers/field canvas.

## Testing

End-to-end tests use Playwright against a live dev server and real Firebase project. See [`tests/README.md`](tests/README.md) for full setup instructions, env vars, and how to run.

```bash
npx playwright test                              # run all e2e tests
npx playwright test tests/e2e/phase1/auth.spec.ts  # run a single spec
npx playwright show-report                       # open HTML report
```

Tests are organised by phase under `tests/e2e/`. Shared selectors live in `tests/helpers/selectors.ts`; the auth fixture in `tests/fixtures/auth.ts` establishes a server-side session without touching the login UI.
