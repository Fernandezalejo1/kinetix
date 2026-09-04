import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  ActiveWorkoutSession,
  CompletedWorkout,
  Exercise,
  NutritionLog,
  MealItem,
  BodyMetricEntry,
  PersonalRecord,
  Routine,
  WorkoutExercise,
  WorkoutSet,
  SetType,
  ExerciseHistoryEntry,
  CustomRoutine,
  DifficultyLevel,
  NutritionGoal,
  NutritionProfile,
} from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { DEFAULT_NUTRITION_PROFILE, computePersonalTargets } from "../data/nutritionData";
import { calculate1RM, isCompoundExercise, unlockAudio, playRestTimerCompletedSound, playTickSound } from "../utils/scienceCalculators";
import { detectExecutionMode, isTimeBased, parseTargetSeconds } from "../utils/exerciseMode";
import { safeParse, safeSet, safeRemove, VALIDATORS, isArrayOrNull } from "../utils/storage";
import confetti from "canvas-confetti";

interface RestTimerState {
  active: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string;
  endAt: number | null;
}

interface WorkoutContextType {
  activeSession: ActiveWorkoutSession | null;
  restTimer: RestTimerState;
  workoutHistory: CompletedWorkout[];
  nutritionLog: NutritionLog;
  bodyMetrics: BodyMetricEntry[];
  personalRecords: PersonalRecord[];
  exerciseHistory: ExerciseHistoryEntry[];
  customRoutines: CustomRoutine[];
  weightUnit: "kg" | "lbs";
  soundEnabled: boolean;
  autoStartTimer: boolean;
  selectedExerciseForDetail: Exercise | null;
  isWorkoutModalOpen: boolean;
  setWeightUnit: (unit: "kg" | "lbs") => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setSelectedExerciseForDetail: (ex: Exercise | null) => void;
  setIsWorkoutModalOpen: (open: boolean) => void;
  startWorkoutFromRoutine: (routine: Routine | CustomRoutine) => void;
  startEmptyWorkout: (name?: string) => void;
  addExerciseToActiveWorkout: (exercise: Exercise) => void;
  removeExerciseFromActiveWorkout: (workoutExerciseId: string) => void;
  replaceExerciseInActiveWorkout: (workoutExerciseId: string, newExercise: Exercise) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  addSet: (workoutExerciseId: string, type?: SetType) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  completeSetAndTriggerTimer: (workoutExerciseId: string, setId: string, opts?: { durationSeconds?: number }) => void;
  recordExerciseDifficulty: (workoutExerciseId: string, difficulty: DifficultyLevel) => void;
  finishWorkout: () => { prsAchieved: PersonalRecord[]; totalVolumeKg: number };
  cancelWorkout: () => void;
  startRestTimer: (seconds: number, exerciseName?: string) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  addMeal: (meal: MealItem) => void;
  removeMeal: (mealId: string) => void;
  updateMacroTargets: (targets: { calories: number; protein: number; carbs: number; fats: number }) => void;
  addBodyMetric: (entry: BodyMetricEntry) => void;
  nutritionGoal: NutritionGoal;
  setNutritionGoal: (goal: NutritionGoal) => void;
  nutritionProfile: NutritionProfile;
  setNutritionProfile: (profile: NutritionProfile) => void;
  addWater: (ml: number) => void;
  removeWater: (ml: number) => void;
  addElectrolyte: (nutrient: "sodium" | "potassium" | "magnesium", mg: number) => void;
  removeElectrolyte: (nutrient: "sodium" | "potassium" | "magnesium", mg: number) => void;
  saveCustomRoutine: (routine: CustomRoutine) => void;
  deleteCustomRoutine: (routineId: string) => void;
  deleteWorkoutHistory: (workoutId: string) => void;
  clearWorkoutHistory: () => void;
  clearGhostSessions: () => void;
  getExerciseHistory: (exerciseId: string) => ExerciseHistoryEntry[];
  getNextWeight: (exerciseId: string) => number;
  addPersonalRecord: (pr: Omit<PersonalRecord, "id">) => void;
  deletePersonalRecord: (prId: string) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Sin datos semilla: el historial empieza vacÃ­o y solo muestra sesiones
// reales del usuario. Nunca se inventan entrenamientos, PRs ni medidas.
const INITIAL_WORKOUT_HISTORY: CompletedWorkout[] = [];

const INITIAL_NUTRITION: NutritionLog = {
  date: new Date().toISOString().split("T")[0],
  calorieTarget: 2300,
  proteinTarget: 142,
  carbsTarget: 25,
  fatsTarget: 180,
  waterMl: 0,
  sodiumMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  meals: [],
};

/** Tope de carbos diarios: la app es 100% keto/cetogÃ©nica. NingÃºn objetivo
 *  (plan, ediciÃ³n manual o ajuste por pasos) puede superarlo. */
export const KETO_CARB_CAP = 35;

// Perfil nutricional + objetivo leÃ­dos desde LocalStorage.
// La app es 100% KETO / CetogÃ©nica: el objetivo estÃ¡ fijado a "keto" (no se
// ofrece otro plan en la interfaz). El perfil sÃ­ es editable.
const readNutritionGoal = (): NutritionGoal => "keto";

const readNutritionProfile = (): NutritionProfile => ({
  ...DEFAULT_NUTRITION_PROFILE,
  ...safeParse<Partial<NutritionProfile> | null>(
    "kinetix_nutrition_profile",
    null,
    (v) => v === null || VALIDATORS["kinetix_nutrition_profile"](v)
  ),
});

const computeTargetsFromWeight = (weightKg: number) =>
  computePersonalTargets(weightKg, readNutritionGoal(), readNutritionProfile());

// Sin datos semilla: mÃ©tricas, PRs e historial empiezan vacÃ­os.
// Los PRs solo nacen de sesiones reales o de carga manual del usuario.
const INITIAL_BODY_METRICS: BodyMetricEntry[] = [];

const INITIAL_PRS: PersonalRecord[] = [];

const INITIAL_EXERCISE_HISTORY: ExerciseHistoryEntry[] = [];

// MigraciÃ³n Ãºnica: elimina SOLO los datos semilla exactos de versiones
// previas (ids fijos hist-1..3, bm-1..3, pr-1..4, eh-1..4, wex-1..7, s-1..22).
// Los datos reales del usuario usan ids con timestamp y se conservan intactos.
const SEED_IDS = new Set<string>([
  "hist-1", "hist-2", "hist-3",
  "bm-1", "bm-2", "bm-3",
  "pr-1", "pr-2", "pr-3", "pr-4",
  "eh-1", "eh-2", "eh-3", "eh-4",
  "wex-1", "wex-2", "wex-3", "wex-4", "wex-5", "wex-6", "wex-7",
  ...Array.from({ length: 22 }, (_, i) => `s-${i + 1}`),
]);
(() => {
  try {
    const scrubArray = (key: string) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch {
        return;
      }
      if (!Array.isArray(arr)) return;
      const clean = arr.filter(
        (it) =>
          !(
            it &&
            typeof it === "object" &&
            typeof (it as { id?: unknown }).id === "string" &&
            SEED_IDS.has((it as { id: string }).id)
          )
      );
      if (clean.length !== arr.length) {
        localStorage.setItem(key, JSON.stringify(clean));
      }
    };
    scrubArray("kinetix_workout_history");
    scrubArray("kinetix_body_metrics");
    scrubArray("kinetix_prs");
    scrubArray("kinetix_exercise_history");
  } catch {
    /* ignorar */
  }
})();

