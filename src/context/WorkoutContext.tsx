import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
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
import { DEFAULT_NUTRITION_PROFILE, DEFAULT_WEIGHT_KG, computePersonalTargets } from "../data/nutritionData";
import { calculate1RM, isCompoundExercise } from "../utils/scienceCalculators";
import { useRestTimer, RestTimerState } from "./useRestTimer";
import { detectExecutionMode, isTimeBased, parseTargetSeconds } from "../utils/exerciseMode";
import { safeParse, safeSet, safeRemove, readVaultAwareRaw, writeVaultAwareRaw, VALIDATORS, SANITIZERS, isArrayOrNull } from "../utils/storage";
import { resolveStartingWeight, resolveNextWeightFromHistory } from "../utils/progressionEngine";
import { applyReadinessToSession } from "../utils/goalEngine";
import type { ReadinessEntry } from "../types";
import { localDateKey } from "../utils/dateUtils";
import { latestBodyMetric } from "../utils/absEstimator";
import {
  KETO_CARB_CAP,
  INITIAL_WORKOUT_HISTORY,
  INITIAL_NUTRITION,
  INITIAL_BODY_METRICS,
  INITIAL_PRS,
  INITIAL_EXERCISE_HISTORY,
  scrubSeedData,
  trimLargeColumns,
  capForStorage,
  archiveDayIfStale,
} from "./workoutData";
import { mergeArchived, mirrorHistoryToArchive, hydrateFromArchive, isReplacingHistory } from "../utils/longTermHistory";
import { advanceMesocycleClock } from "../utils/mesocycle";
import { createAutoBackup } from "../utils/backupService";
import confetti from "canvas-confetti";

/**
 * Lee el veredicto de readiness de HOY (si el usuario lo registró en
 * Objetivo). Puro localStorage: evita acoplar WorkoutContext a GoalContext.
 */
function todayReadinessVerdict(): "dale" | "moderado" | "descanso" | null {
  try {
    const raw = readVaultAwareRaw("kinetix_readiness");
    if (!raw) return null;
    const arr = JSON.parse(raw) as ReadinessEntry[];
    if (!Array.isArray(arr)) return null;
    const today = localDateKey();
    const entry = arr.find((r) => r?.date === today);
    if (!entry || (entry.verdict !== "dale" && entry.verdict !== "moderado" && entry.verdict !== "descanso")) {
      return null;
    }
    return entry.verdict;
  } catch {
    return null;
  }
}

export { KETO_CARB_CAP, INITIAL_NUTRITION } from "./workoutData";

interface WorkoutContextType {
  activeSession: ActiveWorkoutSession | null;
  restTimer: RestTimerState;
  workoutHistory: CompletedWorkout[];
  nutritionLog: NutritionLog;
  /** Días nutricionales cerrados (más reciente primero). Para adherencia/tendencias. */
  nutritionHistory: NutritionLog[];
  bodyMetrics: BodyMetricEntry[];
  personalRecords: PersonalRecord[];
  exerciseHistory: ExerciseHistoryEntry[];
  customRoutines: CustomRoutine[];
  weightUnit: "kg" | "lbs";
  soundEnabled: boolean;
  autoStartTimer: boolean;
  includeCardio: boolean;
  selectedExerciseForDetail: Exercise | null;
  isWorkoutModalOpen: boolean;
  setWeightUnit: (unit: "kg" | "lbs") => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setIncludeCardio: (enabled: boolean) => void;
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
  /** P2: acepta el sRPE sesión (Foster 1-10) y guarda carga interna. */
  finishWorkout: (srpe?: number, partialReason?: string) => { prsAchieved: PersonalRecord[]; totalVolumeKg: number };
  cancelWorkout: () => void;
  startRestTimer: (seconds: number, exerciseName?: string) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  addMeal: (meal: MealItem) => void;
  removeMeal: (mealId: string) => void;
  /** P3: re-registra HOY las comidas del día anterior (log rápido). true si copió algo. */
  copyMealsFromYesterday: () => boolean;
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
  carryOverPendingExercise: (exercise: Exercise, pending?: WorkoutExercise | null) => void;
  addPersonalRecord: (pr: Omit<PersonalRecord, "id">) => void;
  deletePersonalRecord: (prId: string) => void;
  logImportedSession: (
    exercise: Exercise,
    date: string,
    sets: { weight: number; reps: number; rir?: number }[],
    difficulty?: DifficultyLevel
  ) => void;
  importBulkData: (
    newEntries: ExerciseHistoryEntry[],
    incomingPrs: PersonalRecord[]
  ) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Perfil nutricional + objetivo leídos desde LocalStorage.
const readNutritionGoal = (): NutritionGoal => {
  const saved = safeParse<string | null>("kinetix_nutrition_goal", null, VALIDATORS["kinetix_nutrition_goal"]);
  if (saved && ["cut", "maintenance", "lean_bulk", "bulk", "keto"].includes(saved)) {
    return saved as NutritionGoal;
  }
  return "lean_bulk";
};

const readNutritionProfile = (): NutritionProfile => ({
  ...DEFAULT_NUTRITION_PROFILE,
  ...safeParse<Partial<NutritionProfile> | null>(
    "kinetix_nutrition_profile",
    null,
    (v) => v === null || VALIDATORS["kinetix_nutrition_profile"](v)
  ),
});

const computeTargetsFromWeight = (weightKg: number, goal?: NutritionGoal) =>
  computePersonalTargets(weightKg, goal ?? readNutritionGoal(), readNutritionProfile());

// Migraciones únicas de datos semilla y de límites de capacidad (ver
// workoutData.ts). Se ejecutan al cargar el contexto.
scrubSeedData();
trimLargeColumns();

// -------------------------------------------------------------------
// El archivo diario de nutrición (archiveDayIfStale) vive en workoutData.ts.
// -------------------------------------------------------------------

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(() => {
    return safeParse<ActiveWorkoutSession | null>(
      "kinetix_active_workout",
      null,
      (v) => v === null || VALIDATORS["kinetix_active_workout"](v)
    );
  });

  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>(() => {
    return safeParse("kinetix_workout_history", INITIAL_WORKOUT_HISTORY, VALIDATORS["kinetix_workout_history"], SANITIZERS["kinetix_workout_history"]);
  });

