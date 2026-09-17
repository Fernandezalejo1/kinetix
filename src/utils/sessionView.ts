/**
 * Estado de plegado de los ejercicios en el entrenamiento activo.
 *
 * Regla: el ejercicio activo muestra sus controles completos; los demás
 * quedan en resumen (cabecera) hasta que el usuario los despliega tocando.
 * Los ejercicios de tiempo/cardio siempre están expandidos (no se pliegan).
 * Funciones puras para probar el recorrido plegar/desplegar.
 */

export interface ExerciseFoldState {
  /** Id del ejercicio expandido manualmente (override del activo). null = ninguno. */
  overrideId: string | null;
  /** Ids plegados explícitamente por el usuario. */
  collapsed: Record<string, boolean>;
}

export function isExerciseExpanded(opts: {
  exerciseId: string;
  isTimed: boolean;
  isActive: boolean;
  fold: ExerciseFoldState;
}): boolean {
  const { exerciseId, isTimed, isActive, fold } = opts;
  if (isTimed) return true;
  if (fold.overrideId === exerciseId) return true;
  return isActive && !fold.collapsed[exerciseId];
}

/**
 * Alterna el plegado de un ejercicio. Los de tiempo/cardio no se tocan.
 * Devuelve el próximo estado (plegado final, para afirmar en tests/UI).
 */
export function toggleExerciseFold(
  fold: ExerciseFoldState,
  exerciseId: string,
  opts: { isTimed: boolean; isActive: boolean }
): { next: ExerciseFoldState; expanded: boolean } {
  if (opts.isTimed) return { next: fold, expanded: true };
  const expanded = isExerciseExpanded({
    exerciseId,
    isTimed: false,
    isActive: opts.isActive,
    fold,
  });
  if (expanded) {
    const next: ExerciseFoldState = {
      overrideId: fold.overrideId === exerciseId ? null : fold.overrideId,
      collapsed: { ...fold.collapsed, [exerciseId]: true },
    };
    return { next, expanded: false };
  }
  const next: ExerciseFoldState = {
    overrideId: exerciseId,
    collapsed: { ...fold.collapsed, [exerciseId]: false },
  };
  return { next, expanded: true };
}
