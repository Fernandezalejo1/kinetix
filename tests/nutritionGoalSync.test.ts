import { describe, expect, it } from "vitest";
import {
  isNutritionGoalCustomized,
  phaseToNutritionGoal,
  readStoredTrainingPhase,
  resolveDefaultNutritionGoal,
  type StorageReader,
} from "../src/utils/nutritionGoalSync";

const readerOf = (store: Record<string, string>): StorageReader => (k) => store[k] ?? null;

describe("fuente única de verdad del objetivo (fase ↔ nutrición)", () => {
  it("mapea cada fase a su estrategia equivalente", () => {
    expect(phaseToNutritionGoal("cut")).toBe("cut");
    expect(phaseToNutritionGoal("maintenance")).toBe("maintenance");
    expect(phaseToNutritionGoal("lean_bulk")).toBe("lean_bulk");
  });

  it("la estrategia por defecto deriva de la fase guardada (no de un default fijo)", () => {
    // Caso reportado: fase Definición pero Nutrición en Volumen Magro.
    const read = readerOf({ kinetix_goal_phase: JSON.stringify({ id: "cut", setAt: 1 }) });
    expect(readStoredTrainingPhase(read)).toBe("cut");
    expect(resolveDefaultNutritionGoal(read)).toBe("cut");
    expect(resolveDefaultNutritionGoal(readerOf({}))).toBe("cut");
  });

  it("ignora fases guardadas rotas o desconocidas", () => {
    expect(readStoredTrainingPhase(readerOf({ kinetix_goal_phase: "no-json" }))).toBeNull();
    expect(readStoredTrainingPhase(readerOf({ kinetix_goal_phase: JSON.stringify({ id: "keto" }) }))).toBeNull();
  });

  it("la personalización explícita gana sobre la fase", () => {
    const custom = readerOf({ kinetix_nutrition_goal_custom: "1" });
    expect(isNutritionGoalCustomized(custom)).toBe(true);
    expect(isNutritionGoalCustomized(readerOf({}))).toBe(false);
  });
});
