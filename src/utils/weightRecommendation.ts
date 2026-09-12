// =============================================================
// KINETIX — Algoritmo de Recomendación de Pesos (v2)
//
// Reemplaza la lógica simplista de getNextWeight con un análisis
// compuesto que considera:
//   - Repeticiones logradas vs objetivo
//   - RIR registrado vs RIR objetivo
//   - Tasa de completado de series
//   - Feedback de dificultad del usuario
//   - Tendencia de e1RM entre sesiones
//   - Histórico reciente (múltiples sesiones)
//
// Principio: NADA se ajusta sin datos. Si faltan datos críticos,
// se cae a la lógica conservadora (mantener peso).
// =============================================================

import { Exercise, ExerciseHistoryEntry, PersonalRecord, DifficultyLevel } from "../types";
import { calculate1RM, isCompoundExercise } from "./scienceCalculators";
import { parseRepsRange } from "./doubleProgression";
import { e1rmFromSet } from "./startingLoads";

// ─── Helpers ────────────────────────────────────────────────────

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Redondea a incremento de platos (2.5 compuesto / 1 aislamiento). */
function roundToIncrement(value: number, inc: number): number {
  return Math.round(value / inc) * inc;
}

function loadIncrement(exercise: Exercise): number {
  // P1: incremento estándar único (2.5 compuesto / 1.25 aislamiento),
  // igual que doubleProgression y placas con micro-carga.
  return isCompoundExercise(exercise) ? 2.5 : 1.25;
}

// ─── Interfaces ─────────────────────────────────────────────────

export interface SessionPerformance {
  /** Reps promedio de todas las series completadas. */
  avgReps: number;
  /** RIR promedio (null si no hay datos). */
  avgRir: number | null;
  /** % de series completadas vs planificadas (0-1). */
  completionRate: number;
  /** Ratio de reps alcanzadas vs objetivo máximo (0-1.5+). */
  repAchievement: number;
  /** e1RM mejor estimado de la sesión (mejor serie con RIR). */
  bestE1rm: number | null;
  /** Feedback del usuario. */
  difficulty: DifficultyLevel | undefined;
  /** Número de series completadas. */
  completedSets: number;
}

export interface WeightRecommendation {
  /** Peso recomendado para la próxima sesión. */
  nextWeight: number;
  /** Delta desde el peso actual. */
  adjustment: number;
  /** Razón legible por el usuario. */
  reason: string;
  /** Nivel de confianza según la cantidad de datos. */
  confidence: "high" | "medium" | "low";
  /** Métricas de rendimiento calculadas. */
  performance: SessionPerformance;
}

// ─── Análisis de sesión ─────────────────────────────────────────

/**
 * Evalúa el rendimiento de una sesión comparado contra los objetivos del plan.
 * Maneja correctamente casos donde faltan datos (RIR, targetReps, etc.).
 */
export function assessSessionPerformance(
  session: ExerciseHistoryEntry,
  targetReps: string | undefined,
  targetSets: number | undefined,
  _targetRir: number | undefined
): SessionPerformance {
  const avgReps =
    session.reps.length > 0
      ? round1(session.reps.reduce((a, b) => a + b, 0) / session.reps.length)
      : 0;

  // RIR: usar el campo rir directo si existe, sino derivar de rpe
  const avgRir =
    session.rir != null
      ? session.rir
      : session.rpe != null
      ? round1(Math.max(0, 10 - session.rpe))
      : null;

  // Completion rate: completados vs planificados
  const completionRate =
    session.completionRate ??
    (targetSets != null && targetSets > 0
      ? Math.min(1, session.sets / targetSets)
      : 1);

  // Rep achievement: reps promedio vs rango objetivo
  const range = targetReps ? parseRepsRange(targetReps) : null;
  const targetMax = range?.max ?? 10;
  const repAchievement = targetMax > 0 ? round1(avgReps / targetMax) : 1;

  // e1RM de la mejor serie
  let bestE1rm: number | null = null;
  if (session.bestSet && session.bestSet.weight > 0 && session.bestSet.reps > 0) {
    const est = e1rmFromSet(
      session.bestSet.weight,
      session.bestSet.reps,
      session.bestSet.rir
    );
    if (est.valid) bestE1rm = est.average;
  }
  // Fallback: calcular del mejor set del array de reps
  if (bestE1rm == null && session.weight > 0 && session.reps.length > 0) {
    let best = 0;
    for (let i = 0; i < session.reps.length; i++) {
      const e = calculate1RM(session.weight, session.reps[i]);
      if (e.valid && e.average > best) best = e.average;
    }
    if (best > 0) bestE1rm = best;
  }

  return {
    avgReps,
    avgRir,
    completionRate,
    repAchievement,
    bestE1rm,
    difficulty: session.difficulty,
    completedSets: session.sets,
  };
}

// ─── Score compuesto ────────────────────────────────────────────

