// =============================================================
// KINETIX — Perfil de entrenamiento del usuario (onboarding).
// Se usa para recomendar programa, frecuencia y duración de
// sesión de forma EXPLICABLE (reglas transparentes, sin heurística
// oculta). Live solo en este dispositivo.
// =============================================================

import { CompletedWorkout, Program, Routine, UserProfile, EquipmentAccess } from "../types";
import { PREBUILT_PROGRAMS } from "../data/programsData";
import { safeParse, safeSet, isUserProfile } from "./storage";
import { adaptRoutineToEquipment } from "./equipmentAdapter";
import { applyDupDay } from "./dup";
import { localDateKey } from "./dateUtils";

export const USER_PROFILE_KEY = "kinetix_user_profile";

export const DEFAULT_USER_PROFILE: UserProfile = {
  goal: "lean_bulk",
  experience: "intermedio",
  daysPerWeek: 4,
  sessionMinutes: 45,
  equipment: "gym",
};

export const loadUserProfile = (): UserProfile | null =>
  safeParse<UserProfile | null>(USER_PROFILE_KEY, null, isUserProfile);

/** Persiste el perfil y lo deja listo para la próxima carga estricta. */
export const saveUserProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    safeSet(USER_PROFILE_KEY, profile);
  }
};

/** True si el usuario ya completó el onboarding (perfil guardado). */
export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(USER_PROFILE_KEY) !== null;
  } catch {
    return false;
  }
};

/**
 * Recomendación de programa EXPLICABLE según perfil:
 *  - Objetivo "cut" prioriza DEFINITION (alta frecuencia + foco en
 *    recomposición); se permite volumen moderado.
 *  - Sin corte: días 2-3 → Full Body FBEOD; 4-5 → Upper/Lower (o FBEOD
 *    para principiantes, que toleran mejor la frecuencia alta);
 *    6 → PPL (o Upper/Lower para principiantes); 7 → NIGHTWING.
 * La experiencia modula la intensidad por sesión (más frecuencia,
 * menos volumen por sesión para principiantes). El equipamiento NO cambia
 * el programa: las rutinas se ADAPTAN en `adaptProgramRoutines`/`resolveAdaptedRoutine`
 * sustituyendo ejercicios inaccesibles por equivalentes del catálogo.
 */
export function recommendProgram(profile: UserProfile | null): Program {
  const days = profile?.daysPerWeek ?? DEFAULT_USER_PROFILE.daysPerWeek;
  const goal = profile?.goal ?? DEFAULT_USER_PROFILE.goal;
  const experience = profile?.experience ?? DEFAULT_USER_PROFILE.experience;
  let id: string;
  if (days <= 3) {
    id = "fbeod-full-body";
  } else if (goal === "cut") {
    if (days <= 4) id = "definition-abs-4d";
    else if (days <= 6) id = "science-hypertrophy-ppl";
    else id = "nightwing-7d";
  } else if (days <= 5) {
    id = experience === "principiante" ? "fbeod-full-body" : "science-upper-lower-4d";
  } else if (days <= 6) {
    id = experience === "principiante" ? "science-upper-lower-4d" : "science-hypertrophy-ppl";
  } else {
    id = "nightwing-7d";
  }
  const program = PREBUILT_PROGRAMS.find((p) => p.id === id) ?? PREBUILT_PROGRAMS[0];
  return fitProgramToSchedule(program, days);
}

/** Programa activo: el elegido explícitamente en Programas, o la
 *  recomendación del perfil como fallback determinista. */
export function resolveFeaturedProgram(profile: UserProfile | null): Program {
  try {
    const saved = localStorage.getItem("kinetix_selected_program");
    const selected = PREBUILT_PROGRAMS.find((p) => p.id === saved);
    return selected ? fitProgramToSchedule(selected, profile?.daysPerWeek ?? 4) : recommendProgram(profile);
  } catch {
    return recommendProgram(profile);
  }
}

/** Último workout COMPLETADO que coincide con el nombre de una rutina
 *  (las rutinas adaptadas conservan el nombre, así el match es estable). */
export function lastWorkoutForRoutine(
  routineName: string,
  history: CompletedWorkout[]
): CompletedWorkout | null {
  let best: CompletedWorkout | null = null;
  let bestTs = -Infinity;
  for (const w of history) {
    if (w.routineName !== routineName) continue;
    const ts = new Date(w.date).getTime();
    if (!Number.isNaN(ts) && ts > bestTs) {
      bestTs = ts;
      best = w;
    }
  }
  return best;
}

