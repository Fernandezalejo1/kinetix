// =============================================================
// KINETIX — Servicio Health Connect.
// Aísla la API nativa de @capgo/capacitor-health detrás de una
// interfaz estable. En la web/PWA cae en modo manual (sin datos
// nativos) para que la feature sea usable y testeable.
// =============================================================

import { Capacitor } from "@capacitor/core";
import { Health, HealthDataType } from "@capgo/capacitor-health";
import { localDateKey } from "./dateUtils";
import { readVaultAwareRaw, writeVaultAwareRaw, safeRemove } from "./storage";

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
  /** Fuente usada para el total (la más alta, anti-duplicado). */
  countedSource?: string | null;
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
 * Totaliza samples de un queryAggregated acotando al rango [rangeStartMs, rangeEndMs).
 * Se queda con los samples que se SOLAPAN con el rango (no exige que arranquen
 * dentro: los buckets diarios pueden alinearse a UTC y empezar antes de la
 * medianoche local; excluirlos daría 0).
 *
 * ANTI-DUPLICADO: cada fuente (reloj, Samsung Health, teléfono) intenta contar
 * el DÍA COMPLETO por su cuenta. Sumarlas duplicaría los mismos pasos físicos.
 * Por eso el total del día es el MÁXIMO entre fuentes (la que más capturó es la
 * más cercana a la realidad, igual que hacen Samsung Health y Google Fit), y se
 * devuelve el desglose para transparencia.
 */
function summarizeSamples(
  samples: AggSample[] | undefined,
  rangeStartMs: number,
  rangeEndMs: number
): { steps: number; sources: StepsSourceTotal[]; countedSource: string | null } {
  const bySource = new Map<string, number>();
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
    const name = (s.sourceName || "Teléfono").trim() || "Teléfono";
    bySource.set(name, (bySource.get(name) ?? 0) + v);
  }
  const sources = [...bySource.entries()]
    .map(([name, steps]) => ({ name, steps: Math.round(steps) }))
    .sort((a, b) => b.steps - a.steps);
  const best = sources[0];
  return { steps: best ? best.steps : 0, sources, countedSource: best ? best.name : null };
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
    const { steps, sources, countedSource } = summarizeSamples(
      res.samples as AggSample[] | undefined,
      start.getTime(),
      now.getTime()
    );
    return { steps, asOf: new Date().toISOString(), source: "healthconnect", sources, countedSource };
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
  /** Fuente usada para el total (la más alta, anti-duplicado). */
  countedSource?: string | null;
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
    const raw = readVaultAwareRaw(STEPS_KEY);
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
    writeVaultAwareRaw(STEPS_KEY, JSON.stringify(day));
    emitStepsChanged();
  } catch {
    /* ignore */
  }
}

