// =============================================================
// KINETIX — Vault v2: cifrado en reposo con texto plano SOLO en memoria (P4+).
//
// Modelo honesto para una app 100% local con lecturas síncronas:
//   - localStorage NUNCA contiene texto plano de las claves sensibles.
//     Cada clave vive como un envelope kinetix-vault-v2 (DataKey AES-GCM
//     aleatoria de 32 B; la DataKey se envuelve 2 veces: password + un
//     secreto de sesión aleatorio).
//   - DESBLOQUEADO = texto plano solo en MEMORIA (memoryStore). El secreto
//     de sesión (sessionStorage) permite re-derivar tras un reload de la
//     MISMA pestaña; muere al cerrarla. El disco siempre está cifrado,
//     tanto bloqueado como desbloqueado.
//   - BLOQUEADO = no hay nada descifrado en disco ni en memoria; pedir
//     contraseña.
//   - El archivo IndexedDB y los auto-backups se vacían al habilitar (el
//     mirror, ahora no-op con vault, nunca contiene texto plano).
//
// Flujos (la mayoría recargan para re-hidratar desde un estado consistente):
//   enable → migra los registros EXCLUSIVOS del archivo IDB a localStorage
//            (para no perder historial), cifra todo a v2, vacía IDB, recarga.
//   unlock → verifica + descifra a memoria + re-envuelve a v2 (doble wrap) +
//            recarga (sesión desbloqueada).
//   lock   → (sin contraseña: ya estamos desbloqueados) descarta memoria y
//            secreto de sesión + recarga. El disco ya estaba cifrado.
//   disable→ verifica + vuelca texto plano a disco + borra meta + recarga.
//   change → verifica actual + re-envuelve las DataKey con la nueva + meta.
// Sin la contraseña NO hay recuperación: se advierte en la UI.
// =============================================================

import {
  VAULT_KEYS,
  VAULT_META_KEY,
  isVaultEnabled,
  isVaultLocked,
  isVaultUnlocked,
  encryptVaultForEnable,
  activateVaultSession,
  deactivateVaultSession,
  setVaultSessionPassword,
  initVaultSessionFromStorage,
  flushVaultWrites,
  decryptVaultValueForKey,
  writePlaintextVaultKeys,
  removeStorageKey,
  getVaultMemory,
  isVaultCiphertext,
} from "./storage";
import { encryptJson, randomBytes, EncryptedBackup } from "./encryption";
import { replaceArchive, idbKvGet } from "./indexedDb";
import { LONG_TERM_KIND } from "./longTermHistory";

export { isVaultEnabled, isVaultLocked, isVaultUnlocked };
export { VAULT_KEYS, VAULT_META_KEY };
export { initVaultSessionFromStorage };

export const VAULT_MIN_PASSWORD = 8;
const VAULT_VERIFIER = "kinetix-vault-ok";

interface VaultMeta {
  enabled: boolean;
  version: 2;
  createdAt: string;
  verifier: EncryptedBackup;
}