/**
 * Calcula un score compuesto de rendimiento (0 a ~1.5+).
 *
 * Score < 0.55  → rendimiento crítico (bajada fuerte)
 * Score 0.55-0.70 → rendimiento bajo (bajada moderada)
 * Score 0.70-0.82 → rendimiento aceptable (bajada leve)
 * Score 0.82-0.95 → en rango (mantener)
 * Score 0.95-1.10 → cumpliendo objetivo (subir)
 * Score > 1.10  → superando objetivo (subir más)
 */
function computePerformanceScore(perf: SessionPerformance, targetRir: number): number {
  let score = perf.repAchievement;

  // Bonus por RIR: si el usuario fue más duro de lo planeado (RIR < target),
  // el rendimiento real es "mejor" de lo que las reps sugieren.
  if (perf.avgRir != null) {
    const rirDelta = targetRir - perf.avgRir; // positivo = más duro
    score += rirDelta * 0.05; // ~5% por punto de RIR bajo
  }

  // Multiplicador por dificultad
  switch (perf.difficulty) {
    case "very_hard":
      score *= 0.80;
      break;
    case "just_right":
      score *= 1.0;
      break;
    case "good":
      score *= 1.08;
      break;
    case "had_more":
      score *= 1.18;
      break;
  }

  // Penalización por series no completadas
  if (perf.completionRate < 1) {
    // Pierde hasta 30% del score por no completar todas las series
    score *= 0.7 + 0.3 * perf.completionRate;
  }

  return score; // sin redondear: el score crudo define las bandas
}

// ─── Algoritmo principal ────────────────────────────────────────

/**
 * Calcula el peso óptimo para la próxima sesión de un ejercicio.
 *
 * Usa TODA la data disponible:
 * - Reps reales vs objetivo
 * - RIR real vs objetivo
 * - % de series completadas
 * - Feedback de dificultad
 * - Tendencia de e1RM entre sesiones
 *
 * Ejemplo del usuario:
 *   Objetivo: 80×10, Real: 80×6@RIR1, 80×5@RIR0, 80×5@RIR0, difficulty: very_hard
 *   → Score ≈ 0.43 → BAJADA FUERTE (-7.5 kg) → recomienda 72.5 kg
 */
