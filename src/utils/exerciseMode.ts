import type { Exercise, WorkoutExercise } from "../types";

/**
 * Detects whether an exercise is performed by time (isometric hold) or by reps.
 * Priority: explicit executionMode > defaultTempo keywords > targetReps format.
 */
export function detectExecutionMode(ex: Exercise, targetReps?: string): "reps" | "time" | "explosive" {
  if (ex.executionMode) return ex.executionMode;
  const tempo = (ex.defaultTempo || "").toLowerCase();
  if (tempo.includes("sostén") || tempo.includes("isométrico") || tempo.includes("isometric")) return "time";
  if (tempo.includes("explosivo") || tempo.includes("explosive")) return "explosive";
  if (targetReps && /[a-z]/i.test(targetReps.trim())) return "time";
  return "reps";
}

/** Shorthand: is this exercise performed by time (isometric/sustained)? */
export function isTimeBased(ex: Exercise, targetReps?: string): boolean {
  return detectExecutionMode(ex, targetReps) === "time";
}

/** Parse a target like "60s", "45-60s", "20-30s", "15 min" or "20min".
 *  Returns the target duration in seconds, or null if not a time-based target. */
export function parseTargetSeconds(targetReps?: string): number | null {
  if (!targetReps) return null;
  const raw = targetReps.trim().toLowerCase();
  // "20 min" / "20min" → 1200 s (LISS/cardio). Los bloques de cardio se
  // acumulaban como 30 s porque caían al fallback sin matchear.
  const minMatch = raw.match(/^(\d+)\s*min$/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1], 10);
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60;
    return null;
  }
  const m = raw.match(/^(\d+)(?:-(\d+))?s?$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const max = m[2] ? parseInt(m[2], 10) : min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return max; // use the upper bound as the target
}

/** Get target seconds from a WorkoutExercise (combining exercise mode + plan target). */
export function getTargetSeconds(wEx: WorkoutExercise): number | null {
  if (!isTimeBased(wEx.exercise, wEx.targetReps)) return null;
  return parseTargetSeconds(wEx.targetReps) ?? 30; // fallback 30s
}
