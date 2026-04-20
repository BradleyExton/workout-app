// Pure PR detection. No I/O — callers fetch existing PRs + new sets,
// pass them here, insert the returned rows. Scoped per exercise.

export type PrType = "1rm" | "volume" | "reps";

export type SetForPr = {
  id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  completed_at: string;
};

export type ExistingPr = {
  exercise_id: string;
  pr_type: PrType;
  value: number;
};

export type NewPr = {
  exercise_id: string;
  pr_type: PrType;
  value: number;
  set_id: string;
  achieved_at: string;
};

// Epley: estimated 1RM from a given set.
// reps = 0 contributes no meaningful estimate — skip those.
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

type BestPerExercise = {
  oneRm: { value: number; setId: string; at: string } | null;
  volume: { value: number; setId: string; at: string } | null;
  reps: { value: number; setId: string; at: string } | null;
};

const emptyBest = (): BestPerExercise => ({
  oneRm: null,
  volume: null,
  reps: null,
});

export const detectPRs = (
  existing: ExistingPr[],
  newSets: SetForPr[],
): NewPr[] => {
  const baseline = new Map<string, Map<PrType, number>>();
  for (const pr of existing) {
    const row = baseline.get(pr.exercise_id) ?? new Map<PrType, number>();
    row.set(pr.pr_type, pr.value);
    baseline.set(pr.exercise_id, row);
  }

  const bestByExercise = new Map<string, BestPerExercise>();
  for (const set of newSets) {
    const best = bestByExercise.get(set.exercise_id) ?? emptyBest();
    const oneRm = round2(estimate1RM(set.weight_kg, set.reps));
    const volume = round2(set.weight_kg * set.reps);
    const reps = set.reps;

    if (oneRm > 0 && (!best.oneRm || oneRm > best.oneRm.value)) {
      best.oneRm = { value: oneRm, setId: set.id, at: set.completed_at };
    }
    if (volume > 0 && (!best.volume || volume > best.volume.value)) {
      best.volume = { value: volume, setId: set.id, at: set.completed_at };
    }
    if (!best.reps || reps > best.reps.value) {
      best.reps = { value: reps, setId: set.id, at: set.completed_at };
    }
    bestByExercise.set(set.exercise_id, best);
  }

  const out: NewPr[] = [];
  for (const [exerciseId, best] of bestByExercise) {
    const prior = baseline.get(exerciseId);
    const beats = (type: PrType, candidate: number): boolean => {
      const priorValue = prior?.get(type);
      return priorValue === undefined ? candidate > 0 : candidate > priorValue;
    };

    if (best.oneRm && beats("1rm", best.oneRm.value)) {
      out.push({
        exercise_id: exerciseId,
        pr_type: "1rm",
        value: best.oneRm.value,
        set_id: best.oneRm.setId,
        achieved_at: best.oneRm.at,
      });
    }
    if (best.volume && beats("volume", best.volume.value)) {
      out.push({
        exercise_id: exerciseId,
        pr_type: "volume",
        value: best.volume.value,
        set_id: best.volume.setId,
        achieved_at: best.volume.at,
      });
    }
    if (best.reps && beats("reps", best.reps.value)) {
      out.push({
        exercise_id: exerciseId,
        pr_type: "reps",
        value: best.reps.value,
        set_id: best.reps.setId,
        achieved_at: best.reps.at,
      });
    }
  }

  return out;
};

export type PrFlags = { oneRm: boolean; volume: boolean; reps: boolean };

// For live UI feedback: given prior PRs and the sets logged so far this
// workout (in completion order), return per-set flags indicating which
// PR types that set achieved at the moment it was logged — i.e., it beat
// both the prior PR and every earlier set of the same type.
export const computePrFlags = (
  priorPrs: ExistingPr[],
  orderedSets: SetForPr[],
): Map<string, PrFlags> => {
  const priorByExercise = new Map<string, Map<PrType, number>>();
  for (const pr of priorPrs) {
    const row = priorByExercise.get(pr.exercise_id) ?? new Map<PrType, number>();
    row.set(pr.pr_type, pr.value);
    priorByExercise.set(pr.exercise_id, row);
  }

  const runningBest = new Map<string, Map<PrType, number>>();
  const flags = new Map<string, PrFlags>();

  for (const set of orderedSets) {
    const oneRm = round2(estimate1RM(set.weight_kg, set.reps));
    const volume = round2(set.weight_kg * set.reps);
    const reps = set.reps;

    const ceiling = (type: PrType): number => {
      const prior = priorByExercise.get(set.exercise_id)?.get(type) ?? 0;
      const running = runningBest.get(set.exercise_id)?.get(type) ?? 0;
      return Math.max(prior, running);
    };

    const flag: PrFlags = {
      oneRm: oneRm > 0 && oneRm > ceiling("1rm"),
      volume: volume > 0 && volume > ceiling("volume"),
      reps: reps > ceiling("reps"),
    };
    flags.set(set.id, flag);

    const row = runningBest.get(set.exercise_id) ?? new Map<PrType, number>();
    if (oneRm > (row.get("1rm") ?? 0)) row.set("1rm", oneRm);
    if (volume > (row.get("volume") ?? 0)) row.set("volume", volume);
    if (reps > (row.get("reps") ?? 0)) row.set("reps", reps);
    runningBest.set(set.exercise_id, row);
  }

  return flags;
};
