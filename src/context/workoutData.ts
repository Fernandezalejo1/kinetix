// Datos de estado inicial, tope de carbos, migraciones de datos semilla y
// helpers de archivo/capacidad del contexto de entrenamiento. Extraído de
// WorkoutContext.tsx para mantener ese archivo enfocado en el proveedor.

import { CompletedWorkout, NutritionLog, BodyMetricEntry, PersonalRecord, ExerciseHistoryEntry } from "../types";
import { localDateKey } from "../utils/dateUtils";
import { readVaultAwareRaw, writeVaultAwareRaw, safeParse, safeSet, VALIDATORS } from "../utils/storage";

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
      const raw = readVaultAwareRaw(key);
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
        writeVaultAwareRaw(key, JSON.stringify(clean));
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
 *  Mantiene las entradas más recientes (los arrays se prependen).
 *  Cuando recorta, emite un evento para que la UI informe al usuario
 *  (el recorte nunca debe pasar silencioso). */
export const RETENTION_POLICY = {
  workoutHistory: 1500, // sesiones completadas
  exerciseHistory: 8000, // registros por ejercicio
  bodyMetrics: 4000, // mediciones corporales
  nutritionDays: 365, // días de nutrición archivados
} as const;

/** Dispara el evento de recorte de retención con la cantidad de entradas
 *  descartadas, para que la interfaz pueda avisar de forma visible. */
function notifyRetentionTrim(key: string, dropped: number): void {
  try {
    window.dispatchEvent(
      new CustomEvent("kinetix-retention-trim", { detail: { key, dropped } })
    );
  } catch {
    /* sin listener: no romper la escritura */
  }
}

export function capForStorage<T>(arr: T[], max: number): T[] {
  if (!Array.isArray(arr) || arr.length <= max) return arr;
  notifyRetentionTrim("arr", arr.length - max);
  return arr.slice(0, max);
}

// Migración silenciosa: recorta historiales ya existentes que superen el tope.
export function trimLargeColumns(): void {
  try {
    for (const [key, max] of [
      ["kinetix_workout_history", RETENTION_POLICY.workoutHistory],
      ["kinetix_exercise_history", RETENTION_POLICY.exerciseHistory],
      ["kinetix_body_metrics", RETENTION_POLICY.bodyMetrics],
    ] as const) {
      // Con vault activo el recorte lo hace el propio pipeline (memoria), y
      // tocar el envelope aquí sería reescribir ciphertext sobre ciphertext.
      const raw = readVaultAwareRaw(key);
      if (!raw) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Array.isArray(arr) && arr.length > max) {
        const trimmed = arr.slice(0, max);
        writeVaultAwareRaw(key, JSON.stringify(trimmed));
        notifyRetentionTrim(key, arr.length - max);
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
    const list = safeParse<NutritionLog[]>("kinetix_nutrition_history", [], (v) => Array.isArray(v));
    if (!Array.isArray(list)) return;
    if (list.some((d) => d && d.date === log.date)) return; // idempotente
    list.unshift(log);
    const trimmed = list.slice(0, RETENTION_POLICY.nutritionDays);
    if (trimmed.length < list.length) {
      notifyRetentionTrim("kinetix_nutrition_history", list.length - trimmed.length);
    }
    safeSet("kinetix_nutrition_history", trimmed);
  } catch {
    /* cuota llena o corrupto: se pierde el archivo de ese día, no la app */
  }
}