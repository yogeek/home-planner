# Le Village Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy « Le Village », a gamified family chores PWA (React + Cloudflare Workers/D1/Durable Objects), ready for family use.

**Architecture:** Single repo. A Vite React TS app (`app/`) built into static assets served by one Cloudflare Worker (`worker/`) that also exposes the JSON API, a Durable Object for WebSocket realtime, D1 for data, cron triggers for weekly distribution and reminders, Web Push for notifications. Pure business logic lives in `shared/` and is developed TDD with Vitest.

**Tech Stack:** TypeScript, React 18, Vite, zustand, Cloudflare Workers + D1 + Durable Objects, Vitest, Web Push (VAPID), SVG/CSS animations.

## Global Constraints

- All UI copy in French. No em dashes anywhere.
- Family: Guillaume (adulte), compagne (adulte), fils (enfant 3-5 ans). Names configurable at onboarding.
- Timezone: Indian/Reunion (UTC+4), hardcoded constant `TZ`.
- Auth: single family secret token (Worker var `FAMILY_TOKEN`), passed as `?k=` once then stored client-side; API via `Authorization: Bearer`.
- Free tier only. No third-party paid services.
- Zones (fixed 6): `jardin`, `piscine`, `lessive`, `cuisine`, `courses`, `rangement`.
- Weights in « glands » (1-5). Village currency accumulates forever.
- Deterministic domain functions: all take explicit dates/inputs, no `Date.now()` inside.

## File Structure

```
app/                    # Vite React PWA (src/screens/*, src/components/*, src/store.ts, src/api.ts, src/ws.ts)
shared/                 # Pure domain logic + types (schedule.ts, village.ts, shopping.ts, types.ts)
worker/                 # index.ts (fetch+cron), api.ts, do.ts (VillageHub), push.ts, db.ts
migrations/             # D1 SQL migrations
docs/                   # specs, plans, guide famille
wrangler.jsonc, vite.config.ts, vitest.config.ts, package.json
```

---

### Task 1: Scaffold + deploy pipeline

Vite React TS app; Worker serving built assets (SPA fallback) + `/api/health`; wrangler.jsonc with D1 database `village-db`, DO `VILLAGE_HUB`, crons (`0 3 * * *`, `30 14 * * *`, `0 14 * * 0`); Vitest configured for `shared/`. Create D1 db with `wrangler d1 create`. Deploy hello-world to verify the full pipeline early. Commit.

### Task 2: DB schema + seed

Migration `0001_init.sql`:

- `members(id TEXT PK, name TEXT, creature TEXT, role TEXT CHECK(adult|child), color TEXT, notif_prefs TEXT JSON, created_at)`
- `push_subs(id INTEGER PK AI, member_id TEXT, endpoint TEXT UNIQUE, keys TEXT JSON)`
- `task_defs(id TEXT PK, title TEXT, zone TEXT, weight INTEGER, recurrence TEXT JSON, fixed_assignee TEXT NULL, child_task INTEGER DEFAULT 0, reminder_time TEXT NULL, season TEXT DEFAULT 'all', active INTEGER DEFAULT 1)`
- `occurrences(id TEXT PK, def_id TEXT NULL, title TEXT, zone TEXT, weight INTEGER, date TEXT, assignee TEXT, status TEXT CHECK(todo|done|skipped) DEFAULT 'todo', done_at TEXT NULL, done_by TEXT NULL, validated_by TEXT NULL)`
- `shopping_items(id TEXT PK, label TEXT, aisle TEXT, status TEXT CHECK(open|checked), added_by TEXT, added_at TEXT, checked_at TEXT NULL)`
- `purchase_history(label TEXT, purchased_at TEXT)`
- `village(id INTEGER PK CHECK(id=1), acorns INTEGER, zone_last_done TEXT JSON)`
- `progress(member_id TEXT PK, streak INTEGER, best_streak INTEGER, last_active_date TEXT, milestones TEXT JSON)`

Seed default `task_defs` (realistic French chores incl. piscine/jardin with season 'summer' where relevant, poubelles fixed tuesday, child tasks) applied at onboarding, not in migration.

