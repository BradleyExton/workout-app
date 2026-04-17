"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import * as buttonStyles from "@/components/ui/Button/styles";
import type { CardioModality } from "@/lib/db/types";
import { logCardio } from "../actions";
import { cardioFormCopy, modalityLabel } from "./copy";
import * as styles from "./styles";

const FORM_ID = "log-cardio-form";
const MODALITIES: readonly CardioModality[] = ["walk", "run", "treadmill"];

export const LogCardioForm = (): JSX.Element => {
  const [modality, setModality] = useState<CardioModality>("run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        {cardioFormCopy.back}
      </Link>
      <h1 className={styles.title}>{cardioFormCopy.title}</h1>

      <form id={FORM_ID} action={logCardio} className="flex flex-col gap-4">
        <input type="hidden" name="modality" value={modality} />

        <p className={styles.sectionLabel}>{cardioFormCopy.modalityLabel}</p>
        <div className={styles.chipRow}>
          {MODALITIES.map((value) => {
            const active = modality === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setModality(value)}
                className={`${styles.chipBase} ${active ? styles.chipActive : styles.chipIdle}`}
              >
                {modalityLabel[value]}
              </button>
            );
          })}
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{cardioFormCopy.distanceLabel}</span>
            <input
              className={styles.input}
              name="distance_km"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
            />
            <span className={styles.fieldUnit}>{cardioFormCopy.distanceUnit}</span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{cardioFormCopy.durationLabel}</span>
            <input
              className={styles.input}
              name="duration_min"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              required
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
            <span className={styles.fieldUnit}>{cardioFormCopy.durationUnit}</span>
          </label>
        </div>
      </form>

      <div className={styles.ctaZone}>
        <button
          type="submit"
          form={FORM_ID}
          className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
        >
          {cardioFormCopy.submit}
        </button>
      </div>
    </main>
  );
};
