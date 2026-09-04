// =============================================================
// KINETIX — Servicio Health Connect.
// Aísla la API nativa de @capgo/capacitor-health detrás de una
// interfaz estable. En la web/PWA cae en modo manual (sin datos
// nativos) para que la feature sea usable y testeable.
// =============================================================

import { Capacitor } from "@capacitor/core";
import { Health, HealthDataType } from "@capgo/capacitor-health";
import { localDateKey } from "./dateUtils";

export interface StepsStatus {
  available: boolean;
  authorized: boolean;
  native: boolean;
}

export interface StepsSourceTotal {
  /** App/fuente que registró los pasos (ej. "Samsung Health", "Zepp Life"). */
  name: string;
  steps: number;
}

export interface StepsOfDay {
  steps: number;
  asOf: string;
  source: "healthconnect" | "manual" | null;
  /** Desglose por fuente (solo Health Connect). */
  sources?: StepsSourceTotal[];
}

const READ_TYPES: HealthDataType[] = ["steps", "totalCalories"];

/**
 * ¿Es plataforma nativa (APK Capacitor)?
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let availabilityKnown: StepsStatus | undefined;

/**
 * Estado de Health Connect:
 *  - En APK Capacitor: consulta real a Health Connect/HealthKit.
 *  - En web (PWA/PC): siempre "no disponible" → modo manual.
 */
export async function getHealthStatus(): Promise<StepsStatus> {
  if (!isNativePlatform()) {
    return { available: false, authorized: false, native: false };
  }
  try {
    const res = await Health.isAvailable();
    if (!availabilityKnown) availabilityKnown = { available: res.available, authorized: false, native: true };
    if (res.available) {
      const auth = await Health.checkAuthorization({ read: READ_TYPES });
      availabilityKnown = { available: true, authorized: auth.readAuthorized.length > 0, native: true };
    }
    return availabilityKnown;
  } catch {
    return { available: false, authorized: false, native: true };
  }
}

/**
 * Pide los permisos de lectura (pasos + calorías activas).
 * Devuelve true si el usuario autorizó.
 */
export async function requestHealthAuthorization(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const res = await Health.requestAuthorization({
      read: READ_TYPES,
      requestHistoryAccess: true,
    });
    return res.readAuthorized.length > 0 && res.readAuthorized.includes("steps");
  } catch {
    return false;
  }
}

type AggSample = { value?: number | null; startDate?: string; endDate?: string; sourceName?: string | null };

/**
 * Suma samples de un queryAggregated acotando al rango [rangeStartMs, rangeEndMs).
 * Se queda con los samples que se SOLAPAN con el rango (no exige que arranquen
 * dentro: los buckets diarios pueden alinearse a UTC y empezar antes de la
 * medianoche local; excluirlos daría 0). Además arma el desglose por fuente
 * para que el usuario vea QUÉ app aportó cada parte del total.
 */
function summarizeSamples(
  samples: AggSample[] | undefined,
  rangeStartMs: number,
  rangeEndMs: number
): { steps: number; sources: StepsSourceTotal[] } {
  const bySource = new Map<string, number>();
  let total = 0;
  for (const s of samples ?? []) {
    const v = s.value || 0;
    if (!(v > 0)) continue;
    const sStart = s.startDate ? Date.parse(s.startDate) : NaN;
    const sEnd = s.endDate ? Date.parse(s.endDate) : NaN;
    // Sin fechas o con solapamiento con el rango → contar. Solo se descarta
    // lo que está claramente fuera del rango pedido.
    if (Number.isFinite(sStart) && Number.isFinite(sEnd) && (sEnd <= rangeStartMs || sStart >= rangeEndMs)) {
      continue;
    }
    total += v;
    const name = (s.sourceName || "Teléfono").trim() || "Teléfono";
    bySource.set(name, (bySource.get(name) ?? 0) + v);
  }
  const sources = [...bySource.entries()]
    .map(([name, steps]) => ({ name, steps: Math.round(steps) }))
    .sort((a, b) => b.steps - a.steps);
  return { steps: Math.round(total), sources };
}

