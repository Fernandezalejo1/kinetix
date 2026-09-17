import { EXERCISES_DATABASE } from "./exercisesData";

/**
 * Ejercicios "básicos" (compuestos pesados) cuyo 1RM se muestra en el
 * Perfil con su fecha, para ver cuánto tardó en subir cada PR.
 *
 * Es una lista curada data-driven: acá se decide qué entra y qué no, sin
 * lógica hardcodeada en la UI. Cada id debe existir en EXERCISES_DATABASE.
 */
export const BASIC_LIFT_IDS: string[] = [
  "barbell-bench-press",
  "barbell-incline-bench-press",
  "standing-military-press",
  "barbell-bent-over-row",
  "neutral-grip-lat-pulldown",
  "weighted-chin-up",
  "barbell-hack-or-squat",
  "trap-bar-deadlift",
  "romanian-deadlift",
  "barbell-hip-thrust",
  "bulgarian-split-squat",
  "seated-cable-row",
];

/** Los básicos existentes en la base de ejercicios, en orden de la lista. */
export function getBasicLifts() {
  const byId = new Map(EXERCISES_DATABASE.map((ex) => [ex.id, ex]));
  return BASIC_LIFT_IDS.map((id) => byId.get(id)).filter(
    (e): e is NonNullable<typeof e> => Boolean(e)
  );
}