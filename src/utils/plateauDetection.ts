// =============================================================
// KINETIX — Detección de plateau de fuerza (P2).
//
// Si el e1RM de un ejercicio no se mueve ±2% en 3 sesiones seguidas,
// hay estancamiento: se sugiere la palanca correcta según la causa
// (cerca del fallo → rotar ejercicio; en el tope del rango → cambiar
// de rango/pausa; por debajo → consolidar carga).
// =============================================================

import type { ExerciseHistoryEntry } from "../types";
import { e1rmFromSet } from "./startingLoads";
import { parseRepsRange } from "./doubleProgression";

export const PLATEAU_SESSIONS = 3;
export const PLATEAU_TOLERANCE = 0.02; // ±2%

export interface PlateauResult {
  plateau: boolean;
  sessionsUsed: number;
  /** Cambio % entre el mejor y peor e1RM de la ventana. */
  changePct: number;
  bestE1rm: number | null;
  suggestion: string;
}

function sessionE1rm(entry: ExerciseHistoryEntry): number | null {
  if (entry.bestSet && entry.bestSet.weight > 0 && entry.bestSet.reps > 0) {
    const est = e1rmFromSet(entry.bestSet.weight, entry.bestSet.reps, entry.bestSet.rir);
    if (est.valid) return est.average;
  }
  return null;
}

/**
 * Analiza las últimas N sesiones de un ejercicio (más recientes primero
 * en el array de entrada, o las ordena por fecha si hace falta).
 */
export function detectStrengthPlateau(
  exerciseId: string,
  history: ExerciseHistoryEntry[],
  targetReps?: string,
  sessions: number = PLATEAU_SESSIONS,
  tolerance: number = PLATEAU_TOLERANCE
): PlateauResult {
  const own = history
    .filter((h) => h.exerciseId === exerciseId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sessions);

  const e1rms = own.map(sessionE1rm).filter((v): v is number => v != null);
  if (e1rms.length < sessions) {
    return { plateau: false, sessionsUsed: e1rms.length, changePct: 0, bestE1rm: null, suggestion: "" };
  }

  const best = Math.max(...e1rms);
  const worst = Math.min(...e1rms);
  const changePct = best > 0 ? Math.round(((best - worst) / best) * 1000) / 10 : 0;
  const plateau = changePct <= tolerance * 100;

  if (!plateau) {
    return { plateau: false, sessionsUsed: e1rms.length, changePct, bestE1rm: best, suggestion: "" };
  }

  // Causa probable desde la última sesión.
  const last = own[0];
  const avgRir = last.rir ?? last.bestSet?.rir ?? null;
  const range = targetReps ? parseRepsRange(targetReps) : null;
  const repsMed = last.reps?.length
    ? [...last.reps].sort((a, b) => a - b)[Math.floor(last.reps.length / 2)]
    : 0;

  let suggestion: string;
  if (avgRir != null && avgRir <= 1) {
    suggestion =
      "Estás rindiendo al límite (RIR ≤1) sin progresar: rotá el ejercicio por una variante 3-4 semanas (ej. press plano → inclinado) o meté una semana liviana y volvé.";
  } else if (range && repsMed >= range.max) {
    suggestion = `Clavado en el tope (${range.max} reps): cambiá el estímulo — rango de fuerza 4-6 reps, o agregá pausa de 2s en el estiramiento 3 semanas.`;
  } else if (range && repsMed < range.min) {
    suggestion =
      "No llegás al rango con esta carga: bajá 1 escalón, consolidá el rango completo 2 semanas y recién ahí volvé a subir.";
  } else {
    suggestion =
      "Sumá 1 serie efectiva por sesión en este ejercicio o subí su frecuencia a 2x/semana durante el próximo mesociclo.";
  }

  return { plateau: true, sessionsUsed: e1rms.length, changePct, bestE1rm: best, suggestion };
}
