// =============================================================
// KINETIX — Utilidades seguras de localStorage.
// W1: safeParse con type guards (no confía en el contenido guardado).
// W2: safeSet con try/catch (cuota de ~5 MB puede fallar).
// =============================================================

/** P4 Vault: claves con datos de salud/entreno que se cifran en reposo. */
export const VAULT_KEYS = [
  "kinetix_workout_history",
  "kinetix_exercise_history",
  "kinetix_body_metrics",
  "kinetix_prs",
  "kinetix_nutrition_log",
  "kinetix_nutrition_history",
  "kinetix_sleep_log",
  "kinetix_readiness",
  "kinetix_cardio_log",
  "kinetix_health_steps",
] as const;

export const VAULT_META_KEY = "kinetix_vault";
const VAULT_SESSION_KEY = "kinetix_vault_session_v2";

// ---------------------------------------------------------------------------
// Vault v2 — cifrado en reposo SIEMPRE.
//
// Antes: desbloquear DESCIFRABA y escribía texto plano en localStorage; si la
// sesión se perdía, la app decía "bloqueado" pero los datos seguían legibles.
// Ahora:
//   - localStorage ÚNICAMENTE guarda envelopes cifrados (kinetix-vault-v2).
//     Cada clave usa una DataKey aleatoria de 32 B; la DataKey se guarda
//     envuelta dos veces (contraseña + secreto de sesión aleatorio).
//   - El texto plano vive solo en MEMORIA (memoryStore) mientras la pestaña
//     está desbloqueada. Cerrar/bloquear = se descarta la memoria; el disco
//     nunca tuvo texto plano.
//   - El secreto de sesión (aleatorio, en sessionStorage) permite re-derivar
//     sin contraseña tras un reload de la MISMA pestaña; muere al cerrarla.
// ---------------------------------------------------------------------------
import { deriveKey, aesKeyFromBytes, aeadEncrypt, aeadDecrypt, randomBytes, isEncryptedBackup, decryptBackup } from "./encryption";

const ENVELOPE_FORMAT = "kinetix-vault-v2";
const SESSION_ITERS = 150_000;
const SESSION_HASH = "SHA-256";

