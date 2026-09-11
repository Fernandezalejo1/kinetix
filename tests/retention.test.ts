import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import { capForStorage, trimLargeColumns, archiveDayIfStale, RETENTION_POLICY } from "../src/context/workoutData";
import { NutritionLog } from "../src/types";

installTestEnv();

const makeNutrition = (date: string, meals: NutritionLog["meals"] = [], waterMl = 500): NutritionLog => ({
  date,
  meals,
  waterMl,
  calorieTarget: 2300,
  proteinTarget: 142,
  carbsTarget: 25,
  fatsTarget: 180,
});

describe("retention: capForStorage", () => {
  it("no trunca arrays dentro del tope", () => {
    const arr = [1, 2, 3];
    expect(capForStorage(arr, 5)).toEqual(arr);
  });

  it("mantiene los N más recientes (inicio del array)", () => {
    const arr = [10, 20, 30, 40, 50];
    expect(capForStorage(arr, 3)).toEqual([10, 20, 30]);
  });

  it("emite evento al truncar", () => {
    const spy = vi.fn();
    window.addEventListener("kinetix-retention-trim", spy);
    capForStorage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as CustomEvent).detail.dropped).toBe(7);
    window.removeEventListener("kinetix-retention-trim", spy);
  });

  it("no emite evento si no trunca", () => {
    const spy = vi.fn();
    window.addEventListener("kinetix-retention-trim", spy);
    capForStorage([1, 2, 3], 5);
    expect(spy).not.toHaveBeenCalled();
    window.removeEventListener("kinetix-retention-trim", spy);
  });
});

describe("retention: trimLargeColumns", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("recorta historial que excede el tope y emite eventos", () => {
    const workouts = Array.from({ length: RETENTION_POLICY.workoutHistory + 100 }, (_, i) => ({
      id: `w${i}`,
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      routineName: "Test",
      durationSeconds: 100,
      totalVolumeKg: 100,
      totalSets: 3,
      exercises: [],
      prCount: 0,
      averageRir: 2,
    }));
    localStorage.setItem("kinetix_workout_history", JSON.stringify(workouts));
    localStorage.setItem("kinetix_exercise_history", JSON.stringify([1, 2]));
    localStorage.setItem("kinetix_body_metrics", JSON.stringify([{ id: "bm1" }]));

    const spy = vi.fn();
    window.addEventListener("kinetix-retention-trim", spy);

    trimLargeColumns();

    const parsed = JSON.parse(localStorage.getItem("kinetix_workout_history")!);
    expect(parsed.length).toBe(RETENTION_POLICY.workoutHistory);
    expect(spy).toHaveBeenCalled();
    window.removeEventListener("kinetix-retention-trim", spy);
  });
});

describe("retention: archiveDayIfStale", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("archiva un día anterior con datos", () => {
    const log = makeNutrition("2026-09-09", [{ id: "m1", dishName: "papa", calories: 400, protein: 30, carbs: 50, fats: 10, fiber: 5, time: "12:00", description: "" }]);
    archiveDayIfStale(log, "2026-09-10");
    const history = JSON.parse(localStorage.getItem("kinetix_nutrition_history")!);
    expect(history).toHaveLength(1);
    expect(history[0].date).toBe("2026-09-09");
  });

  it("no archiva el día actual", () => {
    const log = makeNutrition("2026-09-10", [{ id: "m1", dishName: "x", calories: 400, protein: 30, carbs: 50, fats: 10, fiber: 5, time: "12:00", description: "" }]);
    archiveDayIfStale(log, "2026-09-10");
    expect(localStorage.getItem("kinetix_nutrition_history")).toBeNull();
  });

  it("no archiva días vacíos", () => {
    const log = makeNutrition("2026-09-09", [], 0);
    archiveDayIfStale(log, "2026-09-10");
    expect(localStorage.getItem("kinetix_nutrition_history")).toBeNull();
  });
});
