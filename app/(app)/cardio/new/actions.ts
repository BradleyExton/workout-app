"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CardioModality } from "@/lib/db/types";

const MODALITIES: readonly CardioModality[] = ["walk", "run", "treadmill"];
const isModality = (value: unknown): value is CardioModality =>
  typeof value === "string" && (MODALITIES as readonly string[]).includes(value);

// 7c-extended: accepts client-provided id + started_at + duration in
// seconds + distance in meters (already converted client-side).
export const logCardio = async (formData: FormData): Promise<void> => {
  const id = formData.get("id");
  const modality = formData.get("modality");
  const startedAt = formData.get("started_at");
  const durationSecStr = formData.get("duration_sec");
  const distanceMStr = formData.get("distance_m");

  if (typeof id !== "string") return;
  if (!isModality(modality)) return;
  if (typeof startedAt !== "string") return;
  if (typeof durationSecStr !== "string") return;

  const duration_sec = Number(durationSecStr);
  if (!Number.isFinite(duration_sec) || duration_sec <= 0) return;

  // started_at is now user-chosen (the form's Just now / Earlier / Yesterday
  // control), so it gets the same scrutiny as the numbers. Unparseable is
  // dropped. A future stamp is clamped rather than rejected: the form already
  // refuses a deliberate future pick, so anything arriving here is device-clock
  // skew the user can neither see nor fix, and rejecting would strand the
  // queued op forever while a future timestamp would pin the session to the
  // top of history for good.
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) return;
  const started_at = new Date(
    Math.min(startedAtMs, Date.now()),
  ).toISOString();

  let distance_m: number | null = null;
  if (typeof distanceMStr === "string" && distanceMStr !== "") {
    const m = Number(distanceMStr);
    if (!Number.isFinite(m) || m < 0) return;
    distance_m = Math.round(m);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cardio_sessions")
    .upsert({
      id,
      user_id: user.id,
      modality,
      duration_sec: Math.round(duration_sec),
      distance_m,
      started_at,
    })
    .select("id");
  if (error) {
    console.error("[logCardio] upsert failed", error);
    throw new Error("Could not log cardio");
  }
  if (!data || data.length === 0) {
    console.error("[logCardio] no rows affected", { id });
    throw new Error("Could not log cardio");
  }

  revalidatePath("/");
};