  const [nutritionLog, setNutritionLog] = useState<NutritionLog>(() => {
    const saved = safeParse<NutritionLog | null>(
      "kinetix_nutrition_log",
      null,
      (v) => v === null || VALIDATORS["kinetix_nutrition_log"](v)
    );
    // FIX (bloqueante 3): día LOCAL, no UTC. En Uruguay el día UTC cambia a las 21:00.
    const today = localDateKey();
    const currentGoal = readNutritionGoal();
    if (saved && saved.date === today) {
      const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
      const weightKg = latestBodyMetric(savedMetrics ?? [])?.weightKg ?? DEFAULT_WEIGHT_KG;
      // Log con carbos keto (tope 35) pero objetivo no keto → targets viejos de
      // un objetivo anterior. Recalcular para que cada pantalla muestre macros
      // coherentes con el objetivo actual (Fase 1 coherencia).
      if (currentGoal === "keto" && saved.carbsTarget > KETO_CARB_CAP) {
        return { ...saved, ...computeTargetsFromWeight(weightKg, currentGoal) };
      }
      if (currentGoal !== "keto" && saved.carbsTarget <= KETO_CARB_CAP) {
        return { ...saved, ...computeTargetsFromWeight(weightKg, currentGoal) };
      }
      return saved;
    }
    // New day (or nothing saved): archive the closed day, reset meals/water and recompute targets from body weight.
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const weightKg = latestBodyMetric(savedMetrics ?? [])?.weightKg ?? DEFAULT_WEIGHT_KG;
    const targets = computeTargetsFromWeight(weightKg, currentGoal);
    if (saved) archiveDayIfStale(saved, today);
    return {
      ...(saved ?? INITIAL_NUTRITION),
      ...targets,
      date: today,
      waterMl: 0,
      meals: [],
    };
  });

  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricEntry[]>(() => {
    return safeParse("kinetix_body_metrics", INITIAL_BODY_METRICS, VALIDATORS["kinetix_body_metrics"], SANITIZERS["kinetix_body_metrics"]);
  });

  const [nutritionGoal, setNutritionGoalState] = useState<NutritionGoal>(readNutritionGoal);

