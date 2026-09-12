import { describe, expect, it, beforeEach } from "vitest";
import {
  shouldRunAutoBackup,
  collectKinetixState,
  createAutoBackup,
  AUTO_BACKUP_INTERVAL_MS,
  EXCLUDED_BACKUP_KEYS,
} from "../src/utils/backupService";
import { installTestEnv } from "./helpers/testEnv";

installTestEnv();

describe("backupService — shouldRunAutoBackup", () => {
  it("devuelve true sin última corrida o con fecha inválida", () => {
    expect(shouldRunAutoBackup(null, Date.now())).toBe(true);
    expect(shouldRunAutoBackup("fecha-invalida", Date.now())).toBe(true);
  });

  it("devuelve false si pasó menos que el intervalo", () => {
    const last = Date.now() - 60 * 60 * 1000; // hace 1h
    expect(shouldRunAutoBackup(new Date(last).toISOString(), Date.now())).toBe(false);
  });

  it("devuelve true al cumplir el intervalo", () => {
    const last = Date.now() - AUTO_BACKUP_INTERVAL_MS;
    expect(shouldRunAutoBackup(new Date(last).toISOString(), Date.now())).toBe(true);
  });

  it("devuelve true con intervalo personalizado (vencido)", () => {
    const last = Date.now() - 12 * 60 * 1000;
    expect(shouldRunAutoBackup(new Date(last).toISOString(), Date.now(), 10 * 60 * 1000)).toBe(true);
  });

  it("devuelve false con intervalo personalizado (aún vigente)", () => {
    const last = Date.now() - 5 * 60 * 1000;
    expect(shouldRunAutoBackup(new Date(last).toISOString(), Date.now(), 10 * 60 * 1000)).toBe(false);
  });
});

describe("backupService — collectKinetixState", () => {
  beforeEach(() => localStorage.clear());

  it("colecta solo claves kinetix_* excluyendo las reservadas", () => {
    localStorage.setItem("kinetix_workout_history", JSON.stringify([{ id: "a" }]));
    localStorage.setItem("kinetix_prs", JSON.stringify([{ id: "pr" }]));
    localStorage.setItem("kinetix_nutrition_goal", '"cut"');
    for (const key of EXCLUDED_BACKUP_KEYS) localStorage.setItem(key, '"reservada"');
    localStorage.setItem("otra_app_clave", "no-kinetix");

    const state = collectKinetixState();
    expect(Object.keys(state)).toEqual(["kinetix_workout_history", "kinetix_prs", "kinetix_nutrition_goal"]);
    expect(state.kinetix_workout_history).toEqual([{ id: "a" }]);
    expect(state.kinetix_nutrition_goal).toBe("cut");
  });

  it("conserva el raw si una clave no es JSON válido", () => {
    localStorage.setItem("kinetix_weight_unit", "no-es-json{");
    const state = collectKinetixState();
    expect(state.kinetix_weight_unit).toBe("no-es-json{");
  });

  it("devuelve objeto vacío sin claves kinetix_*", () => {
    expect(collectKinetixState()).toEqual({});
  });
});

describe("backupService — createAutoBackup sin IndexedDB", () => {
  beforeEach(() => localStorage.clear());

  it("no falla y devuelve null cuando IndexedDB no está disponible", async () => {
    localStorage.setItem("kinetix_prs", JSON.stringify([{ id: "pr" }]));
    const created = await createAutoBackup(true, Date.now());
    expect(created).toBeNull();
  });

  it("no crea nada si no hay datos que respaldar", async () => {
    const created = await createAutoBackup(true, Date.now());
    expect(created).toBeNull();
  });
});