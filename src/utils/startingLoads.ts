// =============================================================
// KINETIX — Cargas de arranque personalizadas.
// En vez de arrancar cada ejercicio con 40/80 kg genéricos, se
// estima el 1RM del usuario POR EJERCICIO desde sus datos reales
// (PRs + historial de sesiones) y se mapea a una carga de trabajo
// para el rango de reps del programa.
//
// Principio KINETIX: NADA se estima sin datos. Si el usuario no
// tiene PR ni historial para un ejercicio, se usa el fallback
// genérico actual (40 kg upper / 80 kg piernas / 3 kg medicine ball).
// =============================================================

import { Exercise, ExerciseHistoryEntry, PersonalRecord } from "../types";
import { calculate1RM, isCompoundExercise } from "./scienceCalculators";
import { parseRepsRange } from "./doubleProgression";

export interface EstimatedStrength {
  /** Mejor 1RM estimado en kg (null si no hay datos para este ejercicio). */
  e1rm: number | null;
  source: "pr" | "history" | "none";
}

/**
 * e1RM de una serie real con RIR: las reps en reserva se SUMAN a las reps hechas
 * (si hiciste 8 @ RIR 2, podías hacer ~10) y se aplica la fórmula estándar.
 * Tope de 12 reps efectivas (mismo límite de fiabilidad de calculate1RM) para
 * que un RIR alto no fabrique 1RMs absurdos.
 */
export function e1rmFromSet(
  weight: number,
  reps: number,
  rir?: number
): { average: number; valid: boolean } {
  const hasRir = rir !== undefined && rir !== null && Number.isFinite(rir) && rir >= 0;
  const effectiveReps = hasRir ? Math.min(reps + Math.min(rir, 10), 12) : reps;
  return calculate1RM(weight, effectiveReps);
}

/** 1RM derivado de un récord personal (1RM directo o 3RM/5RM/max_weight vía Epley). */
function e1rmFromPr(pr: PersonalRecord): number | null {
  if (pr.type === "1RM") return pr.value > 0 ? pr.value : null;
  if (pr.type === "3RM" || pr.type === "5RM" || pr.type === "max_weight") {
    const reps = Math.max(1, pr.reps ?? 1);
    const est = calculate1RM(pr.value, reps);
    return est.valid ? est.average : null;
  }
  // max_volume no es una carga: no sirve para estimar un 1RM de arranque.
  return null;
}

/** Mejor e1RM observado en sesiones reales: prioriza la mejor serie registrada
 *  (bestSet, que incluye el RIR) y cae al peso máximo × reps en datos viejos. */
function e1rmFromHistory(entries: ExerciseHistoryEntry[]): number | null {
  let best: number | null = null;
  for (const h of entries) {
    if (h.bestSet && h.bestSet.weight > 0 && h.bestSet.reps > 0) {
      const est = e1rmFromSet(h.bestSet.weight, h.bestSet.reps, h.bestSet.rir);
      if (est.valid) best = best === null ? est.average : Math.max(best, est.average);
      continue;
    }
    if (h.weight <= 0) continue;
    for (const reps of h.reps) {
      if (reps <= 0) continue;
      const est = calculate1RM(h.weight, reps);
      if (est.valid) best = best === null ? est.average : Math.max(best, est.average);
    }
  }
  return best;
}

/**
 * Estima el 1RM de un ejercicio a partir de PRs (fuente preferida) y
 * del historial de sesiones. Se toma el mejor valor disponible: el
 * usuario entrena contra su mejor marca, no contra su peor día.
 */
export function estimateExerciseStrength(
  exerciseId: string,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[]
): EstimatedStrength {
  const pr = prs.find((p) => p.exerciseId === exerciseId && p.type !== "max_volume");
  const fromPr = pr ? e1rmFromPr(pr) : null;
  const fromHistory = e1rmFromHistory(
    Array.isArray(history) ? history.filter((h) => h.exerciseId === exerciseId) : []
  );

  if (fromPr != null && fromHistory != null) {
    return fromPr >= fromHistory
      ? { e1rm: fromPr, source: "pr" }
      : { e1rm: fromHistory, source: "history" };
  }
  if (fromPr != null) return { e1rm: fromPr, source: "pr" };
  if (fromHistory != null) return { e1rm: fromHistory, source: "history" };
  return { e1rm: null, source: "none" };
}

