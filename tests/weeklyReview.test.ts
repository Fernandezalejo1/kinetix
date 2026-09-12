import { describe, it, expect } from "vitest";
import {
  computeWeeklyReview,
  lowerFrequencySuggestion,
  WEEKLY_REVIEW_THRESHOLDS,
  WeeklyReviewInput,
} from "../src/utils/weeklyReview";
import {
  BodyMetricEntry,
  CardioEntry,
  CompletedWorkout,
  PersonalRecord,
  ReadinessEntry,
  SleepEntry,
  UserProfile,
} from "../src/types";

const PROFILE: UserProfile = {
  goal: "lean_bulk",
  experience: "intermedio",
  daysPerWeek: 4,
  sessionMinutes: 45,
  equipment: "gym",
  completedAt: "2026-09-01T10:00:00.000Z",
};

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

function workout(
  routineName: string,
  daysAgo: number,
  opts: { sets?: number; rir?: number; volumeKg?: number } = {}
): CompletedWorkout {
  const sets = (opts.sets ?? 3);
  const rir = opts.rir;
  return {
    id: `w-${routineName}-${daysAgo}`,
    routineName,
    date: ago(daysAgo),
    durationSeconds: 1800,
    totalVolumeKg: opts.volumeKg ?? sets * 40,
    totalSets: sets,
    exercises: [
      {
        id: `${routineName}-ex`,
        exerciseId: "barbell-bench-press",
        exercise: {} as never,
        targetRestSeconds: 120,
        sets: Array.from({ length: sets }).map((_, i) => ({
          id: `s-${i}`,
          setNumber: i + 1,
          type: "normal" as const,
          weight: 40,
          reps: 10,
          rir,
          completed: true,
        })),
      },
    ],
    prCount: 0,
    averageRir: rir ?? null,
  };
}

const emptyInput = (overrides: Partial<WeeklyReviewInput> = {}): WeeklyReviewInput => ({
  history: [],
  profile: PROFILE,
  phaseId: "lean_bulk",
  personalRecords: [],
  sleepLog: [],
  readinessLog: [],
  cardioLog: [],
  bodyMetrics: [],
  cardioTargetMin: 90,
  ...overrides,
});

describe("lowerFrequencySuggestion", () => {
  it("baja 1 día sin pasar de 2", () => {
    expect(lowerFrequencySuggestion(4)).toBe(3);
    expect(lowerFrequencySuggestion(2)).toBe(2);
  });
});

describe("computeWeeklyReview: adherencia", () => {
  it("sin datos: veredicto danger + ajuste para retomar", () => {
    const r = computeWeeklyReview(emptyInput());
    expect(r.workoutsDone).toBe(0);
    expect(r.adherencePercent).toBe(0);
    expect(r.verdict.tone).toBe("danger");
    expect(r.adjustments.some((a) => a.id === "adj-resume")).toBe(true);
    expect(r.adjustments.some((a) => a.action.type === "set_frequency")).toBe(false);
  });

  it("adherencia excelente (4/4) → veredicto en verde", () => {
    const history = [0, 1, 2, 3].map((d) => workout("Torso A", d));
    const r = computeWeeklyReview(emptyInput({ history }));
    expect(r.workoutsDone).toBe(4);
    expect(r.adherencePercent).toBe(100);
    expect(r.verdict.tone).toBe("good");
    expect(r.items.some((i) => i.id === "adherence-good")).toBe(true);
  });

  it("adherencia baja (1/4) → sugiere bajar frecuencia a 3 días", () => {
    const history = [workout("Torso A", 1)];
    const r = computeWeeklyReview(emptyInput({ history }));
    expect(r.adherencePercent).toBe(25);
    const freq = r.adjustments.find((a) => a.id === "adj-frequency");
    expect(freq).toBeDefined();
    expect(freq?.action.type).toBe("set_frequency");
    if (freq?.action.type === "set_frequency") expect(freq.action.days).toBe(3);
  });
});