/** Limita un historial en localStorage para no agotar la cuota (~5 MB).
 *  Mantiene las entradas mÃ¡s recientes (los arrays se prependen). */
function capForStorage<T>(arr: T[], max: number): T[] {
  if (!Array.isArray(arr) || arr.length <= max) return arr;
  return arr.slice(0, max);
}

// MigraciÃ³n silenciosa: recorta historiales ya existentes que superen el tope.
(() => {
  try {
    for (const [key, max] of [
      ["kinetix_workout_history", 400],
      ["kinetix_exercise_history", 2000],
      ["kinetix_body_metrics", 1000],
    ] as const) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let arr: unknown;
      try {
        arr = JSON.parse(raw);
      } catch {
        continue;
      }
      if (Array.isArray(arr) && arr.length > max) {
        localStorage.setItem(key, JSON.stringify(arr.slice(0, max)));
      }
    }
  } catch {
    /* ignorar */
  }
})();

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(() => {
    return safeParse<ActiveWorkoutSession | null>(
      "kinetix_active_workout",
      null,
      (v) => v === null || VALIDATORS["kinetix_active_workout"](v)
    );
  });

  const [restTimer, setRestTimer] = useState<RestTimerState>({
    active: false,
    totalSeconds: 90,
    remainingSeconds: 90,
    exerciseName: "",
    endAt: null,
  });

  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>(() => {
    return safeParse("kinetix_workout_history", INITIAL_WORKOUT_HISTORY, VALIDATORS["kinetix_workout_history"]);
  });

  const [nutritionLog, setNutritionLog] = useState<NutritionLog>(() => {
    const saved = safeParse<NutritionLog | null>(
      "kinetix_nutrition_log",
      null,
      (v) => v === null || VALIDATORS["kinetix_nutrition_log"](v)
    );
    const today = new Date().toISOString().split("T")[0];
    // Same day: keep the logged meals and targets as-is â€” salvo que los
    // carbos superen el tope keto (objetivos viejos contaminados por planes
    // no-keto): en ese caso se recalculan desde el peso, sin tocar comidas.
    if (saved && saved.date === today) {
      if (saved.carbsTarget > KETO_CARB_CAP) {
        const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
        const list = savedMetrics && savedMetrics.length ? savedMetrics : INITIAL_BODY_METRICS;
        const weightKg = list[list.length - 1]?.weightKg ?? 78;
        return { ...saved, ...computeTargetsFromWeight(weightKg) };
      }
      return saved;
    }
    // New day (or nothing saved): reset meals/water and recompute targets from body weight.
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const list = savedMetrics && savedMetrics.length ? savedMetrics : INITIAL_BODY_METRICS;
    const weightKg = list[list.length - 1]?.weightKg ?? 78;
    const targets = computeTargetsFromWeight(weightKg);
    return {
      ...(saved ?? INITIAL_NUTRITION),
      ...targets,
      date: today,
      waterMl: 0,
      meals: [],
    };
  });

  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>(() => {
    return safeParse("kinetix_body_metrics", INITIAL_BODY_METRICS, VALIDATORS["kinetix_body_metrics"]);
  });

  const [nutritionGoal, setNutritionGoalState] = useState<NutritionGoal>(readNutritionGoal);

  const [nutritionProfile, setNutritionProfileState] = useState<NutritionProfile>(readNutritionProfile);

  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => {
    return safeParse("kinetix_prs", INITIAL_PRS, VALIDATORS["kinetix_prs"]);
  });

  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>(() => {
    return safeParse("kinetix_exercise_history", INITIAL_EXERCISE_HISTORY, VALIDATORS["kinetix_exercise_history"]);
  });

  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>(() => {
    return safeParse("kinetix_custom_routines", [], VALIDATORS["kinetix_custom_routines"]);
  });

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(() =>
    safeParse("kinetix_weight_unit", null, VALIDATORS["kinetix_weight_unit"]) === "lbs" ? "lbs" : "kg"
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    safeParse("kinetix_sound_enabled", null, VALIDATORS["kinetix_sound_enabled"]) === false ? false : true
  );
  const [autoStartTimer, setAutoStartTimer] = useState<boolean>(() =>
    safeParse("kinetix_auto_start_timer", null, VALIDATORS["kinetix_auto_start_timer"]) === false ? false : true
  );
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    if (activeSession) {
      safeSet("kinetix_active_workout", activeSession);
    } else {
      safeRemove("kinetix_active_workout");
    }
  }, [activeSession]);

  useEffect(() => {
    safeSet("kinetix_workout_history", capForStorage(workoutHistory, 400));
  }, [workoutHistory]);

  useEffect(() => {
    safeSet("kinetix_nutrition_log", nutritionLog);
  }, [nutritionLog]);

  useEffect(() => {
    safeSet("kinetix_body_metrics", capForStorage(bodyMetrics, 1000));
  }, [bodyMetrics]);

  useEffect(() => {
    safeSet("kinetix_nutrition_goal", nutritionGoal);
  }, [nutritionGoal]);

  useEffect(() => {
    safeSet("kinetix_nutrition_profile", nutritionProfile);
  }, [nutritionProfile]);

  useEffect(() => {
    safeSet("kinetix_prs", personalRecords);
  }, [personalRecords]);

  useEffect(() => {
    safeSet("kinetix_exercise_history", capForStorage(exerciseHistory, 2000));
  }, [exerciseHistory]);

  useEffect(() => {
    safeSet("kinetix_weight_unit", weightUnit);
  }, [weightUnit]);

  useEffect(() => {
    safeSet("kinetix_sound_enabled", soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    safeSet("kinetix_auto_start_timer", autoStartTimer);
  }, [autoStartTimer]);

  useEffect(() => {
    safeSet("kinetix_custom_routines", customRoutines);
  }, [customRoutines]);

  // Rest Timer Interval â€” timestamp-based so it keeps correct time even if the
  // phone screen locks / the app is backgrounded and setInterval is throttled.
  useEffect(() => {
    let interval: any = null;
    if (restTimer.active && restTimer.endAt !== null) {
      const tick = () => {
        setRestTimer((prev) => {
          if (prev.endAt === null) return prev;
          const left = Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000));
          if (left <= 0) {
            if (soundEnabled) playRestTimerCompletedSound();
            return { ...prev, remainingSeconds: 0, active: false };
          }
          if (soundEnabled && left <= 4 && left > 1 && prev.remainingSeconds > left) {
            playTickSound();
          }
          return { ...prev, remainingSeconds: left };
        });
      };
      tick();
      interval = setInterval(tick, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.active, restTimer.endAt, soundEnabled]);

  const startRestTimer = useCallback(
    (seconds: number, exerciseName = "") => {
      unlockAudio();
      setRestTimer({
        active: true,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        exerciseName,
        endAt: Date.now() + seconds * 1000,
      });
    },
    []
  );

  const stopRestTimer = useCallback(() => {
    setRestTimer((prev) => ({ ...prev, active: false, remainingSeconds: 0, endAt: null }));
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      if (prev.endAt === null) return prev;
      const nextRemaining = Math.max(0, prev.remainingSeconds + deltaSeconds);
      const nextTotal = Math.max(nextRemaining, prev.totalSeconds + deltaSeconds);
      return {
        ...prev,
        remainingSeconds: nextRemaining,
        totalSeconds: nextTotal,
        active: nextRemaining > 0,
        endAt: nextRemaining > 0 ? Date.now() + nextRemaining * 1000 : null,
      };
    });
  }, []);

  const startWorkoutFromRoutine = useCallback((routine: Routine | CustomRoutine) => {
    try {
      const workoutExercises: WorkoutExercise[] = routine.exercises.map((item: any, idx: number) => {
        const exDef = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId) || EXERCISES_DATABASE[0];
        const execMode = detectExecutionMode(exDef, item.targetReps);
        const isTime = execMode === "time";
        const targetDuration = isTime ? (parseTargetSeconds(item.targetReps) ?? 30) : null;
        const parsedReps = isTime ? 1 : (parseInt(item.targetReps.split("-")[0], 10) || 10);

        const lastHistory = exerciseHistory
          .filter((h) => h.exerciseId === item.exerciseId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        // Medicine ball = 3kg default; legs = 80kg; else = 40kg
        const isMedicineBall = item.exerciseId === "medicine-ball-slam";
        const defaultWeight = isMedicineBall ? 3 : (exDef.category === "legs" ? 80 : 40);
        let prevWeight = lastHistory ? lastHistory.weight : defaultWeight;
        // Semana de descarga: bajar la carga âˆ’10-15% para favorecer la recuperaciÃ³n.
        if ((routine as Routine).deload && !isTime) {
          prevWeight = Math.round(prevWeight * 0.9 * 4) / 4;
        }
        const prevReps = lastHistory ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length) : parsedReps;

        const sets: WorkoutSet[] = Array.from({ length: item.targetSets }).map((_, sIdx) => ({
          id: `set-${idx}-${sIdx}-${Date.now()}`,
          setNumber: sIdx + 1,
          type: "normal",
          weight: isTime ? 0 : prevWeight,
          reps: parsedReps,
          durationSeconds: targetDuration ?? undefined,
          rir: item.targetRir ?? 1,
          tempo: item.targetTempo || exDef.defaultTempo,
          completed: false,
          previousWeight: isTime ? 0 : prevWeight,
          previousReps: prevReps,
          previousRir: 1,
        }));

        return {
          id: `wex-${idx}-${Date.now()}`,
          exerciseId: exDef.id,
          exercise: exDef,
          targetRestSeconds: item.restSeconds || 120,
          supersetGroupId: item.supersetGroupId,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          targetRir: item.targetRir,
          targetTempo: item.targetTempo,
          sets,
        };
      });

      // Add cardio block at the end (20 min treadmill) â€” marcado como "cardio"
      // para NO contarlo como serie efectiva de fuerza en volumen/deload/volumen semanal.
      // Se agrega SOLO si la rutina no prescribe ya cardio (ej. D7 NIGHTWING ya
      // incluye elliptical "20 min"; duplicarlo harÃ­a 40 min auto-prescritos).
      const alreadyHasCardio = routine.exercises.some((item: any) => {
        const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
        return def && (def.executionMode === "time" || /min/i.test(String(item.targetReps ?? "")));
      });
      if (!alreadyHasCardio) {
        const cardioDef = EXERCISES_DATABASE.find((e) => e.id === "elliptical-machine-walk") || EXERCISES_DATABASE[0];
        const cardioSets: WorkoutSet[] = [
          { id: `cardio-${Date.now()}`, setNumber: 1, type: "cardio", weight: 0, reps: 1, rir: 2, tempo: "--",
            completed: false, previousWeight: 0, previousReps: 1, previousRir: 2 },
        ];
        workoutExercises.push({
          id: `wex-cardio-${Date.now()}`,
          exerciseId: cardioDef.id,
          exercise: cardioDef,
          targetRestSeconds: 0,
          sets: cardioSets,
          notes: "cardio:20min",
        });
      }

      const newSession: ActiveWorkoutSession = {
        id: `session-${Date.now()}`,
        routineName: routine.name,
        startTime: Date.now(),
        exercises: workoutExercises,
      };

      setActiveSession(newSession);
      setIsWorkoutModalOpen(true);
    } catch (err) {
      console.error("[KINETIX] startWorkoutFromRoutine failed:", err);
    }
  }, [exerciseHistory]);

  const startEmptyWorkout = useCallback((name = "Entrenamiento Libre") => {
    try {
      // Add cardio block (20 min treadmill) â€” marcado como "cardio"
      // para NO contarlo como serie efectiva de fuerza en volumen/deload/volumen semanal.
      const cardioDef = EXERCISES_DATABASE.find((e) => e.id === "elliptical-machine-walk") || EXERCISES_DATABASE[0];
      const cardioSets: WorkoutSet[] = [
        { id: `cardio-${Date.now()}`, setNumber: 1, type: "cardio", weight: 0, reps: 1, rir: 2, tempo: "--",
          completed: false, previousWeight: 0, previousReps: 1, previousRir: 2 },
      ];
      const cardioEx: WorkoutExercise = {
        id: `wex-cardio-${Date.now()}`,
        exerciseId: cardioDef.id,
        exercise: cardioDef,
        targetRestSeconds: 0,
        sets: cardioSets,
        notes: "cardio:20min",
      };

      const newSession: ActiveWorkoutSession = {
        id: `session-${Date.now()}`,
        routineName: name,
        startTime: Date.now(),
        exercises: [cardioEx],
      };
      setActiveSession(newSession);
      setIsWorkoutModalOpen(true);
    } catch (err) {
      console.error("[KINETIX] startEmptyWorkout failed:", err);
    }
  }, []);

  const addExerciseToActiveWorkout = useCallback((exercise: Exercise) => {
    const lastHistory = exerciseHistory
      .filter((h) => h.exerciseId === exercise.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const prevWeight = lastHistory ? lastHistory.weight : (exercise.category === "legs" ? 80 : 40);
    const prevReps = lastHistory ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length) : 10;

    setActiveSession((prev) => {
      if (!prev) return prev;
      const initialSets: WorkoutSet[] = [
        {
          id: `set-${Date.now()}-1`,
          setNumber: 1,
          type: "normal",
          weight: prevWeight,
          reps: prevReps,
          rir: exercise.defaultRir,
          tempo: exercise.defaultTempo,
          completed: false,
          previousWeight: prevWeight,
          previousReps: prevReps,
          previousRir: 1,
        },
        {
          id: `set-${Date.now()}-2`,
          setNumber: 2,
          type: "normal",
          weight: prevWeight,
          reps: prevReps,
          rir: exercise.defaultRir,
          tempo: exercise.defaultTempo,
          completed: false,
          previousWeight: prevWeight,
          previousReps: prevReps,
          previousRir: 1,
        },
        {
          id: `set-${Date.now()}-3`,
          setNumber: 3,
          type: "normal",
          weight: prevWeight,
          reps: prevReps,
          rir: exercise.defaultRir,
          tempo: exercise.defaultTempo,
          completed: false,
          previousWeight: prevWeight,
          previousReps: prevReps,
          previousRir: 1,
        },
      ];

      const newWEx: WorkoutExercise = {
        id: `wex-${Date.now()}`,
        exerciseId: exercise.id,
        exercise,
        targetRestSeconds: 120,
        sets: initialSets,
      };

      return {
        ...prev,
        exercises: [...prev.exercises, newWEx],
      };
    });
  }, [exerciseHistory]);

  const removeExerciseFromActiveWorkout = useCallback((workoutExerciseId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.filter((ex) => ex.id !== workoutExerciseId),
      };
    });
  }, []);

  const replaceExerciseInActiveWorkout = useCallback(
    (workoutExerciseId: string, newExercise: Exercise) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((wEx) => {
            if (wEx.id === workoutExerciseId) {
              return {
                ...wEx,
                exerciseId: newExercise.id,
                exercise: newExercise,
                sets: wEx.sets.map((s) => ({ ...s, tempo: newExercise.defaultTempo })),
              };
            }
            return wEx;
          }),
        };
      });
    },
    []
  );

  const updateSet = useCallback(
    (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((wEx) => {
            if (wEx.id === workoutExerciseId) {
              return {
                ...wEx,
                sets: wEx.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
              };
            }
            return wEx;
          }),
        };
      });
    },
    []
  );

  const addSet = useCallback((workoutExerciseId: string, type: SetType = "normal") => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((wEx) => {
          if (wEx.id === workoutExerciseId) {
            const lastSet = wEx.sets[wEx.sets.length - 1];
            const newSet: WorkoutSet = {
              id: `set-${Date.now()}-${wEx.sets.length + 1}`,
              setNumber: wEx.sets.length + 1,
              type,
              weight: lastSet ? lastSet.weight : 40,
              reps: lastSet ? lastSet.reps : 10,
              rir: type === "dropset" || type === "myorep" ? 0 : 1,
              tempo: lastSet ? lastSet.tempo : wEx.exercise.defaultTempo,
              completed: false,
            };
            return {
              ...wEx,
              sets: [...wEx.sets, newSet],
            };
          }
          return wEx;
        }),
      };
    });
  }, []);

  const removeSet = useCallback((workoutExerciseId: string, setId: string) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((wEx) => {
          if (wEx.id === workoutExerciseId) {
            const filtered = wEx.sets.filter((s) => s.id !== setId);
            const reindexed = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
            return { ...wEx, sets: reindexed };
          }
          return wEx;
        }),
      };
    });
  }, []);

  const completeSetAndTriggerTimer = useCallback(
    (workoutExerciseId: string, setId: string, opts?: { durationSeconds?: number }) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        let restTarget = 90;
        let exName = "";

        const nextExercises = prev.exercises.map((wEx) => {
          if (wEx.id === workoutExerciseId) {
            restTarget = wEx.targetRestSeconds || 90;
            exName = wEx.exercise.nameEs || wEx.exercise.name;
            return {
              ...wEx,
              sets: wEx.sets.map((s) => {
                if (s.id === setId) {
                  const isNowCompleted = !s.completed;
                  if (isNowCompleted && autoStartTimer) {
                    startRestTimer(restTarget, exName);
                  }
                  return {
                    ...s,
                    completed: isNowCompleted,
                    completedAt: isNowCompleted ? Date.now() : undefined,
                    durationSeconds: opts?.durationSeconds ?? s.durationSeconds,
                  };
                }
                return s;
              }),
            };
          }
          return wEx;
        });

        return { ...prev, exercises: nextExercises };
      });
    },
    [autoStartTimer, startRestTimer]
  );

  const recordExerciseDifficulty = useCallback((workoutExerciseId: string, difficulty: DifficultyLevel) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((wEx) => {
          if (wEx.id === workoutExerciseId) {
            return { ...wEx, notes: `difficulty:${difficulty}` };
          }
          return wEx;
        }),
      };
    });
  }, []);

  const finishWorkout = useCallback(() => {
    if (!activeSession) return { prsAchieved: [], totalVolumeKg: 0 };

    const durationSeconds = Math.max(60, Math.floor((Date.now() - activeSession.startTime) / 1000));
    let totalVolumeKg = 0;
    let totalSeconds = 0;
    let totalSets = 0;
    let sessionRirTotal = 0;
    let sessionRirCount = 0;
    const newPrs: PersonalRecord[] = [];
    const newHistoryEntries: ExerciseHistoryEntry[] = [];

    activeSession.exercises.forEach((wEx) => {
      let exerciseVolume = 0;
      let exerciseReps: number[] = [];
      let exerciseSets = 0;
      let maxWeight = 0;
      let exerciseRirTotal = 0;
      let exerciseRirCount = 0;
      let timeSeconds = 0;
      const timeBased = isTimeBased(wEx.exercise, wEx.targetReps);

      wEx.sets.forEach((s) => {
        if (s.completed) {
          totalSets++;
          exerciseSets++;
          if (timeBased) {
            // Time-based exercise: se acumula en un canal separado (segundos),
            // NO se mezcla con tonelaje de fuerza (kg).
            const secs = s.durationSeconds ?? 0;
            timeSeconds += secs;
            totalSeconds += secs;
            exerciseReps.push(secs);
          } else {
            const setVolume = s.weight * s.reps;
            totalVolumeKg += setVolume;
            exerciseVolume += setVolume;
            exerciseReps.push(s.reps);
            maxWeight = Math.max(maxWeight, s.weight);
          }

          if (s.rir !== undefined) {
            exerciseRirTotal += s.rir;
            exerciseRirCount++;
            sessionRirTotal += s.rir;
            sessionRirCount++;
          }

          const e1rmObj = calculate1RM(s.weight, s.reps);
          const current1RM = e1rmObj.average;
          const existingPR = personalRecords.find((p) => p.exerciseId === wEx.exerciseId && p.type === "1RM");
          // Solo registrar un PR por ejercicio, usando el mejor e1RM de la sesiÃ³n.
          // Y solo cuando la estimaciÃ³n es vÃ¡lida (<= 12 reps): +15 reps la
          // extrapolaciÃ³n infla el 1RM y fabricarÃ­a rÃ©cords falsos.
          const alreadyPRdThisSession = newPrs.some((np) => np.exerciseId === wEx.exerciseId && np.type === "1RM");

          if (e1rmObj.valid && !alreadyPRdThisSession && (!existingPR || current1RM > existingPR.value)) {
            const prItem: PersonalRecord = {
              id: `pr-${Date.now()}-${wEx.exerciseId}`,
              exerciseId: wEx.exerciseId,
              exerciseName: wEx.exercise.nameEs || wEx.exercise.name,
              type: "1RM",
              value: Math.round(current1RM),
              reps: s.reps,
              date: new Date().toISOString().split("T")[0],
              previousValue: existingPR?.value,
            };
            newPrs.push(prItem);
          }
        }
      });

      if (exerciseSets > 0) {
        const difficultyStr = wEx.notes?.replace("difficulty:", "") as DifficultyLevel | undefined;
        newHistoryEntries.push({
          id: `eh-${Date.now()}-${wEx.exerciseId}`,
          exerciseId: wEx.exerciseId,
          date: new Date().toISOString(),
          weight: maxWeight,
          sets: exerciseSets,
          reps: exerciseReps,
          // RPE por ejercicio (no acumulado entre ejercicios)
          rpe: exerciseRirCount > 0 ? Math.round((10 - exerciseRirTotal / exerciseRirCount) * 10) / 10 : undefined,
          difficulty: difficultyStr,
          volumeKg: exerciseVolume,
        });
      }
    });

    const averageRir = sessionRirCount > 0 ? Math.round((sessionRirTotal / sessionRirCount) * 10) / 10 : null;

    const completed: CompletedWorkout = {
      id: `completed-${Date.now()}`,
      routineName: activeSession.routineName,
      date: new Date().toISOString(),
      durationSeconds,
      totalVolumeKg,
      totalVolumeSeconds: totalSeconds,
      totalSets,
      exercises: activeSession.exercises,
      prCount: newPrs.length,
      averageRir,
      fatigueScore: activeSession.perceivedFatigue || 5,
    };

    setWorkoutHistory((prev) => [completed, ...prev]);
    setExerciseHistory((prev) => [...newHistoryEntries, ...prev]);

    if (newPrs.length > 0) {
      setPersonalRecords((prev) => {
        const filtered = prev.filter((p) => !newPrs.some((np) => np.exerciseId === p.exerciseId && np.type === p.type));
        return [...newPrs, ...filtered];
      });
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"],
        });
      } catch (_) {}
    }

    setActiveSession(null);
    setIsWorkoutModalOpen(false);
    stopRestTimer();

    return { prsAchieved: newPrs, totalVolumeKg };
  }, [activeSession, personalRecords, stopRestTimer]);

  const cancelWorkout = useCallback(() => {
    setActiveSession(null);
    setIsWorkoutModalOpen(false);
    stopRestTimer();
    // Elimina la sesiÃ³n fantasma persistida de inmediato (no espera al effect):
    // si la app se cierra en ese instante, no queda un active_workout zombie.
    safeRemove("kinetix_active_workout");
  }, [stopRestTimer]);

  /** Carga manual de un rÃ©cord (1RM medido o estimado de una sesiÃ³n real).
   *  Reemplaza el rÃ©cord previo del mismo ejercicio+tipo. */
  const addPersonalRecord = useCallback((pr: Omit<PersonalRecord, "id">) => {
    const item: PersonalRecord = { ...pr, id: `pr-manual-${Date.now()}` };
    setPersonalRecords((prev) => {
      const filtered = prev.filter((p) => !(p.exerciseId === item.exerciseId && p.type === item.type));
      return [item, ...filtered];
    });
  }, []);

  const deletePersonalRecord = useCallback((prId: string) => {
    setPersonalRecords((prev) => prev.filter((p) => p.id !== prId));
  }, []);

  const ensureTodayLogic = useCallback((): { today: string; targets: { calories: number; protein: number; carbs: number; fats: number } } => {
    const today = new Date().toISOString().split("T")[0];
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const list = savedMetrics && savedMetrics.length ? savedMetrics : INITIAL_BODY_METRICS;
    const weightKg = list[list.length - 1]?.weightKg ?? 78;
    return { today, targets: computeTargetsFromWeight(weightKg) };
  }, []);

  const addMeal = useCallback((meal: MealItem) => {
    setNutritionLog((prev) => {
      const { today, targets } = ensureTodayLogic();
      // If the stored day is not today, start a fresh daily log (keeping new targets).
      const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
      return { ...base, meals: [meal, ...base.meals] };
    });
  }, [ensureTodayLogic]);

  const removeMeal = useCallback((mealId: string) => {
    setNutritionLog((prev) => {
      const { today, targets } = ensureTodayLogic();
      const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
      return { ...base, meals: base.meals.filter((m) => m.id !== mealId) };
    });
  }, [ensureTodayLogic]);

  const updateMacroTargets = useCallback(
    (targets: { calories: number; protein: number; carbs: number; fats: number }) => {
      setNutritionLog((prev) => {
        const { today, targets: freshTargets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...freshTargets, date: today, meals: [], waterMl: 0 };
        // La app es 100% keto: ningÃºn camino (plan, ediciÃ³n manual, motor de
        // pasos) puede dejar los carbos por encima del tope.
        return {
          ...base,
          calorieTarget: Math.max(0, Math.round(targets.calories)),
          proteinTarget: Math.max(0, Math.round(targets.protein)),
          carbsTarget: Math.min(KETO_CARB_CAP, Math.max(0, Math.round(targets.carbs))),
          fatsTarget: Math.max(0, Math.round(targets.fats)),
        };
      });
    },
    [ensureTodayLogic]
  );

  const addBodyMetric = useCallback((entry: BodyMetricEntry) => {
    setBodyMetrics((prev) => [entry, ...prev]);
  }, []);

  const setNutritionGoal = useCallback((goal: NutritionGoal) => {
    setNutritionGoalState(goal);
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const list = savedMetrics && savedMetrics.length ? savedMetrics : INITIAL_BODY_METRICS;
    const weightKg = list[list.length - 1]?.weightKg ?? 78;
    const profile = readNutritionProfile();
    setNutritionLog((prev) => ({ ...prev, ...computePersonalTargets(weightKg, goal, profile) }));
  }, []);

  const setNutritionProfile = useCallback((profile: NutritionProfile) => {
    setNutritionProfileState(profile);
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const list = savedMetrics && savedMetrics.length ? savedMetrics : INITIAL_BODY_METRICS;
    const weightKg = list[list.length - 1]?.weightKg ?? 78;
    const goal = readNutritionGoal();
    setNutritionLog((prev) => ({ ...prev, ...computePersonalTargets(weightKg, goal, profile) }));
  }, []);

  const addWater = useCallback(
    (ml: number) => {
      setNutritionLog((prev) => {
        const { today, targets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
        return { ...base, waterMl: Math.min(12000, base.waterMl + ml) };
      });
    },
    [ensureTodayLogic]
  );

  const removeWater = useCallback(
    (ml: number) => {
      setNutritionLog((prev) => {
        const { today, targets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
        return { ...base, waterMl: Math.max(0, base.waterMl - ml) };
      });
    },
    [ensureTodayLogic]
  );

  const electrolyteField = (nutrient: "sodium" | "potassium" | "magnesium") =>
    nutrient === "sodium" ? "sodiumMg" : nutrient === "potassium" ? "potassiumMg" : "magnesiumMg";

  const addElectrolyte = useCallback(
    (nutrient: "sodium" | "potassium" | "magnesium", mg: number) => {
      const field = electrolyteField(nutrient);
      setNutritionLog((prev) => {
        const { today, targets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
        const current = (base as unknown as Record<string, number>)[field] ?? 0;
        return { ...base, [field]: Math.min(20000, current + mg) };
      });
    },
    [ensureTodayLogic]
  );

  const removeElectrolyte = useCallback(
    (nutrient: "sodium" | "potassium" | "magnesium", mg: number) => {
      const field = electrolyteField(nutrient);
      setNutritionLog((prev) => {
        const { today, targets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
        const current = (base as unknown as Record<string, number>)[field] ?? 0;
        return { ...base, [field]: Math.max(0, current - mg) };
      });
    },
    [ensureTodayLogic]
  );

  const saveCustomRoutine = useCallback((routine: CustomRoutine) => {
    setCustomRoutines((prev) => {
      const existing = prev.findIndex((r) => r.id === routine.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = routine;
        return updated;
      }
      return [...prev, routine];
    });
  }, []);

  const deleteCustomRoutine = useCallback((routineId: string) => {
    setCustomRoutines((prev) => prev.filter((r) => r.id !== routineId));
  }, []);

  const deleteWorkoutHistory = useCallback((workoutId: string) => {
    setWorkoutHistory((prev) => prev.filter((w) => w.id !== workoutId));
  }, []);

  const clearWorkoutHistory = useCallback(() => {
    setWorkoutHistory([]);
  }, []);

  const clearGhostSessions = useCallback(() => {
    setActiveSession(null);
    setIsWorkoutModalOpen(false);
    safeRemove("kinetix_active_workout");
    stopRestTimer();
  }, [stopRestTimer]);

  const getExerciseHistory = useCallback((exerciseId: string) => {
    return exerciseHistory
      .filter((h) => h.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exerciseHistory]);

  const getNextWeight = useCallback((exerciseId: string) => {
    const history = exerciseHistory
      .filter((h) => h.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (history.length === 0) return 0;
    const last = history[0];

    if (last.difficulty === "had_more" || (last.reps.every((r) => r >= 10) && history[0].sets >= 3)) {
      const ex = EXERCISES_DATABASE.find((e) => e.id === exerciseId);
      // GramÃ¡tica de carga unificada con los demÃ¡s motores: compuestos (barra,
      // mÃ¡quina, smith) saltan 2,5 kg; aislamientos micro-carga 1 kg.
      const isCompound = ex ? isCompoundExercise(ex) : false;
      return last.weight + (isCompound ? 2.5 : 1);
    }
    if (last.difficulty === "very_hard") {
      return last.weight - (last.weight > 50 ? 2.5 : 1);
    }
    return last.weight;
  }, [exerciseHistory]);

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        restTimer,
        workoutHistory,
        nutritionLog,
        bodyMetrics,
        personalRecords,
        exerciseHistory,
        customRoutines,
        weightUnit,
        soundEnabled,
        autoStartTimer,
        selectedExerciseForDetail,
        isWorkoutModalOpen,
        setWeightUnit,
        setSoundEnabled,
        setAutoStartTimer,
        setSelectedExerciseForDetail,
        setIsWorkoutModalOpen,
        startWorkoutFromRoutine,
        startEmptyWorkout,
        addExerciseToActiveWorkout,
        removeExerciseFromActiveWorkout,
        replaceExerciseInActiveWorkout,
        updateSet,
        addSet,
        removeSet,
        completeSetAndTriggerTimer,
        recordExerciseDifficulty,
        finishWorkout,
        cancelWorkout,
        startRestTimer,
        stopRestTimer,
        adjustRestTimer,
        addMeal,
        removeMeal,
        updateMacroTargets,
        addBodyMetric,
        nutritionGoal,
        setNutritionGoal,
        nutritionProfile,
        setNutritionProfile,
        addWater,
        removeWater,
        addElectrolyte,
        removeElectrolyte,
        saveCustomRoutine,
        deleteCustomRoutine,
        deleteWorkoutHistory,
        clearWorkoutHistory,
        clearGhostSessions,
        getExerciseHistory,
        getNextWeight,
        addPersonalRecord,
        deletePersonalRecord,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
};
