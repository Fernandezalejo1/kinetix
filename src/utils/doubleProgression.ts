import type { Exercise, WorkoutExercise } from "../types";
import { isCompoundExercise } from "./scienceCalculators";

/** Detección de "compuesto" robusta: barra y máquinas principales se tratan
 *  como compuestos (salto de 2,5 kg); el resto apunta a micro-carga (1,25 kg).
 *  Se conserva la lista legacy de isCompoundExercise por compatibilidad. */
const COMPOUND_EQUIPMENT = new Set(["barbell", "machine", "smith-mashine"]);
function isCompoundLike(ex: Exercise): boolean {
  if (COMPOUND_EQUIPMENT.has(ex.equipment)) return true;
  return isCompoundExercise(ex);
}

export interface RepsRange {
  min: number;
  max: number;
}

/**
 * Parses a plan target like "8-10", "10-12", "12" into a numeric range.
 * Returns null for non-weight-based targets ("60s", "20/side", "45-60s",
 * "Sostén isométrico") so the double-progression engine skips them.
 */
export function parseRepsRange(targetReps?: string): RepsRange | null {
  if (!targetReps) return null;
  const raw = targetReps.trim().toLowerCase();
  if (!raw) return null;
  if (/[a-z/]/.test(raw)) return null;
  const m = raw.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const max = m[2] ? parseInt(m[2], 10) : min;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < min) return null;
  if (min > 20 || max > 30) return null;
  return { min, max };
}

export type DoubleProgressionStatus = "not_progressable" | "in_progress" | "target_reached";

export interface DoubleProgressionAnalysis {
  status: DoubleProgressionStatus;
  range: RepsRange | null;
  targetRir: number | null;
  targetSets: number | null;
  completedSets: number;
  maxReps: number;
  setsAtTop: number;
  avgRir: number | null;
  rirMet: boolean;
  isCompound: boolean;
  currentWeight: number;
  suggestedWeight: number | null;
  deltaWeight: number;
  message: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const roundWeight = (v: number) => Math.round(v * 4) / 4;

function rirOf(set: { rir?: number; rpe?: number }): number | null {
  if (set.rir !== undefined && set.rir !== null) {
    const r = Number(set.rir);
    if (Number.isFinite(r) && r >= 0 && r <= 10) return r;
  }
  if (set.rpe !== undefined && set.rpe !== null) {
    const pe = Number(set.rpe);
    if (Number.isFinite(pe) && pe >= 1 && pe <= 10) return round1(Math.max(0, 10 - pe));
  }
  return null;
}

/**
 * Live double-progression engine.
 *
 * Regla de la doble progresión: dentro de un rango de reps objetivo (ej. 8-10)
 * primero se progresa en repeticiones y SOLO cuando la/s serie/s llegan al tope
 * del rango (10) con el RIR objetivo ejecutado (o más duro), se autoriza la
 * sobrecarga de carga (+2,5 kg compuestos / +1,25 kg aislamiento).
 */
export function analyzeDoubleProgression(wEx: WorkoutExercise): DoubleProgressionAnalysis {
  const range = parseRepsRange(wEx.targetReps);
  const isCompound = isCompoundLike(wEx.exercise);
  const deltaWeight = isCompound ? 2.5 : 1.25;

  const base: DoubleProgressionAnalysis = {
    status: "not_progressable",
    range,
    targetRir: wEx.targetRir ?? null,
    targetSets: wEx.targetSets ?? null,
    completedSets: 0,
    maxReps: 0,
    setsAtTop: 0,
    avgRir: null,
    rirMet: false,
    isCompound,
    currentWeight: 0,
    suggestedWeight: null,
    deltaWeight,
    message: "",
  };

  if (!range) return base;

  const working = wEx.sets.filter((s) => s.completed && s.type !== "warmup");
  const completedSets = working.length;
  const currentWeight = round1(
    working.length > 0
      ? working[working.length - 1].weight
      : (wEx.sets.find((s) => s.type !== "warmup")?.weight ?? 0)
  );

  base.completedSets = completedSets;
  base.currentWeight = currentWeight;

  if (completedSets === 0) {
    base.status = "in_progress";
    base.message = `Objetivo ${wEx.targetSets ? `${wEx.targetSets}×` : ""}${range.min}–${range.max} reps · RIR ${wEx.targetRir ?? "—"}. Cuando el tope del rango se haga al RIR objetivo, la app te va a avisar que subas de peso.`;
    return base;
  }

  const maxReps = Math.max(...working.map((s) => s.reps));
  const setsAtTop = working.filter((s) => s.reps >= range.max).length;

  const rirVals = working.map(rirOf).filter((r): r is number => r !== null);
  const avgRir = rirVals.length > 0 ? round1(rirVals.reduce((a, b) => a + b, 0) / rirVals.length) : null;
  const targetRir = wEx.targetRir ?? 2;
  const rirMet = avgRir !== null ? avgRir <= targetRir + 0.5 : false;

  // La doble progresión exige que la MAYORÍA de las series efectivas lleguen al
  // tope del rango (no basta una sola serie) antes de autorizar la sobrecarga.
  const neededAtTop = Math.max(1, Math.ceil(completedSets / 2));
  const topReached = setsAtTop >= neededAtTop;

  base.maxReps = maxReps;
  base.setsAtTop = setsAtTop;
  base.avgRir = avgRir;
  base.rirMet = rirMet;

  if (topReached && rirMet) {
    // Sobrecarga por % del RM estimado (Epley) con piso fijo: ~2.5% del e1RM,
    // nunca menos que el salto clásico (2.5 kg compuestos / 1.25 kg aislamiento).
    // Así un press de 20 kg no salta 6% y una sentadilla de 200 kg no se estanca en 1.25%.
    const e1rmEst = currentWeight > 0 ? currentWeight * (1 + maxReps / 30) : 0;
    const pctDelta = e1rmEst > 0 ? Math.round(e1rmEst * 0.025 * 4) / 4 : deltaWeight;
    const smartDelta = Math.max(deltaWeight, pctDelta);
    const suggestedWeight = roundWeight(currentWeight + smartDelta);
    base.status = "target_reached";
    base.suggestedWeight = suggestedWeight;
    base.deltaWeight = smartDelta;
    base.message = `¡Tope del rango logrado (${maxReps}/${range.max} reps en ${setsAtTop}/${completedSets} series) a RIR ${avgRir} (objetivo ${targetRir})! Sobrecargá la próxima sesión a ${suggestedWeight} kg (+${smartDelta}) en ${range.min}–${range.max} reps.`;
  } else if (setsAtTop >= 1 && !rirMet) {
    base.status = "in_progress";
    base.message = avgRir === null
      ? `Reps al tope (${maxReps}/${range.max}, ${setsAtTop}/${neededAtTop} series exigidas) pero sin RIR registrado. Cargá el RIR de las series para evaluar la sobrecarga.`
      : `Reps al tope (${maxReps}/${range.max}) pero con RIR ${avgRir} (objetivo ${targetRir}): por ahora consolidá repeticiones antes de subir de peso.`;
  } else {
    const missing = range.max - maxReps;
    base.status = "in_progress";
    const rirNote = avgRir === null ? " Registrá el RIR al completar." : ` RIR de hoy: ${avgRir}.`;
    base.message = `Hoy ${maxReps}/${range.max} reps (${setsAtTop}/${neededAtTop} series al tope exigidas)${missing > 0 ? ` — faltan ${missing} reps para el tope` : ""}.${rirNote} Doble progresión: primero reps, después el peso.`;
  }

  return base;
}