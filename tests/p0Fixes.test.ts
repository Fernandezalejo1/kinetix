import { describe, expect, it } from "vitest";
import {
  computeWeeklyVolumeStatus,
  calculatePlates,
  generateWarmupPyramid,
  isCompoundExercise,
} from "../src/utils/scienceCalculators";
import { parseTempo } from "../src/utils/tempoUtils";
import { computeStepAdjustment } from "../src/utils/stepsRules";
import { analyzeDoubleProgression } from "../src/utils/doubleProgression";
import type { WorkoutExercise, WorkoutSet, Exercise } from "../src/types";

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s-" + Math.random(),
    setNumber: 1,
    type: "normal",
    weight: 60,
    reps: 10,
    completed: true,
    ...overrides,
  } as WorkoutSet;
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "test-ex",
    name: "Test",
    nameEs: "Prueba",
    category: "push",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    defaultTempo: "3-1-1-1",
    defaultRir: 2,
    ...overrides,
  } as unknown as Exercise;
}

describe("P0: stepsRules usa stepGoal relativo", () => {
  const base = { calories: 2500, protein: 180, carbs: 250, fats: 80 };
  it("meta 8000: 7000 pasos = dentro de rango (delta 0)", () => {
    const adj = computeStepAdjustment(7000, base, { stepGoal: 8000, trainedToday: false, lunchPassed: false });
    expect(adj.caloriesDelta).toBe(0);
    expect(adj.bandLabel).toBe("Objetivo cumplido");
  });
  it("meta 8000: 3000 pasos = muy poco activo (-250 o suavizado)", () => {
    const adj = computeStepAdjustment(3000, base, { stepGoal: 8000, trainedToday: false, lunchPassed: false });
    expect(adj.caloriesDelta).toBeLessThan(0);
    expect(adj.bandLabel).toBe("Muy poco activo");
  });
  it("mensaje neutro sin 'keto' cuando no es keto", () => {
    const adj = computeStepAdjustment(7000, base, { stepGoal: 8000, trainedToday: false, lunchPassed: false });
    expect(adj.message).not.toMatch(/keto de definición/);
  });
  it("mensaje keto solo cuando base.carbs <= 35", () => {
    const ketoBase = { calories: 2200, protein: 160, carbs: 25, fats: 150 };
    const adj = computeStepAdjustment(7000, ketoBase, { stepGoal: 8000, trainedToday: false, lunchPassed: false });
    expect(adj.message).toMatch(/keto/);
  });
});

describe("P0: volumen exige RIR/RPE", () => {
  it("serie sin RIR ni RPE NO cuenta", () => {
    const ex: WorkoutExercise[] = [{
      id: "w1", exerciseId: "t", exercise: makeExercise(), targetRestSeconds: 90,
      sets: [makeSet({ rir: undefined, rpe: undefined })],
    }];
    const chest = computeWeeklyVolumeStatus(ex).find((v) => v.muscle === "chest")!;
    expect(chest.currentSets).toBe(0);
  });
  it("serie con RPE>=7 SÍ cuenta", () => {
    const ex: WorkoutExercise[] = [{
      id: "w1", exerciseId: "t", exercise: makeExercise(), targetRestSeconds: 90,
      sets: [makeSet({ rir: undefined, rpe: 8 })],
    }];
    const chest = computeWeeklyVolumeStatus(ex).find((v) => v.muscle === "chest")!;
    expect(chest.currentSets).toBe(1);
  });
});

describe("P0: isCompound unificado", () => {
  it("barbell-curl es aislamiento aunque sea barra", () => {
    expect(isCompoundExercise({ id: "barbell-curl", equipment: "barbell" })).toBe(false);
  });
  it("pec-deck / leg-extension en máquina son aislamiento", () => {
    expect(isCompoundExercise({ id: "lever-seated-fly", equipment: "machine" })).toBe(false);
    expect(isCompoundExercise({ id: "seated-leg-curl", equipment: "machine" })).toBe(false);
  });
  it("hack-squat y press banca siguen compuestos", () => {
    expect(isCompoundExercise({ id: "hack-squat-machine", equipment: "machine" })).toBe(true);
    expect(isCompoundExercise({ id: "barbell-bench-press", equipment: "barbell" })).toBe(true);
  });
  it("doble progresión: pec-deck sugiere micro-carga 1.25", () => {
    const wEx: WorkoutExercise = {
      id: "w", exerciseId: "x",
      exercise: makeExercise({ id: "lever-seated-fly", equipment: "machine" }),
      targetRestSeconds: 90, targetSets: 3, targetReps: "8-10", targetRir: 2,
      sets: [makeSet({ weight: 20, reps: 10, rir: 2 }), makeSet({ weight: 20, reps: 10, rir: 2 }), makeSet({ weight: 20, reps: 10, rir: 2 })],
    };
    const a = analyzeDoubleProgression(wEx);
    expect(a.isCompound).toBe(false);
    expect(a.status).toBe("target_reached");
    // e1RM 20kg x10 ≈ 26.7 → 2.5% ≈ 0.75 < piso 1.25 → delta = piso
    expect(a.deltaWeight).toBe(1.25);
  });
});

describe("P0: tempo explosivo", () => {
  it("'3-1-0-1' conserva concéntrica 0", () => {
    expect(parseTempo("3-1-0-1").concentric).toBe(0);
  });
  it("'Explosivo' no rompe", () => {
    const p = parseTempo("Explosivo");
    expect(p.concentric).toBe(0);
  });
});

describe("P0: placas + calentamiento", () => {
  it("calcula micro-carga 0.5kg", () => {
    const r = calculatePlates(21, 20);
    expect(r.plates.some((p) => p.weight === 0.5)).toBe(true);
  });
  it("calentamiento polea no usa pirámide de barra", () => {
    const steps = generateWarmupPyramid(40, 20, { equipment: "cable", weightUnit: "kg" });
    expect(steps.length).toBe(2);
    expect(steps[0].weight).toBeLessThan(40);
  });
  it("calentamiento lbs redondea a 5", () => {
    const steps = generateWarmupPyramid(225, 45, { equipment: "barbell", weightUnit: "lbs" });
    steps.forEach((s) => {
      expect(s.weight % 5).toBe(0);
    });
  });
});
