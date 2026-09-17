import { beforeEach, describe, expect, it, vi } from "vitest";
import { installTestEnv } from "./helpers/testEnv";

// Mock mínimo de IndexedDB: controla el archivo y cuenta wipes.
const db = vi.hoisted(() => ({
  archive: {} as Record<string, unknown>,
  wipeCalls: 0 as number,
}));
vi.mock("../src/utils/indexedDb", () => ({
  idbKvGet: async (key: string) => db.archive[key],
  idbKvPut: async () => undefined,
  replaceArchive: async (value: Record<string, unknown>) => { db.wipeCalls++; db.archive = value; },
  idbBackupGetData: async () => null,
  idbBackupList: async () => [],
  idbBackupPrune: async () => undefined,
  idbBackupSave: async () => 1,
}));

import { enableVault, unlockVault } from "../src/utils/vault";
import { safeParse, safeSet, isVaultEnabled } from "../src/utils/storage";
import { collectFullState } from "../src/utils/backupService";

installTestEnv();

class MemorySession {
  private store = new Map<string, string>();
  getItem(k: string): string | null { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string): void { this.store.set(k, String(v)); }
  removeItem(k: string): void { this.store.delete(k); }
  clear(): void { this.store.clear(); }
}

function installSession(): MemorySession {
  const g = globalThis as Record<string, unknown>;
  const s = new MemorySession();
  g.sessionStorage = s as unknown as Storage;
  return s;
}

// Evita reloads reales (el vault recarga tras cada flujo).
function stubReload(): void {
  const g = globalThis as Record<string, unknown>;
  const win = (g.window ?? {}) as Record<string, unknown>;
  win.location = { reload: () => {} };
  g.window = win as unknown as Window & typeof globalThis;
}

const hist = (id: string, date = "2026-09-13T20:22:00.000Z") => ({
  id, exerciseId: "barbell-bench-press", date, weight: 80, sets: 3, reps: [8, 8, 8], volumeKg: 1920,
});

beforeEach(() => {
  installSession().clear();
  localStorage.clear();
  stubReload();
  db.archive = {};
  db.wipeCalls = 0;
});

describe("vault: regresiones de migración y respaldo", () => {
  it("no pierde ejercicios con el mismo instante (IDs distintos) al habilitar", async () => {
    // Reproducción: dos ejercicios del MISMO instante en el archivo + uno local.
    db.archive.exerciseHistory = [hist("ex-1"), hist("ex-2")];
    localStorage.setItem("kinetix_exercise_history", JSON.stringify([hist("ex-local")]));

    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");
    const merged = safeParse("kinetix_exercise_history", []) as Array<{ id: string }>;
    expect(merged.map((e) => e.id).sort()).toEqual(["ex-1", "ex-2", "ex-local"]);
  });

  it("sin espacio para migrar: la activación ABORTA y el archivo NO se vacía", async () => {
    db.archive.workoutHistory = [{ id: "w1", routineName: "Push" }];
    const ls = localStorage as unknown as { setItem: (k: string, v: string) => void };
    const originalSetItem = ls.setItem.bind(ls);
    ls.setItem = (key: string, value: string) => {
      if (key === "kinetix_workout_history") throw new Error("QuotaExceededError");
      originalSetItem(key, value);
    };
    try {
      await expect(enableVault("contrasena-larga-123")).rejects.toThrow(/espacio/);
    } finally {
      ls.setItem = originalSetItem;
    }
    expect(isVaultEnabled()).toBe(false);
    expect(db.wipeCalls).toBe(0);
    expect(db.archive.workoutHistory).toEqual([{ id: "w1", routineName: "Push" }]);
  });

  it("exporta el texto plano del vault DESBLOQUEADO (el merge no rompe)", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1", routineName: "Push", date: "2026-09-13T10:00:00.000Z" }]);
    safeSet("kinetix_body_metrics", [{ id: "m1", date: "2026-09-13" }]);
    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");

    const state = await collectFullState();
    expect(state.kinetix_workout_history).toEqual([{ id: "w1", routineName: "Push", date: "2026-09-13T10:00:00.000Z" }]);
    expect(Array.isArray(state.kinetix_body_metrics)).toBe(true);
  });

  it("exportar con vault BLOQUEADO da un error claro (no descifra)", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    await expect(collectFullState()).rejects.toThrow(/Desbloqueá el vault/);
  });
});