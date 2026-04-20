import type { ComponentPropsWithoutRef, JSX } from "react";
import * as styles from "./styles";

type ButtonVariant = keyof typeof styles.variant;

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
};

export const Button = ({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps): JSX.Element => (
  <button
    type={type}
    className={`${styles.base} ${styles.variant[variant]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
