# Audit — after milestone 5 (2026-04-17)

Review pass done after milestones 1–5 landed. This doc captures findings so
they're not lost in chat. Updated as items are resolved.

Legend: `[ ]` open · `[x]` fixed · `[~]` deferred (tracked for later milestone)

---

## Critical — data integrity

- **[x] C1. Two-active-workouts race.** `app/(app)/workout/new/actions.ts`
  find-or-create is not atomic. Two rapid picker taps insert two workouts;
  `home` picks one and orphans the other. Fix: partial unique index
  `workouts(user_id) WHERE finished_at IS NULL`, catch 23505 and re-fetch.
- **[x] C2. `set_number` race.** `app/(app)/workout/[id]/actions.ts::logSet`
  reads `max(set_number)` then inserts `max+1`. Rapid LOG SET taps can collide.
  Fix: unique `(workout_exercise_id, set_number)` + retry on 23505 (or use a
  single-statement INSERT … SELECT coalesce(max,0)+1).
- **[x] C4. Defense-in-depth missing on mutating server actions.** `logSet`,
  `finishWorkout`, `discardWorkout` rely on RLS alone. Add `getUser()` +
  `.eq("user_id", user.id)` on every mutation. Matches pattern already used
  in `addExerciseToWorkout`.

## High — bugs + scaling risks

- **[x] H1. Zero-rows-affected not detected.** `finishWorkout` /
  `discardWorkout` / `logSet` don't verify anything updated — a wrong id or
  an RLS-hidden row silently succeeds. Fix: `.select("id")` and assert
  returned array length.
- **[ ] H2. Server actions `throw` raw PostgREST errors.** User sees generic
  error boundary with SQL detail leaked. Use React 19 `useActionState` with
  structured `{ ok, error }` returns for user-recoverable failures; log +
  rethrow generic messages for unexpected errors.
- **[ ] H3. Supabase join normalization duplicated** in `page.tsx` files:
  `Array.isArray(x) ? x[0] : x` pattern for ambiguous PostgREST embeds. Add
  `lib/supabase/embeds.ts::one<T>(v): T | null` helper.
- **[ ] H5. `exercise_category = 'cardio'` enum is dead weight.** PLAN.md says
  cardio lives in `cardio_sessions` not `exercises`; drop the `'cardio'` enum
  value before milestone 6 or someone accidentally seeds a cardio exercise row.
- **[x] H6. `/auth/test-login` guard weakness on Vercel previews.** `NODE_ENV`
  is `production` on previews. Add `VERCEL_ENV !== "production" &&
  VERCEL_ENV !== "preview"` guard before we deploy anywhere.
- **[x] H7. `Timer` effect tears down every render.** `since` is a freshly
  constructed `Date` on each parent render → unstable dep → interval
  constantly replaced. Accept `since: number` (ms-epoch) at the prop boundary
  or memoize the `Date` at each callsite.
- **[~] H8. Overdue muscles never-trained state.** Groups that have never been
  trained don't get the orange dot. Intentional at current state (all users
  are new), revisit when we have longer-lived users. Defer.

## Medium — maintainability / scalability

- **[x] M1. Format helpers duplicated 3×.** `formatVolume`, `formatWeight`,
  `formatDaysAgo`, `relativeDays` appear in `ActiveWorkout`, `FinishModal`,
  `page.tsx`. Move to `lib/format/{weight,volume,time}.ts`.
- **[x] M2. `formatVolume` boundary jump.** 999 → `"999"`, 1000 → `"1.0k"`.
  Pick a single rule (`< 1000 whole · < 10k one decimal · else whole + k`).
- **[x] M3. Typed env module.** Every `process.env.X!` is a runtime ambush
  waiting to happen (we shipped a truncated anon key that only surfaced via
  auth failing in Playwright). Build `lib/env.ts` that validates shape at
  import time, nukes all `!` assertions.
- **[ ] M4. UI primitives don't forward DOM props.** `Card`, `Button` etc
  take only a hand-picked subset. Hit this in `Modal` (had to wrap `Card` in
  a `div` for `onClick` stop-propagation). Fix: spread
  `...rest: React.ComponentPropsWithoutRef<element>`.
