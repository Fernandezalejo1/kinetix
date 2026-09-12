import { describe, it, expect } from "vitest";
import {
  adaptRoutineToEquipment,
  findAlternativeExercise,
  routineNeedsAdaptation,
  EQUIPMENT_ALLOWED,
} from "../src/utils/equipmentAdapter";
import { EXERCISES_DATABASE } from "../src/data/exercisesData";
import { PREBUILT_PROGRAMS } from "../src/data/programsData";
import { Routine } from "../src/types";

const benchPress = EXERCISES_DATABASE.find((e) => e.id === "barbell-bench-press")!;
const latRaise = EXERCISES_DATABASE.find((e) => e.id === "cable-lateral-raise")!;

const sampleRoutine: Routine = {
  id: "test-routine",
  name: "Push Test",
  description: "Rutina de prueba",
  targetSplit: "Push",
  estimatedDurationMin: 55,
  exercises: [
    { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 120 },
    { exerciseId: "cable-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
  ],
};

describe("equipmentAdapter: findAlternativeExercise", () => {
  it("devuelve el mismo ejercicio si ya es accesible", () => {
    expect(findAlternativeExercise(benchPress, "gym")).toBe(benchPress);
  });

  it("para 'home' sustituye un press con barra por un push de peso corporal", () => {
    const alt = findAlternativeExercise(benchPress, "home");
    expect(alt.category).toBe("push");
    expect(alt.primaryMuscles).toContain("chest");
    expect(EQUIPMENT_ALLOWED.home.has(alt.equipment)).toBe(true);
  });

  it("para 'basic' sustituye la barra por mancuerna (mismo músculo primario)", () => {
    const alt = findAlternativeExercise(benchPress, "basic");
    expect(EQUIPMENT_ALLOWED.basic.has(alt.equipment)).toBe(true);
    expect(alt.primaryMuscles).toContain("chest");
  });

  it("para 'home' sustituye una elevación lateral de polea por una alternativa sin aparato", () => {
    const alt = findAlternativeExercise(latRaise, "home");
    expect(alt.category).toBe("push");
    expect(EQUIPMENT_ALLOWED.home.has(alt.equipment)).toBe(true);
    expect(EQUIPMENT_ALLOWED.home.has(latRaise.equipment)).toBe(false);
  });

  it("las sustituciones son deterministas", () => {
    const a = findAlternativeExercise(benchPress, "home");
    const b = findAlternativeExercise(benchPress, "home");
    expect(a.id).toBe(b.id);
  });
});

describe("equipmentAdapter: adaptRoutineToEquipment", () => {
  it("con nivel 'gym' devuelve la rutina idéntica (misma referencia)", () => {
    expect(adaptRoutineToEquipment(sampleRoutine, "gym")).toBe(sampleRoutine);
  });

  it("con 'home' sustituye ejercicios pero conserva estructura, sets y RIR", () => {
    const adapted = adaptRoutineToEquipment(sampleRoutine, "home");
    expect(adapted).not.toBe(sampleRoutine);
    expect(adapted.exercises).toHaveLength(sampleRoutine.exercises.length);
    adapted.exercises.forEach((item, i) => {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId)!;
      expect(EQUIPMENT_ALLOWED.home.has(def.equipment)).toBe(true);
      expect(item.targetSets).toBe(sampleRoutine.exercises[i].targetSets);
      expect(item.targetRir).toBe(sampleRoutine.exercises[i].targetRir);
      expect(item.targetReps).toBe(sampleRoutine.exercises[i].targetReps);
    });
  });

  it("con 'home' ninguna rutina de los programas queda con barras/poleas/máquinas", () => {
    const allowed = EQUIPMENT_ALLOWED.home;
    for (const program of PREBUILT_PROGRAMS) {
      for (const routine of program.routines) {
        const adapted = adaptRoutineToEquipment(routine, "home");
        for (const item of adapted.exercises) {
          const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
          if (def) expect(allowed.has(def.equipment)).toBe(true);
        }
      }
    }
  });
});

describe("equipmentAdapter: routineNeedsAdaptation", () => {
  it("detecta que una rutina con máquinas necesita adaptación solo para niveles sin ese equipo", () => {
    expect(routineNeedsAdaptation(sampleRoutine, "home")).toBe(true);
    expect(routineNeedsAdaptation(sampleRoutine, "basic")).toBe(true);
    expect(routineNeedsAdaptation(sampleRoutine, "gym")).toBe(false);
  });
});