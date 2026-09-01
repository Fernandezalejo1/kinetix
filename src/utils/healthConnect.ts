// =============================================================
// KINETIX — Servicio Health Connect.
// Aísla la API nativa de @capgo/capacitor-health detrás de una
// interfaz estable. En la web/PWA cae en modo manual (sin datos
// nativos) para que la feature sea usable y testeable.
// =============================================================

import { Capacitor } from "@capacitor/core";
import { Health, HealthDataType } from "@capgo/capacitor-health";

export interface StepsStatus {
  available: boolean;
  authorized: boolean;
  native: boolean;
}

export interface StepsOfDay {
  steps: number;
  asOf: string;
  source: "healthconnect" | "manual" | null;
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

/**
 * Lee las calorías y pasos de HOY (desde medianoche local hasta ahora).
 * En fallback web devuelve step 0 / no autorizado, indicando que use manual.
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
    // queryAggregated agrupa por día; tomamos la suma del primer bucket (o el que corresponda a hoy).
    const todayBucket = res.samples.find((s) => {
      const d = new Date(s.startDate).toDateString();
      return d === now.toDateString();
    });
    const steps = Math.round(todayBucket?.value ?? 0);
    return { steps, asOf: new Date().toISOString(), source: "healthconnect" };
  } catch {
    return { steps: 0, asOf: new Date().toISOString(), source: null };
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

interface StoredDay {
  date: string;
  steps: number;
  source: StepsOfDay["source"];
  asOf: string;
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
  return new Date().toISOString().split("T")[0];
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