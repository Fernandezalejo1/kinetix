// =============================================================
// KINETIX — Utilidades seguras de localStorage.
// W1: safeParse con type guards (no confía en el contenido guardado).
// W2: safeSet con try/catch (cuota de ~5 MB puede fallar).
// =============================================================

export function safeParse<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean, sanitize?: (value: unknown) => unknown | undefined): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (isValid && !isValid(parsed)) {
      // Saneamiento: conserva las entradas válidas y descarta solo las
      // corruptas. Sin esto, una sola entrada dañada borraría TODO el
      // historial del usuario.
      if (sanitize) {
        const cleaned = sanitize(parsed);
        if (cleaned !== undefined) {
          try {
            localStorage.setItem(key, JSON.stringify(cleaned));
          } catch {
            /* se mantiene en memoria aunque no se pueda persistir */
          }
          return cleaned as T;
        }
      }
      localStorage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

export function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Cuota excedida o almacenamiento bloqueado: no romper la app, pero
    // avisar (las escrituras silenciosas hacían creer que se guardó).
    try {
      window.dispatchEvent(new CustomEvent("kinetix-storage-error", { detail: { key } }));
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const isArray = (v: unknown): boolean => Array.isArray(v);
export const isArrayOrNull = (v: unknown): boolean => v === null || Array.isArray(v);
export const isPlainObject = (v: unknown): boolean =>
  v !== null && typeof v === "object" && !Array.isArray(v);
export const isString = (v: unknown): boolean => typeof v === "string";
export const isBoolean = (v: unknown): boolean => typeof v === "boolean";

/** Fecha ISO de día local (YYYY-MM-DD) válida. Las fechas corruptas (ej.
 *  "2020-13-40") se rechazan, no solo los tipos malos. */
export const isDateKey = (v: unknown): boolean => {
  if (typeof v !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(v);
  return !Number.isNaN(t) && new Date(v).toISOString().slice(0, 10) === v;
};

/** Número finito y no negativo (admite decimales). */
export const isNonNegativeNum = (v: unknown): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Número entero y no negativo (counts de sets, reps, etc.). */
export const isNonNegativeInt = (v: unknown): boolean =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

/** String id no vacío (ids de ejercicios/entrenamientos/mediciones). */
export const isId = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

/** Array cuyos elementos pasan la guard; filtra null/undef y valida forma. */
const isArrayOf =
  (guard: (v: unknown) => boolean) =>
  (v: unknown): boolean =>
    Array.isArray(v) && (v as unknown[]).every(guard);

/** Sanea un array: conserva solo las entradas que pasan la guard. Devuelve
 *  undefined si el valor no es un array (imposible de recuperar). */
const sanitizeArrayOf =
  <T>(guard: (v: unknown) => boolean) =>
  (value: unknown): T[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const cleaned = (value as unknown[]).filter(guard);
    if (cleaned.length === value.length) return value as T[];
    return cleaned as T[];
  };

const isWorkoutExercise = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.exerciseId) &&
    isNonNegativeInt(o.sets) &&
    (o.reps === undefined || typeof o.reps === "string")
  );
};

const isCompletedWorkout = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.id) &&
    isDateKey(o.date) &&
    typeof o.routineName === "string" &&
    o.routineName.length > 0 &&
    isNonNegativeNum(o.durationSeconds) &&
    isNonNegativeNum(o.totalVolumeKg) &&
    isNonNegativeInt(o.totalSets) &&
    Array.isArray(o.exercises) &&
    (o.exercises as unknown[]).every(isWorkoutExercise)
  );
};

const isExerciseHistoryEntry = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.exerciseId) &&
    isDateKey(o.date) &&
    isNonNegativeNum(o.weight) &&
    isNonNegativeInt(o.sets) &&
    isArrayOf(isNonNegativeNum)(o.reps) &&
    isNonNegativeNum(o.volumeKg)
  );
};

const isBodyMetric = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return isId(o.id) && isDateKey(o.date) && isNonNegativeNum(o.weightKg);
};

