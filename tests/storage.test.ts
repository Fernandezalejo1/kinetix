import { describe, it, expect, vi, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import {
  VALIDATORS,
  SANITIZERS,
  safeParse,
  isDateKey,
  isNonNegativeNum,
  isNonNegativeInt,
  isId,
} from "../src/utils/storage";

installTestEnv();

describe("storage: type guards unitarios", () => {
  it("isDateKey acepta YYYY-MM-DD válido y rechaza basura", () => {
    expect(isDateKey("2026-09-10")).toBe(true);
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("abcd")).toBe(false);
    expect(isDateKey(123)).toBe(false);
    expect(isDateKey("2026/09/10")).toBe(false);
  });

  it("isNonNegativeNum acepta números >=0 y rechaza negativos/NaN/strings", () => {
    expect(isNonNegativeNum(0)).toBe(true);
    expect(isNonNegativeNum(42.5)).toBe(true);
    expect(isNonNegativeNum(-1)).toBe(false);
    expect(isNonNegativeNum(NaN)).toBe(false);
    expect(isNonNegativeNum(Infinity)).toBe(false);
    expect(isNonNegativeNum("3")).toBe(false);
  });

  it("isNonNegativeInt acepta enteros >=0", () => {
    expect(isNonNegativeInt(0)).toBe(true);
    expect(isNonNegativeInt(5)).toBe(true);
    expect(isNonNegativeInt(1.5)).toBe(false);
    expect(isNonNegativeInt(-2)).toBe(false);
  });

  it("isId acepta strings no vacíos", () => {
    expect(isId("abc")).toBe(true);
    expect(isId("  ")).toBe(false);
    expect(isId("")).toBe(false);
    expect(isId(42)).toBe(false);
  });
});

describe("storage: validadores de entidad", () => {
  const validWorkout = {
    id: "w1",
    routineName: "Push A",
    date: "2026-09-10",
    durationSeconds: 3600,
    totalVolumeKg: 1200,
    totalSets: 18,
    exercises: [{ exerciseId: "bench-press", sets: 4 }],
    prCount: 0,
    averageRir: 2,
  };

  it("acepta workout completo válido", () => {
    expect(VALIDATORS.kinetix_workout_history([validWorkout])).toBe(true);
  });

  it("rechaza workout sin date válida", () => {
    const bad = { ...validWorkout, date: "2026-13-40" };
    expect(VALIDATORS.kinetix_workout_history([bad])).toBe(false);
  });

  it("rechaza workout sin exercises array", () => {
    const bad = { ...validWorkout, exercises: "nope" };
    expect(VALIDATORS.kinetix_workout_history([bad])).toBe(false);
  });

  it("rechaza si no es array", () => {
    expect(VALIDATORS.kinetix_workout_history("not-array")).toBe(false);
  });

  it("acepta array vacío (sin datos aún)", () => {
    expect(VALIDATORS.kinetix_workout_history([])).toBe(true);
  });

  it("valida exercise_history con volumen", () => {
    const entry = {
      exerciseId: "bench",
      date: "2026-01-01",
      weight: 80,
      sets: 3,
      reps: [8, 8, 7],
      volumeKg: 1920,
    };
    expect(VALIDATORS.kinetix_exercise_history([entry])).toBe(true);
  });

  it("rechaza exercise_history sin weight numérico", () => {
    const entry = {
      exerciseId: "bench",
      date: "2026-01-01",
      weight: "80kg",
      sets: 3,
      reps: [8],
      volumeKg: 1920,
    };
    expect(VALIDATORS.kinetix_exercise_history([entry])).toBe(false);
  });

  it("valida body_metric con weightKg numérico", () => {
    const bm = { id: "bm1", date: "2026-09-10", weightKg: 82.5 };
    expect(VALIDATORS.kinetix_body_metrics([bm])).toBe(true);
  });

  it("rechaza body_metric con weightKg NaN", () => {
    const bm = { id: "bm1", date: "2026-09-10", weightKg: NaN };
    expect(VALIDATORS.kinetix_body_metrics([bm])).toBe(false);
  });

  it("valida nutrition_log con fecha válida", () => {
    const log = { date: "2026-09-10", meals: [], waterMl: 0 };
    expect(VALIDATORS.kinetix_nutrition_log(log)).toBe(true);
  });

  it("rechaza nutrition_log con fecha inválida", () => {
    const log = { date: "nope", meals: [], waterMl: 0 };
    expect(VALIDATORS.kinetix_nutrition_log(log)).toBe(false);
  });
});

describe("storage: saneamiento de arrays (sanitizers)", () => {
  it("conserva todas las entradas válidas", () => {
    const data = [
      { exerciseId: "a", date: "2026-01-01", weight: 50, sets: 3, reps: [8], volumeKg: 1200 },
      { exerciseId: "b", date: "2026-01-02", weight: 55, sets: 3, reps: [8], volumeKg: 1320 },
    ];
    const sanitizer = SANITIZERS.kinetix_exercise_history;
    expect(sanitizer(data)).toEqual(data);
  });

  it("filtra entradas corruptas y conserva las válidas", () => {
    const good = [
      { exerciseId: "a", date: "2026-01-01", weight: 50, sets: 3, reps: [8], volumeKg: 1200 },
    ];
    const bad = { exerciseId: "b", date: "X", weight: "NaN", sets: 3, reps: [8], volumeKg: 1200 };
    const sanitizer = SANITIZERS.kinetix_exercise_history;
    expect(sanitizer([good[0], bad])).toEqual(good);
  });

  it("devuelve undefined si el valor no es un array", () => {
    const sanitizer = SANITIZERS.kinetix_workout_history;
    expect(sanitizer("not-array")).toBeUndefined();
  });

  it("conserva workouts válidos con campos opcionales ausentes", () => {
    const minimal = {
      id: "w1",
      routineName: "Push",
      date: "2026-09-10",
      durationSeconds: 3600,
      totalVolumeKg: 1200,
      totalSets: 18,
      exercises: [],
      prCount: 0,
      averageRir: 2,
    };
    const sanitizer = SANITIZERS.kinetix_workout_history;
    expect(sanitizer([minimal])).toEqual([minimal]);
  });
});

describe("storage: safeParse con saneamiento", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("si un array tiene mix de entradas buenas y malas, conserva las buenas", () => {
    const good = {
      exerciseId: "bench",
      date: "2026-01-01",
      weight: 80,
      sets: 3,
      reps: [8],
      volumeKg: 1920,
    };
    const bad = { exerciseId: "nope", date: "invalid", weight: NaN, sets: 3, reps: [8], volumeKg: 0 };
    localStorage.setItem(
      "kinetix_exercise_history",
      JSON.stringify([good, bad])
    );

    const result = safeParse(
      "kinetix_exercise_history",
      [],
      VALIDATORS.kinetix_exercise_history,
      SANITIZERS.kinetix_exercise_history
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(good);
  });

  it("si todo es basura, devuelve fallback", () => {
    localStorage.setItem("kinetix_prs", JSON.stringify([{ noId: true }]));
    const result = safeParse(
      "kinetix_prs",
      [],
      VALIDATORS.kinetix_prs,
      SANITIZERS.kinetix_prs
    );
    expect(result).toEqual([]);
  });
});
