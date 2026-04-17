import type { JSX } from "react";
import * as styles from "./styles";

type ButtonVariant = keyof typeof styles.variant;

type ButtonProps = {
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
};

export const Button = ({
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className = "",
  children,
}: ButtonProps): JSX.Element => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`${styles.base} ${styles.variant[variant]} ${className}`}
  >
    {children}
  </button>
);
