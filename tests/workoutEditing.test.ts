// =============================================================
// KINETIX — Reemplazo de ejercicio en sesión activa.
//
// Regresión del hallazgo de auditoría: al sustituir un ejercicio se
// conservaban las series ya completadas (con sus cargas) pero cambiaban
// de identidad al ejercicio nuevo. Ahora las series hechas quedan con el
// ejercicio ORIGINAL y solo se trasladan las pendientes, tomando el
// historial del reemplazo.
// =============================================================
import { describe, expect, it } from "vitest";
import { replacePendingExercise } from "../src/utils/workoutEditing";
import type { Exercise, ExerciseHistoryEntry, WorkoutExercise, WorkoutSet } from "../src/types";

const exercise = (id: string, extra: Partial<Exercise> = {}): Exercise =>
  ({
    id,
    name: id,
    nameEs: id,
    category: "legs",
    defaultTempo: "3-1-0-1",
    defaultRir: 2,
    ...extra,
  }) as Exercise;

const set = (n: number, completed: boolean, weight: number): WorkoutSet => ({
  id: `set-${n}`,
  setNumber: n,
  type: "normal",
  weight,
  reps: 10,
  rir: 2,
  completed,
});

const wEx = (id: string, ex: Exercise, sets: WorkoutSet[]): WorkoutExercise => ({
  id,
  exerciseId: ex.id,
  exercise: ex,
  sets,
  targetRestSeconds: 120,
  targetSets: sets.length,
  targetReps: "8-10",
});

const history = (over: Partial<ExerciseHistoryEntry> = {}): ExerciseHistoryEntry => ({
  id: "eh-1",
  exerciseId: "curl-femoral",
  date: "2026-09-01T10:00:00.000Z",
  weight: 45,
  sets: 3,
  reps: [10, 9, 8],
  rir: 2,
  volumeKg: 1215,
  ...over,
});

describe("replacePendingExercise", () => {
  it("deja las series completadas en el ejercicio original y mueve solo las pendientes", () => {
    const squat = exercise("sentadilla");
    const legCurl = exercise("curl-femoral");
    const session = [wEx("wex-1", squat, [set(1, true, 80), set(2, true, 80), set(3, false, 80)])];

    const result = replacePendingExercise(session, "wex-1", legCurl, [history()], 1234);

    expect(result).toHaveLength(2);

    const [kept, replacement] = result;
    expect(kept.exerciseId).toBe("sentadilla");
    expect(kept.sets).toHaveLength(2);
    expect(kept.sets.every((s) => s.completed)).toBe(true);
    expect(kept.targetSets).toBe(2);

    expect(replacement.exerciseId).toBe("curl-femoral");
    expect(replacement.sets).toHaveLength(1);
    expect(replacement.sets.every((s) => !s.completed)).toBe(true);
    // Identidad nueva: no colisiona con el id del ejercicio original.
    expect(replacement.id).not.toBe("wex-1");
    expect(replacement.targetSets).toBe(1);
  });

  it("toma la carga y el historial del ejercicio de reemplazo", () => {
    const session = [wEx("wex-1", exercise("sentadilla"), [set(1, false, 80)])];
    const [replacement] = replacePendingExercise(session, "wex-1", exercise("curl-femoral"), [history()], 1);

    expect(replacement.sets[0].weight).toBe(45);
    expect(replacement.sets[0].previousWeight).toBe(45);
    expect(replacement.sets[0].previousReps).toBe(10);
    expect(replacement.sets[0].previousRir).toBe(2);
    expect(replacement.sets[0].previousIsEstimate).toBe(false);
    expect(replacement.sets[0].tempo).toBe("3-1-0-1");
  });

  it("sin historial del reemplazo: no inventa carga ni historial falso", () => {
    const session = [wEx("wex-1", exercise("sentadilla"), [set(1, false, 80)])];
    const [replacement] = replacePendingExercise(session, "wex-1", exercise("curl-femoral"), [], 1);

    expect(replacement.sets[0].weight).toBe(0);
    expect(replacement.sets[0].previousWeight).toBeUndefined();
    expect(replacement.sets[0].previousIsEstimate).toBe(true);
  });

  it("conserva el id (y el orden) cuando no hay nada completado", () => {
    const session = [wEx("wex-1", exercise("sentadilla"), [set(1, false, 80)])];
    const result = replacePendingExercise(session, "wex-1", exercise("sentadilla-frontal"), [], 1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("wex-1");
    expect(result[0].exerciseId).toBe("sentadilla-frontal");
  });

  it("no toca nada si el ejercicio está completo o el reemplazo es el mismo", () => {
    const done = wEx("wex-1", exercise("sentadilla"), [set(1, true, 80)]);
    expect(replacePendingExercise([done], "wex-1", exercise("curl-femoral"), [])).toEqual([done]);

    const pending = wEx("wex-2", exercise("curl-femoral"), [set(1, false, 45)]);
    expect(replacePendingExercise([pending], "wex-2", exercise("curl-femoral"), [])).toEqual([pending]);
  });

  it("mantiene el resto de la sesión intacto y en su sitio", () => {
    const before = wEx("wex-0", exercise("press-banca"), [set(1, true, 60)]);
    const after = wEx("wex-9", exercise("remo-barra"), [set(1, false, 50)]);
    const session = [before, wEx("wex-1", exercise("sentadilla"), [set(1, true, 80), set(2, false, 80)]), after];

    const result = replacePendingExercise(session, "wex-1", exercise("curl-femoral"), []);

    expect(result.map((w) => w.exerciseId)).toEqual(["press-banca", "sentadilla", "curl-femoral", "remo-barra"]);
    expect(result[0]).toEqual(before);
    expect(result[3]).toEqual(after);
  });
});
