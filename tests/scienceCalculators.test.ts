import { describe, expect, it } from "vitest";
import {
  computeWeeklyVolumeStatus,
  calculate1RM,
  MUSCLE_LANDMARKS_CONFIG,
} from "../src/utils/scienceCalculators";
import type { WorkoutExercise, WorkoutSet, Exercise } from "../src/types";

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s-" + Math.random(),
    setNumber: 1,
    type: "normal",
    weight: 60,
    reps: 10,
    rir: 2,
    completed: true,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "test-ex",
    name: "Test Exercise",
    nameEs: "Ejercicio de prueba",
    category: "push",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps"],
    defaultSets: 3,
    defaultReps: "8-12",
    defaultRir: 2,
    defaultTempo: "2-0-1",
    executionMode: "reps",
    ...overrides,
  } as Exercise;
}

function makeWEx(sets: WorkoutSet[], exercise?: Partial<Exercise>): WorkoutExercise {
  return {
    id: "wex-1",
    exerciseId: "test-ex",
    exercise: makeExercise(exercise),
    targetRestSeconds: 90,
    sets,
  };
}

describe("computeWeeklyVolumeStatus", () => {
  it("cuenta series efectivas (RIR<=3, sin warmup/cardio) por músculo primario", () => {
    const ex = [
      makeWEx([
        makeSet({ rir: 2 }),
        makeSet({ rir: 3 }),
        makeSet({ type: "warmup" }),
        makeSet({ type: "cardio" }),
        makeSet({ completed: false }),
      ]),
    ];
    const result = computeWeeklyVolumeStatus(ex);
    const chest = result.find((v) => v.muscle === "chest")!;
    expect(chest.currentSets).toBe(2);
    // secundarios al 50%
    const triceps = result.find((v) => v.muscle === "triceps")!;
    expect(triceps.currentSets).toBe(1);
  });

  it("descarta series con RIR > 3 (muy lejos del fallo)", () => {
    const ex = [makeWEx([makeSet({ rir: 5 }), makeSet({ rir: 4 })])];
    const chest = computeWeeklyVolumeStatus(ex).find((v) => v.muscle === "chest")!;
    expect(chest.currentSets).toBe(0);
  });

  it("clasifica estados respecto a MEV/MAV/MRV", () => {
    const cfg = MUSCLE_LANDMARKS_CONFIG.chest;
    const sets = Array.from({ length: cfg.mev }, () => makeSet());
    const under = computeWeeklyVolumeStatus([makeWEx(sets.slice(0, 1))]).find((v) => v.muscle === "chest")!;
    expect(under.status).toBe("under");

    const optimal = computeWeeklyVolumeStatus([makeWEx(Array.from({ length: cfg.mav }, () => makeSet()))]).find(
      (v) => v.muscle === "chest"
    )!;
    expect(optimal.status).toBe("optimal");

    const over = computeWeeklyVolumeStatus([makeWEx(Array.from({ length: cfg.mrv + 2 }, () => makeSet()))]).find(
      (v) => v.muscle === "chest"
    )!;
    expect(over.status).toBe("overreaching");
  });
});

describe("calculate1RM", () => {
  it("1 rep = peso real", () => {
    const r = calculate1RM(100, 1);
    expect(r.valid).toBe(true);
    expect(r.average).toBe(100);
  });

  it("valida el rango de reps (<=12) y rechaza extrapolaciones", () => {
    expect(calculate1RM(100, 12).valid).toBe(true);
    expect(calculate1RM(100, 15).valid).toBe(false);
    expect(calculate1RM(100, 0).valid).toBe(false);
  });

  it("e1RM crece con reps a igual peso", () => {
    expect(calculate1RM(100, 5).average).toBeGreaterThan(calculate1RM(100, 3).average);
  });
});