  const [nutritionProfile, setNutritionProfileState] = useState<NutritionProfile>(readNutritionProfile);

  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => {
    return safeParse("kinetix_prs", INITIAL_PRS, VALIDATORS["kinetix_prs"], SANITIZERS["kinetix_prs"]);
  });

  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>(() => {
    return safeParse("kinetix_exercise_history", INITIAL_EXERCISE_HISTORY, VALIDATORS["kinetix_exercise_history"], SANITIZERS["kinetix_exercise_history"]);
  });

  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>(() => {
    return safeParse("kinetix_custom_routines", [], VALIDATORS["kinetix_custom_routines"], SANITIZERS["kinetix_custom_routines"]);
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
  // Cardio opcional: visible/decidible antes de iniciar la sesión (auditoría:
  // "Hoy" decía 5 ejercicios y al iniciar aparecían 6). Default = mantener
  // comportamiento histórico (incluirlo).
  const [includeCardio, setIncludeCardio] = useState<boolean>(() =>
    safeParse("kinetix_include_cardio", null, VALIDATORS["kinetix_include_cardio"]) === false ? false : true
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
    safeSet("kinetix_include_cardio", includeCardio);
  }, [includeCardio]);

  useEffect(() => {
    safeSet("kinetix_custom_routines", customRoutines);
  }, [customRoutines]);

  // ---------- Largo plazo (IndexedDB): espejo completo + recuperación ----------
  // localStorage se recorta por capacidad (capForStorage). El archivo IDB
  // conserva el historial COMPLETO y, al arrancar, se rehidrata el state si el
  // archivo tiene más entradas (nunca se pierde lo recortado).
  const hydrationDoneRef = useRef(false);

  useEffect(() => {
    let closed = false;
    void (async () => {
      const archived = await hydrateFromArchive(true);
      if (closed || isReplacingHistory()) return;

      let prevNutrition: NutritionLog[] = [];
      try {
        const raw = readVaultAwareRaw("kinetix_nutrition_history");
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) prevNutrition = list as NutritionLog[];
      } catch {
        /* corrupto: se parte de vacío */
      }

      const nextWorkouts = mergeArchived(workoutHistory, archived.workoutHistory, (w) => w.id);
      const nextExercises = mergeArchived(exerciseHistory, archived.exerciseHistory, (e) => e.id);
      const nextMetrics = mergeArchived(bodyMetrics, archived.bodyMetrics, (m) => m.id);
      const nextNutrition = mergeArchived(prevNutrition, archived.nutritionHistory, (n) => n.date);

      setWorkoutHistory(current => mergeArchived(current, archived.workoutHistory, w => w.id));
      setExerciseHistory(current => mergeArchived(current, archived.exerciseHistory, e => e.id));
      setBodyMetrics(current => mergeArchived(current, archived.bodyMetrics, m => m.id));
      if (nextNutrition !== prevNutrition) {
        safeSet("kinetix_nutrition_history", capForStorage(nextNutrition, 365));
      }

      hydrationDoneRef.current = true;
      // Siembra inicial del archivo con el estado de arranque (incluye lo que
      // localStorage ya tenía recortado antes de instalar esta versión).
      void mirrorHistoryToArchive({
        workoutHistory: nextWorkouts,
        exerciseHistory: nextExercises,
        bodyMetrics: nextMetrics,
        nutritionHistory: nextNutrition,
      });
    })().catch(() => {
      window.dispatchEvent(new CustomEvent("kinetix-storage-error"));
    });
    return () => {
      closed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Espejo continuo del historial COMPLETO (sin recorte) en IndexedDB. Se
  // desactiva hasta que la rehidratación del arranque termina para no
  // sobrescribir el archivo con la versión recortada justo al montar.
  useEffect(() => {
    if (!hydrationDoneRef.current) return;
    let rawNutrition: NutritionLog[] = [];
    try {
      const raw = readVaultAwareRaw("kinetix_nutrition_history");
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) rawNutrition = list as NutritionLog[];
    } catch {
      /* sin cambios */
    }
    void mirrorHistoryToArchive({
      workoutHistory,
      exerciseHistory,
      bodyMetrics,
      nutritionHistory: rawNutrition,
    });
  }, [workoutHistory, exerciseHistory, bodyMetrics, nutritionLog.date]);

  // Antes de que un recorte de retención descarte entradas de localStorage,
  // se fuerza una copia automática del estado vigente como punto de restauración.
  useEffect(() => {
    const onTrim = () => {
      void createAutoBackup(true);
    };
    window.addEventListener("kinetix-retention-trim", onTrim);
    return () => window.removeEventListener("kinetix-retention-trim", onTrim);
  }, []);

  // Rest Timer Interval â€” timestamp-based so it keeps correct time even if the
  // P3: timer de descanso vive en useRestTimer (mismo comportamiento).
  const { restTimer, startRestTimer, stopRestTimer, adjustRestTimer } = useRestTimer(soundEnabled);
  const startWorkoutFromRoutine = useCallback((routine: Routine | CustomRoutine) => {
    try {
      // P1: veredicto de hoy (una sola lectura por sesión).
      const readinessVerdict = todayReadinessVerdict();
      let readinessApplied = false;
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
        // Peso inicial inteligente vía motor unificado (P1: score engine +
        // fallback e1RM/genérico) o cae a estimación e1RM / genérico.
        let prevWeight = isTime ? 0 : resolveStartingWeight(
          exDef,
          item.targetReps,
          item.targetSets,
          item.targetRir,
          exerciseHistory,
          personalRecords,
          defaultWeight
        );
        // Semana de descarga: bajar la carga −10-15% para favorecer la recuperación.
        if ((routine as Routine).deload && !isTime) {
          prevWeight = Math.round(prevWeight * 0.9 * 4) / 4;
        }
        // P1 Autoregulación por readiness de hoy: descanso → −10% + RIR+1,
        // moderado → +1 RIR. No aplica a isométricos/tiempo ni a deload
        // (la descarga ya regula).
        let sessionRir = item.targetRir ?? 1;
        if (!isTime && !(routine as Routine).deload && readinessVerdict && readinessVerdict !== "dale") {
          const adj = applyReadinessToSession(readinessVerdict, prevWeight, sessionRir);
          prevWeight = adj.weight;
          sessionRir = adj.rir;
          readinessApplied = true;
        }
        const prevReps = lastHistory ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length) : parsedReps;
        // Peso real levantado la última vez (para mostrar el delta del auto-ajuste)
        const lastRealWeight = isTime ? 0 : (lastHistory ? lastHistory.weight : prevWeight);
        // RIR real de la última sesión (ghost más fiel)
        const lastRealRir = isTime ? 2 : (lastHistory?.rir ?? 1);

        const sets: WorkoutSet[] = Array.from({ length: item.targetSets }).map((_, sIdx) => ({
          id: `set-${idx}-${sIdx}-${Date.now()}`,
          setNumber: sIdx + 1,
          type: "normal",
          weight: isTime ? 0 : prevWeight,
          reps: parsedReps,
          durationSeconds: targetDuration ?? undefined,
          rir: sessionRir,
          tempo: item.targetTempo || exDef.defaultTempo,
          completed: false,
          previousWeight: lastRealWeight,
          previousReps: prevReps,
          previousRir: lastRealRir,
          previousIsEstimate: !lastHistory,
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

      // Add cardio block at the end (20 min elliptical) — marcado como "cardio"
      // para NO contarlo como serie efectiva de fuerza. Solo si el usuario lo
      // dejó habilitado (toggle visible en "Hoy" antes de iniciar) y la rutina
      // no prescribe ya cardio (ej. D7 NIGHTWING incluye elliptical "20 min").
      const alreadyHasCardio = routine.exercises.some((item: any) => {
        const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
        return def && (def.executionMode === "time" || /min/i.test(String(item.targetReps ?? "")));
      });
      if (!alreadyHasCardio && includeCardio) {
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
        // P1: marca visible para que el logger muestre el badge de autoregulación.
        notes: readinessApplied && readinessVerdict ? `readiness:${readinessVerdict}` : undefined,
      };

      setActiveSession(newSession);
      setIsWorkoutModalOpen(true);
    } catch (err) {
      console.error("[KINETIX] startWorkoutFromRoutine failed:", err);
    }
  }, [exerciseHistory, personalRecords, includeCardio]);

  const startEmptyWorkout = useCallback((name = "Entrenamiento Libre") => {
    try {
      const newSession: ActiveWorkoutSession = {
        id: `session-${Date.now()}`,
        routineName: name,
        startTime: Date.now(),
        exercises: [],
      };
      // Cardio opcional coherente con el toggle global ("Hoy"): la sesión libre
      // solo arranca con 20 min de elíptica si el usuario lo dejó habilitado.
      if (includeCardio) {
        const cardioDef = EXERCISES_DATABASE.find((e) => e.id === "elliptical-machine-walk") || EXERCISES_DATABASE[0];
        const cardioSets: WorkoutSet[] = [
          { id: `cardio-${Date.now()}`, setNumber: 1, type: "cardio", weight: 0, reps: 1, rir: 2, tempo: "--",
            completed: false, previousWeight: 0, previousReps: 1, previousRir: 2 },
        ];
        newSession.exercises.push({
          id: `wex-cardio-${Date.now()}`,
          exerciseId: cardioDef.id,
          exercise: cardioDef,
          targetRestSeconds: 0,
          sets: cardioSets,
          notes: "cardio:20min",
        });
      }
      setActiveSession(newSession);
      setIsWorkoutModalOpen(true);
    } catch (err) {
      console.error("[KINETIX] startEmptyWorkout failed:", err);
    }
  }, [includeCardio]);

  const addExerciseToActiveWorkout = useCallback((exercise: Exercise) => {
    const lastHistory = exerciseHistory
      .filter((h) => h.exerciseId === exercise.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // Peso inicial inteligente vía motor unificado (P1).
    const isMedicineBall = exercise.id === "medicine-ball-slam";
    const defaultWeight = isMedicineBall ? 3 : (exercise.category === "legs" ? 80 : 40);
    const prevWeight = resolveStartingWeight(
      exercise,
      lastHistory?.targetReps,
      lastHistory?.targetSets,
      lastHistory?.targetRir ?? exercise.defaultRir,
      exerciseHistory,
      personalRecords,
      defaultWeight
    );
    const prevReps = lastHistory ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length) : 10;
    const lastRealWeight = lastHistory ? lastHistory.weight : prevWeight;
    const lastRealRir = lastHistory?.rir ?? 1;

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
          previousWeight: lastRealWeight,
          previousReps: prevReps,
          previousRir: lastRealRir,
          previousIsEstimate: !lastHistory,
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
          previousWeight: lastRealWeight,
          previousReps: prevReps,
          previousRir: lastRealRir,
          previousIsEstimate: !lastHistory,
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
          previousWeight: lastRealWeight,
          previousReps: prevReps,
          previousRir: lastRealRir,
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
  }, [exerciseHistory, personalRecords]);

  /**
   * Lleva un ejercicio que quedó sin completar en una sesión previa hacia la
   * sesión activa actual. Si no hay sesión activa, crea una nueva ("Retomando
   * pendientes") con ese ejercicio listo para completar. Reusa la configuración
   * objetivo original (targetSets / targetReps / targetRir / targetTempo).
   */
  const carryOverPendingExercise = useCallback(
    (exercise: Exercise, pending?: WorkoutExercise | null) => {
      const lastHistory = exerciseHistory
        .filter((h) => h.exerciseId === exercise.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const isMedicineBallCarry = exercise.id === "medicine-ball-slam";
      const defaultCarryWeight = isMedicineBallCarry ? 3 : exercise.category === "legs" ? 80 : 40;
      const prevWeight = resolveStartingWeight(
        exercise,
        pending?.targetReps,
        pending?.targetSets,
        pending?.targetRir ?? exercise.defaultRir,
        exerciseHistory,
        personalRecords,
        defaultCarryWeight
      );
      const prevReps = lastHistory
        ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length)
        : pending?.targetReps
        ? parseInt(pending.targetReps.split("-")[0], 10) || 10
        : 10;
      const lastRealWeight = lastHistory ? lastHistory.weight : prevWeight;
      const lastRealRir = lastHistory?.rir ?? 1;
      const targetSets = pending?.targetSets ?? 3;
      const targetReps = pending?.targetReps ?? undefined;
      const targetRir = pending?.targetRir ?? exercise.defaultRir;
      const targetTempo = pending?.targetTempo || exercise.defaultTempo;
      const targetRest = pending?.targetRestSeconds ?? 120;

      const initialSets: WorkoutSet[] = Array.from({ length: targetSets }).map((_, sIdx) => ({
        id: `set-${Date.now()}-${sIdx}`,
        setNumber: sIdx + 1,
        type: "normal",
        weight: prevWeight,
        reps: prevReps,
        rir: targetRir,
        tempo: targetTempo,
        completed: false,
        previousWeight: lastRealWeight,
        previousReps: prevReps,
        previousRir: lastRealRir,
        previousIsEstimate: !lastHistory,
      }));

      const newWEx: WorkoutExercise = {
        id: `wex-${Date.now()}`,
        exerciseId: exercise.id,
        exercise,
        targetRestSeconds: targetRest,
        targetSets,
        targetReps,
        targetRir,
        targetTempo,
        sets: initialSets,
      };

      if (!activeSession) {
        setActiveSession({
          id: `session-${Date.now()}`,
          routineName: "Retomando pendientes",
          startTime: Date.now(),
          exercises: [newWEx],
        });
      } else if (!activeSession.exercises.some((wEx) => wEx.exerciseId === exercise.id)) {
        setActiveSession((prev) =>
          prev ? { ...prev, exercises: [...prev.exercises, newWEx] } : prev
        );
      }
      setIsWorkoutModalOpen(true);
    },
    [exerciseHistory, activeSession, personalRecords]
  );

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

  const finishWorkout = useCallback((srpe?: number, partialReason?: string) => {
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
      let bestE1rm = 0;
      let bestSetData: { weight: number; reps: number; rir?: number } | undefined;
      const timeBased = isTimeBased(wEx.exercise, wEx.targetReps);

      wEx.sets.forEach((s) => {
        if (s.completed) {
          totalSets++;
          exerciseSets++;
          if (timeBased) {
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

            // Track best e1RM for bestSet
            const e1rmCheck = calculate1RM(s.weight, s.reps);
            const effectiveReps = s.rir != null ? Math.min(s.reps + Math.min(s.rir, 10), 12) : s.reps;
            const bestE = calculate1RM(s.weight, effectiveReps);
            if (bestE.valid && bestE.average > bestE1rm) {
              bestE1rm = bestE.average;
              bestSetData = { weight: s.weight, reps: s.reps, rir: s.rir };
            }
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
          
          if (e1rmObj.valid) {
            const currentPrIdx = newPrs.findIndex((np) => np.exerciseId === wEx.exerciseId && np.type === "1RM");
            if (currentPrIdx >= 0) {
              if (current1RM > newPrs[currentPrIdx].value) {
                newPrs[currentPrIdx].value = Math.round(current1RM);
                newPrs[currentPrIdx].reps = s.reps;
              }
            } else if (!existingPR || current1RM > existingPR.value) {
              const prItem: PersonalRecord = {
                id: `pr-${Date.now()}-${wEx.exerciseId}`,
                exerciseId: wEx.exerciseId,
                exerciseName: wEx.exercise.nameEs || wEx.exercise.name,
                type: "1RM",
                value: Math.round(current1RM),
                reps: s.reps,
                date: localDateKey(),
                previousValue: existingPR?.value,
              };
              newPrs.push(prItem);
            }
          }
        }
      });

      if (exerciseSets > 0) {
        const difficultyStr = wEx.notes?.replace("difficulty:", "") as DifficultyLevel | undefined;
        const avgRir = exerciseRirCount > 0 ? Math.round((exerciseRirTotal / exerciseRirCount) * 10) / 10 : undefined;
        const completionRate = wEx.targetSets && wEx.targetSets > 0
          ? Math.round((exerciseSets / wEx.targetSets) * 100) / 100
          : undefined;

        newHistoryEntries.push({
          id: `eh-${Date.now()}-${wEx.exerciseId}`,
          exerciseId: wEx.exerciseId,
          date: new Date().toISOString(),
          weight: maxWeight,
          sets: exerciseSets,
          reps: exerciseReps,
          rpe: avgRir != null ? Math.round((10 - avgRir) * 10) / 10 : undefined,
          rir: avgRir,
          bestSet: bestSetData,
          difficulty: difficultyStr,
          volumeKg: exerciseVolume,
          targetSets: wEx.targetSets,
          targetReps: wEx.targetReps,
          targetRir: wEx.targetRir,
          completionRate,
        });
      }
    });

    const averageRir = sessionRirCount > 0 ? Math.round((sessionRirTotal / sessionRirCount) * 10) / 10 : null;

    // P2: sRPE sesión (Foster) + carga interna = sRPE × minutos.
    const cleanSrpe =
      srpe != null && Number.isFinite(srpe) ? Math.min(10, Math.max(1, Math.round(srpe))) : undefined;
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
      srpe: cleanSrpe,
      sessionLoad: cleanSrpe != null ? Math.round(cleanSrpe * (durationSeconds / 60)) : undefined,
      partialReason,
    };

    setWorkoutHistory((prev) => [completed, ...prev]);
    setExerciseHistory((prev) => [...newHistoryEntries, ...prev]);
    // Reloj del mesociclo: registra el entreno de HOY (marca descarga
    // realizada si es la semana 5; reinicia el ciclo si la descarga ya pasó).
    advanceMesocycleClock([completed, ...workoutHistory]);

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
  }, [activeSession, personalRecords, workoutHistory, stopRestTimer]);

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

  /** Importa una sesión pasada (modal de la app alpha): agrega las series al
   *  historial del ejercicio (con bestSet/1RM estimado + PR si supera el récord)
   *  y alimenta las cargas de arranque. Nunca toca sesiones ni pisa datos nuevos. */
  const logImportedSession = useCallback(
    (
      exercise: Exercise,
      date: string,
      sets: { weight: number; reps: number; rir?: number }[],
      difficulty?: DifficultyLevel
    ) => {
      if (!Math.floor(sets.length)) return;

      let maxWeight = 0;
      let volumeKg = 0;
      let bestSet: { weight: number; reps: number; rir?: number } | undefined;
      let bestE1rm = -1;
      let rirAcc = 0;
      let rirCount = 0;
      const reps: number[] = [];
      for (const s of sets) {
        const w = Number(s.weight) || 0;
        const r = Math.max(1, Math.round(Number(s.reps) || 0));
        const rir = s.rir != null && Number.isFinite(s.rir) && s.rir >= 0 ? Number(s.rir) : undefined;
        if (!(w > 0)) continue;
        reps.push(r);
        maxWeight = Math.max(maxWeight, w);
        volumeKg += w * r;
        if (rir !== undefined) {
          rirAcc += rir;
          rirCount++;
        }
        const hasRir = rir !== undefined;
        const effectiveReps = hasRir ? Math.min(r + Math.min(rir as number, 10), 12) : r;
        const est = calculate1RM(w, effectiveReps);
        if (est.valid && est.average > bestE1rm) {
          bestE1rm = est.average;
          bestSet = { weight: w, reps: r, rir };
        }
      }
      if (reps.length === 0) return;

      const avgRir = rirCount > 0 ? Math.round((rirAcc / rirCount) * 10) / 10 : undefined;

      const entry: ExerciseHistoryEntry = {
        id: `imp-${Date.now()}-${exercise.id}-${Math.floor(Math.random() * 1000)}`,
        exerciseId: exercise.id,
        date,
        weight: maxWeight,
        sets: reps.length,
        reps,
        rpe: avgRir !== undefined ? Math.round((10 - avgRir) * 10) / 10 : undefined,
        rir: avgRir,
        bestSet,
        difficulty,
        volumeKg: Math.round(volumeKg * 10) / 10,
      };
      setExerciseHistory((prev) => [entry, ...prev]);

      if (bestSet && bestE1rm > 0) {
        setPersonalRecords((prev) => {
          const existing = prev.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
          if (existing && existing.value >= Math.round(bestE1rm)) return prev;
          const prItem: PersonalRecord = {
            id: `imp-pr-${Date.now()}-${exercise.id}`,
            exerciseId: exercise.id,
            exerciseName: exercise.nameEs || exercise.name,
            type: "1RM",
            value: Math.round(bestE1rm),
            reps: bestSet.reps,
            date,
          };
          return [prItem, ...prev.filter((p) => p.exerciseId !== exercise.id || p.type !== "1RM")];
        });
      }
    },
    []
  );

  const importBulkData = useCallback(
    (newEntries: ExerciseHistoryEntry[], incomingPrs: PersonalRecord[]) => {
      if (newEntries.length > 0) {
        setExerciseHistory((prev) => [...newEntries, ...prev]);
      }
      if (incomingPrs.length > 0) {
        setPersonalRecords((prev) => {
          let updated = [...prev];
          incomingPrs.forEach((np) => {
            const existingIdx = updated.findIndex(
              (p) => p.exerciseId === np.exerciseId && p.type === np.type
            );
            if (existingIdx >= 0) {
              if (np.value > updated[existingIdx].value) {
                updated[existingIdx] = np;
              }
            } else {
              updated.push(np);
            }
          });
          return updated;
        });
      }
    },
    []
  );

  const ensureTodayLogic = useCallback((): { today: string; targets: { calories: number; protein: number; carbs: number; fats: number } } => {
    // FIX (bloqueante 3): día LOCAL. Y peso actual = medición más reciente por
    // fecha (los arrays se prependen: length-1 podía devolver el peso más viejo).
    const today = localDateKey();
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const weightKg = latestBodyMetric(savedMetrics ?? [])?.weightKg ?? DEFAULT_WEIGHT_KG;
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

  // P3: copia HOY las comidas del día anterior (fuente: historial largo + el
  // log local si todavía es de ayer). Devuelve true si pudo copiar.
  const copyMealsFromYesterday = useCallback((): boolean => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayKey = localDateKey(yesterday);
    let sourceMeals: MealItem[] = [];
    try {
      const raw = readVaultAwareRaw("kinetix_nutrition_history");
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        const y = (list as NutritionLog[]).find((n) => n.date === yesterdayKey);
        if (y && Array.isArray(y.meals)) sourceMeals = y.meals;
      }
    } catch {
      /* corrupto: se intenta con el log local */
    }
    if (sourceMeals.length === 0 && nutritionLog.date === yesterdayKey) {
      sourceMeals = Array.isArray(nutritionLog.meals) ? nutritionLog.meals : [];
    }
    if (sourceMeals.length === 0) return false;
    const nowStr = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    setNutritionLog((prev) => {
      const { today, targets } = ensureTodayLogic();
      const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...targets, date: today, meals: [], waterMl: 0 };
      const copied: MealItem[] = sourceMeals.map((m) => ({
        ...m,
        id: `meal-copy-${Date.now()}-${m.id}`,
        time: nowStr,
      }));
      return { ...base, meals: [...copied, ...base.meals] };
    });
    return true;
  }, [ensureTodayLogic, nutritionLog]);

  // P3: al pasar de día, archiva el log anterior en el historial LARGO antes de
  // descartarlo (evita perder las comidas de ayer al abrir la app hoy).
  const archivedNutritionRef = useRef<NutritionLog | null>(nutritionLog);
  useEffect(() => {
    const prev = archivedNutritionRef.current;
    if (
      prev &&
      prev.date &&
      prev.date !== nutritionLog.date &&
      Array.isArray(prev.meals) &&
      prev.meals.length > 0
    ) {
      try {
        const raw = readVaultAwareRaw("kinetix_nutrition_history");
        const list = raw ? JSON.parse(raw) : [];
        const arr = Array.isArray(list) ? (list as NutritionLog[]) : [];
        const next = arr.filter((n) => n.date !== prev.date);
        next.unshift(prev);
        safeSet("kinetix_nutrition_history", capForStorage(next, 365));
      } catch {
        /* no-op */
      }
    }
    archivedNutritionRef.current = nutritionLog;
  }, [nutritionLog]);

  const updateMacroTargets = useCallback(
    (targets: { calories: number; protein: number; carbs: number; fats: number }) => {
      setNutritionLog((prev) => {
        const { today, targets: freshTargets } = ensureTodayLogic();
        const base = prev.date === today ? prev : { ...INITIAL_NUTRITION, ...freshTargets, date: today, meals: [], waterMl: 0 };
        const isKeto = nutritionGoal === "keto";
        return {
          ...base,
          calorieTarget: Math.max(0, Math.round(targets.calories)),
          proteinTarget: Math.max(0, Math.round(targets.protein)),
          carbsTarget: isKeto
            ? Math.min(KETO_CARB_CAP, Math.max(0, Math.round(targets.carbs)))
            : Math.max(0, Math.round(targets.carbs)),
          fatsTarget: Math.max(0, Math.round(targets.fats)),
        };
      });
    },
    [ensureTodayLogic, nutritionGoal]
  );

  const addBodyMetric = useCallback((entry: BodyMetricEntry) => {
    setBodyMetrics((prev) => [entry, ...prev]);
  }, []);

  const setNutritionGoal = useCallback((goal: NutritionGoal) => {
    setNutritionGoalState(goal);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("kinetix_nutrition_goal", goal);
    }
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const weightKg = latestBodyMetric(savedMetrics ?? [])?.weightKg ?? DEFAULT_WEIGHT_KG;
    const profile = readNutritionProfile();
    setNutritionLog((prev) => ({ ...prev, ...computePersonalTargets(weightKg, goal, profile) }));
  }, []);

  const setNutritionProfile = useCallback((profile: NutritionProfile) => {
    setNutritionProfileState(profile);
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null, isArrayOrNull);
    const weightKg = latestBodyMetric(savedMetrics ?? [])?.weightKg ?? DEFAULT_WEIGHT_KG;
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
    const ex = EXERCISES_DATABASE.find((e) => e.id === exerciseId);

    if (!ex) return last.weight;

    const rec = resolveNextWeightFromHistory(
      ex,
      last.targetReps,
      last.targetSets,
      last.targetRir ?? ex.defaultRir ?? 2,
      history,
      personalRecords
    );

    // Si el algoritmo no pudo recomendar (sin targetReps y sin difficulty),
    // conservar el último peso conocido.
    return rec.nextWeight > 0 ? rec.nextWeight : last.weight;
  }, [exerciseHistory, personalRecords]);

  // Historial nutricional archivado (días cerrados). Se re-lee cuando cambia
  // el log activo: archiveDayIfStale lo mantiene sincronizado al abrir un día nuevo.
  const nutritionHistory = useMemo((): NutritionLog[] => {
    try {
      const raw = readVaultAwareRaw("kinetix_nutrition_history");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? (list as NutritionLog[]) : [];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nutritionLog.date]);

  return (
    <WorkoutContext.Provider
      value={{
        activeSession,
        restTimer,
        workoutHistory,
        nutritionLog,
        nutritionHistory,
        bodyMetrics,
        personalRecords,
        exerciseHistory,
        customRoutines,
        weightUnit,
        soundEnabled,
        autoStartTimer,
        selectedExerciseForDetail,
        isWorkoutModalOpen,
        includeCardio,
        setWeightUnit,
        setSoundEnabled,
        setAutoStartTimer,
        setIncludeCardio,
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
        copyMealsFromYesterday,
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
        carryOverPendingExercise,
        addPersonalRecord,
        deletePersonalRecord,
        logImportedSession,
        importBulkData,
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
