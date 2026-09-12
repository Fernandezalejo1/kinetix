import { describe, it, expect, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import {
  recommendProgram,
  adaptProgramRoutines,
  resolveAdaptedRoutine,
  DEFAULT_USER_PROFILE,
} from "../src/utils/userProfile";
import { adaptRoutineToEquipment } from "../src/utils/equipmentAdapter";
import { EXERCISES_DATABASE } from "../src/data/exercisesData";
import { UserProfile } from "../src/types";

installTestEnv();

const incluirPerfil = (overrides: Partial<UserProfile>): UserProfile => ({
  ...DEFAULT_USER_PROFILE,
  ...overrides,
});

describe("userProfile: recommendProgram", () => {
  it("usa la experiencia para modular la frecuencia (principiante → más frecuente)", () => {
    expect(recommendProgram(incluirPerfil({ goal: "lean_bulk", daysPerWeek: 4, experience: "principiante" })).id).toBe("fbeod-full-body");
    expect(recommendProgram(incluirPerfil({ goal: "lean_bulk", daysPerWeek: 4, experience: "intermedio" })).id).toBe("science-upper-lower-4d");
  });

  it("6 días: avanzado → PPL, principiante → Upper/Lower", () => {
    expect(recommendProgram(incluirPerfil({ goal: "lean_bulk", daysPerWeek: 6, experience: "avanzado" })).id).toBe("science-hypertrophy-ppl");
    expect(recommendProgram(incluirPerfil({ goal: "lean_bulk", daysPerWeek: 6, experience: "principiante" })).id).toBe("science-upper-lower-4d");
  });

  it("mantiene la prioridad de DEFINICIÓN para objetivo cut", () => {
    expect(recommendProgram(incluirPerfil({ goal: "cut", daysPerWeek: 3 })).id).toBe("fbeod-full-body");
    expect(recommendProgram(incluirPerfil({ goal: "cut", daysPerWeek: 6 })).id).toBe("science-hypertrophy-ppl");
  });

  it("2-3 días siempre Full Body; 7 días NIGHTWING", () => {
    expect(recommendProgram(incluirPerfil({ daysPerWeek: 2 })).id).toBe("fbeod-full-body");
    expect(recommendProgram(incluirPerfil({ daysPerWeek: 3 })).id).toBe("fbeod-full-body");
    expect(recommendProgram(incluirPerfil({ daysPerWeek: 7 })).id).toBe("nightwing-7d");
  });

  it("dos usuarios con el mismo objetivo/días pero distinto equipamiento recibirán el MISMO programa (la adaptación ocurre en las rutinas)", () => {
    const home = recommendProgram(incluirPerfil({ daysPerWeek: 5, equipment: "home" }));
    const gym = recommendProgram(incluirPerfil({ daysPerWeek: 5, equipment: "gym" }));
    expect(home.id).toBe(gym.id);
  });
});

describe("userProfile: adaptProgramRoutines y resolveAdaptedRoutine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("un usuario 'home' recibe las rutinas del programa sin ejercicios de gimnasio", () => {
    const perfil = incluirPerfil({ equipment: "home", daysPerWeek: 4, experience: "intermedio" });
    const program = recommendProgram(perfil);
    const adapted = adaptProgramRoutines(program, perfil);
    const allowedHome = ["bodyweight"];
    for (const routine of adapted) {
      for (const item of routine.exercises) {
        const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
        if (def) expect(allowedHome).toContain(def.equipment);
      }
    }
  });

  it("resolveAdaptedRoutine devuelve la rutina de 'hoy' adaptada (home)", () => {
    const perfil = incluirPerfil({ equipment: "home" });
    const program = recommendProgram(perfil);
    // Persistir selección explícita para que use la primera rutina del programa.
    localStorage.setItem("kinetix_selected_program", program.id);
    localStorage.setItem("kinetix_selected_routine", program.routines[0].id);

    const adapted = resolveAdaptedRoutine(perfil);
    const expected = adaptRoutineToEquipment(program.routines[0], "home");
    expect(adapted.id).toBe(expected.id);
    expect(adapted.exercises.map((e) => e.exerciseId)).toEqual(expected.exercises.map((e) => e.exerciseId));
  });

  it("un usuario 'gym' recibe la rutina sin adaptación", () => {
    const perfil = incluirPerfil({ equipment: "gym" });
    const program = recommendProgram(perfil);
    const adapted = adaptProgramRoutines(program, perfil);
    for (let i = 0; i < program.routines.length; i++) {
      expect(adapted[i].exercises.map((e) => e.exerciseId)).toEqual(program.routines[i].exercises.map((e) => e.exerciseId));
    }
  });
});