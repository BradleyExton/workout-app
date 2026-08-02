"use client";

import { useEffect, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import * as styles from "./styles";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  // While locked (e.g. a save in flight), backdrop taps and Escape are
  // ignored so dismissal can't cancel the operation mid-write.
  locked?: boolean;
  children: React.ReactNode;
};

export const Modal = ({
  open,
  onClose,
  locked = false,
  children,
}: ModalProps): JSX.Element | null => {
  useEffect(() => {
    if (!open || locked) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, locked, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      onClick={locked ? undefined : onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <Card variant="muted" className={styles.card}>
          {children}
        </Card>
      </div>
    </div>
  );
};
