import type { GoalPhase, NutritionGoal } from "../types";

/**
 * Fuente única de verdad entre el objetivo de entrenamiento (fase en Perfil)
 * y la estrategia nutricional (Nutrición).
 *
 * El bug que corrige: la fase decía "Definición/Déficit" mientras Nutrición
 * mostraba "Volumen Magro/superávit" porque cada pantalla usaba su propio
 * valor por defecto independiente. Ahora la estrategia nutricional deriva de
 * la fase salvo que el usuario la haya personalizado explícitamente en
 * Nutrición ("Cambiar estrategia nutricional"), caso en el que su elección
 * gana y no se toca.
 */

export type StorageReader = (key: string) => string | null;

const CUSTOM_FLAG_KEY = "kinetix_nutrition_goal_custom";
const PHASE_KEY = "kinetix_goal_phase";

/** Fase de entrenamiento → estrategia nutricional equivalente. */
export function phaseToNutritionGoal(phase: GoalPhase): NutritionGoal {
  switch (phase) {
    case "maintenance":
      return "maintenance";
    case "lean_bulk":
      return "lean_bulk";
    case "cut":
    default:
      return "cut";
  }
}

/** Lee la fase de entrenamiento guardada (defensivo: null si no hay/dato roto). */
export function readStoredTrainingPhase(read: StorageReader): GoalPhase | null {
  try {
    const raw = read(PHASE_KEY);
    if (!raw) return null;
    const id = (JSON.parse(raw) as { id?: unknown })?.id;
    return id === "cut" || id === "maintenance" || id === "lean_bulk" ? id : null;
  } catch {
    return null;
  }
}

/** ¿El usuario personalizó la estrategia en Nutrición? Si no, manda la fase. */
export function isNutritionGoalCustomized(read: StorageReader): boolean {
  try {
    return read(CUSTOM_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Estrategia por defecto: la que corresponde a la fase (o `cut` si no hay fase). */
export function resolveDefaultNutritionGoal(read: StorageReader): NutritionGoal {
  return phaseToNutritionGoal(readStoredTrainingPhase(read) ?? "cut");
}

/** Marca la elección explícita del usuario (no la pisa el cambio de fase). */
export function markNutritionGoalCustomized(): void {
  try {
    localStorage.setItem(CUSTOM_FLAG_KEY, "1");
  } catch {
    /* almacenamiento no disponible */
  }
}
