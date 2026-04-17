"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CardioModality } from "@/lib/db/types";

const MODALITIES: readonly CardioModality[] = ["walk", "run", "treadmill"];
const isModality = (value: unknown): value is CardioModality =>
  typeof value === "string" && (MODALITIES as readonly string[]).includes(value);

export const logCardio = async (formData: FormData): Promise<void> => {
  const modality = formData.get("modality");
  const distanceStr = formData.get("distance_km");
  const durationStr = formData.get("duration_min");

  if (!isModality(modality)) return;
  if (typeof durationStr !== "string") return;

  const duration_min = Number(durationStr);
  if (!Number.isFinite(duration_min) || duration_min <= 0) return;

  let distance_m: number | null = null;
  if (typeof distanceStr === "string" && distanceStr.trim() !== "") {
    const km = Number(distanceStr);
    if (!Number.isFinite(km) || km < 0) return;
    distance_m = Math.round(km * 1000);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("cardio_sessions")
    .insert({
      user_id: user.id,
      modality,
      duration_sec: Math.round(duration_min * 60),
      distance_m,
      started_at: new Date().toISOString(),
    })
    .select("id");
  if (error) {
    console.error("[logCardio] insert failed", error);
    throw new Error("Could not log cardio");
  }
  if (!data || data.length === 0) {
    console.error("[logCardio] no rows affected", { userId: user.id });
    throw new Error("Could not log cardio");
  }

  revalidatePath("/");
  redirect("/");
};
