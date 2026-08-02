import type { JSX } from "react";
import { createClient } from "@/lib/supabase/server";
import { ExercisePicker } from "./ExercisePicker";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}): Promise<JSX.Element> {
  // ?from={workoutId}: set when "+ Add exercise" was tapped inside an
  // active workout, so Back returns to the session instead of home.
  const { from } = await searchParams;
  const fromWorkoutId =
    typeof from === "string" && UUID_RE.test(from) ? from : null;

  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, category")
    .eq("category", "strength")
    .order("name");

  return (
    <ExercisePicker exercises={exercises ?? []} fromWorkoutId={fromWorkoutId} />
  );
}