const _b64 = {
  e: (u: Uint8Array): string => {
    let bin = "";
    u.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  },
  d: (b: string): Uint8Array => {
    const bin = atob(b);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

interface VaultEnvelope {
  app: string;
  encrypted: true;
  format: typeof ENVELOPE_FORMAT;
  kdfPw: { name: "PBKDF2"; iterations: number; hash: string; salt: string };
  ivPw: string;
  wrappedPw: string;
  ivSes?: string;
  wrappedSes?: string;
  iv: string;
  ciphertext: string;
}

// Estado de sesión (solo memoria + secreto de pestaña en sessionStorage).
let sessionSecret: string | null = null;
let sessionPassword: string | null = null;
let sesKey: CryptoKey | null = null;
const sessionPwKeyBySalt = new Map<string, CryptoKey>();
const memoryStore = new Map<string, unknown>();
let sessionMemoryReady = false;
let writeQueue: Promise<void> = Promise.resolve();

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): void { localStorage.setItem(key, value); }
function lsRemove(key: string): void { try { localStorage.removeItem(key); } catch { /* ignore */ } }

const textDecoder = new TextDecoder();

async function deriveSessionKey(secret: string): Promise<CryptoKey> {
  if (sesKey) return sesKey;
  sesKey = await deriveKey(secret, new TextEncoder().encode("kinetix-vault-session-v2"), {
    iterations: SESSION_ITERS, hash: SESSION_HASH,
  });
  return sesKey;
}

async function derivePwKey(saltB64: string, iterations: number, hash: string): Promise<CryptoKey> {
  const cached = sessionPwKeyBySalt.get(saltB64);
  if (cached) return cached;
  if (!sessionPassword) throw new Error("Vault sin sesión de contraseña");
  const key = await deriveKey(sessionPassword, _b64.d(saltB64), { iterations, hash });
  sessionPwKeyBySalt.set(saltB64, key);
  return key;
}

const kdfPwParams = () => ({ name: "PBKDF2" as const, iterations: SESSION_ITERS, hash: SESSION_HASH });

async function buildEnvelope(value: unknown): Promise<VaultEnvelope> {
  if (!sessionPassword) throw new Error("Vault sin sesión de contraseña");
  const dataKeyRaw = randomBytes(32);
  const dataKey = await aesKeyFromBytes(dataKeyRaw);
  const iv = randomBytes(12);
  const ciphertext = await aeadEncrypt(dataKey, iv, new TextEncoder().encode(JSON.stringify(value)));
  const saltPw = randomBytes(16);
  const pwKey = await derivePwKey(_b64.e(saltPw), SESSION_ITERS, SESSION_HASH);
  const ivPw = randomBytes(12);
  const wrappedPw = await aeadEncrypt(pwKey, ivPw, dataKeyRaw);
  const env: VaultEnvelope = {
    app: "KINETIX", encrypted: true, format: ENVELOPE_FORMAT,
    kdfPw: { ...kdfPwParams(), salt: _b64.e(saltPw) }, ivPw: _b64.e(ivPw), wrappedPw,
    iv: _b64.e(iv), ciphertext,
  };
  if (sessionSecret) {
    const sk = await deriveSessionKey(sessionSecret);
    const ivSes = randomBytes(12);
    env.ivSes = _b64.e(ivSes);
    env.wrappedSes = await aeadEncrypt(sk, ivSes, dataKeyRaw);
  }
  return env;
}

async function unwrapDataKey(env: VaultEnvelope, useSession: boolean): Promise<CryptoKey> {
  if (useSession) {
    if (!env.wrappedSes || !env.ivSes) throw new Error("Envelope sin envoltura de sesión");
    const raw = await aeadDecrypt(await deriveSessionKey(sessionSecret!), _b64.d(env.ivSes), env.wrappedSes);
    return aesKeyFromBytes(raw);
  }
  const pwKey = await derivePwKey(env.kdfPw.salt, env.kdfPw.iterations, env.kdfPw.hash);
  const raw = await aeadDecrypt(pwKey, _b64.d(env.ivPw), env.wrappedPw);
  return aesKeyFromBytes(raw);
}

async function readEnvelopeValue(env: VaultEnvelope, useSession: boolean): Promise<unknown> {
  const dataKey = await unwrapDataKey(env, useSession);
  const plain = await aeadDecrypt(dataKey, _b64.d(env.iv), env.ciphertext);
  return JSON.parse(textDecoder.decode(plain)) as unknown;
}

/** Reescribe un envelope ya existente preservando su DataKey (misma data), p.ej.
 *  al cambiar la contraseña o al agregar la envoltura de sesión tras unlock. */
export async function secureSetEnvelope(key: string, value: unknown): Promise<void> {
  const env = await buildEnvelope(value);
  lsSet(key, JSON.stringify(env));
}

async function rewrapEnvelope(key: string, env: VaultEnvelope, useSession: boolean): Promise<void> {
  const dataKey = await unwrapDataKey(env, useSession);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dataKey));
  const saltPw = randomBytes(16);
  const pwKey = await derivePwKey(_b64.e(saltPw), SESSION_ITERS, SESSION_HASH);
  const ivPw = randomBytes(12);
  const wrappedPw = await aeadEncrypt(pwKey, ivPw, raw);
  const next: VaultEnvelope = {
    app: "KINETIX", encrypted: true, format: ENVELOPE_FORMAT,
    kdfPw: { ...kdfPwParams(), salt: _b64.e(saltPw) }, ivPw: _b64.e(ivPw), wrappedPw,
    iv: _b64.e(randomBytes(12)),
    ciphertext: env.ciphertext,
  };
  if (sessionSecret) {
    const sk = await deriveSessionKey(sessionSecret);
    const ivSes = randomBytes(12);
    next.ivSes = _b64.e(ivSes);
    next.wrappedSes = await aeadEncrypt(sk, ivSes, raw);
  }
  lsSet(key, JSON.stringify(next));
}

function isLegacyEnvelope(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === "object" && parsed !== null &&
      (parsed as Record<string, unknown>).encrypted === true &&
      (parsed as Record<string, unknown>).format === "aes-gcm-256" &&
      isEncryptedBackup(parsed)
    );
  } catch { return false; }
}

function readVaultMetaRaw(): string | null {
  try {
    return localStorage.getItem(VAULT_META_KEY);
  } catch {
    return null;
  }
}

/** Vault habilitado (hay meta activa). No implica desbloqueado. */
export function isVaultEnabled(): boolean {
  try {
    const raw = readVaultMetaRaw();
    if (!raw) return false;
    const meta = JSON.parse(raw) as { enabled?: unknown };
    return meta?.enabled === true;
  } catch {
    return false;
  }
}

