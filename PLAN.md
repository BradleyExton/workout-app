# Workout App — Build Plan

Personal weightlifting + cardio tracker. Phone-first PWA. Playful brutalist UI.

## Design is locked

UI mockup lives at `design/final.html` — read it for visual reference. Do **not** redesign screens; port the existing look. (Original source: `/Users/bradleyexton/projects/workout-app-mockups/final.html`.)

Design system tokens:
- Colors: `#0a0a0a` (black), `#c8ff2d` (lime), `#ff6b35` (orange, *only* for urgent/destructive signals), `#fff8e3` (cream), `#f5f1e3` (page bg), `#ffffff` (white). Skin tone for mascots: `#ffd9b3`. Hair: `#3d2817`.
- Borders: `3px solid #0a0a0a` on cards.
- Shadow: `5px 5px 0 #0a0a0a` (hard, no blur).
- Fonts: **Bungee** for display, **Bricolage Grotesque** for body.
- Paper-grain background texture on page bg.

Muscle groups (fixed enum): Chest, Back, Shoulders, Arms, Legs, Core. Cardio tracked separately (distance + time).

## Stack (locked)

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — auth (magic link) + Postgres + RLS
- **Dexie (IndexedDB)** — offline-first local cache + write queue. **Locked in for v1** (gym reception is flaky; in-progress workouts must survive offline).
- **PWA** — `next-pwa` or hand-rolled SW + manifest. Installable.
- **Zod** — schema validation at DB boundary and in forms.

## Data model (Supabase)

```
muscles            id, name, muscle_group                               -- 20 seeded individual muscles
exercises          id, name, primary_muscle, category, is_custom, user_id (null for seeded)
exercise_muscles   exercise_id, muscle_id, role ('primary'|'secondary') -- many-to-many
workouts           id, user_id, started_at, finished_at, notes
workout_exercises  id, workout_id, exercise_id, position
sets               id, workout_exercise_id, set_number, weight_kg, reps, completed_at
cardio_sessions    id, user_id, started_at, duration_sec, distance_m, modality ('walk'|'run'|'treadmill')
personal_records   id, user_id, exercise_id, pr_type ('1rm'|'volume'|'reps'), value, set_id, achieved_at
achievements       id, slug, title, description, icon, criteria (jsonb)
user_achievements  user_id, achievement_id, unlocked_at
```

**Muscle groups** (`muscle_group` enum): Chest, Back, Shoulders, Arms, Legs, Core. These drive the 6-group home-screen coverage grid.

**Individual muscles** (`muscles` table, 20 rows): Upper/Mid/Lower Chest · Lats/Upper Traps/Mid Traps–Rhomboids/Lower Back · Front/Side/Rear Delt · Biceps/Triceps/Forearms · Quads/Hamstrings/Glutes/Calves/Adductors · Abs/Obliques. Each muscle belongs to one group. Enables per-muscle detail (future anatomy heatmap) while keeping the 6-group UI primary.

**Coverage semantics**: primary-only (a set ticks its exercise's `primary_muscle` group). Secondary hits surface in per-muscle views, not in the weekly coverage card.

**Face Pull** is classified as Shoulders (rear delt is the dominant mover), not Back.

RLS: every user-scoped table filters by `auth.uid() = user_id`. `muscles` + `achievements` are read-all public metadata. `exercises` are readable if seeded (user_id null) OR own; writable only if own.

## Folder structure

```
app/
  (app)/                 # authed routes (layout enforces auth)
    page.tsx             # home
    workout/
      new/page.tsx       # exercise picker
      [id]/page.tsx      # active workout
    cardio/[id]/page.tsx
    history/page.tsx
    goals/page.tsx
    you/page.tsx
  (auth)/login/page.tsx
lib/
  supabase/              # browser + server clients
  db/                    # Dexie schema, sync queue, mirror logic
  domain/                # pure logic: PR detection, coverage calc, achievement rules
  types.ts
components/
  ui/                    # Button, Card, Pip — brutalist primitives
  workout/               # SetRow, ExerciseCard, RestTimer
  mascot/                # SVG mascot components (port from mockup)
styles/
  globals.css            # Bungee + Bricolage imports, CSS vars
public/
  manifest.webmanifest
  icons/
```

## Milestones

Roughly 1-2 evenings each for a stack-familiar dev.

1. **Scaffold + auth** — Next.js + Tailwind + Supabase client. Magic-link login. Empty home behind auth.
2. **Design system** — port tokens (colors, shadows, fonts) + primitives (Card, Button, Pip) from `final.html`. Mascot SVGs as React components.
3. **Exercise catalog** — seed ~40 common exercises (bench, squat, deadlift, OHP, rows, pulldowns, curls, etc.). Picker screen with muscle group filter.
4. **Log a workout (online only)** — start → add exercise → log sets → finish/discard modal. Writes straight to Supabase. No Dexie yet.
5. **Home screen data** — this-week coverage, muscle pips (5 per group), last session, "Back to workout" resume CTA when a session is active. Derived from `sets` + `workouts`.
6. **Cardio logging** — separate flow. Modality + distance + time.
7. **Offline-first (Dexie)** — local mirror, optimistic UI, write queue that drains when online. Biggest single chunk; phased delivery.
   - 7a. Foundations — Dexie schema, client UUIDs, queue primitives, `useOnlineStatus` hook. *(done)*
   - 7b. Convert `logSet` to optimistic-first with queue drain. *(next)*
   - 7c. Same pattern for `addExercise`, `finishWorkout`, `discardWorkout`, `logCardio`.
   - 7d. Read path: active workout (and home cardio + resume CTA) hydrate from Dexie, reconcile with Supabase on load. *(done)*
   - 7e. Edge cases: logSet 23505 retry, queue GC + per-op backoff, home metrics Dexie-merge. *(done)*
8. **PWA polish** — manifest, install prompt, service worker, offline fallback page. *(done)*
9. **Achievements + PRs** — pure functions run after each workout save. Easy to unit test.
10. **Polish pass** — empty states, error states, transitions, install prompt copy.

## Decisions already made (don't re-litigate)

- **No RPE** in v1. Skipped.
- **No rest timer auto-start** in v1. Can add later.
- **Cardio is its own card** below muscle grid, not mixed in. 3 sessions/week goal shown as pips + weekly distance/time rollup.
- **Back button (not Cancel)** in active workout. Returns to home; workout persists. Home CTA flips to "← BACK TO WORKOUT · timer" when active.
- **Finish opens a modal** with time/sets/volume summary. Primary: FINISH & SAVE. Escape hatch: `Discard workout` as orange text link.
- **6 muscle groups** only: Chest, Back, Shoulders, Arms, Legs, Core.
- **Orange (`#ff6b35`) is reserved** for urgent/destructive signals only (overdue muscle dots, discard link). Don't sprinkle it elsewhere.

## Resolved at kickoff

- **Units: kg.** No toggle.
- **Auth: magic-link only.** No password.
- **Exercise seed: curated with user.** 39 strength lifts live in the `exercises` table; cardio modalities (walk/run/treadmill) are enum values on `cardio_sessions`, not rows in `exercises`.
