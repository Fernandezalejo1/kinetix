/**
 * IndexedDB — almacenamiento local de largo plazo y copias automáticas.
 *
 * Dos object stores:
 *   - kv:       un único registro por "kind" con el historial COMPLETO
 *               (sin el recorte de capacidad de localStorage). Es la fuente
 *               de recuperación cuando localStorage ya recortó entradas.
 *   - backups:  snapshots completos del estado (copias automáticas) con id
 *               autoincremental.
 *
 * Las escrituras del archivo y las lecturas estrictas propagan errores para
 * evitar confirmar backups incompletos. Las consultas auxiliares tienen fallback.
 */

const DB_NAME = "kinetix-longterm";
const DB_VERSION = 1;
const KV_STORE = "kv";
const BACKUP_STORE = "backups";

let dbPromise: Promise<IDBDatabase | null> | null = null;

export const idbAvailable = (): boolean => typeof indexedDB !== "undefined";

export const openKinetixDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE, { keyPath: "kind" });
        }
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          db.createObjectStore(BACKUP_STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });
  return dbPromise;
};

const requestToPromise = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });

export interface KvRecord<T> {
  kind: string;
  data: T;
  updatedAt: string;
}

export interface AutoBackupRecord {
  id: number;
  createdAt: string;
  reason: string;
  entries: number;
  data: Record<string, unknown>;
}

export interface AutoBackupMeta {
  id: number;
  createdAt: string;
  reason: string;
  entries: number;
}

export async function idbKvPut<T>(kind: string, data: T): Promise<void> {
  const db = await openKinetixDb();
  if (!db) throw new Error("No se pudo guardar el archivo local");
    const tx = db.transaction(KV_STORE, "readwrite");
    tx.objectStore(KV_STORE).put({ kind, data, updatedAt: new Date().toISOString() } as KvRecord<T>);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IDB write aborted"));
    });
}

export async function idbKvGet<T>(kind: string, strict = false): Promise<T | undefined> {
  const db = await openKinetixDb();
  if (!db) { if (strict) throw new Error("No se pudo leer el archivo local"); return undefined; }
  try {
    const rec = await requestToPromise(
      db.transaction(KV_STORE, "readonly").objectStore(KV_STORE).get(kind) as IDBRequest<KvRecord<T> | undefined>
    );
    return rec?.data;
  } catch (error) {
    if (strict) throw error;
    return undefined;
  }
}

export async function idbBackupSave(reason: string, data: Record<string, unknown>): Promise<number | null> {
  const db = await openKinetixDb();
  if (!db) return null;
  try {
    return await requestToPromise(
      db.transaction(BACKUP_STORE, "readwrite").objectStore(BACKUP_STORE).add({
        createdAt: new Date().toISOString(),
        reason,
        entries: Object.keys(data).length,
        data,
      } as Omit<AutoBackupRecord, "id">) as IDBRequest<number>
    );
  } catch {
    return null;
  }
}

export async function idbBackupList(): Promise<AutoBackupMeta[]> {
  const db = await openKinetixDb();
  if (!db) return [];
  try {
    const all = await requestToPromise(
      db.transaction(BACKUP_STORE, "readonly").objectStore(BACKUP_STORE).getAll() as IDBRequest<AutoBackupRecord[]>
    );
    return all
      .map(({ id, createdAt, reason, entries }) => ({ id, createdAt, reason, entries }))
      .sort((a, b) => b.id - a.id);
  } catch {
    return [];
  }
}

export async function idbBackupGetData(id: number): Promise<Record<string, unknown> | null> {
  const db = await openKinetixDb();
  if (!db) return null;
  try {
    const rec = await requestToPromise(
      db.transaction(BACKUP_STORE, "readonly").objectStore(BACKUP_STORE).get(id) as IDBRequest<AutoBackupRecord | undefined>
    );
    return rec?.data ?? null;
  } catch {
    return null;
  }
}

export async function idbBackupDelete(id: number): Promise<boolean> {
  const db = await openKinetixDb();
  if (!db) return false;
  try {
    await requestToPromise(db.transaction(BACKUP_STORE, "readwrite").objectStore(BACKUP_STORE).delete(id) as IDBRequest<void>);
    return true;
  } catch {
    return false;
  }
}

export async function idbBackupPrune(keep: number): Promise<number> {
  const db = await openKinetixDb();
  if (!db) return 0;
  const all = await idbBackupList();
  if (all.length <= keep) return 0;
  const toDelete = all.slice(keep).map((r) => r.id);
  try {
    const tx = db.transaction(BACKUP_STORE, "readwrite");
    const store = tx.objectStore(BACKUP_STORE);
    for (const id of toDelete) store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB prune failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IDB prune aborted"));
    });
    return toDelete.length;
  } catch {
    return 0;
  }
}
export async function replaceArchive(data: Record<string, unknown>, wipeBackups = false): Promise<void> {
  const db = await openKinetixDb();
  if (!db) throw new Error("No se pudo abrir el archivo local");
  const tx = db.transaction([KV_STORE, BACKUP_STORE], "readwrite");
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("No se pudo guardar el archivo"));
  });
  const store = tx.objectStore(KV_STORE);
  store.clear();
  for (const [kind, value] of Object.entries(data)) store.put({ kind, data: value, updatedAt: new Date().toISOString() });
  if (wipeBackups) tx.objectStore(BACKUP_STORE).clear();
  await done;
}