/** Sesión desbloqueada: secreto de pestaña vigente en esta pestaña. */
export function isVaultUnlocked(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return isVaultEnabled() && sessionStorage.getItem(VAULT_SESSION_KEY) != null;
  } catch {
    return false;
  }
}

/** Bloqueado = habilitado pero sin desbloqueo en esta pestaña. */
export function isVaultLocked(): boolean {
  return isVaultEnabled() && !isVaultUnlocked();
}

/** La memoria cifrada ya fue poblada (boot o unlock). Antes de esto, las
 *  lecturas toman fallback y las escrituras son no-op: evita que un provider
 *  sobrescriba datos descifrados reales mientras el boot async sigue. */
export function isVaultMemoryReady(): boolean {
  return sessionMemoryReady;
}

/** ¿El texto guardado es un envelope cifrado? (sync, sin tocar nada). */
export function isVaultCiphertext(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;
    const o = parsed as Record<string, unknown>;
    if (o.encrypted !== true) return false;
    if (o.format === "aes-gcm-256") return isEncryptedBackup(parsed);
    return o.format === ENVELOPE_FORMAT && typeof o.iv === "string" && typeof o.ciphertext === "string";
  } catch {
    return false;
  }
}

export const isVaultKey = (key: string): boolean =>
  (VAULT_KEYS as readonly string[]).includes(key);

// ─── Gestión de sesión (usada por utils/vault.ts) ────────────────────────

function queueVaultWrite(key: string): void {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      if (!isVaultEnabled() || !isVaultUnlocked()) return;
      const value = memoryStore.get(key);
      if (value === undefined) {
        lsRemove(key);
        return;
      }
      await secureSetEnvelope(key, value);
    });
  void writeQueue.catch(() => {
    try { window.dispatchEvent(new CustomEvent("kinetix-storage-error", { detail: { key } })); } catch { /* ignore */ }
  });
}

function queueVaultRemove(key: string): void {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      if (!isVaultEnabled()) return;
      lsRemove(key);
    });
  void writeQueue.catch(() => undefined);
}

/** Espera a que terminen los reapuntes pendientes (lock/disable). */
export async function flushVaultWrites(): Promise<void> {
  await writeQueue.catch(() => undefined);
}

/**
 * Cifra todas las claves del vault al formateo v2 (solo password-wrap, sin
 * sesión). Se usa en enableVault, antes de escribir la meta: el storage
 * todavía ve texto plano, aquí se reemplaza por envelopes cifrados.
 */
export async function encryptVaultForEnable(password: string): Promise<number> {
  let count = 0;
  sessionPassword = password;
  for (const key of VAULT_KEYS) {
    const raw = lsGet(key);
    if (!raw || isVaultCiphertext(raw)) continue;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch { continue; }
    const env = await buildEnvelope(value);
    sessionPwKeyBySalt.clear();
    lsSet(key, JSON.stringify(env));
    count++;
  }
  sessionPassword = null;
  sessionPwKeyBySalt.clear();
  return count;
}

/**
 * Descifra un envelope v2/v1 (para migrate o para escribir plaintext al
 * deshabilitar). En v2/legacy usa el derive de contraseña de la sesión.
 */
export async function decryptVaultValueForKey(key: string, password: string): Promise<unknown | null> {
  const raw = lsGet(key);
  if (!raw || !isVaultCiphertext(raw)) return null;
  if (sessionPassword == null) sessionPassword = password;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isLegacyEnvelope(raw)) {
      return await decryptBackup(parsed as never, password);
    }
    return await readEnvelopeValue(parsed as VaultEnvelope, false);
  } catch { return null; }
  finally {
    sessionPassword = null;
    sessionPwKeyBySalt.clear();
  }
}

/**
 * Desbloquea en memoria: descifra lo presente con la contraseña, puebla el
 * memory store y reescribe envelopes v2 con doble envoltura (password +
 * session) para que la pestaña siga desbloqueada tras un reload. Devuelve
 * cuántas claves quedaron en memoria.
 */
