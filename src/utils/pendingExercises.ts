import { CompletedWorkout, WorkoutExercise } from "../types";

/** Series "de trabajo" sin completar (excluye warmup y cardio). */
export function countIncompleteWorkingSets(wEx: WorkoutExercise): number {
  return wEx.sets.filter((s) => !s.completed && s.type !== "warmup" && s.type !== "cardio").length;
}

/** Ejercicios de una sesión que quedaron sin completar. */
export function getUndoneExercisesFromSession(session: CompletedWorkout): {
  wEx: WorkoutExercise;
  incompleteSets: number;
}[] {
  return session.exercises
    .map((wEx) => ({ wEx, incompleteSets: countIncompleteWorkingSets(wEx) }))
    .filter((x) => x.incompleteSets > 0);
}