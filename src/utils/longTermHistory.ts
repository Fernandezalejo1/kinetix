/**
 * Historial de largo plazo — espejo en IndexedDB (sin recorte) + recuperación.
 *
 * localStorage se mantiene con tope de capacidad (capForStorage) para el
 * arranque veloz y los análisis habituales. Este módulo guarda el historial
 * COMPLETO en el store "kv" de IndexedDB: si un trim de retención descarta
 * entradas en localStorage, el espejo conserva todo y la app lo rehidrata
 * al arrancar (el state vuelve a tener el historial completo).
 */

import { CompletedWorkout, ExerciseHistoryEntry, BodyMetricEntry, NutritionLog } from "../types";
import { idbKvGet, idbKvPut } from "./indexedDb";
import { isVaultEnabled } from "./storage";

export const LONG_TERM_KIND = {
  workoutHistory: "workoutHistory",
  exerciseHistory: "exerciseHistory",
  bodyMetrics: "bodyMetrics",
  nutritionHistory: "nutritionHistory",
} as const;

/** Merge by identity, prefer current edits, and keep newest records first.
 * Archive size is not a validity check: even a small archive can hold unique older records. */
export function mergeArchived<T>(
  prev: T[],
  archived: T[] | null | undefined,
  keyOf: (entry: T) => string
): T[] {
  const entries = new Map<string, T>();
  for (const entry of archived ?? []) entries.set(keyOf(entry), entry);
  for (const entry of prev) entries.set(keyOf(entry), entry);
  return [...entries.values()].sort((a, b) => Date.parse((b as { date?: string }).date ?? "") - Date.parse((a as { date?: string }).date ?? "") || 0);

}

export interface LongTermArchiveInput {
  workoutHistory: CompletedWorkout[];
  exerciseHistory: ExerciseHistoryEntry[];
  bodyMetrics: BodyMetricEntry[];
  nutritionHistory: NutritionLog[];
}

export interface LongTermArchiveData {
  workoutHistory: CompletedWorkout[] | null;
  exerciseHistory: ExerciseHistoryEntry[] | null;
  bodyMetrics: BodyMetricEntry[] | null;
  nutritionHistory: NutritionLog[] | null;
}

let archiveQueue: Promise<void> = Promise.resolve();
let replacing = false;
export const isReplacingHistory = () => replacing;
export async function pauseHistoryWrites(): Promise<void> { replacing = true; await archiveQueue.catch(() => {}); }
export const resumeHistoryWrites = () => { replacing = false; };
export async function flushHistoryWrites(): Promise<void> { await archiveQueue; }
export function mirrorHistoryToArchive(input: LongTermArchiveInput): Promise<void> {
  if (replacing) return Promise.resolve();
  // P4 Vault: con cifrado en reposo no se espeja texto plano a IndexedDB.
  if (isVaultEnabled()) return Promise.resolve();
  archiveQueue = archiveQueue.catch(() => {}).then(async () => {
    const oldNutrition = await idbKvGet<NutritionLog[]>(LONG_TERM_KIND.nutritionHistory, true);
    await Promise.all([
      idbKvPut(LONG_TERM_KIND.workoutHistory, input.workoutHistory),
      idbKvPut(LONG_TERM_KIND.exerciseHistory, input.exerciseHistory),
      idbKvPut(LONG_TERM_KIND.bodyMetrics, input.bodyMetrics),
      idbKvPut(LONG_TERM_KIND.nutritionHistory, mergeArchived(input.nutritionHistory, oldNutrition, n => n.date)),
    ]);
  });
  void archiveQueue.catch(() => window.dispatchEvent(new CustomEvent("kinetix-storage-error")));
  return archiveQueue;
}

export async function hydrateFromArchive(strict = false): Promise<LongTermArchiveData> {
  const [workoutHistory, exerciseHistory, bodyMetrics, nutritionHistory] = await Promise.all([
    idbKvGet<CompletedWorkout[]>(LONG_TERM_KIND.workoutHistory, strict),
    idbKvGet<ExerciseHistoryEntry[]>(LONG_TERM_KIND.exerciseHistory, strict),
    idbKvGet<BodyMetricEntry[]>(LONG_TERM_KIND.bodyMetrics, strict),
    idbKvGet<NutritionLog[]>(LONG_TERM_KIND.nutritionHistory, strict),
  ]);
  return {
    workoutHistory: workoutHistory ?? null,
    exerciseHistory: exerciseHistory ?? null,
    bodyMetrics: bodyMetrics ?? null,
    nutritionHistory: nutritionHistory ?? null,
  };
}