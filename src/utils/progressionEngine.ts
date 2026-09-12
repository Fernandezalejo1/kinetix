// =============================================================
// KINETIX — Motor de Progresión Unificado (P1).
//
// Fachada canónica sobre los 3 motores históricos:
//   - analyzeDoubleProgression (doble progresión: BASE de la decisión)
//   - calculateSmartNextWeight (score por dificultad/tendencia e1RM: OVERRIDE de seguridad)
//   - calculateAutoProgression (matriz RIR: EXPLICACIÓN humana)
//
// Regla de conflicto: la seguridad gana. Si la doble progresión autoriza
// subir pero el score detecta rendimiento crítico (score < 0.70 → el smart
// engine pide bajar), se mantiene/baja en vez de subir.
// Incremento estándar único: 2.5 kg compuestos / 1.25 kg aislamientos.
//
// Las funciones originales se conservan (compatibilidad + tests); la UI
// nueva debe importar desde aquí.
// =============================================================

import type {
  Exercise,
  ExerciseHistoryEntry,
  PersonalRecord,
  WorkoutExercise,
  WorkoutSet,
} from "../types";
import { analyzeDoubleProgression } from "./doubleProgression";
import {
  calculateSmartNextWeight,
  smartStartingWeight,
} from "./weightRecommendation";
import { calculateAutoProgression } from "./scienceCalculators";
import { loadIncrementFor } from "./startingLoads";

/** Incremento estándar único de sobrecarga (P1: antes 3 estándares distintos). */
export const PROGRESSION_INCREMENT = {
  compound: 2.5,
  isolation: 1.25,
} as const;

export function standardIncrementFor(exercise: Exercise): number {
  return loadIncrementFor(exercise);
}

export type ProgressionSource =
  | "double_progression"
  | "smart_score"
  | "conservative_hold"
  | "starting_estimate"
  | "insufficient_data";

export interface UnifiedProgression {
  nextWeight: number;
  deltaWeight: number;
  action: "increase" | "maintain" | "decrease";
  source: ProgressionSource;
  /** Explicación lista para UI (viene de la matriz RIR cuando hay sets vivos). */
  rationale: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Peso de arranque al iniciar una sesión (sin sets vivos todavía).
 * Delega al score engine (usa historial + dificultad + tendencia e1RM),
 * con fallback a estimación e1RM y luego al genérico.
 */
export function resolveStartingWeight(
  exercise: Exercise,
  targetReps: string | undefined,
  targetSets: number | undefined,
  targetRir: number | undefined,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  fallback: number
): number {
  return smartStartingWeight(
    exercise,
    targetReps,
    targetSets,
    targetRir,
    history,
    prs,
    fallback
  );
}

/**
 * Progresión en vivo (con sets de la sesión actual): la doble progresión
 * es la base (regla de mayoría + %e1RM con piso estándar).
 */
export function resolveLiveProgression(wEx: WorkoutExercise) {
  return analyzeDoubleProgression(wEx);
}

/**
 * Decisión combinada para "próxima sesión" cuando hay sets vivos + historial:
 * la seguridad (score crítico) veta la suba de la doble progresión.
 */
export function resolveNextWeight(
  exercise: Exercise,
  wExLive: WorkoutExercise,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  opts?: { weightUnit?: "kg" | "lbs" | string }
): UnifiedProgression {
  const live = analyzeDoubleProgression(wExLive);
  const targetRir = wExLive.targetRir ?? 2;
  const smart = calculateSmartNextWeight(
    exercise,
    wExLive.targetReps,
    wExLive.targetSets,
    targetRir,
    history,
    prs
  );
  const unit: "kg" | "lbs" = opts?.weightUnit === "lbs" ? "lbs" : "kg";

  // Explicación humana desde la matriz RIR (última sesión viva).
  let rationale = live.message;
  try {
    const expl = calculateAutoProgression(exercise, wExLive.sets, unit);
    if (expl.scientificRationale) rationale = expl.scientificRationale;
  } catch {
    /* explicación opcional: si falla, queda el mensaje de doble progresión */
  }

  const confidence = smart.confidence;

  // Sin datos del score → la doble progresión decide sola.
  if (smart.performance.completedSets === 0 && live.status !== "target_reached") {
    return {
      nextWeight: live.currentWeight,
      deltaWeight: 0,
      action: "maintain",
      source: "insufficient_data",
      rationale: "Sin datos suficientes: completá la sesión con RIR para habilitar la progresión.",
      confidence: "low",
    };
  }

  // Conflicto: la doble progresión autoriza subir pero el score pide bajar
  // (rendimiento crítico / tendencia e1RM en caída) → gana la seguridad.
  if (live.status === "target_reached" && smart.adjustment < 0) {
    return {
      nextWeight: live.currentWeight,
      deltaWeight: 0,
      action: "maintain",
      source: "conservative_hold",
      rationale: `Llegaste al tope del rango, pero el rendimiento global pide cautela (${smart.reason}). Se mantiene la carga una sesión más.`,
      confidence,
    };
  }

  if (live.status === "target_reached" && live.suggestedWeight != null) {
    return {
      nextWeight: live.suggestedWeight,
      deltaWeight: live.deltaWeight,
      action: "increase",
      source: "double_progression",
      rationale,
      confidence,
    };
  }

  // Fuera del tope: el score engine decide (subir/mantener/bajar).
  if (smart.nextWeight > 0) {
    const action: UnifiedProgression["action"] =
      smart.adjustment > 0 ? "increase" : smart.adjustment < 0 ? "decrease" : "maintain";
    return {
      nextWeight: smart.nextWeight,
      deltaWeight: smart.adjustment,
      action,
      source: "smart_score",
      rationale: smart.reason,
      confidence,
    };
  }

  return {
    nextWeight: live.currentWeight,
    deltaWeight: 0,
    action: "maintain",
    source: "starting_estimate",
    rationale,
    confidence: "low",
  };
}

/**
 * Progresión para la PRÓXIMA sesión a partir del historial (sin sets vivos),
 * p.ej. para el resumen al terminar un entreno o el análisis de un ejercicio.
 * Unifica el flujo bajo la misma fachada que el resto de la app: un solo
 * motor toma la decisión en todas las pantallas.
 */
export function resolveNextWeightFromHistory(
  exercise: Exercise,
  targetReps: string | undefined,
  targetSets: number | undefined,
  targetRir: number | undefined,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  opts?: { weightUnit?: "kg" | "lbs" | string }
): UnifiedProgression {
  const rir = targetRir ?? 2;
  const smart = calculateSmartNextWeight(exercise, targetReps, targetSets, rir, history, prs);
  const action: UnifiedProgression["action"] =
    smart.adjustment > 0 ? "increase" : smart.adjustment < 0 ? "decrease" : "maintain";
  return {
    nextWeight: smart.nextWeight,
    deltaWeight: smart.adjustment,
    action,
    source: smart.nextWeight > 0 ? "smart_score" : "starting_estimate",
    rationale: smart.reason,
    confidence: smart.confidence,
  };
}

/** Re-export para que la UI importe un solo módulo. */
export type { WorkoutSet };
