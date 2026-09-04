// =============================================================
// KINETIX — Rangos por grupo muscular (estilo LoL).
// Métrica: mejor e1RM del grupo ÷ peso corporal (fuerza relativa).
// Cada PR/historial se mapea a músculos vía EXERCISES_DATABASE
// (primario = 1.0, secundario = 0.45). Por grupo visible se toma
// el mejor e1RM y se divide por el peso corporal.
// =============================================================

import type { MuscleGroup, PersonalRecord, ExerciseHistoryEntry } from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { calculate1RM } from "./scienceCalculators";
import type { Rank } from "./challengeStorage";

export type MuscleRankGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs";

export interface MuscleRankGroupDef {
  id: MuscleRankGroupId;
  label: string;
  muscles: MuscleGroup[];
  /** Umbrales de ratio (e1RM / peso corporal): gold, master, challenger. */
  thresholds: { gold: number; master: number; challenger: number };
  hint: string;
}

export const MUSCLE_RANK_GROUPS: MuscleRankGroupDef[] = [
  { id: "chest", label: "Pecho", muscles: ["chest"], thresholds: { gold: 0.75, master: 1.0, challenger: 1.25 }, hint: "Press banca / fondos" },
  { id: "back", label: "Espalda", muscles: ["lats", "upper_back", "traps", "lower_back"], thresholds: { gold: 0.75, master: 1.0, challenger: 1.3 }, hint: "Remo / dominadas" },
  { id: "shoulders", label: "Hombros", muscles: ["front_delts", "side_delts", "rear_delts"], thresholds: { gold: 0.45, master: 0.6, challenger: 0.75 }, hint: "Press militar" },
  { id: "biceps", label: "Bíceps", muscles: ["biceps", "forearms"], thresholds: { gold: 0.35, master: 0.5, challenger: 0.65 }, hint: "Curl barra / martillo" },
  { id: "triceps", label: "Tríceps", muscles: ["triceps"], thresholds: { gold: 0.4, master: 0.6, challenger: 0.8 }, hint: "Press cerrado / fondos" },
  { id: "quads", label: "Cuádriceps", muscles: ["quads"], thresholds: { gold: 1.0, master: 1.4, challenger: 1.75 }, hint: "Sentadilla" },
  { id: "hamstrings", label: "Isquios", muscles: ["hamstrings"], thresholds: { gold: 0.9, master: 1.25, challenger: 1.6 }, hint: "Peso muerto / RDL" },
  { id: "glutes", label: "Glúteos", muscles: ["glutes"], thresholds: { gold: 1.0, master: 1.4, challenger: 1.8 }, hint: "Hip thrust / sentadilla" },
  { id: "calves", label: "Gemelos", muscles: ["calves"], thresholds: { gold: 0.8, master: 1.0, challenger: 1.3 }, hint: "Elevación talones" },
  { id: "abs", label: "Abdomen", muscles: ["abs"], thresholds: { gold: 0.2, master: 0.35, challenger: 0.5 }, hint: "Crunch en polea lastrado" },
];

export interface MuscleRankResult {
  group: MuscleRankGroupDef;
  rank: Rank;
  ratio: number;
  bestKg: number;
  exerciseName: string;
  /** Progreso 0-1 hacia el siguiente rango. */
  progress: number;
  nextLabel: string | null;
  nextRatio: number | null;
}

const SECONDARY_FACTOR = 0.45;

export function rankForRatio(ratio: number, t: { gold: number; master: number; challenger: number }): Rank {
  if (ratio >= t.challenger) return "challenger";
  if (ratio >= t.master) return "master";
  if (ratio >= t.gold) return "gold";
  return "bronze";
}