export function clearStoredDay(): void {
  try {
    safeRemove(STEPS_KEY);
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

// -------------------------------------------------------------
// Sueño + Peso (Health Connect) — sincronización del Plan de Fases.
// Se leen las últimas noches dormidas y la última pesada de la
// balanza para alimentar el Goal Hub. Las reglas de fusión (no
// pisar datos manuales) viven en HealthSyncEngine.
// -------------------------------------------------------------

export interface SleepSourceDay {
  date: string; // YYYY-MM-DD (día local en que se durmió la mayor parte)
  bed: string; // "23:30"
  wake: string; // "07:30"
}

export interface WeightSample {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

const SLEEP_WEIGHT_EVENT = "kinetix-health-sync-requested";

/** Dispara una sincronización bajo demanda (ej. tras conectar Health Connect). */
export function requestHealthSyncNow(): void {
  try {
    window.dispatchEvent(new Event(SLEEP_WEIGHT_EVENT));
  } catch {
    /* ignore */
  }
}

/** Se suscribe al evento de sincronización bajo demanda. */
export function subscribeHealthSyncRequested(cb: () => void): () => void {
  try {
    window.addEventListener(SLEEP_WEIGHT_EVENT, cb);
    return () => window.removeEventListener(SLEEP_WEIGHT_EVENT, cb);
  } catch {
    return () => {};
  }
}

const SLEEP_WEIGHT_TYPES: HealthDataType[] = ["sleep", "weight"];

/**
 * Permisos de lectura de sueño y peso. Devuelve el estado por tipo
 * (Health Connect puede autorizar uno y no el otro).
 */
export async function hasSleepWeightPermission(): Promise<{
  sleep: boolean;
  weight: boolean;
}> {
  if (!isNativePlatform()) return { sleep: false, weight: false };
  try {
    const auth = await Health.checkAuthorization({ read: SLEEP_WEIGHT_TYPES });
    const granted = new Set(auth.readAuthorized);
    return { sleep: granted.has("sleep"), weight: granted.has("weight") };
  } catch {
    return { sleep: false, weight: false };
  }
}

/**
 * Lee las noches de sueño de los últimos `days` días y las agrupa por
 * día: bed = inicio de la sesión de sueño, wake = fin. Si un día tiene
 * varios segmentos, toma el más temprano como bed y el más tardío como
 * wake. Devuelve solo días con datos válidos (2–14 h de cama).
 */
export async function readRecentSleep(days: number): Promise<SleepSourceDay[]> {
  if (!isNativePlatform()) return [];
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0, 0);
    const res = await Health.readSamples({
      dataType: "sleep",
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      limit: 200,
      ascending: true,
    });
    const byDay = new Map<string, { earliest: number; latest: number }>();
    for (const s of res.samples ?? []) {
      const sStart = Date.parse(s.startDate);
      const sEnd = Date.parse(s.endDate);
      if (!Number.isFinite(sStart) || !Number.isFinite(sEnd)) continue;
      // El día local del segmento: el de su inicio (una noche cruza el dia siguiente
      // como mucho hasta el despertar, que debe caer en el mismo día del "bed" real).
      const d = new Date(sStart);
      const key = localDateKey(d);
      const cur = byDay.get(key) ?? { earliest: Infinity, latest: -Infinity };
      cur.earliest = Math.min(cur.earliest, sStart);
      cur.latest = Math.max(cur.latest, sEnd);
      byDay.set(key, cur);
    }
    return [...byDay.entries()]
      .map(([date, { earliest, latest }]) => {
        const bed = new Date(earliest);
        const wake = new Date(latest);
        const pad = (n: number) => `${n}`.padStart(2, "0");
        const bedT = `${pad(bed.getHours())}:${pad(bed.getMinutes())}`;
        const wakeT = `${pad(wake.getHours())}:${pad(wake.getMinutes())}`;
        return { date, bed: bedT, wake: wakeT };
      })
      .filter((s) => {
        const h = sleepHoursOf(s.bed, s.wake);
        return h >= 2 && h <= 14;
      });
  } catch {
    return [];
  }
}

/** Horas de sueño para validar (copia local para no acoplar import circular). */
function sleepHoursOf(bed: string, wake: string): number {
  const [bh, bm = 0] = bed.split(":").map(Number);
  const [wh, wm = 0] = wake.split(":").map(Number);
  if (Number.isNaN(bh) || Number.isNaN(wh)) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

/**
 * Última pesada de la balanza en los últimos `days` días (por hora de
 * registro, la más reciente). Devuelve null si no hay ninguna.
 */
export async function readLatestWeight(days: number): Promise<WeightSample | null> {
  if (!isNativePlatform()) return null;
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0, 0);
    const res = await Health.readSamples({
      dataType: "weight",
      startDate: start.toISOString(),
      endDate: now.toISOString(),
      limit: 50,
      ascending: true,
    });
    const samples = res.samples ?? [];
    if (samples.length === 0) return null;
    const best = samples[samples.length - 1];
    const d = new Date(best.endDate || best.startDate);
    const kg = Number(best.value);
    if (!Number.isFinite(kg) || !(kg > 0)) return null;
    return { date: localDateKey(d), weightKg: Math.round(kg * 100) / 100 };
  } catch {
    return null;
  }
}

export function requestSleepWeightAuthorization(): Promise<{
  sleep: boolean;
  weight: boolean;
}> {
  if (!isNativePlatform()) return Promise.resolve({ sleep: false, weight: false });
  return Health.requestAuthorization({
    read: SLEEP_WEIGHT_TYPES,
    requestHistoryAccess: true,
  })
    .then((auth) => {
      const granted = new Set(auth.readAuthorized);
      return { sleep: granted.has("sleep"), weight: granted.has("weight") };
    })
    .catch(() => ({ sleep: false, weight: false }));
}

// -------------------------------------------------------------
// Historial de pasos por día (para el reto / seed alpha):
// guarda los días con pasos en una clave aparte, indexada por fecha.
// -------------------------------------------------------------
const STEPS_HISTORY_KEY = "kinetix_health_steps_history";

export function saveStepsHistoryDay(day: StoredDay): void {
  try {
    const raw = localStorage.getItem(STEPS_HISTORY_KEY);
    const map: Record<string, StoredDay> = raw ? JSON.parse(raw) : {};
    map[day.date] = day;
    localStorage.setItem(STEPS_HISTORY_KEY, JSON.stringify(map));
    emitStepsChanged();
  } catch {
    /* ignore */
  }
}

export function readStoredDayForDate(date: string): StoredDay | null {
  try {
    const raw = localStorage.getItem(STEPS_HISTORY_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, StoredDay>;
    const day = map[date];
    return day && day.date === date ? day : null;
  } catch {
    return null;
  }
}