export async function activateVaultSession(password: string, secret: string): Promise<number> {
  sessionPassword = password;
  sessionSecret = secret;
  sesKey = null;
  sessionPwKeyBySalt.clear();
  sessionMemoryReady = false;
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(VAULT_SESSION_KEY, secret);
  } catch { /* ignore */ }

  let count = 0;
  for (const key of VAULT_KEYS) {
    const raw = lsGet(key);
    if (!raw || !isVaultCiphertext(raw)) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      let value: unknown;
      if (isLegacyEnvelope(raw)) {
        value = await decryptBackup(parsed as never, password);
      } else {
        value = await readEnvelopeValue(parsed as VaultEnvelope, false);
      }
      memoryStore.set(key, value);
      await secureSetEnvelope(key, value);
      count++;
    } catch { /* clave corrupta: se ignora, sin borrar el envelope */ }
  }
  sessionMemoryReady = true;
  return count;
}

/**
 * Post-reload: si existe un secreto de sesión válido en sessionStorage, vuelve
 * a poblar la memoria descifrando con session (sin pedir contraseña).
 */
export async function initVaultSessionFromStorage(): Promise<boolean> {
  if (!isVaultEnabled()) return true;
  let secret: string | null = null;
  try {
    if (typeof sessionStorage === "undefined") return false;
    secret = sessionStorage.getItem(VAULT_SESSION_KEY);
  } catch { return false; }
  if (!secret) return false;

  sessionSecret = secret;
  sesKey = null;
  let ok = false;
  try {
    for (const key of VAULT_KEYS) {
      const raw = lsGet(key);
      if (!raw || !isVaultCiphertext(raw)) continue;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isLegacyEnvelope(raw)) { sessionSecret = null; return false; } // necesita contraseña
        const env = parsed as VaultEnvelope;
        if (!env.wrappedSes || !env.ivSes) { sessionSecret = null; return false; } // migrate pendiente
        memoryStore.set(key, await readEnvelopeValue(env, true));
        ok = true;
      } catch { /* clave corrupta: se ignora */ }
    }
  } catch {
    sessionSecret = null;
    return false;
  }
  if (!ok) {
    sessionSecret = null;
    sessionMemoryReady = false;
    try { sessionStorage.removeItem(VAULT_SESSION_KEY); } catch { /* ignore */ }
    return false;
  }
  sessionMemoryReady = true;
  return true;
}

/** Bloquea: descarta la memoria y el secreto de pestaña (el disco sigue cifrado). */
export function deactivateVaultSession(): void {
  sessionSecret = null;
  sessionPassword = null;
  sesKey = null;
  sessionPwKeyBySalt.clear();
  memoryStore.clear();
  sessionMemoryReady = false;
  try { sessionStorage.removeItem(VAULT_SESSION_KEY); } catch { /* ignore */ }
}

/** Cambia la contraseña usada para los envelopes de la sesión activa
 *  (al cambiar la contraseña del vault) sin descartar la sesión. */
export function setVaultSessionPassword(password: string): void {
  sessionPassword = password;
  sessionPwKeyBySalt.clear();
}

/** Acceso directo al valor en memoria de una clave del vault (modo lectura). */
export function getVaultMemory(key: string): unknown {
  return memoryStore.get(key);
}

/** Escribe plano directamente a localStorage (solo para disableVault, que ya
 *  no tendrá cifrado). Sin pasar por safeSet/memory para no double-write. */
export function writePlaintextVaultKeys(values: ReadonlyMap<string, unknown>): void {
  for (const [key, value] of values) {
    lsSet(key, JSON.stringify(value));
  }
}

export function removeStorageKey(key: string): void {
  lsRemove(key);
}

/** Lee el texto plano de una clave como string JSON (equivalente histórico a
 *  localStorage.getItem), respetando el vault: bloqueado/sin memoria → null;
 *  desbloqueado → se serializa el valor de memoria. Útil para lectores que
 *  luego parsean el JSON (deload, health, nutrición). */
