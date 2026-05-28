# CLAUDE.md

Persistent context for Claude Code working on **HeroPath**. Read this before any change.

## What HeroPath is

An offline-first, client-only PWA that turns fitness progression into an anime-inspired RPG leveling journey. Users start as a "Civilian" and progress through 8 ranks toward the full "Caped Baldy" workout (100 push-ups, 100 squats, 100 sit-ups, 10 km run). The product is a progression game disguised as fitness: gamification, adaptive difficulty, streaks, XP, achievements.

There is **no backend in the MVP.** All state lives on the device. Do not add network calls, cloud sync, auth servers, or third-party analytics unless explicitly asked.

## Non-negotiable architecture

Four layers with a strict one-way dependency rule:

1. **`src/domain/`** — pure TypeScript rules. XP math, streak logic, progression engine, achievements, rank definitions. **Imports nothing**: no React, no Zustand, no Dexie, no DOM, no clock. Plain data in, plain data out.
2. **`src/db/`** — Dexie/IndexedDB repositories + a `localStorage` preferences helper. Returns domain types, not raw rows.
3. **`src/store/`** — Zustand stores. **Orchestration only.** They call domain functions and repositories; they contain zero business rules.
4. **`src/features/` + `src/components/` + `src/app/`** — React UI. Renders store state, dispatches intents. No business logic.

**The golden rule:** if you're writing an `if (xp > ...)` or any rule/threshold/math inside a component or a store action, it belongs in `src/domain/`. Components render, stores orchestrate, domain decides.

Dependency direction: UI → store → domain, and store → db → domain. Domain depends on nothing. Never invert this.

## The one clock rule

Domain code **never** reads the clock. No `Date.now()`, no `new Date()` inside `src/domain/`. The current date is injected as a parameter at the call site. Exactly **one** place in the app (the store boundary) reads the real system clock and passes it down. This is the single most important rule for avoiding streak/progression date bugs. Always test date logic with injected fixed dates, including day-boundary and missed-day cases.

## Folder structure

```
src/
  domain/        # pure logic, no I/O — ranks, xp, streak, progression, achievements, types
  db/            # Dexie schema + repositories + preferences helper
  store/         # Zustand stores (orchestration only)
  features/      # UI by feature: onboarding, dashboard, workout, achievements, profile
  components/    # shared UI primitives
  hooks/
  lib/           # utilities (date, formatting)
  app/           # routing, layout, providers
  pwa/           # service worker config, manifest assets
```

Keep new code in its correct layer. If a file would need to import "upward" (domain importing a store, etc.), the design is wrong — stop and reconsider.

## Tech stack (do not substitute without asking)

React, TypeScript (strict), Vite, Tailwind CSS, Zustand, Dexie.js (IndexedDB), Framer Motion, React Router, vite-plugin-pwa. Tests: Vitest + React Testing Library + `fake-indexeddb`. Deploy: Vercel.

## Data model (local)

- **users**: id, username, level, xp, rank, streak
- **workouts**: id, date, pushups, squats, situps, cardioDistance
- **achievements**: id, title, unlockedAt
- **progression**: currentRank, consistencyScore, fatigueScore

IndexedDB holds records (workouts, progression, achievements, streak history). `localStorage` holds **only** three lightweight flags: theme, onboarding-complete, username. Don't put records in localStorage or preferences in IndexedDB.

## The 8 ranks (canonical — match exactly)

1. Civilian — 5/5/5, 0.5 km
2. Trainee — 10/10/10, 1 km
3. Fighter — 20/20/20, 2 km
4. Hunter — 35/35/35, 3 km
5. Elite — 50/50/50, 5 km
6. Hero Candidate — 70/70/70, 7 km
7. Hero — 85/85/85, 8.5 km
8. Caped Baldy — 100/100/100, 10 km

(reps are push-ups/squats/sit-ups; distance is the run/walk.)

## Product rules that live in code

- **Consistency over intensity.** The progression engine must never escalate difficulty when fatigue is high or consistency is low — it holds or deloads instead. This is a *tested invariant*, not a preference.
- **Safe start.** When onboarding assessment answers are ambiguous, bias the starting rank *down* (default Rank 1). Never start a user higher than their answers clearly justify.
- **Bounded progression.** Difficulty scales smoothly toward the next rank's target and never overshoots it. Rank advancement requires *sustained* consistent completion, not one good day.
- **Micro-rewards.** XP calculations return itemized breakdowns (base + each bonus), never a single number, so the UI can animate each source.
- **One-time celebrations.** Achievement evaluation returns only *newly* unlocked items so celebrations fire exactly once.

## Workout-completion orchestration (canonical sequence)

On "Complete Workout", the store runs, in this order: compute XP → update streak → run progression engine → evaluate achievements → persist all records via repositories → update in-memory state. UI then animates the deltas. Don't reorder; don't skip persistence.

## Coding conventions

- TypeScript strict; no `any`. Prefer precise domain types over primitives.
- Pure domain functions are synchronous and deterministic — no randomness, no side effects.
- Repositories wrap every IndexedDB call in try/catch and surface typed errors. Persistence must **degrade gracefully** (private mode, quota, Safari quirks) — never crash the app on a storage failure.
- Zustand selectors must be granular to avoid unnecessary re-renders.
- Path alias `@/` → `src/`.
- Use the existing utilities in `src/lib/` for date/formatting rather than inlining.

## UI/UX intent

Dark-mode-first, anime-inspired, futuristic, RPG-like. Glowing progression effects, energetic and rewarding feedback. It must feel like a game, **not** like a clinical, corporate, or spreadsheet-style tracker. Animate only `transform` and `opacity` for 60fps performance; respect `prefers-reduced-motion` (degrade to instant). Any sound effects are off by default with a mute toggle — never autoplay.

## Offline & PWA requirements

The entire core loop (workout tracking, XP, progression, achievements) must work fully offline after first load. Service worker precaches the app shell. Installable on Android Chrome, iOS Safari (needs `apple-touch-icon` + status-bar meta), and desktop. Standalone display, dark splash, maskable + standard icons. Initial load under 3 seconds on mid-tier mobile.

## Definition of done for any change

Before considering a task complete:

1. `npm run typecheck` passes (zero errors).
2. `npm run test` passes. New domain logic ships **with** tests; date logic is tested with injected fixed dates.
3. The change sits in the correct layer (no rules in components/stores; domain imports nothing).
4. Affected screen clicked through manually where UI changed.
5. No new network calls, no new dependencies, no business logic moved out of `domain/` — unless explicitly requested.

## Things not to do

- Don't add a backend, cloud sync, auth, payments, social features, or wearable/nutrition integrations (all explicitly out of MVP scope).
- Don't read the clock inside domain code.
- Don't put business rules in components or stores.
- Don't use `localStorage`/`sessionStorage` for records, or store preferences in IndexedDB.
- Don't swap stack libraries or add heavy dependencies (e.g. a big chart lib when a small SVG/Canvas suffices) without asking.
- Don't reproduce or bundle copyrighted anime assets, character art, or trademarked names as shipped content; keep visuals original and inspired-by.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview the build
- `npm run test` — Vitest
- `npm run typecheck` — TypeScript check
