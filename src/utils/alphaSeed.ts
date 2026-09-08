import { EXERCISES_DATABASE } from "../data/exercisesData";
import { e1rmFromSet } from "./startingLoads";
import { saveStepsHistoryDay, readStoredDayForDate, readStepsConfig, saveStepsConfig } from "./healthConnect";
import { readChallenge, saveChallenge } from "./challengeStorage";
import type {
  CompletedWorkout,
  Exercise,
  ExerciseHistoryEntry,
  PersonalRecord,
  SetType,
  WorkoutExercise,
  WorkoutSet,
} from "../types";

/**
 * Seed único (una sola vez por instalación, controlado por flag en
 * localStorage) que importa los datos REALES del usuario desde la app alpha:
 *
 *  - 4 sesiones completas (Legs A 2/9, Push B 3/9, Pull B 4/9, Posterior 5/9)
 *    con series, pesos y RIR → historial de ejercicios con bestSet + RIR,
 *    PRs de 1RM estimado, y sesiones visibles en "Historial de Entrenamientos".
 *  - 6 días de ≥15.000 pasos (lun 31/8 → sáb 5/9) en el registro de pasos,
 *    marcados "manual" para que Health Connect nunca los baje ni los pise.
 *  - El Reto 21 Días arranca activo el 31/8 con esos 6 días ya cumplidos
 *    (hoy sería el día 7), reflejando la racha real del usuario.
 *
 * Es NO destructivo: nunca pisa datos existentes (si el usuario ya tiene un
 * día de pasos, un historial de ejercicio o un PR, se conserva).
 */

const SEED_FLAG = "kinetix_alpha_seed_v2";

interface SeedSet {
  weight: number;
  reps: number;
  rir?: number;
  durationSeconds?: number;
  type?: SetType;
}
interface SeedExercise {
  nameEs: string;
  sets: SeedSet[];
}
interface SeedSession {
  routineName: string;
  dateISO: string; // YYYY-MM-DD
  durationMinutes: number;
  exercises: SeedExercise[];
}

// ─── Sesiones reales de la app alpha (6-9/2026) ────────────────────────────

const SESSIONS: SeedSession[] = [
  {
    routineName: "Legs A (Cuádriceps & Gemelos)",
    dateISO: "2026-09-02",
    durationMinutes: 45,
    exercises: [
      {
        nameEs: "Sentadilla Trasera Barra Alta",
        sets: [
          { weight: 60, reps: 6, rir: 2 },
          { weight: 70, reps: 6, rir: 1 },
          { weight: 70, reps: 6, rir: 1 },
        ],
      },
      {
        nameEs: "Sentadilla Hack / Péndulo",
        sets: [
          { weight: 50, reps: 8, rir: 0 },
          { weight: 50, reps: 8, rir: 0 },
          { weight: 50, reps: 8, rir: 0 },
        ],
      },
      {
        nameEs: "Curl Femoral Sentado",
        sets: [
          { weight: 60, reps: 10, rir: 0 },
          { weight: 60, reps: 10, rir: 0 },
          { weight: 60, reps: 10, rir: 0 },
        ],
      },
    ],
  },
  {
    routineName: "Push B (Pectoral & Deltoides)",
    dateISO: "2026-09-03",
    durationMinutes: 56,
    exercises: [
      {
        nameEs: "Press de Banca con Barra",
        sets: [
          { weight: 90, reps: 5, rir: 0 },
          { weight: 90, reps: 5, rir: 1 },
          { weight: 90, reps: 4, rir: 0 },
        ],
      },
      {
        nameEs: "Aperturas en Polea Sentado",
        sets: [
          { weight: 80, reps: 12, rir: 2 },
          { weight: 80, reps: 10, rir: 0 },
          { weight: 80, reps: 12, rir: 0 },
        ],
      },
      {
        nameEs: "Elevaciones Laterales en Polea Cruzada",
        sets: [
          { weight: 20, reps: 12, rir: 2 },
          { weight: 20, reps: 12, rir: 0 },
          { weight: 20, reps: 10, rir: 0 },
          { weight: 20, reps: 10, rir: 0 },
        ],
      },
      {
        nameEs: "Extensión de Tríceps Sobre la Cabeza en Polea",
        sets: [
          { weight: 20, reps: 12, rir: 0 },
          { weight: 20, reps: 12, rir: 0 },
          { weight: 20, reps: 12, rir: 0 },
        ],
      },
      {
        nameEs: "Crunch en Banco Declinado",
        sets: [
          { weight: 40, reps: 12, rir: 1 },
          { weight: 40, reps: 12, rir: 1 },
          { weight: 40, reps: 12, rir: 1 },
        ],
      },
      {
        nameEs: "Russian Twist con Peso",
        sets: [
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
        ],
      },
    ],
  },
  {
    routineName: "Pull B (Espalda Alta & Trapecio Medio)",
    dateISO: "2026-09-04",
    durationMinutes: 53,
    exercises: [
      {
        nameEs: "Remo en T con Soporte en Pecho",
        sets: [
          { weight: 40, reps: 8, rir: 2 },
          { weight: 40, reps: 8, rir: 2 },
          { weight: 40, reps: 8, rir: 1 },
          { weight: 40, reps: 8, rir: 1 },
        ],
      },
      {
        nameEs: "Jalón al Pecho Agarre Neutro",
        sets: [
          { weight: 50, reps: 10, rir: 2 },
          { weight: 60, reps: 10, rir: 1 },
          { weight: 60, reps: 10, rir: 1 },
        ],
      },
      {
        nameEs: "Curl de Bíceps en Banco Inclinado (60°)",
        sets: [
          { weight: 12.5, reps: 10, rir: 0 },
          { weight: 12.5, reps: 10, rir: 0 },
          { weight: 12.5, reps: 7, rir: 0 },
        ],
      },
      {
        nameEs: "Crunch Abdominal en Polea Alta",
        sets: [
          { weight: 40, reps: 12, rir: 1 },
          { weight: 40, reps: 12, rir: 1 },
          { weight: 40, reps: 12, rir: 1 },
        ],
      },
      {
        nameEs: "Tijeras Cruzadas Tumbado",
        sets: [
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
        ],
      },
    ],
  },
  {
    routineName: "Posterior (Isquios & Glúteos)",
    dateISO: "2026-09-05",
    durationMinutes: 32,
    exercises: [
      {
        nameEs: "Curl Femoral Sentado",
        sets: [
          { weight: 50, reps: 8, rir: 1 },
          { weight: 40, reps: 8, rir: 1 },
          { weight: 40, reps: 8, rir: 1 },
          { weight: 60, reps: 12, rir: 0 },
          { weight: 60, reps: 12, rir: 0 },
          { weight: 60, reps: 12, rir: 0 },
        ],
      },
      {
        nameEs: "Hip Thrust con Barra",
        sets: [
          { weight: 80, reps: 10, rir: 1 },
          { weight: 80, reps: 10, rir: 1 },
          { weight: 80, reps: 10, rir: 1 },
        ],
      },
      {
        nameEs: "Sentadilla Hack / Péndulo",
        sets: [
          { weight: 50, reps: 8, rir: 1 },
          { weight: 50, reps: 8, rir: 1 },
          { weight: 50, reps: 8, rir: 1 },
        ],
      },
      {
        nameEs: "Elevación de Talones de Pie",
        sets: [
          { weight: 80, reps: 12, rir: 0 },
          { weight: 80, reps: 12, rir: 0 },
          { weight: 80, reps: 12, rir: 0 },
          { weight: 80, reps: 12, rir: 0 },
        ],
      },
      {
        nameEs: "Superman Hold (Fuerza Lumbar)",
        sets: [
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
          { weight: 0, reps: 1, rir: 1, durationSeconds: 30 },
        ],
      },
    ],
  },
];