/** Días corridos desde la última vez que se completó esta rutina
 *  (0 = hoy). null si nunca se entrenó. */
export function daysSinceCompletion(
  routine: Routine,
  history: CompletedWorkout[]
): number | null {
  const last = lastWorkoutForRoutine(routine.name, history);
  if (!last) return null;
  const d = new Date(last.date);
  if (Number.isNaN(d.getTime())) return null;
  const startLast = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((startToday - startLast) / 86_400_000));
}

/**
 * "Hoy te toca" INTELIGENTE — regla determinista y explicable (sin heurística
 * oculta):
 *  1. Nunca repite la rutina que ya se COMPLETÓ hoy.
 *  2. Prioriza la rutina AÚN NO entrenada en el ciclo (vale como "hace
 *     muchísimo"): si quedan días por cubrir, toca cubrirlos.
 *  3. Entre las ya entrenadas, elige la que hace MÁS TIEMPO que no se hace.
 *  4. Empates → el orden del programa.
 *  5. Sin candidatas (todo ya entrenado hoy) → la rutina guardada/primera.
 */
export function pickNextRoutine(
  routines: Routine[],
  history: CompletedWorkout[],
  fallback: Routine
): Routine {
  if (!Array.isArray(routines) || routines.length === 0) return fallback;
  const today = localDateKey();

  const scored = routines.map((routine, index) => {
    let lastTs: number | null = null;
    let doneToday = false;
    for (const w of history) {
      if (w.routineName !== routine.name) continue;
      const ts = new Date(w.date).getTime();
      if (!Number.isNaN(ts)) lastTs = lastTs === null ? ts : Math.max(lastTs, ts);
      if (!doneToday && localDateKey(new Date(w.date)) === today) doneToday = true;
    }
    return { routine, index, lastTs, doneToday };
  });

  const candidates = scored
    .filter((s) => !s.doneToday)
    .sort((a, b) => (a.lastTs ?? -Infinity) - (b.lastTs ?? -Infinity) || a.index - b.index);

  if (candidates.length > 0) return candidates[0].routine;
  return fallback;
}

/** Rutina de "hoy": la elegida explícitamente, o la primera del programa.
 *  Con historial, usa la rotación real (`pickNextRoutine`) en lugar de
 *  quedarse clavada en la misma sesión. */
export function resolveNextRoutine(
  profile: UserProfile | null,
  history: CompletedWorkout[] = []
): Routine {
  const program = resolveFeaturedProgram(profile);
  let savedName: string | undefined;
  try {
    const routineId = localStorage.getItem("kinetix_selected_routine");
    savedName = program.routines.find((r) => r.id === routineId)?.name;
  } catch {
    /* noop */
  }
  const routines = adaptProgramRoutines(program, profile);
  const first = routines[0] ?? program.routines[0];
  const fallback = (savedName ? routines.find((r) => r.name === savedName) : undefined) ?? first;
  const picked = pickNextRoutine(routines, history, fallback);
  // P4 DUP: la rutina de hoy rota fuerza/hipertrofia/potencia por exposiciones.
  return applyDupDay(picked, history, program.id).routine;
}

/** Persiste el programa activo y su primera rutina (uso en onboarding y
 *  al seleccionar un programa). */
export function persistSelectedProgram(program: Program): void {
  try {
    localStorage.setItem("kinetix_selected_program", program.id);
    localStorage.setItem("kinetix_selected_routine", program.routines[0]?.id ?? "");
  } catch {
    /* noop */
  }
}

/** Rutinas del programa ADPATADAS al equipamiento del perfil. Un usuario
 *  de "solo casa" recibe los mismos días/frecuencia pero con ejercicios
 *  que sí puede hacer (nunca barras/poleas/máquinas). */
export function adaptProgramRoutines(program: Program, profile: UserProfile | null): Routine[] {
  const level = profile?.equipment ?? DEFAULT_USER_PROFILE.equipment;
  return program.routines.map((r) => adaptRoutineToEquipment(r, level));
}

/** Rutina de "hoy" adaptada al equipamiento disponible (para iniciar
 *  sesión directamente y para la tarjeta de decisión). Usa la misma
 *  rotación inteligente por historial que `resolveNextRoutine`. */
