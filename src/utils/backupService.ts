import { hydrateFromArchive, mergeArchived, pauseHistoryWrites, resumeHistoryWrites, flushHistoryWrites, isReplacingHistory } from "./longTermHistory";
import { replaceArchive } from "./indexedDb";
import { VALIDATORS } from "./storage";
/**
 * Copia de seguridad automática — snapshots completos del estado en IndexedDB.
 *
 * Cada ~6h (o forzada) se guarda un snapshot JSON-puro de todas las claves
 * kinetix_* en el store "backups" de IndexedDB (hasta 24 copias). No usa
 * nube: todo permanece 100% en el dispositivo. La restauración se hace desde
 * Configuración y, entre dispositivos, con la exportación manual de archivo.
 */

import { idbBackupGetData, idbBackupList, idbBackupPrune, idbBackupSave, AutoBackupMeta } from "./indexedDb";
import { isVaultEnabled, isVaultUnlocked, getVaultMemory, VAULT_KEYS } from "./storage";

export const AUTO_BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas
export const AUTO_BACKUP_LIMIT = 24;
const LAST_KEY = "kinetix_auto_backup_last";

export const EXCLUDED_BACKUP_KEYS = [
  "kinetix_pin_hash",
  "kinetix_pin_attempts",
  "kinetix_pin_skipped",
  "kinetix_pin_locked",
  "kinetix_pin_autolock",
  "kinetix_reminder",
  "kinetix_backup_saved",
  "kinetix_auto_backup_last",
  // P4 Vault: el estado del cifrado no se exporta (el backup restaurado
  // arranca sin vault; el usuario lo reactiva si quiere).
  "kinetix_vault",
];

export function shouldRunAutoBackup(lastRunAt: string | null, now: number, intervalMs = AUTO_BACKUP_INTERVAL_MS): boolean {
  if (!lastRunAt) return true;
  const last = Date.parse(lastRunAt);
  if (!isFinite(last)) return true;
  return now - last >= intervalMs;
}

export function collectKinetixState(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("kinetix_") || EXCLUDED_BACKUP_KEYS.includes(key)) continue;
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch {
    /* sin acceso a localStorage: snapshot vacío */
  }
  return data;
}

export async function listAutoBackups(): Promise<AutoBackupMeta[]> {
  return idbBackupList();
}

export async function restoreAutoBackup(id: number): Promise<Record<string, unknown> | null> {
  return idbBackupGetData(id);
}

export async function createAutoBackup(
  force: boolean,
  now: number = Date.now()
): Promise<AutoBackupMeta | null> {
  const lastRaw = (() => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null;
    }
  })();
  if (!force && !shouldRunAutoBackup(lastRaw, now)) return null;
  if (isReplacingHistory()) return null;
  // P4 Vault: los auto-backups guardarían texto plano en IndexedDB.
  // Con vault, el respaldo es la exportación manual cifrada.
  if (isVaultEnabled()) return null;
  let state: Record<string, unknown>;
  try { state = await collectFullState(); } catch { return null; }
  if (isReplacingHistory()) return null;
  if (Object.keys(state).length === 0) return null;
  const id = await idbBackupSave("auto", state);
  if (id === null) return null;
  try {
    localStorage.setItem(LAST_KEY, new Date(now).toISOString());
  } catch {
    /* no bloquea el backup ya guardado */
  }
  await idbBackupPrune(AUTO_BACKUP_LIMIT);
  const list = await idbBackupList();
  return list.find((r) => r.id === id) ?? null;
}
export const ARCHIVE_KEYS: Record<string, string> = {
  kinetix_workout_history: "workoutHistory", kinetix_exercise_history: "exerciseHistory",
  kinetix_body_metrics: "bodyMetrics", kinetix_nutrition_history: "nutritionHistory",
};
export async function collectFullState(): Promise<Record<string, unknown>> {
  await flushHistoryWrites();
  const state = collectKinetixState();
  // P4 Vault: con cifrado en reposo, localStorage guarda envelopes cifrados
  // (no arrays). El respaldo manual (la única vía con vault activo) exporta el
  // texto plano de la sesión DESBLOQUEADA; si está bloqueado no hay forma de
  // leer los datos, así que se falla con un mensaje claro en lugar de tratar el
  // cifrado como una lista y romper en el merge.
  if (isVaultEnabled()) {
    if (!isVaultUnlocked()) {
      throw new Error("Desbloqueá el vault para poder exportar el respaldo.");
    }
    for (const key of VAULT_KEYS as readonly string[]) {
      const plain = getVaultMemory(key);
      if (plain !== undefined) state[key] = plain;
    }
  }
  const archive = await hydrateFromArchive(true);
  for (const [key, kind] of Object.entries(ARCHIVE_KEYS)) {
    // strict: kind es string; se acota a las claves reales del archivo.
    const archived = archive[kind as keyof typeof archive] as unknown[] | null;
    state[key] = mergeArchived(
      Array.isArray(state[key]) ? (state[key] as unknown[]) : [],
      archived,
      (entry) =>
        (key === "kinetix_nutrition_history"
          ? (entry as { date?: string }).date
          : (entry as { id?: string }).id) as string
    );
  }
  return state;
}
export async function replaceFullState(data: Record<string, unknown>, wipe = false): Promise<void> {
  const entries = Object.entries(data).filter(([key]) => key.startsWith("kinetix_") && !EXCLUDED_BACKUP_KEYS.includes(key));
  for (const [key, value] of entries) {
    if (VALIDATORS[key] && !VALIDATORS[key](value)) throw new Error(`Backup inválido: ${key}. No se modificaron tus datos.`);
  }
  if (isReplacingHistory()) throw new Error("Ya hay una restauración en curso");
  // Vault: escribir texto plano bajo claves cifradas desincronizaría el vault.
  if (isVaultEnabled()) throw new Error("Desactivá el vault antes de restaurar un backup");
  await pauseHistoryWrites();
  const snapshot = new Map<string, string>();
  const keys = () => {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("kinetix_") && (wipe || !EXCLUDED_BACKUP_KEYS.includes(key))) result.push(key);
    }
    return result;
  };
  try {
    for (const key of keys()) snapshot.set(key, localStorage.getItem(key)!);
    for (const key of keys()) localStorage.removeItem(key);
    const archive: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      const kind = ARCHIVE_KEYS[key];
      if (kind) archive[kind] = value;
      const limit = key === "kinetix_nutrition_history" ? 365 : 200;
      const rawString = key === "kinetix_selected_program" || key === "kinetix_selected_routine";
      localStorage.setItem(key, rawString && typeof value === "string" ? value : JSON.stringify(kind && Array.isArray(value) ? value.slice(0, limit) : value));
    }
    await replaceArchive(archive, wipe);
  } catch (error) {
    try {
      for (const key of keys()) localStorage.removeItem(key);
      for (const [key, raw] of snapshot) localStorage.setItem(key, raw);
    } catch {
      throw new Error("No se pudo recuperar el almacenamiento anterior. Conservá tu archivo de backup.");
    } finally { resumeHistoryWrites(); }
    throw error;
  }
}
