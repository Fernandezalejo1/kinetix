// =============================================================
// KINETIX — Mesociclos (P1): periodización 4+1 con reloj persistente.
//
// Estructura clásica basada en evidencia (Israetel/RP, Helms):
//   semanas 1-4 = acumulación (intro → sobrecarga → sobrecarga → pico)
//   semana 5    = descarga (deload) programada por calendario
// La detección por señales (analyzeDeload, RIR real) puede adelantar
// la descarga: shouldSuggestDeload = calendario OR señales.
//
// FIX (revisión externa): ANTES, al llegar a 5 semanas el ciclo quedaba
// pegado en "descarga" para siempre (consecutiveTrainedWeeks topeaba en 5).
// AHORA existe un reloj persistente (kinetix_mesocycle_state): el ciclo
// tiene inicio real (cycleStart), la semana de descarga se distingue entre
// "sugerida" (weekInCycle 5 sin haber entrenado) y "realizada" (se entrenó),
// y al pasar la semana 5 el ciclo se reinicia automáticamente (wrap → novo).
// =============================================================

import type { CompletedWorkout } from "../types";
import { analyzeDeload } from "./deloadDetection";
import { safeParse, safeSet } from "./storage";

export const MESOCYCLE_WEEKS = 5;

const MESOCYCLE_STATE_KEY = "kinetix_mesocycle_state";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type MesocyclePhase = "intro" | "ramp" | "peak" | "deload";

export interface MesocycleState {
  cycleId: string;
  /** Inicio REAL del ciclo actual (ISO). Define semana 1 por calendario. */
  cycleStart: string;
  /** Cuándo se entrenó dentro de la semana de descarga (descarga realizada). */
  deloadCompletedAt: string | null;
}

export interface MesocycleInfo {
  /** Semana del ciclo (1-5). */
  weekInCycle: number;
  phase: MesocyclePhase;
  phaseLabel: string;
  /** True en la semana 5 del ciclo (descarga programada). */
  isDeloadWeek: boolean;
  /** Semanas con ≥1 sesión en la ventana analizada. */
  trainedWeeks: number;
  /** La descarga programada ya se entrenó (no es solo sugerida). */
  deloadCompleted: boolean;
  /** Se reinició automáticamente al terminar la semana de descarga. */
  wrapped: boolean;
}

const PHASE_LABELS: Record<MesocyclePhase, string> = {
  intro: "Semana de adaptación",
  ramp: "Semana de sobrecarga",
  peak: "Semana pico",
  deload: "Semana de descarga",
};

const isoKey = (now: number) => new Date(now).toISOString();

function readMesocycleState(): MesocycleState | null {
  return safeParse<MesocycleState | null>(MESOCYCLE_STATE_KEY, null, (v) => {
    if (typeof v !== "object" || v === null) return false;
    const o = v as Record<string, unknown>;
    return (
      typeof o.cycleId === "string" &&
      typeof o.cycleStart === "string" &&
      Number.isFinite(Date.parse(o.cycleStart)) &&
      (o.deloadCompletedAt === null || typeof o.deloadCompletedAt === "string")
    );
  });
}

function writeMesocycleState(state: MesocycleState): void {
  safeSet(MESOCYCLE_STATE_KEY, state);
}

function newCycleStartFrom(now: number, trainedWeeks: number): string {
  // La semana 1 comenzó hace (trainedWeeks-1) semanas como máximo.
  return isoKey(now - Math.max(trainedWeeks - 1, 0) * WEEK_MS);
}

/**
 * Avanza el reloj del mesociclo. LLAMAR solo en momentos de "evento"
 * (al completar un entrenamiento). No se ejecuta en cada render.
 * Crear el ciclo la primera vez, marca la descarga como realizada si se
 * entrenó en la semana 5, y reinicia el ciclo cuando la semana 5 pasó.
 */
export function advanceMesocycleClock(history: CompletedWorkout[], now = Date.now()): MesocycleState | null {
  const trained = consecutiveTrainedWeeks(history, now);
  let state = readMesocycleState();

  if (!state) {
    if (trained < 1) return null;
    state = { cycleId: `${now}-${Math.random().toString(36).slice(2, 10)}`, cycleStart: newCycleStartFrom(now, trained), deloadCompletedAt: null };
    writeMesocycleState(state);
    return state;
  }

  const start = Date.parse(state.cycleStart);
  if (!Number.isFinite(start)) return state;
  const weeksSinceStart = 1 + Math.floor((now - start) / WEEK_MS);

  if (weeksSinceStart > MESOCYCLE_WEEKS) {
    // La descarga ya pasó → nuevo ciclo empieza desde el primer entreno de HOY.
    const next: MesocycleState = { cycleId: `${now}-${Math.random().toString(36).slice(2, 10)}`, cycleStart: isoKey(now), deloadCompletedAt: null };
    writeMesocycleState(next);
    return next;
  }

  if (weeksSinceStart === MESOCYCLE_WEEKS && trained >= MESOCYCLE_WEEKS && state.deloadCompletedAt === null) {
    const done: MesocycleState = { ...state, deloadCompletedAt: isoKey(now) };
    writeMesocycleState(done);
    return done;
  }

  return state;
}

