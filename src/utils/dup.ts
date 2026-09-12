// =============================================================
// KINETIX — DUP por programa (P4): periodización ondulante diaria.
//
// Evidencia (Rhea 2002, Schoenfeld): variar el rango de reps entre
// sesiones (fuerza → hipertrofia → potencia) supera a la progresión
// lineal en fuerza e iguala/mejora hipertrofia.
//
// Regla determinista y explicable: cada vez que se completa una rutina,
// la próxima rota de día (fuerza → hipertrofia → potencia → ...).
// Solo toca compuestos con rango numérico (la doble progresión los
// sigue evaluando sobre el rango del día); aislados, tiempos y AMRAP
// quedan intactos. Nightwing ya ondula por diseño (días pesados/livianos)
// y se excluye.
// =============================================================

import type { CompletedWorkout, DupDay, Routine } from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { isCompoundExercise } from "./scienceCalculators";
import { parseRepsRange } from "./doubleProgression";

export const DUP_ORDER: DupDay[] = ["fuerza", "hipertrofia", "potencia"];

export const DUP_DAY_LABEL: Record<DupDay, string> = {
  fuerza: "DUP Fuerza (4-7 reps)",
  hipertrofia: "DUP Hipertrofia (rango base)",
  potencia: "DUP Potencia (reps altas)",
};

/** Programas que ya ondulan por diseño y no necesitan rotación DUP. */
export const DUP_SKIP_PROGRAMS = new Set(["nightwing-7d"]);

export const DUP_EXPOSURE_WINDOW_DAYS = 21;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Veces que se completó esta rutina en la ventana (el nombre es estable). */
export function countRecentCompletions(
  routineName: string,
  history: CompletedWorkout[],
  days: number = DUP_EXPOSURE_WINDOW_DAYS,
  now: number = Date.now()
): number {
  const cutoff = now - days * 86400000;
  let n = 0;
  for (const h of history) {
    if (h.routineName !== routineName) continue;
    const t = new Date(h.date).getTime();
    if (Number.isFinite(t) && t >= cutoff && t <= now) n++;
  }
  return n;
}

/** Día DUP por exposiciones acumuladas (0 = primera vez → fuerza, en fresco). */
export function dupDayFor(exposureCount: number): DupDay {
  return DUP_ORDER[((exposureCount % 3) + 3) % 3];
}

export interface DupApplied {
  routine: Routine;
  /** null = día base (hipertrofia sin cambios) o programa excluido/sin compuestos. */
  dupDay: DupDay | null;
  adjusted: number;
}

/**
 * Aplica la rotación DUP a una rutina. No muta la base: devuelve copia.
 * Marca `dupDay`/`dupAdjusted` y anota la descripción para que el Hub
 * muestre qué día toca (trazabilidad sin romper el match por nombre).
 */
export function applyDupDay(
  routine: Routine,
  history: CompletedWorkout[] = [],
  programId?: string
): DupApplied {
  if (programId && DUP_SKIP_PROGRAMS.has(programId)) {
    return { routine, dupDay: null, adjusted: 0 };
  }
  const exposures = countRecentCompletions(routine.name, history);
  const day = dupDayFor(exposures);
  if (day === "hipertrofia") return { routine, dupDay: null, adjusted: 0 };

  let adjusted = 0;
  const exercises = routine.exercises.map((item) => {
    const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
    const range = parseRepsRange(item.targetReps);
    if (!def || !range || !isCompoundExercise(def)) return item;
    adjusted++;
    if (day === "fuerza") {
      const lo = clamp(range.min - 2, 3, 30);
      return {
        ...item,
        targetReps: `${lo}-${range.min + 1}`,
        targetRir: Math.min(4, (item.targetRir ?? 2) + 1),
        restSeconds: item.restSeconds + 30,
      };
    }
    // potencia: reps altas, RIR bajo, descansos cortos (mín 45s).
    return {
      ...item,
      targetReps: `${Math.max(1, range.max - 1)}-${range.max + 3}`,
      targetRir: Math.max(0, (item.targetRir ?? 2) - 1),
      restSeconds: Math.max(45, item.restSeconds - 15),
    };
  });

  if (adjusted === 0) return { routine, dupDay: null, adjusted: 0 };
  return {
    routine: {
      ...routine,
      exercises,
      dupDay: day,
      dupAdjusted: adjusted,
      description: `${routine.description} ${DUP_DAY_LABEL[day]} en ${adjusted} compuesto(s) por rotación automática.`,
    },
    dupDay: day,
    adjusted,
  };
}