### Task 3: Domain: recurrence + weekly distribution (TDD)

`shared/schedule.ts`.

**Produces:**
- `type Recurrence = { timesPerWeek?: number; daysOfWeek?: number[] }` (0=lundi)
- `expandWeek(defs: TaskDef[], weekStart: string, season: 'summer'|'winter'): Slot[]`
- `distributeWeek(slots: Slot[], adults: [string,string], childId: string|null, lastAssignee: Record<string,string>): Occurrence[]`

Algorithm: child_task→child. fixed_assignee respected. Remaining slots sorted by weight desc; each assigned to the adult with the lower running weighted total; tie broken by rotation (prefer the adult who did NOT do this def last time, tracked via `lastAssignee`). daysOfWeek pins dates; timesPerWeek spreads evenly across the week (e.g. 2× → lundi+jeudi). Deterministic.

Tests: expansion with daysOfWeek / timesPerWeek / season filtering; distribution balances weighted totals within min slot weight; rotation alternates an unpopular chore; fixed assignee kept even if unbalanced; child tasks to child.

### Task 4: Domain: village state, balance, suggestions (TDD)

`shared/village.ts`: `levelFor(acorns)` with `LEVELS` table (18 unlocks, cost curve `cost(n)=50+25*n`), returns `{level, unlocked[], nextCost, progress}`; `freshness(lastDoneISO, nowISO)` → 0-100 (100 - 12/day, floor 15); `weekBalance(occurrences, adults)` → per-adult weighted done totals + ratio; `updateStreak(progress, doneDateLocal)`.
`shared/shopping.ts`: `suggest(history: {label, purchasedAt}[], nowISO)` → labels bought ≥3 times whose median interval has elapsed since last purchase; plus `frequentItems(history)` top-12 by count.
Full unit test coverage, edge cases (empty history, single purchase, same-day repeats).

### Task 5: API Worker

`worker/api.ts` REST (all under `/api`, Bearer auth except `/health`):
- `GET /state` → bootstrap payload: members, village (acorns, level info, freshness/zone), today occurrences (all members), week occurrences, shopping open items, my progress, balance.
- `POST /onboard` {members:[{name,creature,role}]} idempotent; creates members + default task_defs + village row.
- `POST /occurrences/:id/done` {byMemberId} (child tasks: also `validatedBy`); adds acorns, updates zone_last_done, streak, purchase-like side effects; returns updated village+occurrence. `POST /occurrences/:id/undo`, `POST /occurrences/:id/move` {date?, assignee?}, `POST /occurrences` (ad-hoc task {title, zone, weight?, date?, assignee?}).
- `GET/POST /shopping` add {label, aisle?}; `POST /shopping/:id/check`, `/uncheck`, `POST /shopping/checkout` (moves checked→purchase_history); `GET /shopping/suggestions`.
- `POST /tasks` CRUD minimal for task_defs (create/edit/deactivate), `POST /week/regenerate`.
- `POST /push/subscribe` {memberId, subscription}.
After each mutation, notify DO to broadcast `{type:'refresh'}`. Errors: JSON `{error}` + proper codes. Integration smoke-tested via `wrangler dev` + curl in Task 14.

### Task 6: Durable Object realtime

`worker/do.ts` `VillageHub`: WebSocket hibernation API; `/api/ws?k=` upgrades and joins; `broadcast(payload)` via internal fetch from api handlers. Client reconnects with backoff; on message `refresh`, client refetches `/state`.

### Task 7: Crons + Web Push

`worker/push.ts` using `@block65/webcrypto-web-push` (VAPID keys as secrets `VAPID_PUBLIC/VAPID_PRIVATE`).
Cron dispatch in `worker/index.ts` by cron string:
- `0 14 * * 0` (dim 18h local): archive last week leftovers (keep todo→move to new week? rule: unfinished non-fixed occurrences are dropped, they will regenerate), generate next week via domain fns, broadcast.
- `0 3 * * *` (7h local): per adult with tasks today → push « Bonjour {name} ! {n} missions t'attendent aujourd'hui 🌱 ».
- `30 14 * * *` (18h30 local): per adult, if important (weight≥3) task still todo → gentle push. Also per-task `reminder_time` checked hourly? Simplify: reminder_time tasks get included in the morning push with their hour; evening push mentions them explicitly.