/** Reinicia el reloj (poco usado: por si el usuario borra todo su historial). */
export function resetMesocycleClock(): void {
  try {
    localStorage.removeItem(MESOCYCLE_STATE_KEY);
  } catch {
    /* ignore */
  }
}

/** Cuenta semanas consecutivas con ≥1 sesión mirando hacia atrás desde hoy. */
export function consecutiveTrainedWeeks(history: CompletedWorkout[], now = Date.now()): number {
  let count = 0;
  for (let w = 0; w < MESOCYCLE_WEEKS; w++) {
    const start = now - (w + 1) * WEEK_MS;
    const end = now - w * WEEK_MS;
    const trained = history.some((h) => {
      const t = new Date(h.date).getTime();
      return Number.isFinite(t) && t >= start && t < end;
    });
    if (trained) count++;
    else break;
  }
  return count;
}

function deloadInfo(trained: number, completed: boolean): MesocycleInfo {
  return {
    weekInCycle: MESOCYCLE_WEEKS,
    phase: "deload",
    phaseLabel: PHASE_LABELS.deload,
    isDeloadWeek: true,
    trainedWeeks: trained,
    deloadCompleted: completed,
    wrapped: false,
  };
}

function accumulationInfo(weekInCycle: number, trained: number): MesocycleInfo {
  return {
    weekInCycle,
    phase: weekInCycle === 1 ? "intro" : weekInCycle === 4 ? "peak" : "ramp",
    phaseLabel: PHASE_LABELS[weekInCycle === 1 ? "intro" : weekInCycle === 4 ? "peak" : "ramp"],
    isDeloadWeek: false,
    trainedWeeks: trained,
    deloadCompleted: false,
    wrapped: false,
  };
}

export function getMesocycleInfo(history: CompletedWorkout[], now = Date.now()): MesocycleInfo {
  const trained = Math.max(consecutiveTrainedWeeks(history, now), 1);
  const state = readMesocycleState();

  if (state && Number.isFinite(Date.parse(state.cycleStart))) {
    const weeksSinceStart = 1 + Math.floor((now - Date.parse(state.cycleStart)) / WEEK_MS);
    if (weeksSinceStart > MESOCYCLE_WEEKS) {
      // La semana de descarga ya pasó → nuevo ciclo (sin reescribir aquí;
      // advanceMesocycleClock persiste el wrap al completar un entreno).
      return { ...accumulationInfo(1, trained), wrapped: true };
    }
    if (weeksSinceStart >= MESOCYCLE_WEEKS) {
      // Semana 5 en curso: descarga sugerida; "realizada" si se entrenó.
      return deloadInfo(trained, trained >= MESOCYCLE_WEEKS || !!state.deloadCompletedAt);
    }
    return accumulationInfo(Math.max(weeksSinceStart, 1), trained);
  }

  // Sin reloj persistido (primeras sesiones / tests): exactamente el modelo
  // anterior — semanas consecutivas entrenadas, sin quedar pegado en descarga
  // porque advanceMesocycleClock crea el reloj al completar la semana 5.
  const weekInCycle = Math.min(Math.max(trained, 1), MESOCYCLE_WEEKS);
  if (weekInCycle >= MESOCYCLE_WEEKS) {
    return deloadInfo(trained, trained >= MESOCYCLE_WEEKS);
  }
  return accumulationInfo(weekInCycle, trained);
}

/**
 * ¿Sugerir descarga? SÍ si el calendario llegó a la semana 5 O si las
 * señales reales (RIR/volumen/fallos) marcan sobrecarga acumulada.
 */
export function shouldSuggestDeload(
  history: CompletedWorkout[],
  now = Date.now()
): { suggest: boolean; reason: "calendar" | "signals" | "both" | "none"; mesocycle: MesocycleInfo; signalsDue: boolean } {
  const mesocycle = getMesocycleInfo(history, now);
  const signalsDue = analyzeDeload(history, 4).status === "due";
  const calendar = mesocycle.isDeloadWeek;
  const suggest = calendar || signalsDue;
  const reason = calendar && signalsDue ? "both" : calendar ? "calendar" : signalsDue ? "signals" : "none";
  return { suggest, reason, mesocycle, signalsDue };
}
