import { describe, expect, it } from "vitest";
import { applyReadinessToSession } from "../src/utils/goalEngine";
import { getMesocycleInfo, consecutiveTrainedWeeks, shouldSuggestDeload, advanceMesocycleClock } from "../src/utils/mesocycle";
import { safeSet } from "../src/utils/storage";
import {
  resolveNextWeight,
  resolveNextWeightFromHistory,
  resolveStartingWeight,
  standardIncrementFor,
} from "../src/utils/progressionEngine";
import {
  startChallenge,
  processTodaySteps,
  rolloverIfMissed,
  getCurrentDay,
  isExpired,
  DAILY_GOAL,
} from "../src/utils/challengeStorage";
import { localDateKey } from "../src/utils/dateUtils";
import { installTestEnv } from "./helpers/testEnv";
import type { CompletedWorkout, Exercise, ExerciseHistoryEntry, WorkoutExercise, WorkoutSet } from "../src/types";

installTestEnv();

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "bench",
    name: "Bench",
    nameEs: "Press banca",
    category: "push",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps"],
    defaultTempo: "3-1-1-1",
    defaultRir: 2,
    ...overrides,
  } as unknown as Exercise;
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "s1", setNumber: 1, type: "normal", weight: 80, reps: 10, rir: 2, completed: true,
    ...overrides,
  } as WorkoutSet;
}

function makeWEx(sets: WorkoutSet[], overrides: Partial<WorkoutExercise> = {}): WorkoutExercise {
  return {
    id: "w1", exerciseId: "bench", exercise: makeExercise(),
    targetRestSeconds: 120, targetSets: 3, targetReps: "8-10", targetRir: 2,
    sets, ...overrides,
  };
}

function histEntry(weight: number, reps: number[], difficulty?: "very_hard" | "had_more"): ExerciseHistoryEntry {
  return {
    exerciseId: "bench", date: new Date().toISOString(), weight, reps,
    sets: reps.length, difficulty,
  } as unknown as ExerciseHistoryEntry;
}

