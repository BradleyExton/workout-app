---
applies_to: "**/*.{test,spec}.{ts,tsx,js,jsx}"
---

# Testing standards

> **Global, framework-agnostic** test-quality rules — ported from the `ask-locallogic` testing rules
> and de-projected (DESIGN §9.1). Project-specific tooling (the test runner, how to render/mount, the
> selector idiom — Vitest vs Jest, `react-dom/server` vs Testing Library) stays **vendored per
> project**. The discipline below is universal. Pairs with [`verification.md`](verification.md).

## Where tests live

- **Colocate** tests with the code under test: `index.test.ts` next to `index.ts`, `foo.test.ts` next to `foo.ts`. Use the project's settled `.test.*` / `.spec.*` suffix.

## What to assert

- Prefer testing **pure functions/selectors directly** over asserting on rendered output or prose — it's less brittle.
- When you must assert on output, assert on **stable structural signals**, not incidental copy.
- Include both positive and negative state assertions when both are useful for the behaviour under test.

## Test quality

- Keep tests **deterministic**. No implicit dependency on time, randomness, ordering, or network.
- Name tests as **`does X when Y`**. The name explains the *why* of a state, not an abstract descriptor: "when the score key is unknown" beats "with invalid data"; "preserves order across re-derive" beats "keeps order stable".
- **One behaviour per test.** If the title contains "and", split it into two.
- Extract repeated setup into local helpers.
- **Bug fixes ship with a regression test** that fails without the fix and passes with it.

## Fixtures & mocks

- Keep non-trivial mock payloads in a colocated `fixtures/` directory; use builders when several tests need variants of one shape.
- **Mock only external boundaries.** Don't mock internal implementation details unless the test specifically requires it.
- A mock is the **minimum** that satisfies the test — don't fabricate realistic prose unless the test asserts on copy.

## Don't game the check

- A test exists to **fail when the behaviour breaks**. Never weaken an assertion, delete a case, or special-case the input just to make a suite green — that defeats the purpose and is treated as a defect (see [`verification.md`](verification.md): the QA pass grades the *test* diff too).