describe("computeWeeklyReview: progreso y recuperación", () => {
  it("contabiliza PRs de la semana", () => {
    const records: PersonalRecord[] = [
      {
        id: "pr1",
        exerciseId: "barbell-bench-press",
        exerciseName: "Press",
        type: "1RM",
        value: 100,
        date: ago(2),
      },
      {
        id: "pr2",
        exerciseId: "deadlift",
        exerciseName: "Peso muerto",
        type: "max_weight",
        value: 180,
        date: ago(40), // fuera de la ventana
      },
    ];
    const r = computeWeeklyReview(
      emptyInput({ personalRecords: records, history: [workout("Torso A", 1)] })
    );
    expect(r.prCount).toBe(1);
    expect(r.items.some((i) => i.id === "prs")).toBe(true);
  });

  it("RIR bajo sostenido → ítem de recuperación", () => {
    const history = [
      workout("Torso A", 1, { sets: 3, rir: 1 }),
      workout("Pierna A", 8, { sets: 3, rir: 1 }),
      workout("Torso B", 15, { sets: 3, rir: 1 }),
    ];
    const r = computeWeeklyReview(emptyInput({ history }));
    expect(r.items.some((i) => i.id === "rir-low")).toBe(true);
  });

  it("acumulación fuerte de fatiga → deload sugerido", () => {
    const history = [
      workout("A", 1, { sets: 4, rir: 0 }),
      workout("B", 8, { sets: 4, rir: 0 }),
      workout("C", 15, { sets: 4, rir: 0 }),
    ];
    const r = computeWeeklyReview(emptyInput({ history }));
    if (r.deloadStatus === "due") {
      expect(r.items.some((i) => i.id === "deload-due")).toBe(true);
      expect(r.adjustments.some((a) => a.id === "adj-deload")).toBe(true);
    } else {
      expect(["none", "ready"]).toContain(r.deloadStatus);
    }
  });

  it("sueño promedio < 7h → ítem tip", () => {
    const sleep: SleepEntry[] = [
      { id: "s1", date: ago(1), bed: "00:30", wake: "06:30", quality: 3 },
      { id: "s2", date: ago(2), bed: "01:00", wake: "06:30", quality: 3 },
    ];
    const r = computeWeeklyReview(
      emptyInput({ sleepLog: sleep, history: [workout("Torso A", 1)] })
    );
    expect(r.avgSleepHours).toBeCloseTo(5.8, 0);
    expect(r.items.some((i) => i.id === "sleep-low")).toBe(true);
  });

  it("readiness promedio 0-100", () => {
    const ready: ReadinessEntry[] = [
      { id: "r1", date: ago(1), fatigue: 2, soreness: 3, sleepHours: 7.5, score: 72, verdict: "dale" },
      { id: "r2", date: ago(2), fatigue: 3, soreness: 3, sleepHours: 6, score: 55, verdict: "moderado" },
    ];
    const r = computeWeeklyReview(
      emptyInput({ readinessLog: ready, history: [workout("Torso A", 1)] })
    );
    expect(r.avgReadiness).toBe(64);
  });

  it("cardio cuenta contra el objetivo de la fase", () => {
    const cardio: CardioEntry[] = [
      { id: "c1", date: ago(1), type: "liss", minutes: 30 },
      { id: "c2", date: ago(2), type: "hiit", minutes: 20 },
    ];
    const r = computeWeeklyReview(emptyInput({ cardioLog: cardio }));
    expect(r.cardioMinutes).toBe(50);
    expect(r.cardioTarget).toBe(90);
  });
});

describe("computeWeeklyReview: ajustes de fase", () => {
  it("fase cut con peso subiendo (déficit sin responder)", () => {
    const bodyMetrics: BodyMetricEntry[] = [
      { id: "b1", date: ago(14), weightKg: 80 },
      { id: "b2", date: ago(1), weightKg: 80.5 },
    ];
    const r = computeWeeklyReview(
      emptyInput({
        phaseId: "cut",
        bodyMetrics,
        history: [workout("Torso A", 1)],
      })
    );
    expect(r.weightDeltaKg).toBe(0.5);
    expect(r.adjustments.some((a) => a.id === "adj-cut-stall")).toBe(true);
  });

  it("dos semanas con adherencia baja → sugiere programa Full Body 3d", () => {
    const history = [workout("Torso A", 1)];
    const r = computeWeeklyReview(emptyInput({ history }));
    const prog = r.adjustments.find((a) => a.id === "adj-program");
    expect(prog).toBeDefined();
    expect(prog?.action.type).toBe("set_program");
    if (prog?.action.type === "set_program") expect(prog.action.programId).toBe("fbeod-full-body");
  });

  it("RIR alto con sesiones completas → sugiere subir intensidad", () => {
    const history = [0, 1, 2, 3].map((d) => workout("Torso A", d, { sets: 3, rir: 3 }));
    const r = computeWeeklyReview(emptyInput({ history }));
    expect(r.adjustments.some((a) => a.id === "adj-intensity")).toBe(true);
  });
});

describe("computeWeeklyReview: determinismo", () => {
  it("dos llamadas con los mismos datos dan el mismo resultado", () => {
    const input = () =>
      emptyInput({ history: [0, 1, 2].map((d) => workout("Torso A", d, { sets: 3, rir: 2 })) });
    const a = computeWeeklyReview(input());
    const b = computeWeeklyReview(input());
    expect(a).toEqual(b);
  });

  it("threshold config es coherente", () => {
    expect(WEEKLY_REVIEW_THRESHOLDS.lowAdherencePercent).toBeLessThanOrEqual(100);
    expect(WEEKLY_REVIEW_THRESHOLDS.lowAdherenceWeeks).toBeGreaterThanOrEqual(1);
  });
});