const isPersonalRecord = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.exerciseId) &&
    isNonNegativeNum(o.value) &&
    isDateKey(o.date) &&
    (o.type === undefined || typeof o.type === "string")
  );
};

const isRoutine = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return isId(o.id) && typeof o.name === "string" && o.name.length > 0;
};

const isMealItem = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.id) &&
    typeof o.dishName === "string" &&
    (o.calories === undefined || isNonNegativeNum(o.calories)) &&
    (o.protein === undefined || isNonNegativeNum(o.protein))
  );
};

const isNutritionLog = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isDateKey(o.date) &&
    Array.isArray(o.meals) &&
    (o.meals as unknown[]).every(isMealItem) &&
    (o.waterMl === undefined || isNonNegativeNum(o.waterMl)) &&
    (o.calorieTarget === undefined || isNonNegativeNum(o.calorieTarget))
  );
};

const isNutritionProfile = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  const ageValid =
    o.age === undefined ||
    (typeof o.age === "number" && Number.isFinite(o.age) && o.age >= 0 && o.age < 130);
  const heightValid =
    o.heightCm === undefined ||
    (typeof o.heightCm === "number" &&
      Number.isFinite(o.heightCm) &&
      o.heightCm >= 0 &&
      o.heightCm <= 300);
  return ageValid && heightValid;
};

const isTimestampEntry = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return isDateKey(o.date) || isNonNegativeNum(o.timestamp) || isId(o.id);
};

/** Type guards por clave para los datos persistidos de KINETIX.
 *  Se usan en safeParse al cargar (W1) y al validar backups (M1).
 *  Validan CONTENIDO (fechas, números, referencias) y no solo el tipo
 *  superficial: una lista de objetos corruptos se rechaza completa. */
export const VALIDATORS: Record<string, (v: unknown) => boolean> = {
  kinetix_active_workout: isPlainObject,
  kinetix_workout_history: isArrayOf(isCompletedWorkout),
  kinetix_exercise_history: isArrayOf(isExerciseHistoryEntry),
  kinetix_body_metrics: isArrayOf(isBodyMetric),
  kinetix_prs: isArrayOf(isPersonalRecord),
  kinetix_custom_routines: isArrayOf(isRoutine),
  kinetix_nutrition_log: isNutritionLog,
  kinetix_nutrition_profile: isNutritionProfile,
  kinetix_nutrition_goal: (v) => typeof v === "string" && v.length > 0,
  kinetix_weight_unit: (v) => v === "kg" || v === "lbs",
  kinetix_sound_enabled: isBoolean,
  kinetix_auto_start_timer: isBoolean,
  kinetix_health_steps: isPlainObject,
  kinetix_steps_config: isPlainObject,
  kinetix_goal_phase: (v) =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (v as { id?: unknown }).id != null,
  kinetix_sleep_log: isArrayOf(isTimestampEntry),
  kinetix_readiness: isArrayOf(isTimestampEntry),
  kinetix_cardio_log: isArrayOf(isTimestampEntry),
  kinetix_nutrition_history: isArrayOf(isNutritionLog),
};

/** Sanitizadores por clave: si una clave validada falla, estos limpian el
 *  contenido conservando las entradas válidas en lugar de descartar TODO.
 *  Se pasa a safeParse como 4º argumento en las cargas de historiales. */
export const SANITIZERS: Record<string, (v: unknown) => unknown[] | undefined> = {
  kinetix_workout_history: sanitizeArrayOf(isCompletedWorkout),
  kinetix_exercise_history: sanitizeArrayOf(isExerciseHistoryEntry),
  kinetix_body_metrics: sanitizeArrayOf(isBodyMetric),
  kinetix_prs: sanitizeArrayOf(isPersonalRecord),
  kinetix_custom_routines: sanitizeArrayOf(isRoutine),
  kinetix_nutrition_history: sanitizeArrayOf(isNutritionLog),
  kinetix_sleep_log: sanitizeArrayOf(isTimestampEntry),
  kinetix_readiness: sanitizeArrayOf(isTimestampEntry),
  kinetix_cardio_log: sanitizeArrayOf(isTimestampEntry),
};