export function calculateSmartNextWeight(
  exercise: Exercise,
  targetReps: string | undefined,
  targetSets: number | undefined,
  targetRir: number,
  history: ExerciseHistoryEntry[],
  _prs: PersonalRecord[]
): WeightRecommendation {
  const inc = loadIncrement(exercise);
  const sorted = history
    .filter((h) => h.exerciseId === exercise.id && h.weight > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Sin datos → fallback a estimación e1RM
  if (sorted.length === 0) {
    return {
      nextWeight: 0,
      adjustment: 0,
      reason: "Sin datos previos. Se usará la estimación de carga inicial.",
      confidence: "low",
      performance: {
        avgReps: 0,
        avgRir: null,
        completionRate: 0,
        repAchievement: 0,
        bestE1rm: null,
        difficulty: undefined,
        completedSets: 0,
      },
    };
  }

  const lastSession = sorted[0];
  const currentWeight = lastSession.weight;

  // Evaluar rendimiento de la última sesión
  const perf = assessSessionPerformance(lastSession, targetReps, targetSets, targetRir);

  // Si no hay targetReps (ejercicio por tiempo), usar lógica de mantenimiento
  if (!targetReps || !parseRepsRange(targetReps)) {
    if (perf.difficulty === "had_more") {
      return {
        nextWeight: roundToIncrement(currentWeight + inc, inc),
        adjustment: inc,
        reason: "Ejercicio por tiempo: sobraron fuerzas. Subida estándar.",
        confidence: perf.completedSets >= 3 ? "high" : "medium",
        performance: perf,
      };
    }
    if (perf.difficulty === "very_hard") {
      const drop = Math.max(inc, roundToIncrement(currentWeight * 0.05, inc));
      return {
        nextWeight: Math.max(inc, roundToIncrement(currentWeight - drop, inc)),
        adjustment: -drop,
        reason: "Ejercicio por tiempo: muy difícil. Bajada leve.",
        confidence: perf.completedSets >= 3 ? "high" : "medium",
        performance: perf,
      };
    }
    return {
      nextWeight: currentWeight,
      adjustment: 0,
      reason: "Ejercicio por tiempo: mantené la carga.",
      confidence: "medium",
      performance: perf,
    };
  }

  // Sesión interrumpida/parcial: NO se decide carga sobre una sesión incompleta.
  // Bajarla como si fuera bajo rendimiento o subirla por un RIR fácil son dos
  // errores: falta el dato de las series que no se hicieron. La decisión honesta
  // es mantener la carga y pedir completar la sesión. (Fase 1 coherencia)
  if (targetSets != null && targetSets > 0 && perf.completionRate < 1) {
    return {
      nextWeight: currentWeight,
      adjustment: 0,
      reason: `Sesión parcial: completaste ${perf.completedSets} de ${targetSets} series planificadas. Mantené la carga hasta completar la sesión completa.`,
      confidence: perf.completedSets >= Math.ceil(targetSets / 2) ? "low" : "low",
      performance: perf,
    };
  }

  // Calcular score compuesto
  const score = computePerformanceScore(perf, targetRir);

  // Calcular ajuste según score
  let adjustment = 0;
  let reason = "";

  if (score < 0.55) {
    // CRÍTICO: rendimiento muy bajo. Bajada fuerte.
    const dropPct = 0.10;
    const drop = Math.max(inc * 2, roundToIncrement(currentWeight * dropPct, inc));
    adjustment = -drop;
    const pctReps = Math.round(perf.repAchievement * 100);
    reason = `Rendimiento muy por debajo del objetivo (${pctReps}% de reps, RIR ${perf.avgRir ?? "?"}). Bajada significativa de carga.`;
  } else if (score < 0.70) {
    // BAJO: no llega al mínimo del rango
    const dropPct = 0.07;
    const drop = Math.max(inc * 2, roundToIncrement(currentWeight * dropPct, inc));
    adjustment = -drop;
    reason = `Reps por debajo del rango objetivo. Bajada moderada para consolidar.`;
  } else if (score < 0.82) {
    // ACEPTABLE: dentro del rango pero bajo
    const drop = Math.max(inc, roundToIncrement(currentWeight * 0.03, inc));
    adjustment = -drop;
    reason = `Rendimiento aceptable pero por debajo del objetivo. Bajada leve.`;
  } else if (score < 0.95) {
    // EN RANGO: mantener
    adjustment = 0;
    reason = `Rendimiento en rango del objetivo. Mantené la carga.`;
  } else if (score < 1.10) {
    // CUMPLIENDO: subir
    adjustment = inc;
    reason = `Objetivo cumplido. Subida estándar de sobrecarga.`;
  } else {
    // SUPERANDO: subir más
    adjustment = inc * (score > 1.25 ? 2 : 1.5);
    reason = `Objetivo superado con margen. Subida agresiva.`;
  }

  // Verificar tendencia de e1RM entre sesiones
  if (sorted.length >= 2 && perf.bestE1rm != null) {
    const prevPerf = assessSessionPerformance(
      sorted[1],
      targetReps,
      targetSets,
      targetRir
    );
    if (prevPerf.bestE1rm != null && prevPerf.bestE1rm > 0) {
      const trend = (perf.bestE1rm - prevPerf.bestE1rm) / prevPerf.bestE1rm;
      if (trend < -0.05 && adjustment >= 0) {
        // Tendencia descendente: ser más conservador
        adjustment = Math.min(adjustment, 0);
        reason += ` Tendencia decreciente en e1RM → más conservador.`;
      } else if (trend > 0.05 && adjustment <= 0) {
        // Tendencia ascendente: ser menos agresivo con bajadas
        adjustment = Math.min(adjustment, 0);
        reason += ` Tendencia ascendente en e1RM → mantener carga.`;
      }
    }
  }

  // Aplicar floor y redondeo
  const nextWeight = Math.max(inc, roundToIncrement(currentWeight + adjustment, inc));

  const confidence: "high" | "medium" | "low" =
    perf.completedSets >= 4
      ? "high"
      : perf.completedSets >= 2
      ? "medium"
      : "low";

  return {
    nextWeight,
    adjustment: nextWeight - currentWeight,
    reason,
    confidence,
    performance: perf,
  };
}

// ─── Función de inicialización de sesión ────────────────────────

/**
 * Peso de arranque inteligente para un ejercicio al iniciar una sesión.
 * Usa el algoritmo completo si hay datos, fallback a e1RM, o peso genérico.
 */
export function smartStartingWeight(
  exercise: Exercise,
  targetReps: string | undefined,
  targetSets: number | undefined,
  targetRir: number | undefined,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  fallback?: number
): number {
  const rec = calculateSmartNextWeight(
    exercise,
    targetReps,
    targetSets,
    targetRir ?? 2,
    history,
    prs
  );

  // Si el algoritmo devolvió peso válido, usarlo
  if (rec.nextWeight > 0) return rec.nextWeight;

  // Fallback: usar e1RM del PR si existe
  const pr = prs.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
  if (pr && pr.value > 0 && targetReps) {
    const range = parseRepsRange(targetReps);
    if (range) {
      // Calcular peso de trabajo desde 1RM para el tope del rango
      const workingPct = 1 / (1 + range.max / 30);
      return roundToIncrement(pr.value * workingPct, loadIncrement(exercise));
    }
  }

  // Fallback final: peso genérico
  return fallback ?? (exercise.category === "legs" ? 80 : 40);
}
