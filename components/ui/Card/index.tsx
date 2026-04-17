import type { JSX } from "react";
import * as styles from "./styles";

type CardVariant = keyof typeof styles.variant;
type CardSize = "md" | "sm";

type CardProps = {
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  children: React.ReactNode;
};

export const Card = ({
  variant = "white",
  size = "md",
  className = "",
  children,
}: CardProps): JSX.Element => {
  const sizeClass = size === "md" ? styles.md : styles.sm;
  return (
    <div className={`${sizeClass} ${styles.variant[variant]} ${className}`}>
      {children}
    </div>
  );
};