### Task 8: Frontend foundation

`app/src`: `api.ts` (fetch wrapper w/ token), `store.ts` (zustand: state payload, actions optimistic), `ws.ts`, token capture from `?k=`, profile picker (Netflix-style creature cards, stored `memberId` localStorage), onboarding wizard (first run: names + creatures), bottom tab nav (Village, Aujourd'hui, Semaine, Courses, Plus), design tokens (palette forêt: crème #FAF3E3, vert #3E5C40, terracotta #D9714E, nuit #22333B; font Nunito), creatures as inline SVGs (renard, chouette, panda roux, hérisson, lapin, ours). Use frontend-design skill for visual direction.

### Task 9: Village screen

Layered SVG scene (sky gradient, hills, 6 zones placées, houses per member with creature). Zone visuals react to freshness (opacity/saturation + details: fumée lavoir, fleurs potager) and animate on completion events (WS). Level gauge (glands), balançoire (balance ratio tilts), unlock reveal animation + toast « Nouveau : la fontaine ! ». Tap zone → sheet with zone tasks (done/todo this week).

### Task 10: Aujourd'hui + Semaine screens

Aujourd'hui: my cards (title, zone icon, glands), tap→done w/ confetti + acorn fly animation; swipe/long-press menu: « demain », « proposer à {autre} »; section « L'équipe aujourd'hui » showing partner's done items. Semaine: 7-day columns × members rows, drag (or tap-to-move fallback) occurrence to other day/person; « + » quick add (title + zone, optional weight/day/assignee); button « Rééquilibrer » calls regenerate keeping manual moves.

### Task 11: Courses screen + offline

Grouped by aisle (rayons fixes: fruits & légumes, frais, épicerie, boissons, hygiène, maison, autre). Add bar with suggestions chips (frequent + due suggestions). Check with strike animation; « Terminer les courses » → checkout. Offline: mutations queued in localStorage, flushed on reconnect; list cached for offline read.

### Task 12: Mode enfant + tablette + Équilibre

Enfant (from child profile or « mode enfant » button): fullscreen, huge illustrated mission cards (emoji-based illustrations), tap→parent validation dialog (parent taps their creature)→dance + confetti. Tablette: `min-width: 1024px` layout = dashboard grid (village large, today lists per member, shopping sidebar); auto-refresh via WS. Équilibre (tab « Plus »): weekly/monthly weighted split (bar duo), history list (qui a fait quoi), streaks, positive copy. Use dataviz skill guidance for charts.

### Task 13: PWA + push subscribe

`manifest.webmanifest` (name « Le Village », icons generated SVG→PNG 192/512, theme colors), service worker (precache app shell, runtime cache /state fallback, offline page), install hint UI, notifications opt-in screen in « Plus » (per-member toggle morning/evening), push subscription wiring, iOS instructions (ajouter à l'écran d'accueil).

### Task 14: E2E Chrome, polish, deploy, guide

Run `wrangler dev`; drive full flows in Chrome via claude-in-chrome (onboarding, done task→village anim, week move, shopping offline, child mode, tablet layout via resize, second tab realtime sync). Fix all findings (auditing-user-flows skill). Deploy (`wrangler deploy`, migrations apply, secrets). Verify production URL in Chrome. Write `docs/GUIDE-FAMILLE.md` (French quickstart: URL + token QR, install PWA iOS/Android, activer notifs) + README. Final commit.

---

## Self-Review

- Spec coverage: all spec sections map to tasks (concept→9/12, écrans→9-12, distribution→3, rappels→7/13, courses→4/11, équilibre→4/12, technique→1/5/6/7/13, tests→3/4/14). Household guide added.
- Unfinished-task rule decided: non-fixed leftover occurrences drop at week regeneration (they regenerate naturally); ad-hoc tasks roll over to the new week. Made explicit in Task 7.
- Types consistent: `Occurrence`, `TaskDef`, `Slot`, `Recurrence` defined once in `shared/types.ts` (Task 3) and reused.
