import type { JSX } from "react";
import { createClient } from "@/lib/supabase/server";
import { ExercisePicker } from "./ExercisePicker";

export default async function NewWorkoutPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, category")
    .eq("category", "strength")
    .order("name");

  return <ExercisePicker exercises={exercises ?? []} />;
}
