# Volt design system

The app is migrating from the old neo-brutalist look to **Volt** — training as a
game: XP, levels, quests, badge drops, neon glow on deep violet. Reference
mockups: https://claude.ai/code/artifact/b9c2c15a-ff33-4d2f-9a70-8931f92aae34

## Tokens (defined in `app/globals.css`)

| Token | Value | Job |
| --- | --- | --- |
| `void` | `#140B26` | App ground |
| `panel` | `#1D1038` | Cards |
| `edge` | `#35205E` | Borders |
| `plasma-pink` → `plasma-violet` | `#FF3EA5` → `#8B3DFF` | Primary actions & identity (always as a gradient) |
| `pulse` | `#26F0E5` | Whatever is live right now: progress, active timers, success |
| `gold` | `#FFC93C` | XP and rewards, nothing else |
| `glow` | `#F2ECFF` | Text |
| `dust` / `dust-dim` | `#B9A8E8` / `#5D4A8F` | Secondary / tertiary text |

**Each accent has one job.** If everything glows, nothing does — colored
`shadow-glow-*` shadows belong only on elements of that accent's own color.

## Type & shape

- One face: **Baloo 2** (`--font-baloo`), loaded in `app/layout.tsx`. Weight
  800 (`font-extrabold` / `display` utility) for anything that celebrates,
  500–600 for prose.
- Cards: `card-volt` (rounded-2xl) / `card-volt-sm` (rounded-xl). Chips and
  small actions are full pills.

## Migration status

- ✅ Phase 1: tokens, fonts, shared UI (`Card`, `Button`, `PipRow`, `TabBar`,
  `Modal`), Home screen.
- ✅ Phase 2: workout flow (exercise picker, active workout, finish modal,
  workout-complete screen) and cardio logging.
- ✅ Phase 3: history, profile, login, offline. **Every screen is on Volt.**
  The legacy alias tokens (`ink`, `lime`, `paper`, `cream`, `urgent`, the
  remapped `white`), the `brutalist-*` utilities and the `shadow-brutal*`
  names are **deleted** — `globals.css` now declares Volt tokens only. The
  unused mascot component was deleted with them, along with its
  `--color-skin` / `--color-hair` palette.
  `Card` variants are now `panel` / `plasma` / `muted` (was
  `white`/`black`/`lime`/`urgent`/`cream`).
- 🔜 Later phase: the XP economy (levels, quests, badge-drop moments) —
  computed from existing tables (`sets`, `workouts`, `cardio_sessions`,
  `user_achievements`), no new source of truth.
