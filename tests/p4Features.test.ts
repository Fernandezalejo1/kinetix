import { describe, expect, it, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import { applyDupDay, countRecentCompletions, dupDayFor } from "../src/utils/dup";
import {
  changeVaultPassword,
  disableVault,
  enableVault,
  lockVault,
  unlockVault,
  verifyVaultPassword,
  VAULT_MIN_PASSWORD,
} from "../src/utils/vault";
import { isVaultCiphertext, isVaultEnabled, isVaultLocked, safeParse, safeSet, initVaultSessionFromStorage } from "../src/utils/storage";
import type { CompletedWorkout, Routine } from "../src/types";

installTestEnv();

// sessionStorage no existe en Node: mock mínimo tab-scoped.
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

// Evita reloads reales (vault recarga tras cada flujo).
function stubReload(): void {
  const g = globalThis as Record<string, unknown>;
  const win = (g.window ?? {}) as Record<string, unknown>;
  win.location = { reload: () => {} };
  g.window = win as unknown as Window & typeof globalThis;
}

function baseRoutine(): Routine {
  return {
    id: "r1",
    name: "Torso",
    description: "Base",
    targetSplit: "Push",
    estimatedDurationMin: 60,
    exercises: [
      { exerciseId: "barbell-bench-press", targetSets: 4, targetReps: "6-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
      { exerciseId: "dumbbell-biceps-curl", targetSets: 3, targetReps: "8-12", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 60 },
      { exerciseId: "front-plank", targetSets: 3, targetReps: "60s", targetRir: 2, targetTempo: "Sostén", restSeconds: 60 },
    ],
  };
}

function completion(daysAgo: number, name = "Torso"): CompletedWorkout {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w-${daysAgo}`, routineName: name, date: d.toISOString(),
    durationSeconds: 3600, totalVolumeKg: 5000, totalSets: 15,
    exercises: [], prCount: 0, averageRir: 2,
  };
}

// ─── DUP ──────────────────────────────────────────────────────
describe("P4: DUP por programa", () => {
  it("rota fuerza → hipertrofia → potencia por exposiciones", () => {
    expect(dupDayFor(0)).toBe("fuerza");
    expect(dupDayFor(1)).toBe("hipertrofia");
    expect(dupDayFor(2)).toBe("potencia");
    expect(dupDayFor(3)).toBe("fuerza");
  });

  it("primera vez (sin historial) toca fuerza con rango bajo", () => {
    const { routine, dupDay, adjusted } = applyDupDay(baseRoutine(), [], "science-hypertrophy-ppl");
    expect(dupDay).toBe("fuerza");
    expect(adjusted).toBe(1); // solo el press banca (compuesto)
    const bench = routine.exercises[0];
    expect(bench.targetReps).toBe("4-7"); // min 6 → 4-7
    expect(bench.targetRir).toBe(3);
    expect(bench.restSeconds).toBe(150);
  });

  it("segunda exposición = hipertrofia (rutina intacta)", () => {
    const h = [completion(3)];
    const { routine, dupDay, adjusted } = applyDupDay(baseRoutine(), h, "science-hypertrophy-ppl");
    expect(dupDay).toBeNull();
    expect(adjusted).toBe(0);
    expect(routine.exercises[0].targetReps).toBe("6-12");
    expect(routine.dupDay).toBeUndefined();
  });

  it("tercera exposición = potencia con reps altas y RIR bajo", () => {
    const h = [completion(3), completion(7)];
    const { routine, dupDay } = applyDupDay(baseRoutine(), h, "science-hypertrophy-ppl");
    expect(dupDay).toBe("potencia");
    expect(routine.exercises[0].targetReps).toBe("11-15");
    expect(routine.exercises[0].targetRir).toBe(1);
    expect(routine.exercises[0].restSeconds).toBe(105);
    expect(routine.dupDay).toBe("potencia");
  });

  it("aislados y tiempos no se tocan", () => {
    const { routine } = applyDupDay(baseRoutine(), [], "science-hypertrophy-ppl");
    expect(routine.exercises[1].targetReps).toBe("8-12"); // curl
    expect(routine.exercises[2].targetReps).toBe("60s"); // plancha
  });

  it("nightwing se excluye (ya ondula por diseño)", () => {
    const { dupDay, adjusted } = applyDupDay(baseRoutine(), [], "nightwing-7d");
    expect(dupDay).toBeNull();
    expect(adjusted).toBe(0);
  });

  it("no muta la rutina base", () => {
    const base = baseRoutine();
    applyDupDay(base, [], "science-hypertrophy-ppl");
    expect(base.exercises[0].targetReps).toBe("6-12");
    expect(base.dupDay).toBeUndefined();
  });

  it("cuenta exposiciones solo en ventana de 21 días", () => {
    const h = [completion(2), completion(30)];
    expect(countRecentCompletions("Torso", h)).toBe(1);
    expect(countRecentCompletions("Otro", h)).toBe(0);
  });
});

// ─── Vault ────────────────────────────────────────────────────
describe("P4: vault de cifrado en reposo", () => {
  beforeEach(() => {
    localStorage.clear();
    installSession().clear();
    stubReload();
  });

  it(`rechaza contraseña corta (<${VAULT_MIN_PASSWORD})`, async () => {
    await expect(enableVault("corta")).rejects.toThrow();
    expect(isVaultEnabled()).toBe(false);
  });

  it("enable cifra las claves y el parse cae a fallback sin borrar", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    safeSet("kinetix_body_metrics", [{ id: "m1" }]);
    await enableVault("contrasena-larga-123");
    expect(isVaultEnabled()).toBe(true);
    // En reposo: ciphertext ilegible, parse a fallback, sin borrado.
    const raw = localStorage.getItem("kinetix_workout_history");
    expect(isVaultCiphertext(raw)).toBe(true);
    expect(raw).not.toContain("w1");
    expect(safeParse("kinetix_workout_history", "FB")).toBe("FB");
    expect(localStorage.getItem("kinetix_workout_history")).not.toBeNull();
  });

  it("bloqueado: safeSet es no-op sobre claves del vault", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    expect(isVaultLocked()).toBe(true);
    const before = localStorage.getItem("kinetix_workout_history");
    expect(safeSet("kinetix_workout_history", [])).toBe(false);
    expect(localStorage.getItem("kinetix_workout_history")).toBe(before);
    // Claves fuera del vault siguen escribiendo.
    expect(safeSet("kinetix_selected_program", "ppl")).toBe(true);
  });

  it("contraseña incorrecta no desbloquea ni rompe nada", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    expect(await unlockVault("otra-clave-larga")).toBe(false);
    expect(await verifyVaultPassword("otra-clave-larga")).toBe(false);
    expect(isVaultLocked()).toBe(true);
  });

  it("unlock restaura los datos intactos (y el disco SIGUE cifrado)", async () => {
    const data = [{ id: "w1", routineName: "Push" }];
    safeSet("kinetix_workout_history", data);
    await enableVault("contrasena-larga-123");
    expect(await unlockVault("contrasena-larga-123")).toBe(true);
    expect(safeParse("kinetix_workout_history", [])).toEqual(data);
    // CRÍTICO: desbloqueado NO significa texto plano en disco.
    expect(isVaultCiphertext(localStorage.getItem("kinetix_workout_history"))).toBe(true);
  });

  it("CRÍTICO: desbloqueado mantiene 100% cifrado en reposo (solo memoria)", async () => {
    const data = [{ id: "w1", routineName: "Push" }];
    safeSet("kinetix_workout_history", data);
    safeSet("kinetix_readiness", [{ day: "2025-01-01", verdict: "go" }]);
    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");
    for (const key of ["kinetix_workout_history", "kinetix_readiness"]) {
      expect(isVaultCiphertext(localStorage.getItem(key))).toBe(true);
    }
    // Las claves del vault se leen desde memoria; el disco nunca se descifra.
    expect(safeParse("kinetix_readiness", [])).toEqual([{ day: "2025-01-01", verdict: "go" }]);
  });

  it("lock (sin contraseña) descarta sesión y deja ciphertext en disco", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");
    await lockVault();
    expect(isVaultLocked()).toBe(true);
    expect(safeParse("kinetix_workout_history", [])).toEqual([]); // ya no hay memoria
    expect(isVaultCiphertext(localStorage.getItem("kinetix_workout_history"))).toBe(true);
    await unlockVault("contrasena-larga-123");
    await disableVault("contrasena-larga-123");
    expect(isVaultEnabled()).toBe(false);
    expect(safeParse("kinetix_workout_history", [])).toEqual([{ id: "w1" }]);
  });

  it("lock bloquea la escritura (no-op) y no daña nada", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");
    const before = localStorage.getItem("kinetix_workout_history");
    await lockVault();
    expect(isVaultCiphertext(localStorage.getItem("kinetix_workout_history"))).toBe(true);
    expect(localStorage.getItem("kinetix_workout_history")).toBe(before);
  });

  it("sesión de pestaña: initVaultSessionFromStorage sigue desbloqueado sin clave", async () => {
    const data = [{ id: "w1", routineName: "Push" }];
    safeSet("kinetix_workout_history", data);
    await enableVault("contrasena-larga-123");
    await unlockVault("contrasena-larga-123");
    // Simula reload de la misma pestaña: el secreto sigue en sessionStorage.
    expect(await initVaultSessionFromStorage()).toBe(true);
    expect(isVaultLocked()).toBe(false);
    expect(safeParse("kinetix_workout_history", [])).toEqual(data);
    expect(isVaultCiphertext(localStorage.getItem("kinetix_workout_history"))).toBe(true);
  });

  it("change password: la vieja muere, la nueva abre (los datos no se tocan)", async () => {
    safeSet("kinetix_workout_history", [{ id: "w1" }]);
    await enableVault("contrasena-larga-123");
    await changeVaultPassword("contrasena-larga-123", "nueva-clave-larga-456");
    expect(await verifyVaultPassword("contrasena-larga-123")).toBe(false);
    expect(await verifyVaultPassword("nueva-clave-larga-456")).toBe(true);
    expect(isVaultCiphertext(localStorage.getItem("kinetix_workout_history"))).toBe(true);
    expect(await unlockVault("nueva-clave-larga-456")).toBe(true);
    expect(safeParse("kinetix_workout_history", [])).toEqual([{ id: "w1" }]);
  });
});
