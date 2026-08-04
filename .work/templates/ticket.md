---
# ─── Required ───────────────────────────────────────────────────────────────
id: T-N                  # <PREFIX>-<n>; must equal the filename's <ID>; unique across the work-log
title: One-line title    # one line
status: needs-planning   # idea | needs-research | needs-planning | ready | in-progress | in-review | done | blocked | superseded
kind: feature            # feature | bug | chore | spike | ui
priority: medium         # high | medium | low
created: 2026-06-29      # YYYY-MM-DD (plan-work auto-stamps)

# ─── Optional (delete a line to take its default) ───────────────────────────
deps: []                 # list<id>; DAG edges; must all be `done` before the SELECTOR picks this; default []
blocked_by: []           # list<string>; external/manual waits (free text); non-empty => selector skips; default []
# model: sonnet          # opus | sonnet | haiku; unset => global default-by-kind policy (SCHEMA §5)
# thinking: medium       # low | medium | high; unset => policy
# trust: checkpointed    # checkpointed | heads-down; default checkpointed
# needs_prototype: false # true => prototype must complete before in-progress; default false
# landing: preview-pr    # preview-pr | direct-main | feature-flag; unset => manifest default (SCHEMA §7)
# worktree:              # set by work-on on claim (collision guard); default null
# parallel_safe:         # RESERVED for F-8 (post-MVP) — do not set
---

## Goal
<one-line intent>

## Acceptance Criteria
- [ ] <criterion>
- [ ] <criterion>
- [ ] <the LAST item MUST be a machine-checkable verification step — e.g. `yarn test src/foo.test.ts` passes>

## Plan
<filled at GATE 1 — this is what the human approves>

## Progress
<the executing agent appends here — the restart-safe log>

## Evidence
<test output + screenshot / preview URL, recorded before `done`>

## Links
<program docs, related tickets, references>
