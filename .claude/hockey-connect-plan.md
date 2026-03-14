# Hockey Connect - Implementation Plan

## Context

This plan addresses the need to build a comprehensive field hockey league management, statistics tracking, and game management application ("Hockey Connect"). The app serves five user types: league admins, match officials, team admins, players, and the general public. It must handle real-time match tracking, role-based access control, article publishing, and public statistics -- all with a strong focus on UX and mobile responsiveness to drive engagement and grow field hockey in the country.

---

## Architecture Decisions

### Data Distribution (Firestore vs Realtime Database)

**Firestore** (structured queries, static/semi-static data):
- Users, clubs, leagues, tournaments, teams, squads, players
- Match definitions (schedule, venue, teams, officials)
- Finalized match stats (match cards)
- Articles, notifications, transfers, app settings, audit logs

**Realtime Database** (sub-second sync for live features):
- Live match state: timer, current interval, stoppages
- Live match event stream: goals, cards, substitutions as they happen
- Match official presence
- Maintenance mode flag

**Firebase Storage**: Club logos, profile images, article header images

### RBAC Model

Roles stored on Firestore user documents AND as Firebase Auth custom claims:
- `league_admin` -- federation personnel
- `match_official` -- umpires, table operators (can also hold `player` role)
- `team_admin` -- scoped to a `clubId` (can also hold `player` role)
- `player` -- scoped to a `clubId`
- `public` -- unauthenticated or anonymous

Users can hold multiple roles. Custom claims enable Firestore/RTDB security rules + Next.js middleware enforcement.

### API Pattern

All mutations go through Next.js API Route Handlers using Firebase Admin SDK for server-side validation, custom claims checks, audit logging, aggregation triggers, and email (Resend).

---

## Project Structure

```
hockey-connect/
├── next.config.ts / tailwind.config.ts / tsconfig.json / package.json
├── Dockerfile                          # Cloud Run deployment
├── firestore.rules / database.rules.json / storage.rules
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (providers, fonts)
│   │   ├── page.tsx                    # Public landing page
│   │   ├── maintenance/page.tsx
│   │   ├── (auth)/                     # Login, register
│   │   ├── (public)/                   # Unauthenticated pages
│   │   │   ├── leagues/ clubs/ players/ calendar/ articles/ matches/ stats/
│   │   ├── (dashboard)/                # All authenticated dashboards
│   │   │   ├── layout.tsx              # Sidebar + auth guard
│   │   │   ├── admin/                  # League admin pages
│   │   │   ├── official/               # Match official pages
│   │   │   ├── team/                   # Team admin pages
│   │   │   └── player/                 # Player pages
│   │   └── api/                        # Route handlers
│   ├── components/
│   │   ├── ui/          # Shared primitives (Button, Card, Input, Modal, Table, etc.)
│   │   ├── layout/      # Header, Footer, Sidebar, DashboardShell
│   │   ├── auth/        # LoginForm, RegisterForm, AuthGuard
│   │   ├── admin/ official/ team/ player/   # Feature components
│   │   ├── match/       # Timer, EventFeed, QuickActions, FieldCanvas, ScoreBoard
│   │   ├── articles/    # Editor, card, list, detail
│   │   ├── stats/       # Tables, charts, leaderboards
│   │   └── calendar/    # Calendar views
│   ├── lib/firebase/    # config.ts, admin.ts, auth.ts, firestore.ts, rtdb.ts, storage.ts
│   ├── lib/resend.ts    # Email client
│   ├── lib/csv.ts       # CSV parsing
│   ├── hooks/           # useAuth, useRole, useRealtimeMatch, useTimer, useNotifications
│   ├── providers/       # AuthProvider, NotificationProvider
│   ├── types/           # user, club, league, tournament, match, matchEvent, article, etc.
│   ├── constants/       # roles, matchEvents, positions, demographics
│   ├── middleware.ts    # Auth + RBAC + maintenance mode
│   └── styles/globals.css
```

---

## Phase 1: Project Scaffolding, Auth & RBAC Foundation

**Goal**: Bootable app with authentication, role system, and base UI

**Build**:
- Initialize Next.js 15 + TypeScript + Tailwind CSS + ESLint
- Configure Firebase project (Auth, Firestore, RTDB, Storage)
- Firebase Auth with 3 providers: anonymous, Google, email/password
- `AuthProvider` context with user state and role information
- `middleware.ts` for route protection, role-based redirects, maintenance mode check
- Login/register pages
- Dashboard layout with role-aware sidebar navigation
- Base UI component library (Button, Input, Card, Modal, Badge, Avatar, Table, Tabs, Select, Toast)
- Initial Firestore, RTDB, and Storage security rules
- Resend email client setup
- Dockerfile for Cloud Run
- Maintenance mode (RTDB flag + middleware redirect)

**Key data models**: User, AppSettings, Maintenance flag

