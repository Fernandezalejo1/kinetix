import { CompletedWorkout, Routine, WorkoutSet } from "../types";

/**
 * Deload Detection — "Deload automático por acumulación real de sobrecarga".
 *
 * Analiza el historial de entrenamiento de las últimas N semanas y detecta si
 * se ha acumulado fatiga real (RIR bajando = cada vez más cerca del fallo,
 * volumen en aumento, mayor tasa de fallos/fueras de reserva). Cuando la
 * tendencia marca sobrecarga acumulada sostenida, sugiere una semana de
 * descarga (deload) antes de seguir cargando.
 */

export interface WeeklyDeloadMetric {
  weekIndex: number; // 0 = más reciente
  workouts: number;
  volumeKg: number;
  averageRir: number | null; // promedio de RIR de todas las series (menor = más cerca del fallo). null si no hay datos.
  failureRate: number | null; // % de series con RIR 0 (fallo) dentro del total
  hardRate: number | null; // % de series con RIR <= 1
}

export interface DeloadRecommendation {
  status: "none" | "due" | "ready";
  weeksAnalyzed: number;
  weekly: WeeklyDeloadMetric[];
  rirTrend: number; // delta de RIR semana reciente vs previa (negativo = bajando)
  volumeTrendPercent: number; // % incremento de volumen semana reciente vs previa
  failureRate: number; // % de fallos en la semana reciente
  reasons: string[];
  suggestedVolumeCutPercent: number; // cuánto bajar el volumen en la semana de descarga
  /** Mensaje humano resumido en español. */
  summary: string;
  weeksTrained: number; // semanas con al menos 1 entrenamiento en la ventana
  consecutiveOverloadWeeks: number; // semanas seguidas con señal de sobrecarga
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Umbrales parametrizables (defaults = comportamiento actual).
 *  Permite endurecer/suavizar la detección por nivel sin tocar la lógica. */
export const DELOAD_THRESHOLDS = {
  rirLow: 1.2,
  rirTrendDrop: -0.3,
  hardRateHigh: 60,
  failureRateHigh: 30,
  weeklyOverloadRir: 1.5,
  weeklyOverloadHardRate: 40,
};

function weekBounds(now: number, weeksBack: number): [number, number] {
  const start = now - (weeksBack + 1) * WEEK_MS;
  const end = now - weeksBack * WEEK_MS;
  return [start, end];
}

function effectiveSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.completed && s.type !== "warmup" && s.type !== "cardio");
}

/** Agrupa los workouts por ventanas semanales (0 = esta semana, 1 = hace 1 semana...). */
export function computeWeeklyDeloadMetrics(
  history: CompletedWorkout[],
  weeks: number = 4
): WeeklyDeloadMetric[] {
  const now = Date.now();
  const metrics: WeeklyDeloadMetric[] = [];

  for (let w = 0; w < weeks; w++) {
    const [start, end] = weekBounds(now, w);
    const wks = history.filter((h) => {
      const t = new Date(h.date).getTime();
      return t >= start && t < end;
    });

    const allSets = wks.flatMap((w) => w.exercises.flatMap((e) => effectiveSets(e.sets)));
    const withRir = allSets.filter((s) => typeof s.rir === "number");

    // Sin series con RIR NO se inventa "1.0" (eso disparaba un deload falso).
    const rirSum = withRir.reduce((a, s) => a + (s.rir ?? 0), 0);
    const averageRir = withRir.length > 0 ? Math.round((rirSum / withRir.length) * 100) / 100 : null;

    const failureCount = withRir.filter((s) => (s.rir ?? 0) === 0).length;
    const hardCount = withRir.filter((s) => (s.rir ?? 0) <= 1).length;
    const base = withRir.length > 0 ? withRir.length : null;

    metrics.push({
      weekIndex: w,
      workouts: wks.length,
      volumeKg: wks.reduce((a, w) => a + w.totalVolumeKg, 0),
      averageRir,
      failureRate: base === null ? null : Math.round((failureCount / base) * 100),
      hardRate: base === null ? null : Math.round((hardCount / base) * 100),
    });
  }

  return metrics;
}

/**
 * Detecta si hay que hacer deload por ACUMULACIÓN REAL: se exigen varias
 * señales simultáneas y sostenidas (no una sola sesión dura).
 */
