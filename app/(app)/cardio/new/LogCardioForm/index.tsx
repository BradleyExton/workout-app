"use client";

import { useState, useTransition, type FormEvent, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as buttonStyles from "@/components/ui/Button/styles";
import { getDb } from "@/lib/db/dexie";
import { newId } from "@/lib/db/ids";
import { drainQueue, enqueue, type LogCardioPayload } from "@/lib/db/queue";
import type { CardioModality } from "@/lib/db/types";
import { cardioFormCopy, modalityLabel } from "./copy";
import * as styles from "./styles";

const FORM_ID = "log-cardio-form";
const MODALITIES: readonly CardioModality[] = ["walk", "run", "treadmill"];

export const LogCardioForm = (): JSX.Element => {
  const [modality, setModality] = useState<CardioModality>("run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [error, setError] = useState<"duration" | "distance" | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const durationMin = Number(duration);
    if (duration.trim() === "" || !Number.isFinite(durationMin) || durationMin <= 0) {
      setError("duration");
      return;
    }

    let distanceM: number | null = null;
    if (distance.trim() !== "") {
      const km = Number(distance);
      if (!Number.isFinite(km) || km < 0) {
        setError("distance");
        return;
      }
      distanceM = Math.round(km * 1000);
    }
    setError(null);

    startTransition(async () => {
      const id = newId();
      const startedAt = new Date().toISOString();
      const durationSec = Math.round(durationMin * 60);

      await getDb().cardio_sessions.put({
        id,
        user_id: "",
        modality,
        started_at: startedAt,
        duration_sec: durationSec,
        distance_m: distanceM,
      });

      await enqueue("logCardio", {
        id,
        modality,
        started_at: startedAt,
        duration_sec: durationSec,
        distance_m: distanceM,
      } satisfies LogCardioPayload);

      void drainQueue();
      router.push("/");
    });
  };

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        {cardioFormCopy.back}
      </Link>
      <h1 className={styles.title}>{cardioFormCopy.title}</h1>

      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <label
            className={`${styles.field} ${error === "distance" ? styles.fieldError : ""}`}
          >
            <span className={styles.fieldLabel}>{cardioFormCopy.distanceLabel}</span>
            <input
              className={styles.input}
              name="distance_km"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              aria-invalid={error === "distance"}
              value={distance}
              onChange={(event) => {
                setDistance(event.target.value);
                if (error === "distance") setError(null);
              }}
            />
            <span className={styles.fieldUnit}>{cardioFormCopy.distanceUnit}</span>
          </label>

          <label
            className={`${styles.field} ${error === "duration" ? styles.fieldError : ""}`}
          >
            <span className={styles.fieldLabel}>{cardioFormCopy.durationLabel}</span>
            <input
              className={styles.input}
              name="duration_min"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              required
              aria-invalid={error === "duration"}
              value={duration}
              onChange={(event) => {
                setDuration(event.target.value);
                if (error === "duration") setError(null);
              }}
            />
            <span className={styles.fieldUnit}>{cardioFormCopy.durationUnit}</span>
          </label>
        </div>

        {error && (
          <p role="alert" className={styles.errorText}>
            {error === "duration"
              ? cardioFormCopy.errorDuration
              : cardioFormCopy.errorDistance}
          </p>
        )}
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
