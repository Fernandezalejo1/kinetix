// =============================================================
// KINETIX — Adaptación de rutinas al equipamiento disponible.
// Un usuario de "solo casa" no debe recibir el mismo programa que
// uno con gimnasio completo. Las rutinas preconstruidas asumen
// barras/poleas/máquinas; esta utilidad sustituye cada ejercicio
// que no se puede hacer por un equivalente del catálogo que SÍ se
// pueda, priorizando misma categoría y músculo primario en común.
// Las sustituciones son DETERMINISTAS (mismo perfil → mismo plan).
// =============================================================

import { EXERCISES_DATABASE } from "../data/exercisesData";
import { EquipmentAccess, Exercise, Routine } from "../types";

/** Equipamiento permitido por nivel de acceso. "home" = peso corporal,
 *  "basic" = mancuernas + banco, "gym" = todo el gimnasio. */
export const EQUIPMENT_ALLOWED: Record<EquipmentAccess, ReadonlySet<Exercise["equipment"]>> = {
  home: new Set(["bodyweight"]),
  basic: new Set(["bodyweight", "dumbbell"]),
  gym: new Set(["bodyweight", "dumbbell", "barbell", "cable", "machine", "smith"]),
};

/** Alternativa del catálogo que el usuario puede hacer. Prioriza la misma
 *  categoría + al menos un músculo primario en común (y si coincide el
 *  primer músculo primario, mejor); si no hay, cae a CUALQUIER ejercicio
 *  accesible de la misma categoría (ej. elevación lateral sin banda →
 *  otro push accesible). Devuelve el mismo ejercicio si ya es accesible
 *  o si no existe equivalente razonable. */
export function findAlternativeExercise(
  exercise: Exercise,
  level: EquipmentAccess
): Exercise {
  const allowed = EQUIPMENT_ALLOWED[level];
  if (allowed.has(exercise.equipment)) return exercise;

  const bySameMuscle = EXERCISES_DATABASE.filter(
    (e) =>
      allowed.has(e.equipment) &&
      e.category === exercise.category &&
      e.primaryMuscles.some((m) => exercise.primaryMuscles.includes(m))
  );
  const fallbackByCategory = EXERCISES_DATABASE.filter(
    (e) => allowed.has(e.equipment) && e.category === exercise.category
  );

  const pool = bySameMuscle.length > 0 ? bySameMuscle : fallbackByCategory;
  if (pool.length === 0) return exercise;

  const firstPrimary = exercise.primaryMuscles[0];
  const samePrimary = pool.filter((e) => e.primaryMuscles.includes(firstPrimary));
  const finalPool = samePrimary.length > 0 ? samePrimary : pool;
  finalPool.sort((a, b) => a.id.localeCompare(b.id));
  return finalPool[0];
}

/** Devuelve true si la rutina quedó idéntica (nada que adaptar) o sin
 *  ejercicios inaccesibles. Útil para decidir si mostrar un aviso. */
export function routineNeedsAdaptation(routine: Routine, level: EquipmentAccess): boolean {
  const allowed = EQUIPMENT_ALLOWED[level];
  return routine.exercises.some((item) => {
    const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
    return !!def && !allowed.has(def.equipment);
  });
}

/** Copia de la rutina con los exerciseId inaccesibles sustituidos por un
 *  equivalente accesible. Conserva todo lo demás (sets, reps, RIR, tempo,
 *  descansos, ids de rutina/superserie). */
export function adaptRoutineToEquipment(routine: Routine, level: EquipmentAccess): Routine {
  const allowed = EQUIPMENT_ALLOWED[level];
  const needsWork = routine.exercises.some((item) => {
    const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
    return !!def && !allowed.has(def.equipment);
  });
  if (!needsWork) return routine;

  return {
    ...routine,
    exercises: routine.exercises.map((item) => {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
      if (!def || allowed.has(def.equipment)) return item;
      const alt = findAlternativeExercise(def, level);
      if (alt.id === def.id) return item;
      return { ...item, exerciseId: alt.id };
    }),
  };
}