export function readVaultAwareRaw(key: string): string | null {
  try {
    if (isVaultKey(key) && isVaultEnabled()) {
      if (!isVaultMemoryReady()) return null;
      const value = memoryStore.get(key);
      if (value === undefined) return null;
      return JSON.stringify(value);
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Escribe el texto plano de una clave (equivalente histórico a setItem),
 *  respetando el vault: desbloqueado → memoria + reapunteo; bloqueado → no-op. */
export function writeVaultAwareRaw(key: string, value: string): boolean {
  try {
    if (isVaultKey(key) && isVaultEnabled()) {
      if (!isVaultMemoryReady()) return false;
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        return false;
      }
      memoryStore.set(key, parsed);
      queueVaultWrite(key);
      return true;
    }
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeParse<T>(key: string, fallback: T, isValid?: (value: unknown) => boolean, sanitize?: (value: unknown) => unknown | undefined): T {
  try {
    // Vault v2: clave sensible y sesión desbloqueada → leer SOLO de memoria
    // (ciphertext-at-rest; el disco nunca tiene texto plano).
    if (isVaultKey(key) && isVaultEnabled()) {
      if (!isVaultMemoryReady()) return fallback;
      if (memoryStore.has(key)) {
        const value = memoryStore.get(key);
        if (isValid && !isValid(value)) return fallback;
        return value as T;
      }
      return fallback;
    }
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed: unknown = JSON.parse(saved);
    // P4 Vault: un envelope cifrado NO es corrupción — se devuelve el
    // fallback SIN borrar (borrarlo destruiría el vault bloqueado).
    if (isVaultCiphertext(saved)) return fallback;
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
      // P4 Vault: nunca borrar un envelope que no se pudo descifrar.
      const saved = localStorage.getItem(key);
      if (!isVaultCiphertext(saved)) localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

export function safeSet(key: string, value: unknown): boolean {
  try {
    // Vault v2: clave sensible con vault activo → texto solo en memoria y
    // reapunteo diferido del envelope (session secret + password wrap).
    if (isVaultKey(key) && isVaultEnabled()) {
      if (!isVaultMemoryReady()) return false; // no-op seguro: aún sin memoria.
      memoryStore.set(key, value);
      queueVaultWrite(key);
      return true;
    }
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
    if (isVaultKey(key) && isVaultEnabled()) {
      if (!isVaultMemoryReady()) return; // no-op seguro.
      memoryStore.delete(key);
      queueVaultRemove(key);
      return;
    }
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

/** Fecha tal como la persiste la app: o el día local (YYYY-MM-DD) del
 *  formateador, o el timestamp ISO completo que guardan las sesiones
 *  (ej. "2026-09-11T16:00:00.000Z"). Rechaza fechas corruptas en ambos
 *  formatos. Los validadores la usan para NO descartar historial válido. */
export const isDateStamp = (v: unknown): boolean => {
  if (typeof v !== "string") return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return isDateKey(v);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) return false;
  return isDateKey(v.slice(0, 10)) && !Number.isNaN(Date.parse(v));
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
  // La app real guarda `sets` como lista de WorkoutSet; los backups
  // importados (CSV/legacy) lo guardaban como contador entero.
  const setsOk = isNonNegativeInt(o.sets) || Array.isArray(o.sets);
  return (
    isId(o.exerciseId) &&
    setsOk &&
    (o.reps === undefined || typeof o.reps === "string")
  );
};

const isCompletedWorkout = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.id) &&
    isDateStamp(o.date) &&
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
    isDateStamp(o.date) &&
    isNonNegativeNum(o.weight) &&
    isNonNegativeInt(o.sets) &&
    isArrayOf(isNonNegativeNum)(o.reps) &&
    isNonNegativeNum(o.volumeKg)
  );
};

const isBodyMetric = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return isId(o.id) && isDateStamp(o.date) && isNonNegativeNum(o.weightKg);
};

const isPersonalRecord = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isId(o.exerciseId) &&
    isNonNegativeNum(o.value) &&
    isDateStamp(o.date) &&
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
    isDateStamp(o.date) &&
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

/** Perfil de entrenamiento del usuario (onboarding personalizado). */
export const isUserProfile = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  const days = o.daysPerWeek as number;
  const minutes = o.sessionMinutes as number;
  return (
    (o.goal === "cut" || o.goal === "maintenance" || o.goal === "lean_bulk") &&
    (o.experience === "principiante" || o.experience === "intermedio" || o.experience === "avanzado") &&
    isNonNegativeInt(days) &&
    days >= 2 &&
    days <= 6 &&
    isNonNegativeInt(minutes) &&
    minutes >= 15 &&
    minutes <= 180 &&
    (o.equipment === "gym" || o.equipment === "basic" || o.equipment === "home") &&
    (o.completedAt === undefined || typeof o.completedAt === "string")
  );
};

const isTimestampEntry = (v: unknown): boolean => {
  if (!isPlainObject(v)) return false;
  const o = v as Record<string, unknown>;
  return isDateStamp(o.date) || isNonNegativeNum(o.timestamp) || isId(o.id);
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
  kinetix_user_profile: isUserProfile,
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