export function computeMuscleRanks(
  personalRecords: PersonalRecord[],
  exerciseHistory: ExerciseHistoryEntry[],
  bodyWeightKg: number | null
): MuscleRankResult[] {
  const bw = bodyWeightKg && bodyWeightKg > 30 && bodyWeightKg < 300 ? bodyWeightKg : null;

  const exById = new Map(EXERCISES_DATABASE.map((e) => [e.id, e]));

  // Mejor e1RM por exerciseId (PRs + historial).
  const bestByExercise = new Map<string, { e1rm: number; name: string }>();
  for (const pr of personalRecords) {
    if (pr.type !== "1RM" || !(pr.value > 0)) continue;
    const prev = bestByExercise.get(pr.exerciseId);
    if (!prev || pr.value > prev.e1rm) {
      bestByExercise.set(pr.exerciseId, { e1rm: pr.value, name: pr.exerciseName });
    }
  }
  for (const h of exerciseHistory) {
    if (!(h.weight > 0) || !h.reps?.length) continue;
    const bestReps = Math.max(...h.reps);
    if (!(bestReps > 0)) continue;
    const e1rm = calculate1RM(h.weight, bestReps).average;
    if (!(e1rm > 0)) continue;
    const ex = exById.get(h.exerciseId);
    const prev = bestByExercise.get(h.exerciseId);
    if (!prev || e1rm > prev.e1rm) {
      bestByExercise.set(h.exerciseId, { e1rm, name: ex?.nameEs || ex?.name || h.exerciseId });
    }
  }

  // Mejor e1RM ponderado por MuscleGroup.
  const bestByMuscle = new Map<MuscleGroup, { e1rm: number; name: string }>();
  for (const [exerciseId, best] of bestByExercise) {
    const ex = exById.get(exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles ?? []) {
      const prev = bestByMuscle.get(m);
      if (!prev || best.e1rm > prev.e1rm) bestByMuscle.set(m, { e1rm: best.e1rm, name: best.name });
    }
    for (const m of ex.secondaryMuscles ?? []) {
      const weighted = best.e1rm * SECONDARY_FACTOR;
      const prev = bestByMuscle.get(m);
      if (!prev || weighted > prev.e1rm) bestByMuscle.set(m, { e1rm: weighted, name: best.name });
    }
  }

  return MUSCLE_RANK_GROUPS.map((group) => {
    let bestKg = 0;
    let exerciseName = "Sin registros";
    for (const m of group.muscles) {
      const b = bestByMuscle.get(m);
      if (b && b.e1rm > bestKg) {
        bestKg = b.e1rm;
        exerciseName = b.name;
      }
    }
    const ratio = bw ? bestKg / bw : 0;
    const rank = rankForRatio(ratio, group.thresholds);

    const order: { r: Rank; v: number; label: string }[] = [
      { r: "gold", v: group.thresholds.gold, label: "Oro" },
      { r: "master", v: group.thresholds.master, label: "Master" },
      { r: "challenger", v: group.thresholds.challenger, label: "Challenger" },
    ];
    let nextLabel: string | null = null;
    let nextRatio: number | null = null;
    let progress = 1;
    if (rank === "bronze") {
      nextLabel = "Oro";
      nextRatio = group.thresholds.gold;
      progress = group.thresholds.gold > 0 ? Math.min(1, ratio / group.thresholds.gold) : 1;
    } else if (rank === "gold") {
      nextLabel = "Master";
      nextRatio = group.thresholds.master;
      const span = group.thresholds.master - group.thresholds.gold;
      progress = span > 0 ? Math.min(1, (ratio - group.thresholds.gold) / span) : 1;
    } else if (rank === "master") {
      nextLabel = "Challenger";
      nextRatio = group.thresholds.challenger;
      const span = group.thresholds.challenger - group.thresholds.master;
      progress = span > 0 ? Math.min(1, (ratio - group.thresholds.master) / span) : 1;
    } else {
      progress = 1;
    }

    return {
      group,
      rank,
      ratio: Math.round(ratio * 100) / 100,
      bestKg: Math.round(bestKg * 10) / 10,
      exerciseName,
      progress: Math.max(0, Math.min(1, progress)),
      nextLabel,
      nextRatio,
    };
  });
}
