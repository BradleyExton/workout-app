"use client";

import { useState, useTransition, type FormEvent, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as buttonStyles from "@/components/ui/Button/styles";
import { CtaZone } from "@/components/ui/CtaZone";
import * as ctaStyles from "@/components/ui/CtaZone/styles";
import { getDb } from "@/lib/db/dexie";
import { newId } from "@/lib/db/ids";
import { drainQueue, enqueue, type LogCardioPayload } from "@/lib/db/queue";
import type { CardioModality } from "@/lib/db/types";
import { clockValue, composeStartedAt, type WhenChoice } from "@/lib/domain/time";
import { formatClockValue } from "@/lib/format/time";
import { cardioFormCopy, modalityLabel, whenLabel } from "./copy";
import * as styles from "./styles";

const FORM_ID = "log-cardio-form";
const MODALITIES: readonly CardioModality[] = ["walk", "run", "treadmill"];
const WHEN_CHOICES: readonly WhenChoice[] = ["now", "today", "yesterday"];

const REDIRECT_DELAY_MS = 1200;

type FormError = "duration" | "distance" | "time" | "future";

export const LogCardioForm = (): JSX.Element => {
  const [modality, setModality] = useState<CardioModality>("run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  // "Just now" is the default so the common case stays zero extra taps.
  const [when, setWhen] = useState<WhenChoice>("now");
  // Raw <input type="time"> value. Seeded on the chip tap rather than at
  // render, because a render-time clock would differ between the server
  // pass and hydration.
  const [time, setTime] = useState("");
  const [error, setError] = useState<FormError | null>(null);
  const [phase, setPhase] = useState<"idle" | "saving" | "done">("idle");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const pickWhen = (choice: WhenChoice): void => {
    setWhen(choice);
    // Prefill with the current clock: for "Earlier" it means an untouched
    // field still says "now", and it opens the native wheel somewhere near
    // where the user is heading instead of at midnight.
    if (choice !== "now" && time === "") setTime(clockValue(new Date()));
    if (error === "time" || error === "future") setError(null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (phase !== "idle") return;

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

    const now = new Date();
    const started = composeStartedAt(when, time, now);
    if (started === null) {
      setError("time");
      return;
    }
    // Refuse rather than clamp. Silently rewriting "11:30 PM" to now would
    // record something the user never asked for and hide the mistake; the
    // message points at the fix (they usually meant AM, or Yesterday).
    if (started.getTime() > now.getTime()) {
      setError("future");
      return;
    }

    setError(null);
    setPhase("saving");

    startTransition(async () => {
      const id = newId();
      const startedAt = started.toISOString();
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
      // Brief on-screen confirmation before returning home — an instant
      // teleport reads as "did that even save?".
      setPhase("done");
      setTimeout(() => router.push("/"), REDIRECT_DELAY_MS);
    });
  };

  const doneClock = when === "now" ? null : formatClockValue(time);
  const summary = cardioFormCopy.doneSummary(
    modalityLabel[modality],
    distance.trim() === "" ? null : Number(distance),
    Number(duration),
    when === "now" || doneClock === null
      ? null
      : cardioFormCopy.doneWhen(when, doneClock),
  );

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        {cardioFormCopy.back}
      </Link>
      <h1 className={styles.title}>{cardioFormCopy.title}</h1>

      {/* method="dialog" is the no-JS guard, not a dialog thing: the submit
          button lives outside this form (it's in the fixed CTA strip) and a
          tap that lands before hydration would otherwise run the *native*
          submission — a GET reload of this screen with the typed values in
          the query string, where nothing reads them. With method="dialog"
          and no <dialog> ancestor the browser fires the submit event and
          then does nothing, so React's handler still runs once hydrated and
          an early tap is merely ignored. */}
      <form
        id={FORM_ID}
        method="dialog"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
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

        <p className={styles.sectionLabel}>{cardioFormCopy.whenLabel}</p>
        <div className={styles.chipRow}>
          {WHEN_CHOICES.map((value) => {
            const active = when === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => pickWhen(value)}
                className={`${styles.chipBase} ${active ? styles.chipActive : styles.chipIdle}`}
              >
                {whenLabel[value]}
              </button>
            );
          })}
        </div>

        {when !== "now" && (
          <label
            className={`${styles.timeField} ${error === "time" || error === "future" ? styles.fieldError : ""}`}
          >
            <span className={styles.fieldLabel}>
              {cardioFormCopy.timeFieldLabel(when)}
            </span>
            <input
              className={styles.timeInput}
              name="started_time"
              type="time"
              aria-invalid={error === "time" || error === "future"}
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                if (error === "time" || error === "future") setError(null);
              }}
            />
          </label>
        )}

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
            {cardioFormCopy.errors[error]}
          </p>
        )}
      </form>

      <CtaZone>
        {phase === "done" ? (
          <div className={`${ctaStyles.inner} ${styles.doneCard}`} role="status">
            <span className={styles.doneTitle}>{cardioFormCopy.doneTitle}</span>
            <span className={styles.doneSummary}>{summary}</span>
          </div>
        ) : (
          <button
            type="submit"
            form={FORM_ID}
            className={`${ctaStyles.inner} ${buttonStyles.variant.primary}`}
            disabled={phase !== "idle"}
            aria-busy={phase === "saving"}
          >
            {phase === "saving" ? cardioFormCopy.saving : cardioFormCopy.submit}
          </button>
        )}
      </CtaZone>
    </main>
  );
};
