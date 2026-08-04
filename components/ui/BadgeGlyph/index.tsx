import type { JSX } from "react";
import { isAchievementSlug, type AchievementSlug } from "@/lib/domain/achievements";
import * as styles from "./styles";

// One hand-drawn 24×24 stroke glyph per achievement. These replace the
// seeded emoji icons (the achievements.icon column is now a legacy
// fallback no surface renders).

type Circle = { cx: number; cy: number; r: number };
type Glyph = { paths: string[]; circles?: Circle[] };

const GLYPHS: Record<AchievementSlug, Glyph> = {
  first_workout: {
    paths: ["M7 7v10", "M3.5 9.5v5", "M17 7v10", "M20.5 9.5v5", "M7 12h10"],
  },
  ten_workouts: {
    paths: ["M8 3l2.5 6.4", "M16 3l-2.5 6.4"],
    circles: [
      { cx: 12, cy: 15.3, r: 4.3 },
      { cx: 12, cy: 15.3, r: 1.2 },
    ],
  },
  fifty_workouts: {
    paths: [
      "M8 4h8v5a4 4 0 0 1-8 0V4z",
      "M8 5H5v1.5A3 3 0 0 0 8 9.5",
      "M16 5h3v1.5a3 3 0 0 1-3 3",
      "M12 13v4",
      "M9 17h6",
      "M8 20h8",
    ],
  },
  streak_week: {
    paths: [
      "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 1.07-2.14 2.5-3.5 4.5-4 0 2 .5 3.5 2 5 1.5 1.5 2 2.5 2 4a6.5 6.5 0 1 1-13 0c0-1.5.5-2.5 1-3.5.5 1 1 1.5 2 2z",
    ],
  },
  first_pr: {
    paths: [
      "M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9L12 3z",
    ],
  },
  ten_prs: {
    paths: [
      "M15.5 4l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L15.5 4z",
      "M3 7h4.5",
      "M2 12h4",
      "M4 17h4.5",
    ],
  },
  full_body_week: {
    paths: ["M4.5 10.5L12 9l7.5 1.5", "M12 9v5.5", "M12 14.5l-4 6", "M12 14.5l4 6"],
    circles: [{ cx: 12, cy: 5, r: 2.5 }],
  },
  volume_10k: {
    paths: ["M12 6.3v1.9", "M12 15.8v1.9"],
    circles: [
      { cx: 12, cy: 12, r: 8.3 },
      { cx: 12, cy: 12, r: 2.6 },
    ],
  },
};

// Unknown slugs (a badge seeded after this file was written) fall back to
// the star rather than crashing or rendering an empty coin.
const FALLBACK: Glyph = GLYPHS.first_pr;

type BadgeGlyphTone = keyof typeof styles;

type BadgeGlyphProps = {
  slug: string;
  /** plasma = unlocked (gradient stroke + glow); dim = currentColor silhouette. */
  tone?: BadgeGlyphTone;
  className?: string;
};

export const BadgeGlyph = ({
  slug,
  tone = "plasma",
  className = "",
}: BadgeGlyphProps): JSX.Element => {
  const glyph = isAchievementSlug(slug) ? GLYPHS[slug] : FALLBACK;
  // Instances of the same slug repeat this id; the defs are identical, so
  // whichever instance the browser resolves to renders the same gradient.
  const gradientId = `badge-grad-${slug}`;
  const stroke = tone === "plasma" ? `url(#${gradientId})` : "currentColor";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles[tone]} ${className}`}
      aria-hidden
    >
      {tone === "plasma" && (
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="var(--color-plasma-pink)" />
            <stop offset="1" stopColor="var(--color-plasma-violet)" />
          </linearGradient>
        </defs>
      )}
      {glyph.circles?.map((c) => (
        <circle key={`${c.cx}-${c.cy}-${c.r}`} cx={c.cx} cy={c.cy} r={c.r} />
      ))}
      {glyph.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
};