/**
 * Lee las calorías y pasos de HOY (desde medianoche local hasta ahora).
 * En fallback web devuelve step 0 / no autorizado, indicando que use manual.
 *
 * NOTA: Health Connect solo ve lo que cada app (Samsung Health, Zepp, etc.)
 * sincronizó con él. Si el reloj o Samsung muestran más pasos, es porque esa
 * fuente aún no volcó a Health Connect (sincronización con demora o permiso
 * apagado en la app de origen), no un error de lectura.
 */
export async function readTodaySteps(): Promise<StepsOfDay> {
  if (!isNativePlatform()) {
    return { steps: 0, asOf: new Date().toISOString(), source: null };
  }
  try {
    const now = new Date();
    // Medianoche local de hoy.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const res = await Health.queryAggregated({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    const { steps, sources } = summarizeSamples(
      res.samples as AggSample[] | undefined,
      start.getTime(),
      now.getTime()
    );
    return { steps, asOf: new Date().toISOString(), source: "healthconnect", sources };
  } catch {
    return { steps: 0, asOf: new Date().toISOString(), source: null };
  }
}

/**
 * Lee los pasos de UN DÍA ESPECÍFICO desde Health Connect.
 * Útil para el reto 21 días (verificar días históricos).
 * En fallback web devuelve 0.
 */
export async function readStepsForDate(date: Date): Promise<number> {
  if (!isNativePlatform()) return 0;
  try {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const res = await Health.queryAggregated({
      dataType: "steps",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucket: "day",
      aggregation: "sum",
    });
    return summarizeSamples(res.samples as AggSample[] | undefined, start.getTime(), end.getTime()).steps;
  } catch {
    return 0;
  }
}

/**
 * Abre la pantalla de ajustes de Health Connect (Android).
 * No-op en web.
 */
export async function openHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Health.openHealthConnectSettings();
  } catch {
    /* noop */
  }
}

// -------------------------------------------------------------
// Persistencia del estado de pasos (localStorage, funciona web + nativo).
// -------------------------------------------------------------

const STEPS_KEY = "kinetix_health_steps";
const CONFIG_KEY = "kinetix_steps_config";

export interface StepsConfig {
  stepGoal: number;
  enabled: boolean;
  autoApply: boolean;
  /** `true` si el usuario confirmó que su actividad la registra Health Connect. */
  trainedToday: boolean;
}

export function defaultStepsConfig(): StepsConfig {
  return { stepGoal: 10000, enabled: false, autoApply: true, trainedToday: false };
}

export function readStepsConfig(): StepsConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultStepsConfig(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultStepsConfig();
}

export function saveStepsConfig(cfg: StepsConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    emitStepsChanged();
  } catch {
    /* ignore */
  }
}

export interface StoredDay {
  date: string;
  steps: number;
  source: StepsOfDay["source"];
  asOf: string;
  /** Desglose por fuente de la última lectura de Health Connect. */
  sources?: StepsSourceTotal[];
  /** Targets BASE del día (sin ajuste). Se congelan al primer ajuste para
   *  que recalcular con más pasos revierta correctamente (idempotente). */
  base?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  adjustment: {
    caloriesDelta: number;
    bandLabel: string;
    message: string;
  } | null;
}

function todayKey(): string {
  // Clave LOCAL (no UTC): coincide con el rango local que usamos al
  // leer Health Connect y evita descartar datos cerca de la medianoche.
  return localDateKey();
}

export function readStoredDay(): StoredDay | null {
  try {
    const raw = localStorage.getItem(STEPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDay;
    if (parsed.date !== todayKey()) return null; // día viejo → descartar
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredDay(day: StoredDay): void {
  try {
    localStorage.setItem(STEPS_KEY, JSON.stringify(day));
    emitStepsChanged();
  } catch {
    /* ignore */
  }
}

export function clearStoredDay(): void {
  try {
    localStorage.removeItem(STEPS_KEY);
    emitStepsChanged();
  } catch {
    /* ignore */
  }
}

// -------------------------------------------------------------
// Mini event bus para sincronizar StepsPanel y StepsEngine vía
// el mismo evento window (funciona web + nativo).
// -------------------------------------------------------------
const STEPS_EVENT = "kinetix-steps-changed";

function emitStepsChanged(): void {
  try {
    window.dispatchEvent(new Event(STEPS_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeStepsChanged(cb: () => void): () => void {
  try {
    window.addEventListener(STEPS_EVENT, cb);
    return () => window.removeEventListener(STEPS_EVENT, cb);
  } catch {
    return () => {};
  }
}