export function resolveAdaptedRoutine(
  profile: UserProfile | null,
  history: CompletedWorkout[] = []
): Routine {
  return resolveNextRoutine(profile, history);
}

// -------- Ubicación de entrenamiento de HOY (casa / básico / gimnasio) --------
// Los rutinas "de hoy" se adaptan al lugar donde el usuario va a entrenar ESE
// día (la preferencia del perfil es la base; este override es temporal y
// expira al cambiar de día). Persistida en localStorage con fecha.

const TODAY_EQUIPMENT_KEY = "kinetix_today_equipment";

export function loadTodayEquipment(): EquipmentAccess | null {
  try {
    const raw = localStorage.getItem(TODAY_EQUIPMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== localDateKey()) {
      localStorage.removeItem(TODAY_EQUIPMENT_KEY);
      return null;
    }
    return parsed.equipment === "gym" || parsed.equipment === "basic" || parsed.equipment === "home"
      ? (parsed.equipment as EquipmentAccess)
      : null;
  } catch {
    return null;
  }
}

export function setTodayEquipment(equipment: EquipmentAccess | null): void {
  try {
    if (equipment === null) {
      localStorage.removeItem(TODAY_EQUIPMENT_KEY);
    } else {
      localStorage.setItem(
        TODAY_EQUIPMENT_KEY,
        JSON.stringify({ date: localDateKey(), equipment })
      );
    }
  } catch {
    /* noop */
  }
}

/** Equipamiento vigente para adaptar ejercicios: prioriza el override de hoy
 *  (selector "Hoy entreno en"), luego el perfil y por defecto gimnasio. */
export function resolveCurrentEquipment(): EquipmentAccess {
  const today = loadTodayEquipment();
  if (today) return today;
  const profile = loadUserProfile();
  return profile?.equipment ?? "gym";
}

/** "Hoy te toca" adaptado al equipamiento real de HOY (override diario). Sin
 *  override (null) o igual al perfil → comportamiento normal. */
export function resolveAdaptedRoutineForEquipment(
  profile: UserProfile | null,
  history: CompletedWorkout[] = [],
  todayEquipment: EquipmentAccess | null
): Routine {
  if (!profile || !todayEquipment || profile.equipment === todayEquipment) {
    return resolveNextRoutine(profile, history);
  }
  return resolveNextRoutine({ ...profile, equipment: todayEquipment }, history);
}

/** Rutina que entra en la franja de minutos preferida del usuario. Prefiere
 *  la más cercana por debajo o igual; si ninguna entra, la más corta. */
export function pickSessionFitting(
  profile: UserProfile | null,
  routines: Routine[]
): Routine | null {
  const minutes = profile?.sessionMinutes ?? DEFAULT_USER_PROFILE.sessionMinutes;
  if (!Array.isArray(routines) || routines.length === 0) return null;
  const fitting = routines.filter((r) => r.estimatedDurationMin <= minutes);
  const pool = fitting.length > 0 ? fitting : routines;
  return pool.reduce((a, b) =>
    Math.abs(b.estimatedDurationMin - minutes) < Math.abs(a.estimatedDurationMin - minutes) ? b : a
  );
}
function fitProgramToSchedule(program: Program, days: number): Program {
  if (program.daysPerWeek <= days) return program;
  // Fewer than four days: full-body sessions keep all muscle groups covered.
  const base = days <= 3 ? PREBUILT_PROGRAMS.find(p => p.id === "fbeod-full-body")! : program;
  return { ...base, daysPerWeek: days, title: `${base.title} · ${days} días/semana`, routines: base.routines.slice(0, days) };
}

/** Keep the same split and exercise priority; reduce accessory work first. */
export function shortenRoutine(routine: Routine, minutes: number): Routine {
  if (routine.estimatedDurationMin <= minutes || !routine.exercises.length) return routine;
  const exercises = routine.exercises.map(e => ({ ...e }));
  const estimate = () => Math.ceil(5 + exercises.reduce((sum, e) => sum + e.targetSets * (45 + e.restSeconds) / 60 + 1, 0));
  while (estimate() > minutes) {
    const last = exercises[exercises.length - 1];
    if (last.targetSets > 1) last.targetSets--;
    else if (exercises.length > 1) exercises.pop();
    else break;
  }
  return { ...routine, exercises, estimatedDurationMin: estimate(),
    description: `${routine.description} Sesión reducida: se conserva el orden de prioridad y se reduce primero el trabajo final. Duración estimada, incluidos descansos.` };
}