function readMeta(): VaultMeta | null {
  try {
    const raw = localStorage.getItem(VAULT_META_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as VaultMeta;
    return meta?.enabled === true && meta.verifier ? meta : null;
  } catch {
    return null;
  }
}

function writeMeta(meta: VaultMeta): void {
  localStorage.setItem(VAULT_META_KEY, JSON.stringify(meta));
}

function removeMeta(): void {
  try {
    localStorage.removeItem(VAULT_META_KEY);
  } catch {
    /* ignore */
  }
}

function reload(): void {
  try {
    window.location.reload();
  } catch {
    /* tests / sin window */
  }
}

function checkPassword(password: string): void {
  if (typeof password !== "string" || password.length < VAULT_MIN_PASSWORD) {
    throw new Error(`La contraseña del vault necesita al menos ${VAULT_MIN_PASSWORD} caracteres.`);
  }
}

/** Verifica la contraseña contra el verifier sin tocar los datos. */
export async function verifyVaultPassword(password: string): Promise<boolean> {
  const meta = readMeta();
  if (!meta) return false;
  try {
    const { decryptBackup } = await import("./encryption");
    const ok = await decryptBackup<string>(meta.verifier, password);
    return ok === VAULT_VERIFIER;
  } catch {
    return false;
  }
}

/**
 * CRÍTICO (Codex): antes de vaciar el archivo IndexedDB hay que migrar los
 * registros que SOLO existen ahí (ej.: historial antiguo que se movió al
 * archivo). Si no se migran, habilitar el vault destruiría datos únicos.
 */
async function migrateIdbExclusives(): Promise<void> {
  for (const kind of Object.values(LONG_TERM_KIND)) {
    const key = kindToStorageKey(kind);
    if (!key) continue;
    const raw = localStorage.getItem(key);
    if (raw && isVaultCiphertext(raw)) continue;
    try {
      const archived = await idbKvGet(kind);
      if (!archived) continue;
      const newer = raw ? mergeArraysByDate(raw, archived) : archived;
      if (newer) localStorage.setItem(key, JSON.stringify(newer));
    } catch {
      /* sin IDB (tests/SSR): no hay nada que migrar */
    }
  }
}

function kindToStorageKey(kind: string): string | null {
  const map: Record<string, string> = {
    workoutHistory: "kinetix_workout_history",
    exerciseHistory: "kinetix_exercise_history",
    bodyMetrics: "kinetix_body_metrics",
    nutritionHistory: "kinetix_nutrition_history",
  };
  return map[kind] ?? null;
}

interface DatedRecord { id?: string; date?: string; startTime?: string; ts?: string; day?: string }

function recordDate(r: DatedRecord): string {
  return String((r.date ?? r.startTime ?? r.ts ?? r.day) ?? "");
}

function mergeArraysByDate(raw: string, archived: unknown): unknown {
  try {
    const local = JSON.parse(raw);
    const arch = archived as unknown;
    const both = Array.isArray(local) && Array.isArray(arch);
    if (both) {
      const map = new Map<string, unknown>();
      for (const item of arch) map.set(recordDate(item as DatedRecord), item);
      for (const item of local) map.set(recordDate(item as DatedRecord), item);
      return Array.from(map.values());
    }
    if (Array.isArray(arch) && arch.length && (Array.isArray(local) ? local.length === 0 : true)) return arch;
    return local;
  } catch {
    return archived;
  }
}

/** Vacía el archivo IndexedDB y los auto-backups (contenían texto plano). */
async function wipeIdbMirror(): Promise<void> {
  try {
    await replaceArchive({}, true);
  } catch {
    /* sin IDB (tests/SSR): nada que vaciar */
  }
}

export async function enableVault(password: string): Promise<{ encrypted: number }> {
  checkPassword(password);
  if (isVaultEnabled()) throw new Error("El vault ya está habilitado.");
  // 1) No perder datos: los registros exclusivos del archivo IDB se fusionan
  //    en localStorage ANTES de vaciar el archivo.
  await migrateIdbExclusives();
  // 2) Cifrado en reposo a v2 (solo password-wrap; la sesión se crea al unlock).
  const encrypted = await encryptVaultForEnable(password);
  // 3) Meta + verifier.
  const verifier = await encryptJson(VAULT_VERIFIER, password);
  writeMeta({ enabled: true, version: 2, createdAt: new Date().toISOString(), verifier });
  await wipeIdbMirror();
  reload();
  return { encrypted };
}

export async function unlockVault(password: string): Promise<boolean> {
  if (!(await verifyVaultPassword(password))) return false;
  const secret = btoaUnicode(randomBytes(32));
  // Descifra a memoria con la contraseña y re-escribe envelopes v2 con doble
  // wrap (password + session). El disco NUNCA recibe texto plano.
  const loaded = await activateVaultSession(password, secret);
  reload();
  return loaded >= 0;
}

/**
 * Bloquea SIN pedir contraseña: ya estamos desbloqueados en esta pestaña y el
 * disco está siempre cifrado; solo se descarta la memoria y el secreto sesión.
 */
export async function lockVault(): Promise<void> {
  const meta = readMeta();
  if (!meta) throw new Error("El vault no está habilitado.");
  await flushVaultWrites();
  deactivateVaultSession();
  reload();
}

export async function disableVault(password: string): Promise<{ decrypted: number }> {
  const meta = readMeta();
  if (!meta) throw new Error("El vault no está habilitado.");
  if (!(await verifyVaultPassword(password))) throw new Error("Contraseña incorrecta.");
  // Descifra a texto plano local y escribe directo (ya no habrá cifrado).
  const plain = new Map<string, unknown>();
  let decrypted = 0;
  for (const key of VAULT_KEYS) {
    const inMemory = getVaultMemory(key);
    if (inMemory !== undefined) {
      plain.set(key, inMemory);
      decrypted++;
      continue;
    }
    const value = await decryptVaultValueForKey(key, password);
    if (value !== null) {
      plain.set(key, value);
      decrypted++;
    }
  }
  writePlaintextVaultKeys(plain);
  removeMeta();
  // Si quedó algún envelope suelto (claves sin decodificar), se limpia.
  for (const key of VAULT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && isVaultCiphertext(raw) && !plain.has(key)) removeStorageKey(key);
  }
  deactivateVaultSession();
  reload();
  return { decrypted };
}

export async function changeVaultPassword(current: string, next: string): Promise<void> {
  checkPassword(next);
  const meta = readMeta();
  if (!meta) throw new Error("El vault no está habilitado.");
  if (!(await verifyVaultPassword(current))) throw new Error("La contraseña actual es incorrecta.");
  // Los envelopes están siempre cifrados; solo se re-envuelve la DataKey con la
  // nueva contraseña. Desciframos a memoria con la actual y re-emitimos con la
  // nueva; los datos permanecen idénticos.
  const secret = btoaUnicode(randomBytes(32));
  await activateVaultSession(current, secret);
  setVaultSessionPassword(next);
  for (const key of VAULT_KEYS) {
    const value = getVaultMemory(key);
    if (value !== undefined) writeEnvelopeDirect(key, value);
  }
  await flushVaultWrites();
  const verifier = await encryptJson(VAULT_VERIFIER, next);
  writeMeta({ ...meta, verifier });
  // Mantener la sesión desbloqueada con la contraseña nueva (los envelopes ya
  // se reescribieron con doble wrap, así que el reload de la pestaña vale).
  reload();
}

async function writeEnvelopeDirect(key: string, value: unknown): Promise<void> {
  const { secureSetEnvelope } = await import("./storage");
  if (typeof secureSetEnvelope === "function") {
    await (secureSetEnvelope as (k: string, v: unknown) => Promise<void>)(key, value);
  }
}

function btoaUnicode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}