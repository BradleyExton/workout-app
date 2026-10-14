---
# ─── Required ───────────────────────────────────────────────────────────────
id: WO-2
title: "Give Volt a motion layer — tokens, press feedback, reward moments"
status: in-review
kind: ui
priority: medium
created: 2026-08-05

# ─── Optional (delete a line to take its default) ───────────────────────────
deps: []                 # list<id>; DAG edges; must all be `done` before the SELECTOR picks this; default []
blocked_by: []           # list<string>; external/manual waits (free text); non-empty => selector skips; default []
---

## Goal
Give Volt a shared motion vocabulary and spend it on the reward moments, so the
gamified visual language stops being contradicted by instant state changes.

> **Ticket minted retroactively.** The work was requested and executed
> conversationally on 2026-08-05 before the work-log flow was entered; this
> ticket records what was actually built and verified so the push carries a
> handoff attestation rather than an unrecorded change.

## Acceptance Criteria
- [x] `app/globals.css` declares the vocabulary: three durations, two curves,
      and the keyframes — no component invents its own timing
- [x] `--ease-pop` (the overshoot) is used *only* for earned moments, matching
      the one-job-per-accent rule DESIGN.md sets for colour
- [x] Press feedback lives on the `Button` **variant** strings, so the six
      screens that apply `buttonStyles.variant.*` directly to a `<Link>` or
      `<button>` get it too
- [x] The pre-existing ad-hoc `transition-transform duration-150` sites are
      migrated onto the shared utility — one easing across the app
- [x] Reward moments animate: workout-complete staggers, both progress bars
      fill instead of jumping, PR chip and synced check pop
- [x] `prefers-reduced-motion` is honoured app-wide, including the
      pending-sync pulse that previously ran unconditionally
- [x] `work verify` passes (lint + typecheck + build)

## Plan
Tier 0 (foundation) + tier 1 (reward moments) of the three-tier audit. Tiers 2
(modal/collapse/toast motion) and 3 (route transitions via React
`<ViewTransition>`) are deliberately **out of scope** here and left for a
follow-up — see Links.

## Progress
- 2026-08-05 Audited motion across the app: 7 ad-hoc `active:scale` utilities,
  1 chevron rotate, 1 `animate-pulse`; no keyframes, no motion tokens, no
  `prefers-reduced-motion`. Produced a three-tier plan.
- 2026-08-05 Built tier 0 + tier 1 (commit `e47beeb`).
- 2026-08-05 Browser-verified against the dev server at the mobile preset by
  logging a real PR-setting set and finishing the workout.
- 2026-08-05 Ticket minted retroactively; handed off for attestation.
- 2026-08-05T01:40:36.670Z claimed → in-progress
- 2026-08-05T01:41:03.507Z handed off → in-review (verify green); awaiting land

## Evidence
`work verify` — all three steps green:

```
✓ lint: yarn lint
✓ typecheck: yarn tsc --noEmit
✓ build: yarn build
✓ verify passed (3 step(s))
```

Browser-verify (mobile 375x812, dev server, real workout logged end-to-end),
computed styles read back from the live DOM:

- Motion tokens resolve on `:root`; keyframes `fade-in`, `rise`, `pop-in`,
  `badge-drop` all registered.
- Workout-complete stagger fired in order — `rise` at `0s / 0.09s / 0.18s`,
  CTA at `0.27s` (computed from the badge count).
- Progress fill: `transition-property: width`, `0.3s`, `cubic-bezier(.22,1,.36,1)`.
- "NEW PR" chip and synced check: `pop-in`, `0.3s`, `cubic-bezier(.34,1.56,.64,1)`.
- `badge-drop` verified by injecting a test element (no achievement unlocked in
  the test workout) — 0.6s, overshoot curve, gold glow blooming last.
- Reduced-motion rule present and correctly scoped to `*, ::before, ::after`.

**Test-data residue (not cleaned):** verification created workout
`2179bad2-0a75-4d72-8d9e-fcf80c8855b6`, set
`e1e666aa-f421-4315-9b1e-9f9a33f944c3` (60kg x 8 Barbell Bench Press) and three
`personal_records` rows including a 1RM of 76 kg, in the dev Supabase project
`yvnyolgkfvcnjtttnvtt`. The cleanup delete was blocked by the permission
classifier and was deliberately not worked around. Adds to the known dev-DB
test-residue item.

<!-- captured-evidence:start -->
**Verify gate:** ✓ PASS (3 step(s))

```
✓ lint: yarn lint
✓ typecheck: yarn tsc --noEmit
✓ build: yarn build
```

**Anti-blind-spot grep:** no touched symbols in the diff.

_Captured 2026-08-05T01:41:03.507Z._
<!-- captured-evidence:end -->

## Links
- Follow-up (not yet a ticket): tier 2 — `Modal` mount/unmount via
  `@starting-style` + `transition-behavior: allow-discrete`; expand/collapse via
  `grid-template-rows: 0fr → 1fr` (SetList editor, HistoryEntry panel,
  InstallAppRow steps, cardio time field); IdleGuard + SyncStatusChip slide-in;
  TabBar and filter-chip colour transitions.
- Follow-up (not yet a ticket): tier 3 — route transitions via React
  `<ViewTransition>` behind `experimental.viewTransition`; see
  `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`.
- DESIGN.md — the one-job-per-accent rule the `ease-pop` reservation mirrors.
- rules: .work/rules/code-design.md
