---
applies_to: "**/*.{ts,tsx,js,jsx}"
---

# Code design

> **Global, framework-agnostic** house style — ported from the `ask-locallogic` FE rules and
> de-projected so it travels to any project (DESIGN §9.1). Framework-specific style (React
> component layout, JSX, styling) stays **vendored per project** (e.g. a project's own `react.md`),
> not here. Imported into a project via its `CLAUDE.md` when the manifest lists `code-design`.
>
> The deep-module vocabulary below draws on Ousterhout (*A Philosophy of Software Design*),
> Michael Feathers (seams), and Matt Pocock's `codebase-design` skill.

## Modules

- Prefer **deep modules**: a lot of behaviour behind a small interface. **Depth = leverage** — how much a caller (or test) can exercise per unit of interface they must learn. Measure depth as leverage, *not* as a ratio of implementation-lines to interface-lines (that just rewards padding the body).
- The **interface** is everything a caller must know to use the module correctly — not only the type signature, but invariants, ordering constraints, error modes, and required config. Keep it small; hide internals; don't re-export a symbol only used inside.
- A module should do **one thing**. If describing it needs an "and" ("parses the file AND uploads it"), it's probably two modules.
- **Deletion test:** imagine deleting the module. If complexity vanishes, it was a pass-through; if it reappears across N callers, it was earning its keep.
- **Seams earn their place** (a seam is where an interface lives — Feathers): one adapter is a *hypothetical* seam, two adapters (e.g. real + test) is a *real* one. Don't add indirection for a seam nothing varies across.
- **The interface is the test surface** — tests cross the same seam callers do. If you must test *past* the interface, the module is the wrong shape. Accept dependencies rather than creating them, and return results rather than mutating, so the interface stays testable.

## File & folder structure

- A module with public exports has a single clear **entry point** (`index.ts`) so consumers import the folder, not a file: `import { parse } from './parser'` resolves to `parser/index.ts`.
- When a module accumulates more than one independently testable function, promote `foo.ts` → `foo/index.ts` and split each function into its own subfolder with `index.ts` + its colocated test.
- Co-locate a module's parts (types, helpers, tests) with the module. Promote to a shared location only when actually used across modules.
- If a file exceeds ~150 lines, look for a split. Don't split mechanically — coherent units can legitimately exceed this; the heuristic is a prompt to *look*, not a hard cap.

## Utilities & extraction

- Extract a utility when the logic is **independently testable, single-responsibility, OR reused** — the *combination* of those traits is the trigger, not "this is a function."
- Don't pre-extract speculatively. A function used in one place with no testable behaviour of its own usually stays inline.
- Pull complex logic out of the call site. When a branch grows conditional or a computation becomes non-trivial, extract it into a named function before the surrounding code.

## Naming

- Use **path-relative** names by default. A `Profile` inside `modules/billing/` is `Profile`, not `BillingProfile` — the path supplies the context.
- Prefix only when an export crosses a module boundary and would otherwise be ambiguous, and disambiguate **at the export site** (re-export as `BillingProfile` from the module's entry), not at the source.
- Names should read without surrounding context. Bare generics like `data`, `scope`, `id` are red flags when the role isn't obvious — prefer `areaGeogId`, `requestedTimeframe`, etc.
