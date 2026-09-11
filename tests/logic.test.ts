import { describe, expect, it } from "vitest";
import { computeStepAdjustment } from "../src/utils/stepsRules";
import { KETO_CARB_CAP } from "../src/context/WorkoutContext";
import { assessSessionPerformance } from "../src/utils/weightRecommendation";
import type { ExerciseHistoryEntry } from "../src/types";

describe("stepsRules", () => {
  const base = { calories: 2000, protein: 150, carbs: 30, fats: 140 };

  it("no ajusta si los pasos están en la banda objetivo", () => {
    const r = computeStepAdjustment(10000, base, {
      stepGoal: 10000,
      trainedToday: false,
      lunchPassed: false,
    });
    expect(r.adjusted.calories).toBe(2000);
  });
});

describe("keto cap", () => {
  it("define un tope de carbos razonable", () => {
    expect(KETO_CARB_CAP).toBeGreaterThan(0);
    expect(KETO_CARB_CAP).toBeLessThanOrEqual(50);
  });
});

describe("assessSessionPerformance", () => {
  const entry: ExerciseHistoryEntry = {
    id: "e1",
    exerciseId: "bench",
    date: "2026-09-01",
    weight: 80,
    sets: 3,
    reps: [10, 9, 8],
    rir: 2,
    volumeKg: 2160,
  };

  it("promedia reps y deriva RIR", () => {
    const p = assessSessionPerformance(entry, "8-12", 3, 2);
    expect(p.avgReps).toBe(9);
    expect(p.avgRir).toBe(2);
    expect(p.completionRate).toBe(1);
  });
});
