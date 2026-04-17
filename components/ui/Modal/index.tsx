"use client";

import { useEffect, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import * as styles from "./styles";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const Modal = ({ open, onClose, children }: ModalProps): JSX.Element | null => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <Card variant="cream" className={styles.card}>
          {children}
        </Card>
      </div>
    </div>
  );
};