- **[x] M5. Tailwind class repetition.** Three load-bearing strings appear
  5+ times each: `border-[2.5px] border-ink rounded-[10px] shadow-brutal-sm`,
  `font-display tracking-display`, `text-[10px] font-black uppercase
  tracking-widest`. Add `@utility` definitions in `globals.css` (Tailwind v4).
- **[x] M6. `signOut` action missing `revalidatePath`.** Cached RSC data from
  previous user could persist for next visitor. Call
  `revalidatePath("/", "layout")` before redirect.
- **[ ] M7. Last-session lookup same-day bug.** Query picks any finished
  workout with this exercise — including one earlier today. Renders confusing
  "Last session · today" when the user's current workout is their second
  today. Filter `workout.finished_at < current.started_at`.
- **[ ] M8. Streak uses UTC day keys.** Workouts crossing midnight in UTC−
  break the streak incorrectly for west-coast users. Use local date
  components.
- **[ ] M9. Numeric columns parsed as strings.** TS types say `number`,
  runtime is `string`, we cast at boundaries. Drift will bite. Centralize
  parsing at query boundary or widen types.
- **[x] M10. DB errors leak to client.** `throw error` sends SQL messages
  through to Next.js error UI. Log server-side, throw generic.
- **[ ] M11. `Modal` has no focus trap / initial focus.** Destructive
  "Discard" action is one tab-and-enter from accidental trigger.
- **[ ] M12. Proxy matcher PWA-unfriendly.** When milestone 8 ships SW +
  manifest fetches, every static fetch runs session refresh. Add
  `manifest\.webmanifest` and `sw\.js` to matcher exclusion.
- **[~] M13. Missing index on `exercises(category, name)`.** 40 rows today,
  irrelevant. Revisit when custom exercises ship.
- **[~] M14. Aggregate query indexes for milestones 9–10.** PR detection will
  want `sets(workout_exercise_id, completed_at)`. `EXPLAIN ANALYZE` the home
  query under load before ship. Track in milestone 10.

## Low — nits

- **[ ] L1. `pickerCopy.allFilter` exported but unused.** Either use it or
  delete.
- **[x] L2. `formatDaysAgo(0)` → `"0d"` but copy calls today `"—"` elsewhere.**
  Pick `"today"` for 0 and stop using em-dash for that case.
- **[ ] L3. `proxy.ts` has no explicit `runtime`.** `export const runtime =
  "nodejs"` makes Node-only code paths unambiguous.
- **[ ] L4. `Button` missing `form` attribute forwarding.** Already worked
  around with a raw `<button>` in `ActiveWorkout`. Fix via M4.
- **[ ] L5. `deriveName` from email is scaffolding.** Track for YOU tab.
- **[ ] L6. `MUSCLE_GROUPS` typed as `readonly MuscleGroup[]`.** Declaring
  with `as const` preserves tuple type and richer autocompletion.

## Convention drift — observed clean

As of 2026-04-17: `JSX.Element` returns, named exports, `as const` copy,
named-const styles, no hardcoded colors, no `any`, no `console.log`,
`import type` consistent, `"use client"` minimal.

---

## Standards added to `~/.claude/rules/` (2026-04-17)

- **`supabase-actions.md`** — every mutating server action `getUser()` +
  explicit `user_id` filter + `.select()` row-count assertion; never throw
  raw PostgREST errors; retry on `23505` for `max+1` inserts;
  `revalidatePath` on auth-state changes.
- **`env.md`** — all env access through `lib/env.ts`; dev-only routes guard
  on both `NODE_ENV` and `VERCEL_ENV`; server-only keys never get
  `NEXT_PUBLIC_` prefix.
- **`react-conventions.md`** (amended) — primitives spread `...rest`;
  `copy.ts` contains ONLY `as const` strings (helpers go to `lib/format/*`);
  `useEffect` deps must be primitives or memoized.
- **`typescript.md`** (amended) — Tailwind `@utility` once a string repeats
  3×; centralize DB-numeric parsing at query boundary.