**Critical files**: `src/middleware.ts`, `src/lib/firebase/config.ts`, `src/lib/firebase/admin.ts`, `src/providers/AuthProvider.tsx`

---

## Phase 2: Core Data Models & League Admin CRUD

**Goal**: League admins can manage leagues, tournaments, clubs, officials, users, and settings

**Build**:
- League CRUD with configurable match intervals (number of intervals, duration, half-time rules) and season management (create new season, archive previous season data, reset standings)
- Transfer window configuration on leagues (open/close dates). Transfer requests only accepted during open windows
- Squad setup window configuration on leagues/tournaments (open/close dates). Squad submissions only accepted during open windows
- Tournament CRUD with date ranges, venue, match config
- Club CRUD with logo upload, colors, contact info, archive capability
- Match official management (assign type, link to player if applicable)
- User management: invite club admins via Resend email, enable/disable accounts
- App settings page
- Reusable `DataTable` component (sortable, filterable, paginated)

**Key data models**: League (with transferWindow, squadSetupWindow, and season config), Tournament (with squadSetupWindow), Club, MatchOfficial

**Depends on**: Phase 1

---

## Phase 3: Player & Team Management, CSV Import, Squad Workflows

**Goal**: Team admins can manage players/teams, players can manage profiles, squads flow through approval

**Build**:
- Player profile management (self-service + admin editing)
- Team creation with demographics (gender, age group, division)
- CSV player import: file upload, column mapping preview, validation, bulk create. provide a csv template for download of the expected format.
- Manual player creation by team admin (invite player via Resend email). Player record created in "unclaimed" state with a `claimedByUserId: null` field; linked to user account when they register via the invite link
- Player status management (active, inactive, injured, suspended)
- Squad composition: select players from club roster, assign jersey numbers + positions
- Squad submission and league admin approval workflow (draft -> submitted -> approved/rejected). Squad submissions are only accepted during open squad setup windows (configured per league/tournament in Phase 2)
- Match roster submission from approved squad

**Key data models**: Player, Team (`clubs/{clubId}/teams/{teamId}`), Squad, MatchRoster

**Depends on**: Phase 1, Phase 2

---

## Phase 4: Match Scheduling & Calendar

**Goal**: Matches can be scheduled, assigned to officials, and viewed in calendar format

**Build**:
- Match creation: select league/tournament, home/away teams, venue, date/time
- Assign match officials (umpires + table operators)
- Match status lifecycle: scheduled -> warmup -> live -> completed -> confirmed
- Calendar views for all roles (month/week/list)
- Upcoming matches widgets for dashboards
- Public match listing and event calendar

**Key data models**: Match (with matchConfig, officials array, result, matchCardConfirmed)

**Depends on**: Phase 2, Phase 3

---

## Phase 5: Live Match Engine (highest complexity)

**Goal**: Real-time match management for officials, live viewing for team admins and public

### Match Official Interface
- **Timer**: Always-visible, large display. Start/pause/resume. Tracks elapsed time per interval, total match time. Syncs to Firebase RTDB. Any assigned official can control the timer (last action wins)
- **Offline resilience**: Timer continues running client-side if connectivity drops; RTDB queues writes locally and syncs on reconnection
- **Stoppage tracking**: Start/stop stoppages with reason (penalty corner, injury, video referral, other). Duration auto-calculated
- **Interval management**: Auto-alarm at interval end (audio + visual). Transition to break/half-time/next interval
- **Quick-action buttons**: Large, touch-friendly grid -- Goal, Card, Penalty Corner, Penalty Stroke, Stoppage, End Interval
- **Event entry**: Slide-up panel that does NOT hide timer. Pre-populated with current time. Select team, player (searchable), secondary player (assist/sub), notes. Save immediately returns to timer view
- **Event feed**: Scrollable chronological log with edit capability (supports "edit after the fact")
- **Scoreboard**: Home/away scores, logos, current interval
- **Player Penalties**: Secondary timer interfaces for players serving punishment (green card: 2 to 5 min, yellow card: 5 to 10 min, red card: permanent exclusion). Penalty timers pause during main timer stoppages/intervals and notify the official when punishment concludes. Stored in RTDB at `/liveMatches/{matchId}/activePenalties/{penaltyId}`

### Team Admin Live View
- Read-only view of official events (scores, cards, timer)
- Additional stat tracking: substitutions (player in/out), turnovers, dribbles, aerial throws, etc.

### Public Live View
- Read-only scoreboard, timer, event feed via RTDB subscription

### Post-Match
- Match card generation from RTDB events -> finalize to Firestore
- Team admin match card review with confirm or dispute options. Disputes allow flagging specific events with comments. League admin mediates disputes and can force-confirm after resolution
- Match card status lifecycle: pending_review -> confirmed / disputed -> resolved -> confirmed
- API route to aggregate stats and update standings (only after both teams confirm)

**Key data models**: LiveMatchState (RTDB), LiveMatchEvents (RTDB), MatchStats (Firestore)