/** Redondea hacia ABAJO al incremento estándar (2,5 kg compuestos / 1,25 kg aislamientos, P1). */
function roundDownToIncrement(value: number, inc: number): number {
  return Math.max(inc, Math.floor(value / inc) * inc);
}

/**
 * Carga de trabajo para un rango de reps objetivo: 1RM / (1 + reps/30)
 * usando el REP MÁXIMO del rango (el más conservador) → deja ~RIR 2.
 * Ej: "8-10" → 75% del 1RM · "12-15" → 67% · "5-8" → 79%.
 */
export function workingLoadFrom1RM(
  e1rm: number,
  targetReps: string,
  exercise: Exercise
): number {
  const match = /(\d+)\s*-\s*(\d+)/.exec(targetReps || "");
  const upper = match ? Math.max(parseInt(match[2], 10), parseInt(match[1], 10)) : 10;
  const reps = Math.min(Math.max(upper, 1), 15); // fuera de rango → tope 15 (conservador)
  const raw = e1rm / (1 + reps / 30);
  const inc = loadIncrementFor(exercise);
  return roundDownToIncrement(raw, inc);
}

/**
 * Carga de arranque personalizada para un ejercicio: usa el historial
 * real si existe, si no el 1RM estimado (PR → historial), si no el
 * fallback genérico. NUNCA inventa datos.
 */
export function personalizedStartingLoad(
  exerciseId: string,
  targetReps: string,
  exercise: Exercise,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  fallback: number
): number {
  const est = estimateExerciseStrength(exerciseId, history, prs);
  if (est.e1rm == null) return fallback;
  return workingLoadFrom1RM(est.e1rm, targetReps, exercise);
}

/** Incremento estándar KINETIX (P1, único): compuestos 2,5 kg · aislamientos 1,25 kg. */
export function loadIncrementFor(exercise: Exercise): number {
  return isCompoundExercise(exercise) ? 2.5 : 1.25;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Mediana de reps: robusta a una serie floja (8,8,7 → 8, no 7,7). */
function medianReps(entry: ExerciseHistoryEntry): number {
  if (!entry.reps || entry.reps.length === 0) return 0;
  const sorted = [...entry.reps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : round1((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Carga para la PRÓXIMA vez que se repita un ejercicio, autoregulada por RIR
 * (doble progresión RIR-aware sobre la ÚLTIMA sesión real):
 *  - Te sobraron reps (RIR promedio ≥ 3 o dificultad "had_more") → subí 1 escalón
 *  - Llegaste al tope del rango con el RIR objetivo (≤ 2)               → subí 1 escalón
 *  - Quedaste dentro del rango                                           → mantené la carga
 *  - No llegaste al mínimo del rango                                     → bajá 1 escalón
 * Sin historial → estimación e1RM de arranque (PRs + historial, nunca inventa).
 * Ejercicios por tiempo/AMRAP sin rango de reps → mantener la última carga.
 */
export function nextSessionLoad(
  exerciseId: string,
  targetReps: string,
  exercise: Exercise,
  history: ExerciseHistoryEntry[],
  prs: PersonalRecord[],
  fallback: number
): number {
  const own = Array.isArray(history)
    ? history
        .filter((h) => h.exerciseId === exerciseId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  if (own.length === 0 || !own[0].weight || own[0].weight <= 0) {
    return personalizedStartingLoad(exerciseId, targetReps, exercise, history, prs, fallback);
  }

  const last = own[0];
  const range = parseRepsRange(targetReps);
  if (!range) return last.weight;

  const inc = loadIncrementFor(exercise);
  const repsMed = medianReps(last);
  const avgRir = last.rir ?? last.bestSet?.rir ?? null;
  const hadMore = last.difficulty === "had_more" || (avgRir !== null && avgRir >= 3);

  let next: number;
  if (hadMore) {
    next = last.weight + inc;
  } else if (repsMed >= range.max && (avgRir === null || avgRir <= 2)) {
    next = last.weight + inc;
  } else if (repsMed >= range.min) {
    next = last.weight;
  } else {
    next = Math.max(inc, last.weight - inc);
  }
  return roundDownToIncrement(round1(next), inc);
}