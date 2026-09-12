import { describe, it, expect, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import {
  resolveNextRoutine,
  resolveAdaptedRoutine,
  resolveAdaptedRoutineForEquipment,
  pickNextRoutine,
  lastWorkoutForRoutine,
  daysSinceCompletion,
  persistSelectedProgram,
} from "../src/utils/userProfile";
import { PREBUILT_PROGRAMS } from "../src/data/programsData";
import { EXERCISES_DATABASE } from "../src/data/exercisesData";
import { CompletedWorkout, UserProfile } from "../src/types";

installTestEnv();

const PROFILE: UserProfile = {
  goal: "lean_bulk",
  experience: "intermedio",
  daysPerWeek: 4,
  sessionMinutes: 45,
  equipment: "gym",
};

const UL = PREBUILT_PROGRAMS.find((p) => p.id === "science-upper-lower-4d")!;
const [TorsoA, PiernaA, TorsoB, PiernaB] = UL.routines;

function workout(routineName: string, daysAgo: number): CompletedWorkout {
  return {
    id: `w-${routineName}-${daysAgo}`,
    routineName,
    date: daysAgo === 0 ? new Date().toISOString() : new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    durationSeconds: 1800,
    totalVolumeKg: 0,
    totalSets: 0,
    exercises: [],
    prCount: 0,
    averageRir: null,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("lastWorkoutForRoutine / daysSinceCompletion", () => {
  it("devuelve la última sesión de la rutina", () => {
    const h = [workout(TorsoA.name, 6), workout(PiernaA.name, 1), workout(TorsoA.name, 2)];
    const last = lastWorkoutForRoutine(TorsoA.name, h);
    expect(last?.date).toBe(h[2].date);
  });

  it("null para rutinas nunca entrenadas", () => {
    expect(lastWorkoutForRoutine(TorsoA.name, [])).toBeNull();
    expect(daysSinceCompletion(TorsoA, [])).toBeNull();
  });

  it("días transcurridos: 3 días atrás → 3; hoy → 0", () => {
    const h = [workout(TorsoA.name, 3)];
    expect(daysSinceCompletion(TorsoA, h)).toBe(3);
    expect(daysSinceCompletion(TorsoB, [workout(TorsoB.name, 0)])).toBe(0);
  });
});

describe("pickNextRoutine (regla del microciclo)", () => {
  it("sin historial devuelve el fallback (rutina guardada/primera)", () => {
    expect(pickNextRoutine(UL.routines, [], TorsoA)).toBe(TorsoA);
  });

  it("prioriza la rutina AÚN NO entrenada del ciclo", () => {
    const h = [workout(PiernaA.name, 1), workout(TorsoA.name, 5), workout(TorsoB.name, 3)];
    const next = pickNextRoutine(UL.routines, h, TorsoA);
    expect(next.name).toBe(PiernaB.name); // la única que nunca se hizo
  });

  it("sin pendientes nuevas, elige la que hace MÁS tiempo que no se entrena", () => {
    // Las 4 ya fueron entrenadas: toca la más olvidada (antes en el programa).
    const h = [
      workout(TorsoA.name, 4),
      workout(TorsoB.name, 4),
      workout(PiernaA.name, 3),
      workout(PiernaB.name, 2),
    ];
    const next = pickNextRoutine(UL.routines, h, TorsoA);
    expect(next.name).toBe(TorsoA.name);
  });

  it("nunca repite la rutina ya COMPLETADA hoy", () => {
    const h = [
      workout(TorsoB.name, 0), // hoy
      workout(PiernaA.name, 2),
      workout(TorsoA.name, 4),
      workout(PiernaB.name, 5),
    ];
    const next = pickNextRoutine(UL.routines, h, TorsoA);
    expect(next.name).not.toBe(TorsoB.name);
    expect(next.name).toBe(PiernaB.name);
  });

  it("si todas ya se entrenaron hoy, cae al fallback sin repetir ninguna forzada", () => {
    const h = UL.routines.map((r, i) => workout(r.name, Math.min(i, 1)));
    const next = pickNextRoutine(UL.routines, h, TorsoA);
    expect(next).toBeDefined();
  });
});

describe("resolveNextRoutine / resolveAdaptedRoutine con historial", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("el programa destacado del perfil de 4d es Upper/Lower y rota por historial", () => {
    persistSelectedProgram(UL);
    const h = [workout(PiernaA.name, 1), workout(TorsoB.name, 2), workout(PiernaB.name, 3)];
    const next = resolveNextRoutine(PROFILE, h);
    expect(UL.routines.map((r) => r.name)).toContain(next.name);
    expect(next.name).toBe(TorsoA.name); // la única del programa que falta y hace más tiempo
  });

  it("resolveAdaptedRoutine respeta el equipamiento del perfil (home → sin máquinas)", () => {
    persistSelectedProgram(UL);
    const h = [workout(PiernaA.name, 1)];
    const adapted = resolveAdaptedRoutine({ ...PROFILE, equipment: "home" }, h);
    expect(UL.routines.map((r) => r.name)).toContain(adapted.name);
    for (const item of adapted.exercises) {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
      if (def) expect(def.equipment).toBe("bodyweight");
    }
  });

  it("override de HOY manda aunque el perfil diga gym o no exista perfil", () => {
    persistSelectedProgram(UL);
    const gymHome = resolveAdaptedRoutineForEquipment(
      { ...PROFILE, equipment: "gym" },
      [],
      "home"
    );
    for (const item of gymHome.exercises) {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
      if (def) expect(def.equipment).toBe("bodyweight");
    }
    const nullHome = resolveAdaptedRoutineForEquipment(null, [], "home");
    for (const item of nullHome.exercises) {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
      if (def) expect(def.equipment).toBe("bodyweight");
    }
  });

  it("sin historial: devuelve la rutina guardada o la primera", () => {
    persistSelectedProgram(UL);
    const next = resolveNextRoutine(PROFILE);
    expect(next.name).toBe(UL.routines[0].name);
  });
});