export function analyzeDeload(history: CompletedWorkout[], weeks: number = 4): DeloadRecommendation {
  const weekly = computeWeeklyDeloadMetrics(history, weeks);

  // Solo semanas realmente entrenadas (>= 1 sesión)
  const trainedWeeks = weekly.filter((w) => w.workouts > 0);
  const recent = weekly[0];
  const prev = weekly[1];
  const reasons: string[] = [];

  // Necesitamos al menos la semana reciente con datos reales de RIR para juzgar.
  const recentHasRir = trainedWeeks.length > 0 && weekly[0].averageRir != null;

  let rirTrend = 0;
  let volumeTrendPercent = 0;
  if (prev && prev.workouts > 0 && recent && recent.workouts > 0) {
    if (recent.averageRir != null && prev.averageRir != null) {
      rirTrend = Math.round((recent.averageRir - prev.averageRir) * 100) / 100;
    }
    volumeTrendPercent =
      prev.volumeKg > 0
        ? Math.round((((recent.volumeKg - prev.volumeKg) / prev.volumeKg) * 100) * 10) / 10
        : 0;
  }

  // Señal 1: RIR bajo sostenido en la semana reciente (entreno cerca del fallo)
  if (
    recent &&
    recent.workouts > 0 &&
    recent.averageRir != null &&
    recent.averageRir < DELOAD_THRESHOLDS.rirLow
  ) {
    reasons.push(`RIR promedio muy bajo (${recent.averageRir}) la semana pasada`);
  }

  // Señal 2: el RIR está bajando semana a semana (acumulando fatiga)
  if (
    recent &&
    prev &&
    prev.workouts > 0 &&
    recent.averageRir != null &&
    prev.averageRir != null &&
    rirTrend < DELOAD_THRESHOLDS.rirTrendDrop
  ) {
    reasons.push(`El RIR cayó ${Math.abs(rirTrend)} pts semana a semana (fatiga en aumento)`);
  }

  // Señal 3: alta tasa de fallos o fuera de reserva
  if (
    recent &&
    recent.hardRate != null &&
    recent.failureRate != null &&
    (recent.hardRate >= DELOAD_THRESHOLDS.hardRateHigh || recent.failureRate >= DELOAD_THRESHOLDS.failureRateHigh)
  ) {
    reasons.push(
      `El ${recent.hardRate}% de las series recientes se hizo con RIR ≤ 1 (máxima intensidad)`
    );
  }

  // Señal 4: el volumen no baja (o sube) pese a la fatiga acumulada
  if (recent && prev && prev.workouts > 0 && volumeTrendPercent >= -10) {
    if (recentHasRir && volumeTrendPercent > 5) {
      reasons.push(`Volumen en aumento (+${volumeTrendPercent}%) sin dar tregua a la fatiga`);
    }
  }

  // Cuántas semanas consecutivas con señal sostenida
  let consecutiveOverloadWeeks = 0;
  for (const m of trainedWeeks) {
    const overloaded =
      m.averageRir != null &&
      m.hardRate != null &&
      m.averageRir < DELOAD_THRESHOLDS.weeklyOverloadRir &&
      m.hardRate >= DELOAD_THRESHOLDS.weeklyOverloadHardRate;
    if (overloaded) consecutiveOverloadWeeks++;
    else break;
  }

  const due = consecutiveOverloadWeeks >= 2 && reasons.length >= 2;
  // "ready": señales presentes pero aún no suficientes semanas o señales
  const ready = reasons.length >= 1 && !due;

  // Reducción sugerida de volumen: más agresiva si la fatiga es alta
  let suggestedVolumeCutPercent = 40;
  if (due && recent) {
    suggestedVolumeCutPercent = (recent.failureRate ?? 0) >= 30 ? 60 : 50;
  }

  let summary = "Sin señales de sobrecarga acumulada. Podés entrenar con normalidad.";
  if (ready) {
    summary = "Hay señales iniciales de fatiga. Observá el RIR esta semana y considerá un deload pronto.";
  } else if (due) {
    summary = `Sobrecarga real acumulada durante ${consecutiveOverloadWeeks} semanas. Es el momento de una semana de descarga (~${suggestedVolumeCutPercent}% menos volumen, −10-15% carga, más reps en reserva).`;
  }

  return {
    status: due ? "due" : ready ? "ready" : "none",
    weeksAnalyzed: weeks,
    weekly,
    rirTrend,
    volumeTrendPercent,
    failureRate: recent ? (recent.failureRate ?? 0) : 0,
    reasons,
    suggestedVolumeCutPercent,
    summary,
    weeksTrained: trainedWeeks.length,
    consecutiveOverloadWeeks,
  };
}

/**
 * Construye una versión "deload" de una rutina: reduce el volumen (~50%),
 * sube el RIR objetivo (+2, más reps de reserva) y mantiene la selección de
 * ejercicios. El ajuste de carga (−10-15%) lo aplica startWorkoutFromRoutine
 * cuando la rutina lleva la marca .deload.
 */
export function buildDeloadRoutine(routine: Routine): Routine {
  const exercises = routine.exercises.map((ex) => {
    const reducedSets = Math.max(1, Math.round(ex.targetSets * 0.5));
    const higherRir = Math.min(3, (ex.targetRir ?? 1) + 2);
    return {
      ...ex,
      targetSets: reducedSets,
      targetRir: higherRir,
    };
  });

  return {
    ...routine,
    id: `${routine.id}-deload`,
    name: `Descarga · ${routine.name.split("(")[0].trim()}`,
    description: `Semana de descarga (${routine.description}). Menos series, más reps en reserva (RIR ${2}+) y carga reducida −10-15% para cerrar la acumulación de fatiga.`,
    estimatedDurationMin: Math.max(25, Math.round((routine.estimatedDurationMin || 60) * 0.6)),
    exercises,
    deload: true,
  };
}

/** Claves de persistencia de la semana de descarga. */
export const DELOAD_WEEK_KEY = "kinetix_deload_week";

export function getDeloadWeekState(): {
  active: boolean;
  startedAt?: number;
  routineId?: string;
} {
  try {
    const raw = localStorage.getItem(DELOAD_WEEK_KEY);
    return raw ? JSON.parse(raw) : { active: false };
  } catch {
    return { active: false };
  }
}

export function setDeloadWeekState(state: {
  active: boolean;
  startedAt?: number;
  routineId?: string;
}) {
  try {
    localStorage.setItem(DELOAD_WEEK_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}