function workoutDaysAgo(daysAgo: number, rir = 2): CompletedWorkout {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w-${daysAgo}`, routineName: "R", date: d.toISOString(),
    durationSeconds: 3600, totalVolumeKg: 5000, totalSets: 15,
    exercises: [{
      id: "e", exerciseId: "bench", exercise: makeExercise(),
      targetRestSeconds: 120, sets: [makeSet({ rir }), makeSet({ rir })],
    }],
    prCount: 0, averageRir: rir,
  };
}

// ─── Readiness ────────────────────────────────────────────────
describe("P1: readiness → ajuste de sesión", () => {
  it("dale no toca nada", () => {
    expect(applyReadinessToSession("dale", 100, 2)).toEqual({ weight: 100, rir: 2, applied: false, note: "" });
  });
  it("moderado suma 1 RIR sin bajar carga", () => {
    const r = applyReadinessToSession("moderado", 100, 2);
    expect(r).toMatchObject({ weight: 100, rir: 3, applied: true });
  });
  it("descanso baja 10% y suma 1 RIR", () => {
    const r = applyReadinessToSession("descanso", 100, 2);
    expect(r.weight).toBe(90);
    expect(r.rir).toBe(3);
    expect(r.applied).toBe(true);
  });
});

// ─── Mesociclo ────────────────────────────────────────────────
describe("P1: mesociclo 4+1", () => {
  it("2 semanas entrenadas → ramp, sin deload", () => {
    const h = [workoutDaysAgo(1), workoutDaysAgo(8)];
    const info = getMesocycleInfo(h);
    expect(info.weekInCycle).toBe(2);
    expect(info.phase).toBe("ramp");
    expect(info.isDeloadWeek).toBe(false);
  });
  it("5 semanas seguidas → semana de descarga por calendario", () => {
    const h = [1, 8, 15, 22, 29].map((d) => workoutDaysAgo(d));
    expect(consecutiveTrainedWeeks(h)).toBe(5);
    const { suggest, reason } = shouldSuggestDeload(h);
    expect(suggest).toBe(true);
    expect(["calendar", "both"]).toContain(reason);
  });
  it("sin historial → semana 1 intro", () => {
    const info = getMesocycleInfo([]);
    expect(info.weekInCycle).toBe(1);
    expect(info.phase).toBe("intro");
  });
  it("reloj: avanza con sessiones y no queda pegado en descarga", () => {
    localStorage.clear();
    const now = Date.parse("2026-06-01T12:00:00Z");
    const w = (daysAgo: number) => ({ ...workoutDaysAgo(daysAgo), date: new Date(now - daysAgo * 86400000).toISOString() });
    const h = [w(1), w(8)]; // dos semanas entrenadas
    const state = advanceMesocycleClock(h, now);
    expect(state).not.toBeNull();
    expect(state!.cycleStart).toBeTruthy();
    const info = getMesocycleInfo(h, now);
    expect(info.weekInCycle).toBe(2);
    expect(info.phase).toBe("ramp");
    expect(info.isDeloadWeek).toBe(false);
  });
  it("reloj: descarga SUGERIDA vs REALIZADA (semana 5)", () => {
    localStorage.clear();
    const now = Date.parse("2026-06-01T12:00:00Z");
    // El ciclo arrancó hace 4 semanas → hoy es la semana 5.
    safeSet("kinetix_mesocycle_state", {
      cycleId: "cyc-1",
      cycleStart: new Date(now - 4 * 7 * 86400000).toISOString(),
      deloadCompletedAt: null,
    });
    // Aún no entrena en la semana de descarga (semana actual sin sesiones).
    const hSugerida = [8, 15, 22, 29].map((d) => ({ ...workoutDaysAgo(d), date: new Date(now - d * 86400000).toISOString() }));
    const sugerida = getMesocycleInfo(hSugerida, now);
    expect(sugerida.isDeloadWeek).toBe(true);
    expect(sugerida.weekInCycle).toBe(5);
    expect(sugerida.deloadCompleted).toBe(false);
    // Entrena durante la semana de descarga → "realizada", sigue sem 5.
    const hRealizada = [{ ...workoutDaysAgo(1), date: new Date(now - 1 * 86400000).toISOString() }, ...hSugerida];
    advanceMesocycleClock(hRealizada, now);
    const realizada = getMesocycleInfo(hRealizada, now);
    expect(realizada.isDeloadWeek).toBe(true);
    expect(realizada.deloadCompleted).toBe(true);
  });
  it("reloj: la descarga terminada reinicia el ciclo (sin quedar en deload)", () => {
    localStorage.clear();
    const now = Date.parse("2026-06-01T12:00:00Z");
    // Ciclo viejo: la semana 5 ya pasó (cycleStart hace ~6 semanas).
    safeSet("kinetix_mesocycle_state", {
      cycleId: "cyc-old",
      cycleStart: new Date(now - 6 * 7 * 86400000).toISOString(),
      deloadCompletedAt: new Date(now - 2 * 7 * 86400000).toISOString(),
    });
    const h = [{ ...workoutDaysAgo(1), date: new Date(now - 1 * 86400000).toISOString() }];
    // Lectura: el calendario ya pasó a un ciclo nuevo (semana 1).
    const info = getMesocycleInfo(h, now);
    expect(info.weekInCycle).toBe(1);
    expect(info.phase).toBe("intro");
    expect(info.wrapped).toBe(true);
    expect(info.isDeloadWeek).toBe(false);
    // Al entrenar hoy, el reloj persiste el wrap (nuevo cycleStart).
    const st = advanceMesocycleClock(h, now);
    expect(st!.cycleId).not.toBe("cyc-old");
    const info2 = getMesocycleInfo(h, now);
    expect(info2.wrapped).toBe(false);
    expect(info2.weekInCycle).toBe(1);
  });
});

// ─── Motor unificado ──────────────────────────────────────────
describe("P1: progressionEngine", () => {
  it("incremento estándar único 2.5 / 1.25", () => {
    expect(standardIncrementFor(makeExercise())).toBe(2.5);
    expect(standardIncrementFor(makeExercise({ id: "barbell-curl", equipment: "barbell" }))).toBe(1.25);
    expect(standardIncrementFor(makeExercise({ id: "lever-seated-fly", equipment: "machine" }))).toBe(1.25);
  });
  it("tope del rango + buen rendimiento → double_progression", () => {
    const wEx = makeWEx([makeSet({ reps: 10, rir: 2 }), makeSet({ reps: 10, rir: 2 }), makeSet({ reps: 10, rir: 1 })]);
    const history = [histEntry(80, [10, 10, 10])];
    const r = resolveNextWeight(makeExercise(), wEx, history, []);
    expect(r.source).toBe("double_progression");
    expect(r.action).toBe("increase");
    expect(r.nextWeight).toBeGreaterThan(80);
  });
  it("tope del rango + rendimiento crítico → conservative_hold (seguridad gana)", () => {
    const wEx = makeWEx([makeSet({ reps: 10, rir: 2 }), makeSet({ reps: 10, rir: 2 }), makeSet({ reps: 10, rir: 2 })]);
    // Última sesión pésima: la mitad de reps + very_hard → score < 0.7 → pide bajar.
    const history = [histEntry(80, [5, 5, 4], "very_hard")];
    const r = resolveNextWeight(makeExercise(), wEx, history, []);
    expect(r.source).toBe("conservative_hold");
    expect(r.action).toBe("maintain");
  });
  it("arranque sin historial → fallback genérico, no inventa", () => {
    const w = resolveStartingWeight(makeExercise(), "8-10", 3, 2, [], [], 40);
    expect(w).toBe(40);
  });
  it("mismo facade para historial (sin sets vivos) que para live", () => {
    // El resumen/análisis usa resolveNextWeightFromHistory; produce la MISMA
    // forma (UnifiedProgression) que el resto de la app y decide igual que el
    // motor de score (no reinventa otro criterio).
    const history = [histEntry(80, [10, 10, 10])];
    const r = resolveNextWeightFromHistory(makeExercise(), "6-12", 3, 1, history, []);
    expect(r).toMatchObject({
      source: "smart_score",
      confidence: "medium",
    });
    expect(typeof r.action).toBe("string");
    expect(typeof r.rationale).toBe("string");
    expect(r.nextWeight).toBeGreaterThan(0);
    expect(r.nextWeight - r.deltaWeight).toBe(80);
  });
});

// ─── Reto ─────────────────────────────────────────────────────
describe("P1: reto escalado + calendario", () => {
  it("startChallenge acepta meta elegida", () => {
    const s = startChallenge(8000);
    expect(s.dailyGoal).toBe(8000);
    expect(s.active).toBe(true);
  });
  it("startChallenge rechaza meta inválida → default", () => {
    const s = startChallenge(99999);
    expect(s.dailyGoal).toBe(DAILY_GOAL);
  });
  it("8000 pasos cumplen meta 8000 pero no 15000", () => {
    const low = { ...startChallenge(8000) };
    const ok = processTodaySteps(low, 8000);
    expect(ok.completedDates.length).toBe(1);
    const high = { ...startChallenge(15000) };
    const notOk = processTodaySteps(high, 8000);
    expect(notOk.completedDates.length).toBe(0);
  });
  it("día fallado reinicia a 0 (regla estricta)", () => {
    const today = localDateKey(new Date());
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const yKey = (d: Date) => localDateKey(d);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const state = {
      ...startChallenge(8000),
      startDate: yKey(threeDaysAgo),
      completedDates: [yKey(threeDaysAgo)],
      currentStreak: 1,
      bestStreak: 1,
    };
    // Ayer (no completado) < hoy → rollover reinicia.
    if (!state.completedDates.includes(yKey(yesterday))) {
      const rolled = rolloverIfMissed(state, today);
      expect(rolled.completedDates.length).toBe(0);
      expect(rolled.currentStreak).toBe(0);
      expect(rolled.startDate).toBe(today);
    }
  });
  it("día actual es por calendario, no por completados", () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 9);
    const state = { ...startChallenge(8000), startDate: localDateKey(tenDaysAgo), completedDates: [] };
    expect(getCurrentDay(state)).toBe(10);
  });
  it("vence a los 21 días sin completar", () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 25);
    const state = { ...startChallenge(8000), startDate: localDateKey(longAgo), completedDates: [] };
    expect(isExpired(state)).toBe(true);
    const processed = processTodaySteps(state, 100);
    expect(processed.expired).toBe(true);
    expect(processed.active).toBe(false);
  });
});
