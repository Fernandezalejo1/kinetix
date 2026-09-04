// =============================================================
// KINETIX — Utilidades seguras de localStorage.
// W1: safeParse con type guards (no confía en el contenido guardado).
// W2: safeSet con try/catch (cuota de ~5 MB puede fallar).
// =============================================================

export function safeParse<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (isValid && !isValid(parsed)) {
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
    // Cuota excedida o almacenamiento bloqueado: no romper la app.
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

/** Type guards por clave para los datos persistidos de KINETIX.
 *  Se usan en safeParse al cargar (W1) y al validar backups (M1). */
export const VALIDATORS: Record<string, (v: unknown) => boolean> = {
  kinetix_active_workout: isPlainObject,
  kinetix_workout_history: isArray,
  kinetix_exercise_history: isArray,
  kinetix_body_metrics: isArray,
  kinetix_prs: isArray,
  kinetix_custom_routines: isArray,
  kinetix_nutrition_log: isPlainObject,
  kinetix_nutrition_profile: isPlainObject,
  kinetix_nutrition_goal: isString,
  kinetix_weight_unit: (v) => v === "kg" || v === "lbs",
  kinetix_sound_enabled: isBoolean,
  kinetix_auto_start_timer: isBoolean,
  kinetix_health_steps: isPlainObject,
  kinetix_steps_config: isPlainObject,
};