// ─── Días de ≥15.000 pasos (lun 31/8 → sáb 5/9, 2026) ─────────────────────

const STEP_DAYS = [
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
];

// ─── Helpers de lectura/escritura no destructiva ───────────────────────────

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray(key: string, arr: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function hasEntry<T extends { id?: string }>(arr: T[], id: string): boolean {
  return arr.some((it) => it && typeof it === "object" && (it as { id?: unknown }).id === id);
}

/** Ejecuta el seed una sola vez. Llamar ANTES de montar React (main.tsx). */
export function applyAlphaSeed(): void {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;

    const byName = new Map<string, Exercise>();
    for (const ex of EXERCISES_DATABASE) {
      if (!byName.has(ex.nameEs)) byName.set(ex.nameEs, ex);
      if (!byName.has(ex.name)) byName.set(ex.name, ex);
    }

    const newHistory: ExerciseHistoryEntry[] = [];
    const newPrs: PersonalRecord[] = [];
    const newWorkouts: CompletedWorkout[] = [];
    const base = Date.now();

    const existingHistory = readArray<ExerciseHistoryEntry>("kinetix_exercise_history");
    const existingPrs = readArray<PersonalRecord>("kinetix_prs");
    const existingWorkouts = readArray<CompletedWorkout>("kinetix_workout_history");

    for (const session of SESSIONS) {
      const wExercises: WorkoutExercise[] = [];
      let volumeKg = 0;
      let totalSets = 0;
      const rirVals: number[] = [];
      const startTime = new Date(`${session.dateISO}T19:00:00`).getTime();

      session.exercises.forEach((seedEx, exIdx) => {
        const exercise = byName.get(seedEx.nameEs);
        if (!exercise) {
          console.warn(`[alphaSeed] ejercicio no encontrado: ${seedEx.nameEs}`);
          return;
        }
        const valid = seedEx.sets.filter((s) => s.weight > 0 && s.reps > 0);
        const setsOut: WorkoutSet[] = seedEx.sets.map((s, sIdx) => ({
          id: `alpha-set-${session.dateISO}-${exIdx}-${sIdx}`,
          setNumber: sIdx + 1,
          type: s.type ?? "normal",
          weight: s.weight,
          reps: s.reps,
          rir: s.rir,
          durationSeconds: s.durationSeconds,
          completed: true,
          completedAt: startTime + sIdx * 60 * 1000,
        }));
        wExercises.push({
          id: `alpha-wex-${session.dateISO}-${exIdx}`,
          exerciseId: exercise.id,
          exercise,
          targetRestSeconds: 120,
          sets: setsOut,
        });
        if (valid.length === 0) return;

        const maxWeight = Math.max(...valid.map((s) => s.weight));
        const reps = valid.map((s) => s.reps);
        const vol = Math.round(valid.reduce((a, s) => a + s.weight * s.reps, 0) * 10) / 10;
        volumeKg += vol;
        totalSets += valid.length;

        let bestSet: { weight: number; reps: number; rir?: number } | undefined;
        let bestE1rm = -1;
        for (const s of valid) {
          const est = e1rmFromSet(s.weight, s.reps, s.rir);
          if (est.valid && est.average > bestE1rm) {
            bestE1rm = est.average;
            bestSet = { weight: s.weight, reps: s.reps, rir: s.rir };
          }
        }
        const rirHere = valid
          .map((s) => s.rir)
          .filter((r): r is number => r !== undefined && r !== null && Number.isFinite(r));
        rirVals.push(...rirHere);
        const avgRir =
          rirHere.length > 0 ? Math.round((rirHere.reduce((a, b) => a + b, 0) / rirHere.length) * 10) / 10 : undefined;

        const entryId = `alpha-eh-${session.dateISO}-${exercise.id}`;
        if (!hasEntry(existingHistory, entryId)) {
          newHistory.push({
            id: entryId,
            exerciseId: exercise.id,
            date: session.dateISO,
            weight: maxWeight,
            sets: valid.length,
            reps,
            rpe: avgRir !== undefined ? Math.round((10 - avgRir) * 10) / 10 : undefined,
            rir: avgRir,
            bestSet,
            volumeKg: vol,
          });
        }

        if (bestSet && bestE1rm > 0) {
          const prId = `alpha-pr-${session.dateISO}-${exercise.id}`;
          const existing = existingPrs.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
          if (!existing && !hasEntry(existingPrs, prId)) {
            newPrs.push({
              id: prId,
              exerciseId: exercise.id,
              exerciseName: exercise.nameEs || exercise.name,
              type: "1RM",
              value: Math.round(bestE1rm),
              reps: bestSet.reps,
              date: session.dateISO,
            });
          }
        }
      });

      if (wExercises.length === 0) continue;

      const avgAll =
        rirVals.length > 0 ? Math.round((rirVals.reduce((a, b) => a + b, 0) / rirVals.length) * 10) / 10 : null;
      const wId = `alpha-hist-${session.dateISO}`;
      if (!hasEntry(existingWorkouts, wId)) {
        newWorkouts.push({
          id: wId,
          routineName: session.routineName,
          date: `${session.dateISO}T19:00:00.000Z`,
          startTime,
          endTime: startTime + session.durationMinutes * 60 * 1000,
          durationSeconds: session.durationMinutes * 60,
          totalVolumeKg: Math.round(volumeKg * 10) / 10,
          totalSets,
          exercises: wExercises,
          prCount: newPrs.filter((p) => p.date === session.dateISO).length,
          averageRir: avgAll,
          fatigueScore: 5,
        });
      }
    }

    if (newHistory.length > 0) {
      writeArray("kinetix_exercise_history", [...newHistory, ...existingHistory]);
    }
    if (newPrs.length > 0) {
      writeArray("kinetix_prs", [...newPrs, ...existingPrs]);
    }
    if (newWorkouts.length > 0) {
      writeArray("kinetix_workout_history", [...newWorkouts, ...existingWorkouts]);
    }

    // Pasos: solo días que todavía no tienen registro (nunca pisa una corrección manual).
    for (const date of STEP_DAYS) {
      if (!readStoredDayForDate(date)) {
        saveStepsHistoryDay({
          date,
          steps: 15000,
          source: "manual",
          asOf: new Date(base).toISOString(),
          countedSource: null,
          adjustment: null,
        });
      }
    }

    // Meta de pasos del usuario: 15.000 (si todavía no la personalizó).
    const cfg = readStepsConfig();
    if (cfg.stepGoal === 10000) {
      saveStepsConfig({ ...cfg, stepGoal: 15000 });
    }

    // Reto: si no está activo, arranca el 31/8 con los 6 días ya cumplidos.
    const challenge = readChallenge();
    if (!challenge.active) {
      saveChallenge({
        active: true,
        startDate: "2026-08-31",
        completedDates: [...STEP_DAYS],
        currentStreak: STEP_DAYS.length,
        bestStreak: STEP_DAYS.length,
        lastCheckedDate: "2026-09-05",
      });
    }

    localStorage.setItem(SEED_FLAG, "1");
    // eslint-disable-next-line no-console
    console.info(
      `[alphaSeed] importados ${newWorkouts.length} sesiones, ${newHistory.length} historiales, ${newPrs.length} PRs, ${STEP_DAYS.length} días de pasos`
    );
  } catch (err) {
    // Nunca romper el arranque de la app por un error de seed.
    console.error("[alphaSeed] error", err);
  }
}