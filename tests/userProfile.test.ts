import { describe, it, expect, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import { isUserProfile, safeParse, safeSet, VALIDATORS } from "../src/utils/storage";
import {
  DEFAULT_USER_PROFILE,
  loadUserProfile,
  saveUserProfile,
  recommendProgram,
  resolveFeaturedProgram,
  resolveNextRoutine,
  persistSelectedProgram,
  pickSessionFitting,
} from "../src/utils/userProfile";
import { PREBUILT_PROGRAMS } from "../src/data/programsData";
import type { Program, Routine, UserProfile } from "../src/types";

installTestEnv();

const VALID_PROFILE: UserProfile = {
  goal: "lean_bulk",
  experience: "intermedio",
  daysPerWeek: 4,
  sessionMinutes: 45,
  equipment: "gym",
  completedAt: "2026-09-11T10:00:00.000Z",
};

beforeEach(() => {
  globalThis.localStorage.clear();
});

const routineOf = (program: Program, id: string): Routine | undefined =>
  program.routines.find((r) => r.id === id);

describe("isUserProfile (guard del perfil persistido)", () => {
  it("acepta un perfil completo", () => {
    expect(isUserProfile(VALID_PROFILE)).toBe(true);
  });

  it("acepta el perfil por defecto", () => {
    expect(isUserProfile(DEFAULT_USER_PROFILE)).toBe(true);
  });

  it("rechaza valores fuera de rango", () => {
    expect(isUserProfile({ ...VALID_PROFILE, goal: "bulk" })).toBe(false);
    expect(isUserProfile({ ...VALID_PROFILE, daysPerWeek: 99 })).toBe(false);
    expect(isUserProfile({ ...VALID_PROFILE, sessionMinutes: 240 })).toBe(false);
  });

  it("está registrado en VALIDATORS bajo la clave del onboarding", () => {
    expect(VALIDATORS["kinetix_user_profile"]).toBeDefined();
    expect(VALIDATORS["kinetix_user_profile"](VALID_PROFILE)).toBe(true);
  });
});

describe("load/save perfil (roundtrip en localStorage)", () => {
  it("arranca sin perfil (null)", () => {
    expect(loadUserProfile()).toBeNull();
  });

  it("guarda y recarga el mismo perfil", () => {
    saveUserProfile(VALID_PROFILE);
    expect(loadUserProfile()).toEqual(VALID_PROFILE);
  });

  it("perfil corrupto en storage devuelve null sin romper", () => {
    globalThis.localStorage.setItem("kinetix_user_profile", JSON.stringify({ goal: "hulk", daysPerWeek: 99 }));
    expect(loadUserProfile()).toBeNull();
  });

  it("safeSet/safeParse respetan validadores", () => {
    safeSet("kinetix_user_profile", VALID_PROFILE);
    expect(isUserProfile(safeParse("kinetix_user_profile", null, isUserProfile))).toBe(true);
  });
});

describe("recommendProgram (recomendación explicable)", () => {
  it("2-3 días/sem sin corte → Full Body", () => {
    const p = recommendProgram({ ...VALID_PROFILE, daysPerWeek: 3 });
    expect(p.id).toBe("fbeod-full-body");
  });

  it("4 días/sem sin corte → Upper/Lower", () => {
    const p = recommendProgram({ ...VALID_PROFILE, daysPerWeek: 4 });
    expect(p.id).toBe("science-upper-lower-4d");
  });

  it("objetivo cut con 4 días → DEFINITION", () => {
    const p = recommendProgram({ ...VALID_PROFILE, goal: "cut", daysPerWeek: 4 });
    expect(p.id).toBe("definition-abs-4d");
  });

  it("asistente sin perfil devuelve algo", () => {
    expect(recommendProgram(null)).not.toBeNull();
  });

  it("siempre devuelve un programa preconstruido existente", () => {
    [2, 3, 4, 5, 6].forEach((d) => {
      const p = recommendProgram({ ...VALID_PROFILE, daysPerWeek: d });
      expect(PREBUILT_PROGRAMS.map((x) => x.id)).toContain(p.id);
    });
  });
});

describe("resolveFeaturedProgram (destacado)", () => {
  it("4 días/sem recomienda Upper/Lower 4d", () => {
    const p = resolveFeaturedProgram({ ...VALID_PROFILE, daysPerWeek: 4 });
    expect(p.id).toBe("science-upper-lower-4d");
  });

  it("devuelve siempre un programa válido", () => {
    [2, 3, 4, 5, 6].forEach((d) => {
      const p = resolveFeaturedProgram({ ...VALID_PROFILE, daysPerWeek: d });
      expect(PREBUILT_PROGRAMS.map((x) => x.id)).toContain(p.id);
    });
  });
});

describe("resolveNextRoutine (siguiente sesión)", () => {
  it("4 días/sem devuelve la 1ª rutina del Upper/Lower", () => {
    const program = resolveFeaturedProgram({ ...VALID_PROFILE, daysPerWeek: 4 });
    const next = resolveNextRoutine(VALID_PROFILE);
    expect(next).not.toBeNull();
    expect(routineOf(program, next.id)).toBeDefined();
  });
});

describe("sync: selección explícita gana sobre la recomendación", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("persistSelectedProgram hace que resolveFeaturedProgram lo respete", () => {
    const explicit = PREBUILT_PROGRAMS[0];
    persistSelectedProgram(explicit);
    expect(resolveFeaturedProgram({ ...VALID_PROFILE, daysPerWeek: 4 }).id).toBe(explicit.id);
  });

  it("sin selección explícita usa la recomendación del perfil", () => {
    expect(resolveFeaturedProgram({ ...VALID_PROFILE, daysPerWeek: 4 }).id).toBe("science-upper-lower-4d");
  });
});

describe("pickSessionFitting (elije la rutina que entra en el tiempo)", () => {
  const short: Routine = {
    id: "r-short",
    name: "Corta",
    description: "",
    targetSplit: "Push",
    estimatedDurationMin: 25,
    exercises: [],
  };
  const med: Routine = {
    id: "r-med",
    name: "Media",
    description: "",
    targetSplit: "Push",
    estimatedDurationMin: 50,
    exercises: [],
  };
  const long: Routine = {
    id: "r-long",
    name: "Larga",
    description: "",
    targetSplit: "Push",
    estimatedDurationMin: 75,
    exercises: [],
  };

  it("entran varias: elige la más larga que cabe", () => {
    expect(pickSessionFitting({ ...VALID_PROFILE, sessionMinutes: 55 }, [short, med, long])?.id).toBe("r-med");
  });

  it("no cabe ninguna: devuelve la más corta", () => {
    expect(pickSessionFitting({ ...VALID_PROFILE, sessionMinutes: 15 }, [short, med, long])?.id).toBe("r-short");
  });

  it("routines vacías devuelve null", () => {
    expect(pickSessionFitting(VALID_PROFILE, [])).toBeNull();
  });
});
