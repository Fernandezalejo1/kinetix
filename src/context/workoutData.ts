// Datos de estado inicial, tope de carbos, migraciones de datos semilla y
// helpers de archivo/capacidad del contexto de entrenamiento. Extraído de
// WorkoutContext.tsx para mantener ese archivo enfocado en el proveedor.

import { CompletedWorkout, NutritionLog, BodyMetricEntry, PersonalRecord, ExerciseHistoryEntry } from "../types";
import { localDateKey } from "../utils/dateUtils";

// Sin datos semilla: el historial empieza vacío y solo muestra sesiones
// reales del usuario. Nunca se inventan entrenamientos, PRs ni medidas.
export const INITIAL_WORKOUT_HISTORY: CompletedWorkout[] = [];

export const INITIAL_NUTRITION: NutritionLog = {
  date: localDateKey(),
  calorieTarget: 2300,
  proteinTarget: 142,
  carbsTarget: 25,
  fatsTarget: 180,
  waterMl: 0,
  sodiumMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  meals: [],
};

/** Tope de carbos diarios: la app es 100% keto/cetogénica. Ningún objetivo
 *  (plan, edición manual o ajuste por pasos) puede superarlo. */
export const KETO_CARB_CAP = 35;

export const INITIAL_BODY_METRICS: BodyMetricEntry[] = [];

export const INITIAL_PRS: PersonalRecord[] = [];

export const INITIAL_EXERCISE_HISTORY: ExerciseHistoryEntry[] = [];

// Migración única: elimina SOLO los datos semilla exactos de versiones
// previas (ids fijos hist-1..3, bm-1..3, pr-1..4, eh-1..4, wex-1..7, s-1..22).
// Los datos reales del usuario usan ids con timestamp y se conservan intactos.
export const SEED_IDS = new Set<string>([
  "hist-1", "hist-2", "hist-3",
  "bm-1", "bm-2", "bm-3",
  "pr-1", "pr-2", "pr-3", "pr-4",
  "eh-1", "eh-2", "eh-3", "eh-4",
  "wex-1", "wex-2", "wex-3", "wex-4", "wex-5", "wex-6", "wex-7",
  ...Array.from({ length: 22 }, (_, i) => `s-${i + 1}`),
]);

export function scrubSeedData(): void {
  try {
    const scrubArray = (key: string) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch {
        return;
      }
      if (!Array.isArray(arr)) return;
      const clean = arr.filter(
        (it) =>
          !(
            it &&
            typeof it === "object" &&
            typeof (it as { id?: unknown }).id === "string" &&
            SEED_IDS.has((it as { id: string }).id)
          )
      );
      if (clean.length !== arr.length) {
        localStorage.setItem(key, JSON.stringify(clean));
      }
    };
    scrubArray("kinetix_workout_history");
    scrubArray("kinetix_body_metrics");
    scrubArray("kinetix_prs");
    scrubArray("kinetix_exercise_history");
  } catch {
    /* ignorar */
  }
}

/** Limita un historial en localStorage para no agotar la cuota (~5 MB).
 *  Mantiene las entradas más recientes (los arrays se prependen). */
export function capForStorage<T>(arr: T[], max: number): T[] {
  if (!Array.isArray(arr) || arr.length <= max) return arr;
  return arr.slice(0, max);
}

// Migración silenciosa: recorta historiales ya existentes que superen el tope.
export function trimLargeColumns(): void {
  try {
    for (const [key, max] of [
      ["kinetix_workout_history", 400],
      ["kinetix_exercise_history", 2000],
      ["kinetix_body_metrics", 1000],
    ] as const) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Array.isArray(arr) && arr.length > max) {
        localStorage.setItem(key, JSON.stringify(arr.slice(0, max)));
      }
    }
  } catch {
    /* ignorar */
  }
}

// -------------------------------------------------------------------
// FIX (prioridad alta): ARCHIVO DIARIO de nutrición.
// Antes el log nutricional se REEMPLAZABA cada día: solo existía "hoy", y era
// imposible mostrar adherencia, promedios ni tendencias. El día cerrado se
// archiva en kinetix_nutrition_history (tope 120 días para no agotar cuota).
// -------------------------------------------------------------------
export function archiveDayIfStale(log: NutritionLog | null, today: string): void {
  if (!log || log.date === today) return;
  const dayHasData = (log.meals?.length ?? 0) > 0 || (log.waterMl ?? 0) > 0;
  if (!dayHasData) return; // día vacío: no archiva ruido
  try {
    const raw = localStorage.getItem("kinetix_nutrition_history");
    const list: NutritionLog[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    if (list.some((d) => d && d.date === log.date)) return; // idempotente
    list.unshift(log);
    localStorage.setItem("kinetix_nutrition_history", JSON.stringify(list.slice(0, 120)));
  } catch {
    /* cuota llena o corrupto: se pierde el archivo de ese día, no la app */
  }
}