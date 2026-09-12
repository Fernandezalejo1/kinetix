import { Routine, CustomRoutine } from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";

// Preview coherente de sesión: el cardio extra no debe hacer que el conteo
// "de hoy" difiera de la sesión que realmente se inicia (auditoría).
type AnyRoutine = Routine | CustomRoutine | null;

export function routineHasCardio(r: AnyRoutine): boolean {
  if (!r) return false;
  return r.exercises.some((item) => {
    const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
    return def && (def.executionMode === "time" || /min/i.test(String(item.targetReps ?? "")));
  });
}

export function injectedCardioCount(r: AnyRoutine, includeCardio: boolean): number {
  return includeCardio && !routineHasCardio(r) ? 1 : 0;
}

export function previewExerciseCount(r: AnyRoutine, includeCardio: boolean): number {
  if (!r) return 0;
  return r.exercises.length + injectedCardioCount(r, includeCardio);
}