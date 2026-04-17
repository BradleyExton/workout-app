import type { JSX } from "react";

type MascotKind = "flex-hero" | "bench" | "flex" | "run";

type MascotProps = {
  kind: MascotKind;
  className?: string;
};

const ink = "var(--color-ink)";
const skin = "var(--color-skin)";
const hair = "var(--color-hair)";
const urgent = "var(--color-urgent)";

export const Mascot = ({
  kind,
  className = "",
}: MascotProps): JSX.Element => {
  switch (kind) {
    case "flex-hero":
      return (
        <svg viewBox="0 0 64 64" className={className}>
          <line x1="22" y1="38" x2="12" y2="23" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          <line x1="22" y1="38" x2="12" y2="23" stroke={skin} strokeWidth="6" strokeLinecap="round" />
          <line x1="12" y1="23" x2="21" y2="10" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          <line x1="12" y1="23" x2="21" y2="10" stroke={skin} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="12" cy="18" rx="5.5" ry="5.5" fill={skin} stroke={ink} strokeWidth="2.2" />
          <path d="M 9 16 Q 12 20 15 16" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="22" cy="9" r="3" fill={skin} stroke={ink} strokeWidth="2.2" />
          <path d="M 20 9 L 24 9" stroke={ink} strokeWidth="1" fill="none" />

          <path d="M 23 18 Q 23 10 32 10 Q 41 10 41 18 L 41 22 L 23 22 Z" fill={hair} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M 24 16 L 24 24 Q 24 29 27 31 L 30 33 L 34 33 L 37 31 Q 40 29 40 24 L 40 16 Z" fill={skin} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M 24 18 Q 24 12 32 12 Q 40 12 40 18 L 40 20 Q 36 18 32 18 Q 28 18 24 20 Z" fill={hair} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
          <path d="M 24 21 Q 32 18 40 21" fill="none" stroke={urgent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 27 23 L 30 23" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <path d="M 34 23 L 37 23" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <circle cx="29" cy="25.5" r="1.3" fill={ink} />
          <circle cx="35" cy="25.5" r="1.3" fill={ink} />
          <path d="M 29 29 Q 32 31 35 29" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />

          <path d="M 28 33 L 28 36 L 36 36 L 36 33 Z" fill={skin} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />

          <path d="M 18 38 L 25 35 L 28 36 L 32 36 L 36 36 L 39 35 L 46 38 L 44 50 L 20 50 Z" fill="white" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M 28 38 Q 32 41 36 38" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
          <text x="32" y="46" textAnchor="middle" className="font-display" fontSize="5" fill={ink}>LIFT</text>

          <line x1="42" y1="38" x2="50" y2="32" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          <line x1="42" y1="38" x2="50" y2="32" stroke={skin} strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="32" x2="51" y2="22" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          <line x1="50" y1="32" x2="51" y2="22" stroke={skin} strokeWidth="6" strokeLinecap="round" />
          <circle cx="51" cy="20" r="3.2" fill={skin} stroke={ink} strokeWidth="2.2" />
          <rect x="49.5" y="13" width="3" height="6" rx="1.5" fill={skin} stroke={ink} strokeWidth="2" />

          <rect x="24" y="50" width="7" height="10" fill={ink} />
          <rect x="33" y="50" width="7" height="10" fill={ink} />
        </svg>
      );

    case "bench":
      return (
        <svg viewBox="0 0 40 40" className={className}>
          <circle cx="20" cy="18" r="4" fill={skin} stroke={ink} strokeWidth="1.5" />
          <rect x="10" y="22" width="20" height="5" fill="white" stroke={ink} strokeWidth="1.5" rx="1" />
          <rect x="8" y="27" width="24" height="2" fill={ink} />
          <rect x="4" y="12" width="32" height="1.5" fill={ink} />
          <circle cx="6" cy="12.75" r="2" fill={ink} />
          <circle cx="34" cy="12.75" r="2" fill={ink} />
          <path d="M 13 20 L 13 14 M 27 20 L 27 14" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 28 25 L 34 32" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "flex":
      return (
        <svg viewBox="0 0 40 40" className={className}>
          <circle cx="20" cy="14" r="5" fill={skin} stroke={ink} strokeWidth="1.5" />
          <rect x="15" y="11.5" width="10" height="1.5" fill={ink} />
          <circle cx="18" cy="14" r="1" fill={ink} />
          <circle cx="22" cy="14" r="1" fill={ink} />
          <path d="M 15 18 Q 15 26 17 32 L 23 32 Q 25 26 25 18 Z" fill="white" stroke={ink} strokeWidth="1.5" />
          <path d="M 15 20 Q 8 16 6 8 Q 8 6 12 8 Q 14 16 15 20 Z" fill={skin} stroke={ink} strokeWidth="1.5" />
          <path d="M 25 20 Q 32 16 34 8 Q 32 6 28 8 Q 26 16 25 20 Z" fill={skin} stroke={ink} strokeWidth="1.5" />
          <path d="M 17 32 L 14 38 M 23 32 L 26 38" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "run":
      return (
        <svg viewBox="0 0 40 40" className={className}>
          <circle cx="22" cy="10" r="4" fill={skin} stroke={ink} strokeWidth="1.5" />
          <rect x="18" y="7.5" width="8" height="1.5" fill={ink} />
          <path d="M 20 14 Q 18 20 20 26 L 26 26 Q 27 20 26 14 Z" fill="white" stroke={ink} strokeWidth="1.5" />
          <path d="M 20 16 Q 14 14 12 20" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 26 16 Q 32 18 33 22" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 21 26 Q 18 30 14 32" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 25 26 Q 28 30 30 36" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 6 12 L 10 12 M 5 16 L 9 16 M 7 20 L 11 20" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
};
