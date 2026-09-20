import type { WorkoutExercise, Exercise, ExerciseHistoryEntry } from "../types";
import { isTimeBased } from "./exerciseMode";

/** Recorded sets retain their original exercise identity. Only pending work is replaced. */
export function replacePendingExercise(exercises: WorkoutExercise[], id: string, exercise: Exercise, history: ExerciseHistoryEntry[], stamp = Date.now()): WorkoutExercise[] {
  return exercises.flatMap(original => {
    if (original.id !== id || original.exerciseId === exercise.id) return [original];
    const done = original.sets.filter(s => s.completed);
    const pending = original.sets.filter(s => !s.completed);
    if (!pending.length) return [original];
    const last = history.filter(h => h.exerciseId === exercise.id).sort((a,b) => b.date.localeCompare(a.date))[0];
    const timed = isTimeBased(exercise);
    const wasTimed = isTimeBased(original.exercise, original.targetReps);
    const replacement: WorkoutExercise = {
      ...original, id: done.length ? `${original.id}-replacement-${stamp}` : original.id,
      exerciseId: exercise.id, exercise, notes: undefined, targetSets: pending.length,
      targetReps: timed ? "30s" : wasTimed ? "8-12" : original.targetReps,
      targetRir: exercise.defaultRir, targetTempo: exercise.defaultTempo,
      sets: pending.map((set, i) => ({ ...set, setNumber: i + 1,
        type: timed ? "normal" : set.type === "cardio" ? "normal" : set.type,
        weight: timed ? 0 : last?.weight ?? 0, reps: timed ? 1 : wasTimed ? 8 : set.reps,
        durationSeconds: timed ? 30 : undefined, rir: exercise.defaultRir,
        previousWeight: last?.weight, previousReps: last?.reps[i] ?? last?.reps[0],
        previousRir: last?.rir, previousIsEstimate: !last, tempo: exercise.defaultTempo,
      })),
    };
    return done.length ? [{ ...original, sets: done, targetSets: done.length }, replacement] : [replacement];
  });
}
