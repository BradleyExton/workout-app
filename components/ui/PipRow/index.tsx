import type { JSX } from "react";
import * as styles from "./styles";

type PipRowSize = "md" | "sm";

type PipRowProps = {
  filled: number;
  total: number;
  size?: PipRowSize;
  inverse?: boolean;
  className?: string;
};

export const PipRow = ({
  filled,
  total,
  size = "md",
  inverse = false,
  className = "",
}: PipRowProps): JSX.Element => {
  const rowClass = size === "md" ? styles.md : styles.sm;
  const pipClass = size === "md" ? styles.pipMd : styles.pipSm;
  const tone = inverse ? "onDark" : "onLight";

  return (
    <div className={`${rowClass} ${className}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`${pipClass} ${index < filled ? styles.filled[tone] : styles.unfilled[tone]}`}
        />
      ))}
    </div>
  );
};
