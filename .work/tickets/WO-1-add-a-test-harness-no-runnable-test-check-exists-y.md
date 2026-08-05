---
# ─── Required ───────────────────────────────────────────────────────────────
id: WO-1
title: "Add a test harness (no runnable test check exists yet)"
status: needs-planning   # idea | needs-research | needs-planning | ready | in-progress | in-review | done | blocked | superseded
kind: chore
priority: medium
created: 2026-08-04

# ─── Optional (delete a line to take its default) ───────────────────────────
deps: []                 # list<id>; DAG edges; must all be `done` before the SELECTOR picks this; default []
blocked_by: []           # list<string>; external/manual waits (free text); non-empty => selector skips; default []
---

## Goal
Give workout-app a runnable unit-test command so tickets can carry a machine-checkable test AC (today the verify gate is only lint + typecheck + build).

## Acceptance Criteria
- [ ] A test runner is installed and wired as `yarn test` (pick at planning: `node --test` + tsx like the system repo, or Vitest — decide against the Next 16 / React 19 stack)
- [ ] At least one real unit test exists against a pure module in `lib/` (e.g. a `lib/format` or `lib/domain` function), colocated per testing.md
- [ ] `.work/manifest.yml` gains `test:` (and `test_one:` with a `{pattern}` slot) keys pointing at the new command
- [ ] `yarn test` passes

## Plan
<filled at GATE 1 — this is what the human approves>

## Progress
<the executing agent appends here — the restart-safe log>

## Evidence
<test output + screenshot / preview URL, recorded before `done`>

## Links
- Onboarding decision record: .work/manifest.yml (verify block comment)
- rules: .work/rules/testing.md
