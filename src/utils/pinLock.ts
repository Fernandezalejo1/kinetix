/**
 * Bloqueo local opcional con PIN (100% en el dispositivo).
 *
 * El PIN se guarda SOLO como hash PBKDF2-SHA-256 con salt aleatorio (150k
 * iteraciones). Las claves kinetix_pin_* están excluidas de backups/exportación
 * (backupService.ts) para que el PIN nunca se respalde ni se exporte.
 *
 * Política de seguridad:
 *   - 5 intentos fallidos → bloqueo de 30 s (target: 60 s de espera en $20k).
 *   - Posibilidad de "Omitir por ahora" (queda registrado; se re-bloquea salvo
 *     que haya pasado por el PIN).
 *   - Auto-bloqueo al minimizar/oscurecer la app (toggle en Configuración).
 */

import { textEncoder } from "./encryption";

const HASH_KEY = "kinetix_pin_hash";
const ATTEMPTS_KEY = "kinetix_pin_attempts";
const SKIPPED_KEY = "kinetix_pin_skipped";
const LOCKED_KEY = "kinetix_pin_locked";
const AUTOLOCK_KEY = "kinetix_pin_autolock";

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;
const PBKDF_ITERATIONS = 150_000;
const PBKDF_HASH = "SHA-256";

interface PinRecord {
  v: 1;
  salt: string; // hex
  hash: string; // hex
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const randomHex = (byteLen: number): string => {
  const out = new Uint8Array(byteLen);
  crypto.getRandomValues(out);
  return toHex(out);
};

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin);

export async function derivePinHash(pin: string, saltHex: string): Promise<string> {
  const base = await crypto.subtle.importKey("raw", textEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: textEncoder().encode(saltHex), iterations: PBKDF_ITERATIONS, hash: PBKDF_HASH },
    base,
    256
  );
  return toHex(new Uint8Array(bits));
}

const readPinRecord = (): PinRecord | null => {
  try {
    const raw = localStorage.getItem(HASH_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as PinRecord;
    if (rec?.v === 1 && typeof rec.salt === "string" && typeof rec.hash === "string") return rec;
    return null;
  } catch {
    return null;
  }
};

export function hasAppPin(): boolean {
  return !!readPinRecord();
}

export async function setAppPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const salt = randomHex(16);
  const hash = await derivePinHash(pin, salt);
  const rec: PinRecord = { v: 1, salt, hash };
  try {
    localStorage.setItem(HASH_KEY, JSON.stringify(rec));
    resetPinAttempts();
    setAppLocked(false);
    return true;
  } catch {
    return false;
  }
}

/** Cambia el PIN solo si el PIN actual coincide. Devuelve false si no se pudo. */
export async function changeAppPin(current: string, next: string): Promise<boolean> {
  const ok = await verifyAppPin(current);
  if (!ok) return false;
  return setAppPin(next);
}

export function removeAppPin(): void {
  for (const key of [HASH_KEY, ATTEMPTS_KEY, SKIPPED_KEY, LOCKED_KEY, AUTOLOCK_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  }
}

export async function verifyAppPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const rec = readPinRecord();
  if (!rec) return false;
  if (isPinLockedOut()) return false;
  const hash = await derivePinHash(pin, rec.salt);
  const ok = hash === rec.hash;
  if (ok) {
    resetPinAttempts();
    setPinSkipped(false);
    setAppLocked(false);
    return true;
  }
  registerPinFailure();
  return false;
}

// ---------- Intentos / lockout ----------

interface AttemptState {
  count: number;
  lockedUntil: number;
}

const readAttempts = (): AttemptState => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (raw) {
      const a = JSON.parse(raw) as AttemptState;
      if (typeof a.count === "number" && typeof a.lockedUntil === "number") return a;
    }
  } catch {
    /* corrupto: arrancar de cero */
  }
  return { count: 0, lockedUntil: 0 };
};

export function isPinLockedOut(): boolean {
  const a = readAttempts();
  if (a.count < MAX_ATTEMPTS) return false;
  if (Date.now() < a.lockedUntil) return true;
  resetPinAttempts();
  return false;
}

export function pinBlockedUntil(): number {
  const a = readAttempts();
  return a.count >= MAX_ATTEMPTS && Date.now() < a.lockedUntil ? a.lockedUntil : 0;
}

export function pinAttemptsRemaining(): number {
  if (isPinLockedOut()) return 0;
  const a = readAttempts();
  return Math.max(0, MAX_ATTEMPTS - a.count);
}

export function registerPinFailure(): void {
  const a = readAttempts();
  const count = Math.min(MAX_ATTEMPTS, a.count + 1);
  const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : a.lockedUntil;
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, lockedUntil }));
  } catch {
    /* ignorar */
  }
}

export function resetPinAttempts(): void {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count: 0, lockedUntil: 0 }));
  } catch {
    /* ignorar */
  }
}

// ---------- Omitir / bloquear ----------

export function isPinSkipped(): boolean {
  try {
    return localStorage.getItem(SKIPPED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPinSkipped(skipped: boolean): void {
  try {
    if (skipped) localStorage.setItem(SKIPPED_KEY, "1");
    else localStorage.removeItem(SKIPPED_KEY);
  } catch {
    /* ignorar */
  }
}

export function isAppLocked(): boolean {
  try {
    return localStorage.getItem(LOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAppLocked(locked: boolean): void {
  try {
    if (locked) localStorage.setItem(LOCKED_KEY, "1");
    else localStorage.removeItem(LOCKED_KEY);
  } catch {
    /* ignorar */
  }
}

export function isAutoLockOn(): boolean {
  try {
    return localStorage.getItem(AUTOLOCK_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAutoLockOn(on: boolean): void {
  try {
    localStorage.setItem(AUTOLOCK_KEY, on ? "1" : "0");
  } catch {
    /* ignorar */
  }
}

/** Decide si la app debe quedar bloqueada (usar al oscurecer/minimizar).
 *  Devuelve true si hay que mostrar el PIN. Persiste el estado de bloqueo. */
export function lockAppIfNeeded(): boolean {
  if (!hasAppPin() || isPinSkipped() || !isAutoLockOn()) return false;
  setAppLocked(true);
  return true;
}