**Field hockey metrics tracked**: goals, assists, penalty corners, penalty strokes, green/yellow/red cards, saves, tackles, interceptions, circle entries, shots on/off goal, free hits, long corners, substitutions, turnovers, dribbles, aerial throws, stoppages with reasons/durations, minutes played

**Critical files**: `src/app/(dashboard)/official/match/[matchId]/live/page.tsx`, `src/hooks/useRealtimeMatch.ts`, `src/hooks/useTimer.ts`

**Depends on**: Phase 3, Phase 4

---

## Phase 6: Articles & CMS

**Goal**: League admins can publish articles with role-based visibility

**Build**:
- TipTap WYSIWYG editor integration (headings, bold, italic, lists, images, links, blockquotes)
  - Use `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`
  - Set `immediatelyRender: false` for Next.js SSR compatibility
- Article CRUD: draft, publish, archive
- Role-based visibility via multi-select dropdown (public, league_admin, match_official, team_admin, player)
- Header image upload to Firebase Storage
- Article listing filtered by user role on each dashboard
- Public article listing and detail pages

**Key data models**: Article (with TipTap JSON content, visibility array, status)

**Depends on**: Phase 1

---

## Phase 7: Public Views, Stats & League Tables

**Goal**: Engaging public-facing pages for fans and followers

**Build**:
- League standings table (P, W, D, L, GF, GA, GD, Pts, Form indicator)
- Player profiles with season stats and per-match breakdowns
- Team statistics pages
- Stat leaderboards: top scorers, assisters, most cards, etc.
- Player comparison widget (side-by-side stats)
- Match result pages with full statistics
- Search across players, clubs, matches
- Use Next.js ISR for stats pages that update infrequently

**Key data models**: LeagueStanding, PlayerSeasonStats (aggregated from match stats)

**Depends on**: Phase 5, Phase 3, Phase 4

---

## Phase 8: Notifications, Transfers, Field Canvas, Polish & Deploy

**Goal**: Complete feature set, polish, and production deployment

### Notifications
- In-app notification system: bell icon with unread count, notification list, mark-as-read
- Email notifications via Resend for key events (match scheduled, squad approved, invitations, match reminders)
- Notification types: match_scheduled, squad_approved/rejected, invitation, match_reminder, transfer_request/approved, article_published, match_card_ready, account_status

### Player Transfers
- Transfer requests only accepted during open transfer windows (configured per league in Phase 2)
- Transfer request workflow: team admin requests -> league admin approves -> transfer completes
- Club history preserved on player document (timeline of clubs with dates)

### Visual Field Canvas
- SVG-based hockey field (91.4m x 55m proportions): shooting circles, 23m lines, center line, penalty spots
- Draggable player markers with jersey numbers and name tooltips
- Formation presets: 3-3-3-1, 4-3-2-1, 5-3-2, 1-3-5-2, 3-2-3-2
- Save/load/rename formations per team

### Polish & Deployment
- Loading states, empty states, error boundaries throughout
- Accessibility audit (ARIA labels, keyboard nav, color contrast)
- Image optimization (thumbnails, lazy loading)
- Code splitting and performance optimization
- Cloud Run deployment (Dockerfile, cloudbuild.yaml or GitHub Actions)
- Comprehensive Firestore composite indexes

**Key data models**: Notification, Transfer, PlayerClubHistory, Formation

**Depends on**: All previous phases

---

## Verification Plan

After each phase, verify:

1. **Phase 1**: Login with email/password, Google, and anonymous. Confirm middleware redirects unauthorized users. Toggle maintenance mode in RTDB and verify redirect
2. **Phase 2**: Create a league, tournament, club. Upload a club logo. Invite a club admin via email. Verify Firestore security rules reject unauthorized writes
3. **Phase 3**: Import players via CSV. Create a team. Build a squad and submit for approval. Approve as league admin. Submit a match roster
4. **Phase 4**: Schedule a match, assign officials. View in calendar. Verify match appears in all relevant role views
5. **Phase 5**: Start a live match as official. Verify timer syncs across official, team admin, and public views. Log goals, cards, stoppages. End match and confirm match card from both team admins. Verify stats aggregate to Firestore
6. **Phase 6**: Create an article with TipTap editor. Publish with role visibility set to "match_official". Verify it appears only in the official dashboard, not for players
7. **Phase 7**: After completing matches, verify league table updates, player stats aggregate correctly, leaderboards display top performers
8. **Phase 8**: Trigger a notification (e.g., schedule a match) and verify bell icon updates. Request a player transfer and complete the workflow. Open the field canvas and drag players to positions. Deploy to Cloud Run and verify production build

### End-to-End Smoke Test
Run through a full match lifecycle: create league -> create clubs -> import players -> build squads -> approve squads -> schedule match -> submit rosters -> start live match -> track events -> end match -> confirm match card -> verify stats and standings update
