import { describe, expect, it } from "vitest";
import {
  isExerciseExpanded,
  toggleExerciseFold,
  type ExerciseFoldState,
} from "../src/utils/sessionView";

const EMPTY: ExerciseFoldState = { overrideId: null, collapsed: {} };

describe("plegado de ejercicios en el entrenamiento", () => {
  it("el ejercicio activo muestra controles; los demás quedan en resumen", () => {
    expect(isExerciseExpanded({ exerciseId: "a", isTimed: false, isActive: true, fold: EMPTY })).toBe(true);
    expect(isExerciseExpanded({ exerciseId: "b", isTimed: false, isActive: false, fold: EMPTY })).toBe(false);
  });

  it("plegar el activo oculta todo su contenido hasta reabrirlo", () => {
    const folded = toggleExerciseFold(EMPTY, "a", { isTimed: false, isActive: true });
    expect(folded.expanded).toBe(false);
    // Aunque siga siendo el activo, plegado manda.
    expect(
      isExerciseExpanded({ exerciseId: "a", isTimed: false, isActive: true, fold: folded.next })
    ).toBe(false);
    // Reabrir muestra los controles de nuevo.
    const reopened = toggleExerciseFold(folded.next, "a", { isTimed: false, isActive: true });
    expect(reopened.expanded).toBe(true);
  });

  it("desplegar un ejercicio no activo lo expande sin plegar al resto", () => {
    const opened = toggleExerciseFold(EMPTY, "b", { isTimed: false, isActive: false });
    expect(opened.expanded).toBe(true);
    expect(
      isExerciseExpanded({ exerciseId: "a", isTimed: false, isActive: true, fold: opened.next })
    ).toBe(true);
  });

  it("los ejercicios de tiempo/cardio nunca se pliegan", () => {
    const res = toggleExerciseFold(EMPTY, "cardio", { isTimed: true, isActive: true });
    expect(res.expanded).toBe(true);
    expect(
      isExerciseExpanded({ exerciseId: "cardio", isTimed: true, isActive: false, fold: res.next })
    ).toBe(true);
  });
});
