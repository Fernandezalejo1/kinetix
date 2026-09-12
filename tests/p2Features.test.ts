import { describe, expect, it } from "vitest";
import {
  analyzeDeload,
  acuteChronicWorkloadRatio,
  sessionLoadOf,
  weeklySessionLoads,
} from "../src/utils/deloadDetection";
import { detectStrengthPlateau } from "../src/utils/plateauDetection";
import { estimateVelocity, velocityZone, velocityZoneForSet, vbtPatternFor } from "../src/utils/velocity";
import { quickMealsFor, proteinPerMeal, QUICK_MEALS, QUICK_MEALS_BALANCED } from "../src/data/nutritionData";
import type { CompletedWorkout, ExerciseHistoryEntry } from "../src/types";

function workout(daysAgo: number, srpe?: number, minutes = 60): CompletedWorkout {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w-${daysAgo}-${srpe}`, routineName: "R", date: d.toISOString(),
    durationSeconds: minutes * 60, totalVolumeKg: 5000, totalSets: 15,
    exercises: [], prCount: 0, averageRir: 2, srpe,
    sessionLoad: srpe != null ? srpe * minutes : undefined,
  };
}

function hist(weight: number, reps: number[], rir: number | undefined, daysAgo: number): ExerciseHistoryEntry {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    exerciseId: "bench", date: d.toISOString(), weight, reps, sets: reps.length,
    rir, bestSet: { weight, reps: Math.max(...reps), rir },
  } as unknown as ExerciseHistoryEntry;
}

// ─── sRPE / carga interna ─────────────────────────────────────
describe("P2: sRPE y carga interna (Foster)", () => {
  it("sessionLoad = sRPE × minutos", () => {
    expect(sessionLoadOf(workout(1, 7, 60))).toBe(420);
  });
  it("sin sRPE no inventa carga", () => {
    expect(sessionLoadOf(workout(1, undefined))).toBeNull();
  });
  it("weeklySessionLoads agrupa por semana", () => {
    const h = [workout(1, 6, 60), workout(2, 8, 60)];
    const loads = weeklySessionLoads(h, 2);
    expect(loads[0]).toBe(360 + 480);
    expect(loads[1]).toBeNull();
  });
  it("ACWR null sin historial suficiente", () => {
    expect(acuteChronicWorkloadRatio([workout(1, 7)])).toBeNull();
  });
  it("ACWR detecta spike (>1.5)", () => {
    // 4 semanas tranqui (carga 300) + esta semana disparada (900).
    const h = [
      workout(1, 9, 100), // 900 aguda
      workout(8, 5, 60), workout(15, 5, 60), workout(22, 5, 60), workout(29, 5, 60),
    ];
    const acwr = acuteChronicWorkloadRatio(h);
    expect(acwr).not.toBeNull();
    expect(acwr!).toBeGreaterThan(1.5);
  });
  it("ACWR suma señal de deload", () => {
    const h = [
      workout(1, 9, 100),
      workout(8, 5, 60), workout(15, 5, 60), workout(22, 5, 60), workout(29, 5, 60),
    ];
    const rec = analyzeDeload(h, 4);
    expect(rec.reasons.some((r) => r.includes("ACWR"))).toBe(true);
  });
  it("sueño + readiness suman señales", () => {
    const rec = analyzeDeload([], 4, { poorSleepNights: 3, lowReadinessDays: 2 });
    expect(rec.reasons.length).toBe(2);
    expect(rec.status).toBe("ready");
  });
});

// ─── Plateau ──────────────────────────────────────────────────
describe("P2: plateau de fuerza", () => {
  it("e1RM plano 3 sesiones → plateau con sugerencia", () => {
    const h = [hist(80, [8, 8, 8], 2, 1), hist(80, [8, 8, 7], 2, 8), hist(80, [8, 8, 8], 2, 15)];
    const r = detectStrengthPlateau("bench", h, "8-10");
    expect(r.plateau).toBe(true);
    expect(r.sessionsUsed).toBe(3);
    expect(r.suggestion.length).toBeGreaterThan(10);
  });
  it("progresando → sin plateau", () => {
    const h = [hist(90, [8, 8, 8], 2, 1), hist(85, [8, 8, 8], 2, 8), hist(80, [8, 8, 8], 2, 15)];
    const r = detectStrengthPlateau("bench", h, "8-10");
    expect(r.plateau).toBe(false);
  });
  it("sin datos suficientes → no plateau", () => {
    const r = detectStrengthPlateau("bench", [hist(80, [8], 2, 1)], "8-10");
    expect(r.plateau).toBe(false);
  });
});

// ─── VBT ──────────────────────────────────────────────────────
describe("P2: VBT proxy", () => {
  it("100% 1RM sentadilla ≈ 0.30 m/s", () => {
    expect(estimateVelocity("squat", 1.0)).toBeCloseTo(0.3, 2);
  });
  it("más liviano = más rápido", () => {
    expect(estimateVelocity("bench", 0.7)!).toBeGreaterThan(estimateVelocity("bench", 0.9)!);
  });
  it("zonas: <0.5 fuerza, 0.5-0.75 potencia, >0.75 velocidad", () => {
    expect(velocityZone(0.3)).toBe("fuerza");
    expect(velocityZone(0.6)).toBe("potencia");
    expect(velocityZone(0.9)).toBe("velocidad");
  });
  it("fuera de rango útil → null (no inventa)", () => {
    expect(estimateVelocity("squat", 0.3)).toBeNull();
    expect(velocityZoneForSet("legs", 100, null)).toBeNull();
    expect(velocityZoneForSet("core", 100, 150)).toBeNull();
  });
  it("patrón por categoría", () => {
    expect(vbtPatternFor("legs")).toBe("squat");
    expect(vbtPatternFor("push")).toBe("bench");
    expect(vbtPatternFor("pull")).toBe("hinge");
    expect(vbtPatternFor("core")).toBeNull();
  });
});

// ─── Nutrición no-keto ────────────────────────────────────────
describe("P2: presets por objetivo", () => {
  it("keto → presets cetogénicos (≤12g carbos)", () => {
    const meals = quickMealsFor("keto");
    expect(meals).toBe(QUICK_MEALS);
    expect(Math.max(...meals.map((m) => m.carb))).toBeLessThanOrEqual(12);
  });
  it("bulk/maintenance → balanceados con arroz/papa/avena", () => {
    for (const goal of ["bulk", "lean_bulk", "maintenance", "cut"] as const) {
      const meals = quickMealsFor(goal);
      expect(meals).toBe(QUICK_MEALS_BALANCED);
    }
    const names = QUICK_MEALS_BALANCED.map((m) => m.name).join(" ");
    expect(names).toMatch(/Arroz|Papa|Avena/);
  });
  it("proteína por comida = 0.4 g/kg (80kg → 32g)", () => {
    expect(proteinPerMeal(80)).toBe(32);
    expect(proteinPerMeal(0)).toBe(0);
  });
});
