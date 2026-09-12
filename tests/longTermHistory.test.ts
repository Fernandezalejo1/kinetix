import { describe, expect, it, beforeEach } from "vitest";
import { mergeArchived } from "../src/utils/longTermHistory";
import { installTestEnv } from "./helpers/testEnv";

installTestEnv();

describe("mergeArchived (historial de largo plazo)", () => {
  beforeEach(() => localStorage.clear());

  const getWork = (id: string) => ({ id, routineName: "R", date: "2026-01-01", totalVolumeKg: 1, totalSets: 3, exercises: [] });

  it("devuelve prev sin cambios cuando no hay archivo o está vacío", () => {
    const prev = [getWork("a"), getWork("b")];
    expect(mergeArchived(prev, null, (w) => w.id)).toEqual(prev);
    expect(mergeArchived(prev, [], (w) => w.id)).toEqual(prev);
  });

  it("devuelve prev cuando el archivo no tiene más entradas que prev", () => {
    const prev = [getWork("a"), getWork("b"), getWork("c")];
    const archived = [getWork("a"), getWork("b")];
    expect(mergeArchived(prev, archived, (w) => w.id)).toEqual(prev);
  });

  it("rehidrata el archivo completo cuando es más grande que prev", () => {
    const prev = [getWork("b"), getWork("c")]; // localStorage ya recortado (los más viejos se fueron)
    const archived = [getWork("old-1"), getWork("old-2"), getWork("b"), getWork("c")];
    const merged = mergeArchived(prev, archived, (w) => w.id);
    expect(merged).toHaveLength(4);
    expect(merged.map((w) => w.id)).toEqual(["old-1", "old-2", "b", "c"]);
  });

  it("incorpora entradas viejas del archivo aunque tenga igual longitud que prev", () => {
    const prev = [getWork("a"), getWork("b"), getWork("nueva-session")];
    const archived = [getWork("old-1"), getWork("a"), getWork("b")];
    const merged = mergeArchived(prev, archived, (w) => w.id);
    expect(merged.map((w) => w.id)).toEqual(["old-1", "a", "b", "nueva-session"]);
  });

  it("devuelve prev cuando el archivo es más chico (mirror atrasado: no borra sesiones nuevas)", () => {
    const prev = [getWork("a"), getWork("b"), getWork("nueva-session")];
    const archived = [getWork("a")];
    expect(mergeArchived(prev, archived, (w) => w.id)).toEqual(prev);
  });

  it("no duplica entradas: si prev ya tiene todas las del archivo, devuelve el archivo", () => {
    const prev = [getWork("a"), getWork("old-1"), getWork("b")];
    const archived = [getWork("old-1"), getWork("a"), getWork("b")];
    const merged = mergeArchived(prev, archived, (w) => w.id);
    expect(merged.map((w) => w.id)).toEqual(["old-1", "a", "b"]);
  });

  it("soporta clave por fecha (NutritionLog)", () => {
    const prev = [{ date: "2026-01-05", meals: [] as never[], waterMl: 0, calorieTarget: 0, proteinTarget: 0, carbsTarget: 0, fatsTarget: 0 }];
    const archived = [
      { date: "2026-01-01", meals: [] as never[], waterMl: 0, calorieTarget: 0, proteinTarget: 0, carbsTarget: 0, fatsTarget: 0 },
      { date: "2026-01-05", meals: [] as never[], waterMl: 0, calorieTarget: 0, proteinTarget: 0, carbsTarget: 0, fatsTarget: 0 },
    ];
    const merged = mergeArchived(prev, archived, (n) => n.date);
    expect(merged.map((n) => n.date)).toEqual(["2026-01-05", "2026-01-01"]);
  });
});