// =============================================================
// KINETIX — Revisión semanal + ajustes de fase.
// Lógica 100% determinista y local (sin LLM ni APIs externas):
// mide adherencia, progreso, recuperación y devuelve veredicto,
// ítems de revisión y AJUSTES accionables (frecuencia, programa,
// fase) que el usuario puede aplicar de un toque.
// =============================================================

import {
  BodyMetricEntry,
  CardioEntry,
  CompletedWorkout,
  GoalPhase,
  PersonalRecord,
  ReadinessEntry,
  SleepEntry,
  UserProfile,
} from "../types";
import {
  analyzeDeload,
} from "./deloadDetection";
import { sleepHoursOf } from "./goalEngine";

export type ReviewTone = "good" | "warn" | "tip";

export interface WeeklyReviewItem {
  id: string;
  tone: ReviewTone;
  title: string;
  detail: string;
}

export type AdjustmentAction =
  | { type: "set_frequency"; days: number }
  | { type: "set_program"; programId: string }
  | { type: "set_phase"; phaseId: GoalPhase }
  | { type: "tip" };

export interface WeeklyAdjustment {
  id: string;
  tone: ReviewTone;
  title: string;
  detail: string;
  action: AdjustmentAction;
}

export interface WeeklyReview {
  workoutsDone: number;
  workoutsExpected: number;
  adherencePercent: number;
  volumeKg: number;
  volumeDeltaPercent: number;
  setsThisWeek: number;
  prCount: number;
  avgRir: number | null;
  failureRate: number | null;
  avgReadiness: number | null;
  avgSleepHours: number | null;
  cardioMinutes: number;
  cardioTarget: number | null;
  weightDeltaKg: number | null;
  deloadStatus: string;
  deloadSummary: string;
  items: WeeklyReviewItem[];
  adjustments: WeeklyAdjustment[];
  verdict: {
    tone: "good" | "warn" | "danger";
    label: string;
    summary: string;
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const inLastDays = (date: string, days: number): boolean => {
  const t = new Date(date).getTime();
  return !Number.isNaN(t) && t >= Date.now() - days * DAY_MS;
};

export interface WeeklyReviewInput {
  history: CompletedWorkout[];
  profile: UserProfile | null;
  phaseId: GoalPhase;
  personalRecords: PersonalRecord[];
  sleepLog: SleepEntry[];
  readinessLog: ReadinessEntry[];
  cardioLog: CardioEntry[];
  bodyMetrics: BodyMetricEntry[];
  /** Objetivo de cardio semanal según fase; null = no juzgar. */
  cardioTargetMin?: number | null;
}

export interface WeeklyReviewConfig {
  /** Adherencia bajo la cual se sugiere bajar frecuencia. */
  lowAdherencePercent: number;
  /** Semanas seguidas con adherencia baja para proponer el cambio. */
  lowAdherenceWeeks: number;
  /** RIR promedio por debajo del cual se marca fatiga alta. */
  lowRirThreshold: number;
  /** Caída de volumen (en %) que se marca como regresión. */
  volumeDropPercent: number;
}

export const WEEKLY_REVIEW_THRESHOLDS: WeeklyReviewConfig = {
  lowAdherencePercent: 60,
  lowAdherenceWeeks: 2,
  lowRirThreshold: 1.2,
  volumeDropPercent: -20,
};

/** Frecuencia por defecto a la que se propone bajar cuando la adherencia no da. */
export function lowerFrequencySuggestion(current: number): number {
  return Math.max(2, current - 1);
}

/**
 * Revisión semanal completa (7 días móviles). Todo determinista:
 * veredicto + ítems + ajustes listos para aplicar.
 */
export function computeWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const {
    history,
    profile,
    phaseId,
    personalRecords,
    sleepLog,
    readinessLog,
    cardioLog,
    bodyMetrics,
  } = input;

  const expected = Math.max(1, profile?.daysPerWeek ?? 4);
  const thisWeek = history.filter((w) => inLastDays(w.date, 7));
  const workoutsDone = thisWeek.length;
  const adherencePercent = Math.round(clamp((workoutsDone / expected) * 100, 0, 100));

  const volumeKg = thisWeek.reduce((a, w) => a + w.totalVolumeKg, 0);
  const setsThisWeek = thisWeek.reduce((a, w) => a + w.totalSets, 0);

  const thisWeekTs = Date.now() - WEEK_MS;
  const prCount = personalRecords.filter((r) => inLastDays(r.date, 7)).length;

  const lastWeek = history.filter((w) => {
    const t = new Date(w.date).getTime();
    return t >= thisWeekTs - WEEK_MS && t < thisWeekTs;
  });
  const lastWeekVolume = lastWeek.reduce((a, w) => a + w.totalVolumeKg, 0);
  const volumeDeltaPercent =
    lastWeekVolume > 0 ? Math.round(((volumeKg - lastWeekVolume) / lastWeekVolume) * 100) : 0;

  // Recuperación: RIR/failure de la semana reciente (reusa deload detection).
  const deload = analyzeDeload(history, 4);
  const recent = deload.weekly[0];
  const avgRir = recent?.averageRir ?? null;
  const failureRate = recent?.failureRate ?? null;

  const readinessWeek = readinessLog.filter((r) => inLastDays(r.date, 7));
  const avgReadiness =
    readinessWeek.length > 0
      ? Math.round(readinessWeek.reduce((a, r) => a + r.score, 0) / readinessWeek.length)
      : null;

  const sleepWeek = sleepLog.filter((s) => inLastDays(s.date, 7));
  const avgSleepHours =
    sleepWeek.length > 0
      ? Math.round(
          (sleepWeek.reduce((a, s) => a + sleepHoursOf(s.bed, s.wake), 0) / sleepWeek.length) * 10
        ) / 10
      : null;

  const cardioMinutes = cardioLog
    .filter((c) => inLastDays(c.date, 7))
    .reduce((a, c) => a + (Number(c.minutes) || 0), 0);
  const cardioTarget = input.cardioTargetMin ?? null;

  // Tendencia de peso (últimas 2 mediciones).
  const sortedMetrics = [...bodyMetrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let weightDeltaKg: number | null = null;
  if (sortedMetrics.length >= 2) {
    const last = sortedMetrics[sortedMetrics.length - 1].weightKg;
    const prev = sortedMetrics[sortedMetrics.length - 2].weightKg;
    weightDeltaKg = Math.round((last - prev) * 100) / 100;
  }

  const items: WeeklyReviewItem[] = [];
  const adjustments: WeeklyAdjustment[] = [];

  // --- Adherencia ---
  if (workoutsDone === 0) {
    items.push({
      id: "adherence-zero",
      tone: "warn",
      title: "Sin sesiones esta semana",
      detail: `Entrenaste 0 de ${expected} días planificados. Lo más valioso es retomar con la sesión más corta.`,
    });
  } else if (adherencePercent < WEEKLY_REVIEW_THRESHOLDS.lowAdherencePercent) {
    items.push({
      id: "adherence-low",
      tone: "warn",
      title: `Adherencia baja (${adherencePercent}%)`,
      detail: `Completaste ${workoutsDone} de ${expected} sesiones. Cada sesión cuenta más que la semana perfecta.`,
    });
  } else if (adherencePercent >= 90) {
    items.push({
      id: "adherence-good",
      tone: "good",
      title: `Adherencia excelente (${adherencePercent}%)`,
      detail: `${workoutsDone} de ${expected} sesiones completadas.`,
    });
  } else {
    items.push({
      id: "adherence-ok",
      tone: "good",
      title: `Adherencia ${adherencePercent}%`,
      detail: `${workoutsDone} de ${expected} sesiones completadas.`,
    });
  }

  // --- Progreso / volumen ---
  if (workoutsDone > 0) {
    if (volumeDeltaPercent >= 15) {
      items.push({
        id: "volume-up",
        tone: "good",
        title: `Volumen en aumento (+${volumeDeltaPercent}%)`,
        detail: `La carga de la semana pasada fue ${volumeKg.toLocaleString("es-ES")} kg. Buen estímulo de progresión.`,
      });
    } else if (volumeDeltaPercent <= WEEKLY_REVIEW_THRESHOLDS.volumeDropPercent) {
      items.push({
        id: "volume-down",
        tone: "warn",
        title: `Volumen en caída (${volumeDeltaPercent}%)`,
        detail: "Completaste las sesiones pero bajó la carga total. Revisá si dejaste series sin completar o si estás acumulando fatiga.",
      });
    }
    if (prCount > 0) {
      items.push({
        id: "prs",
        tone: "good",
        title: `${prCount} PR${prCount === 1 ? "" : "s"} esta semana`,
        detail: "Nuevo/s récord/s registrado/s: la sobrecarga progresiva está funcionando.",
      });
    }
  }

  // --- Recuperación ---
  if (avgRir != null && avgRir <= WEEKLY_REVIEW_THRESHOLDS.lowRirThreshold) {
    items.push({
      id: "rir-low",
      tone: "warn",
      title: `RIR promedio bajo (${avgRir})`,
      detail: "Estás entrenando muy cerca del fallo. Es efectivo a corto plazo, pero exige más descanso.",
    });
  }
  if (deload.status === "due") {
    items.push({
      id: "deload-due",
      tone: "warn",
      title: "Señales de deload",
      detail: deload.summary,
    });
  }
  if (avgSleepHours != null && avgSleepHours < 7) {
    items.push({
      id: "sleep-low",
      tone: "tip",
      title: `Sueño promedio ${avgSleepHours}h`,
      detail: "Semanas con menos de 7h reducen la recuperación. Priorizá el descanso esta semana.",
    });
  }

  // --- Ajustes accionables (ajustes de fase) ---
  const usedAdherenceFix = workoutsDone === 0 || adherencePercent < WEEKLY_REVIEW_THRESHOLDS.lowAdherencePercent;

  if (workoutsDone === 0) {
    adjustments.push({
      id: "adj-resume",
      tone: "warn",
      title: "Retomá con la sesión corta",
      detail: `Elegí una sesión de hasta ${profile?.sessionMinutes ?? 45} min para retomar sin fricción. El objetivo es volver, no rendir.`,
      action: { type: "tip" },
    });
  } else if (usedAdherenceFix && adherencePercent < WEEKLY_REVIEW_THRESHOLDS.lowAdherencePercent) {
    const lowerDays = lowerFrequencySuggestion(profile?.daysPerWeek ?? expected);
    adjustments.push({
      id: "adj-frequency",
      tone: "warn",
      title: `Bajar a ${lowerDays} días/sem`,
      detail: `Con ${adherencePercent}% de adherencia, un plan de ${lowerDays} días/sem es más sostenible y evita el abandono.`,
      action: { type: "set_frequency", days: lowerDays },
    });
  }

  // Cambio de programa por adherencia sostenida (2 semanas bajas).
  const sessionsLastTwoWeeks =
    history.filter((w) => inLastDays(w.date, 14)).length;
  const expectedTwoWeeks = expected * 2;
  const twoWeekAdherence =
    expectedTwoWeeks > 0
      ? Math.round((sessionsLastTwoWeeks / expectedTwoWeeks) * 100)
      : 100;
  if (
    twoWeekAdherence < WEEKLY_REVIEW_THRESHOLDS.lowAdherencePercent * 0.7 &&
    (profile?.daysPerWeek ?? 4) > 3
  ) {
    adjustments.push({
      id: "adj-program",
      tone: "tip",
      title: "Programa de 3 días (Full Body)",
      detail: "Dos semanas con adherencia baja: un volumen 3 días/sem con cuerpo completo rinde más que un split que no se completa.",
      action: { type: "set_program", programId: "fbeod-full-body" },
    });
  }

  // Ajuste de fase por composición (misma lógica que GoalHub).
  if (phaseId === "cut" && weightDeltaKg != null && weightDeltaKg >= 0.1) {
    adjustments.push({
      id: "adj-cut-stall",
      tone: "warn",
      title: "Déficit sin responder",
      detail: `La balanza subió/sostuvo (+${weightDeltaKg} kg). Revisá el déficit (−15%) y los registros de comida: el desajuste suele estar ahí.`,
      action: { type: "tip" },
    });
  }

  if (deload.status === "due") {
    adjustments.push({
      id: "adj-deload",
      tone: "warn",
      title: "Iniciá la semana de descarga",
      detail: `${deload.summary} Activá el deload desde la pantalla de Entrenamiento.`,
      action: { type: "tip" },
    });
  }

  if (avgRir != null && avgRir >= 2.5 && workoutsDone >= expected && volumeDeltaPercent < 10) {
    adjustments.push({
      id: "adj-intensity",
      tone: "tip",
      title: "Subí un poco la intensidad",
      detail: "RIR alto con las sesiones completas: te queda margen para bajar RIR a 1–2 en los próximos ejercicios.",
      action: { type: "tip" },
    });
  }

  // --- Veredicto ---
  let verdict: WeeklyReview["verdict"];
  if (workoutsDone === 0 && volumesAreZero(volumeKg)) {
    verdict = {
      tone: "danger",
      label: "Semana perdida",
      summary: "No registraste entrenamientos. La prioridad es retomar: una sesión corta hoy vale más que un plan perfecto.",
    };
  } else if (
    adherencePercent >= 70 &&
    deload.status !== "due" &&
    (avgRir == null || avgRir > WEEKLY_REVIEW_THRESHOLDS.lowRirThreshold) &&
    volumeDeltaPercent >= -10
  ) {
    verdict = {
      tone: "good",
      label: "Semana en verde",
      summary:
        "Cumpliste la frecuencia, el volumen no cayó y la fatiga está controlada. Seguí con la sobrecarga progresiva.",
    };
  } else {
    verdict = {
      tone: "warn",
      label: "Semana para ajustar",
      summary: "Hay señales mixtas (adherencia, recuperación o volumen). Aplicá los ajustes sugeridos y reevaluá la próxima semana.",
    };
  }

  return {
    workoutsDone,
    workoutsExpected: expected,
    adherencePercent,
    volumeKg,
    volumeDeltaPercent,
    setsThisWeek,
    prCount,
    avgRir,
    failureRate,
    avgReadiness,
    avgSleepHours,
    cardioMinutes,
    cardioTarget,
    weightDeltaKg,
    deloadStatus: deload.status,
    deloadSummary: deload.summary,
    items,
    adjustments,
    verdict,
  };
}

function volumesAreZero(...volumes: number[]): boolean {
  return volumes.every((v) => v === 0 || Number.isNaN(v));
}