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
} from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { calculate1RM, playRestTimerCompletedSound, playTickSound } from "../utils/scienceCalculators";
import confetti from "canvas-confetti";

interface RestTimerState {
  active: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string;
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
  completeSetAndTriggerTimer: (workoutExerciseId: string, setId: string) => void;
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
  saveCustomRoutine: (routine: CustomRoutine) => void;
  deleteCustomRoutine: (routineId: string) => void;
  deleteWorkoutHistory: (workoutId: string) => void;
  clearWorkoutHistory: () => void;
  clearGhostSessions: () => void;
  getExerciseHistory: (exerciseId: string) => ExerciseHistoryEntry[];
  getNextWeight: (exerciseId: string) => number;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const INITIAL_WORKOUT_HISTORY: CompletedWorkout[] = [
  {
    id: "hist-1",
    routineName: "Push A (Hipertrofia Clavicular)",
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    durationSeconds: 3240,
    totalVolumeKg: 8450,
    totalSets: 13,
    averageRir: 1.2,
    prCount: 1,
    fatigueScore: 4,
    exercises: [
      {
        id: "wex-1",
        exerciseId: "incline-dumbbell-press",
        exercise: EXERCISES_DATABASE[1],
        targetRestSeconds: 150,
        sets: [
          { id: "s-1", setNumber: 1, type: "normal", weight: 36, reps: 10, rir: 1, completed: true },
          { id: "s-2", setNumber: 2, type: "normal", weight: 36, reps: 9, rir: 1, completed: true },
          { id: "s-3", setNumber: 3, type: "normal", weight: 36, reps: 8, rir: 0, completed: true },
        ],
      },
      {
        id: "wex-2",
        exerciseId: "barbell-bench-press",
        exercise: EXERCISES_DATABASE[0],
        targetRestSeconds: 180,
        sets: [
          { id: "s-4", setNumber: 1, type: "normal", weight: 95, reps: 8, rir: 1, completed: true },
          { id: "s-5", setNumber: 2, type: "normal", weight: 95, reps: 7, rir: 1, completed: true },
          { id: "s-6", setNumber: 3, type: "normal", weight: 95, reps: 6, rir: 0, completed: true },
        ],
      },
      {
        id: "wex-3",
        exerciseId: "cable-lateral-raise",
        exercise: EXERCISES_DATABASE[9],
        targetRestSeconds: 90,
        sets: [
          { id: "s-7", setNumber: 1, type: "normal", weight: 12.5, reps: 15, rir: 1, completed: true },
          { id: "s-8", setNumber: 2, type: "normal", weight: 12.5, reps: 14, rir: 0, completed: true },
          { id: "s-9", setNumber: 3, type: "normal", weight: 12.5, reps: 12, rir: 0, completed: true },
          { id: "s-10", setNumber: 4, type: "dropset", weight: 8.5, reps: 15, rir: 0, completed: true },
        ],
      },
    ],
  },
  {
    id: "hist-2",
    routineName: "Pull A (Dorsal & Espalda Alta)",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    durationSeconds: 3100,
    totalVolumeKg: 9200,
    totalSets: 14,
    averageRir: 1.0,
    prCount: 2,
    fatigueScore: 5,
    exercises: [
      {
        id: "wex-4",
        exerciseId: "neutral-grip-lat-pulldown",
        exercise: EXERCISES_DATABASE[3],
        targetRestSeconds: 150,
        sets: [
          { id: "s-11", setNumber: 1, type: "normal", weight: 80, reps: 10, rir: 1, completed: true },
          { id: "s-12", setNumber: 2, type: "normal", weight: 80, reps: 9, rir: 1, completed: true },
          { id: "s-13", setNumber: 3, type: "normal", weight: 80, reps: 8, rir: 0, completed: true },
        ],
      },
      {
        id: "wex-5",
        exerciseId: "chest-supported-t-bar-row",
        exercise: EXERCISES_DATABASE[4],
        targetRestSeconds: 120,
        sets: [
          { id: "s-14", setNumber: 1, type: "normal", weight: 65, reps: 10, rir: 1, completed: true },
          { id: "s-15", setNumber: 2, type: "normal", weight: 65, reps: 10, rir: 1, completed: true },
          { id: "s-16", setNumber: 3, type: "normal", weight: 65, reps: 9, rir: 0, completed: true },
        ],
      },
    ],
  },
  {
    id: "hist-3",
    routineName: "Legs A (Cuádriceps & Gemelos)",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    durationSeconds: 3600,
    totalVolumeKg: 12400,
    totalSets: 15,
    averageRir: 1.4,
    prCount: 1,
    fatigueScore: 6,
    exercises: [
      {
        id: "wex-6",
        exerciseId: "barbell-hack-or-squat",
        exercise: EXERCISES_DATABASE[6],
        targetRestSeconds: 180,
        sets: [
          { id: "s-17", setNumber: 1, type: "normal", weight: 130, reps: 8, rir: 2, completed: true },
          { id: "s-18", setNumber: 2, type: "normal", weight: 130, reps: 7, rir: 1, completed: true },
          { id: "s-19", setNumber: 3, type: "normal", weight: 130, reps: 6, rir: 1, completed: true },
        ],
      },
      {
        id: "wex-7",
        exerciseId: "hack-squat-machine",
        exercise: EXERCISES_DATABASE[7],
        targetRestSeconds: 150,
        sets: [
          { id: "s-20", setNumber: 1, type: "normal", weight: 140, reps: 10, rir: 1, completed: true },
          { id: "s-21", setNumber: 2, type: "normal", weight: 140, reps: 9, rir: 0, completed: true },
          { id: "s-22", setNumber: 3, type: "myorep", weight: 140, reps: 8, rir: 0, completed: true },
        ],
      },
    ],
  },
];

const INITIAL_NUTRITION: NutritionLog = {
  date: new Date().toISOString().split("T")[0],
  calorieTarget: 2700,
  proteinTarget: 175,
  carbsTarget: 320,
  fatsTarget: 75,
  waterMl: 0,
  meals: [],
};

// Science-based daily macro targets from body weight (used for a lean-bulk / hypertrophy goal).
// - Protein: 2.2 g/kg  (upper end for muscle protein synthesis)
// - Fats:    0.9 g/kg  (hormonal health floor)
// - Calories: ~34 kcal/kg for a moderate surplus
// - Carbs:   remainder of calories (4 kcal/g)
const computeTargetsFromWeight = (weightKg: number) => {
  const protein = Math.round(weightKg * 2.2);
  const fats = Math.round(weightKg * 0.9);
  const calories = Math.round(weightKg * 34);
  const fatCalories = fats * 9;
  const proteinCalories = protein * 4;
  const carbs = Math.max(50, Math.round((calories - fatCalories - proteinCalories) / 4));
  return { calories, protein, carbs, fats };
};

const INITIAL_BODY_METRICS: BodyMetricEntry[] = [
  {
    id: "bm-1",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    weightKg: 78.2,
    waistCm: 81.5,
    chestCm: 104.0,
    armsCm: 38.5,
    thighsCm: 61.0,
    estimatedBodyFat: 13.8,
  },
  {
    id: "bm-2",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    weightKg: 78.5,
    waistCm: 81.2,
    chestCm: 104.5,
    armsCm: 38.8,
    thighsCm: 61.4,
    estimatedBodyFat: 13.5,
  },
  {
    id: "bm-3",
    date: new Date().toISOString().split("T")[0],
    weightKg: 78.9,
    waistCm: 81.0,
    chestCm: 105.2,
    armsCm: 39.2,
    thighsCm: 62.0,
    estimatedBodyFat: 13.2,
    notes: "Aumento de masa muscular magra con cintura estable (recomposición positiva).",
  },
];

const INITIAL_PRS: PersonalRecord[] = [
  { id: "pr-1", exerciseId: "barbell-bench-press", exerciseName: "Press de Banca con Barra", type: "1RM", value: 118, date: "2026-08-15", previousValue: 115 },
  { id: "pr-2", exerciseId: "barbell-hack-or-squat", exerciseName: "Sentadilla Trasera Barra Alta", type: "1RM", value: 165, date: "2026-08-18", previousValue: 160 },
  { id: "pr-3", exerciseId: "romanian-deadlift", exerciseName: "Peso Muerto Rumano con Barra", type: "1RM", value: 175, date: "2026-08-10", previousValue: 170 },
  { id: "pr-4", exerciseId: "incline-dumbbell-press", exerciseName: "Press Inclinado con Mancuernas (30°)", type: "max_weight", value: 38, reps: 8, date: "2026-08-19" },
];

const INITIAL_EXERCISE_HISTORY: ExerciseHistoryEntry[] = [
  {
    id: "eh-1", exerciseId: "barbell-bench-press", date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    weight: 95, sets: 3, reps: [8, 7, 6], rpe: 9, difficulty: "just_right", volumeKg: 2090,
  },
  {
    id: "eh-2", exerciseId: "barbell-hack-or-squat", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    weight: 130, sets: 3, reps: [8, 7, 6], rpe: 9, difficulty: "just_right", volumeKg: 2730,
  },
  {
    id: "eh-3", exerciseId: "neutral-grip-lat-pulldown", date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    weight: 80, sets: 3, reps: [10, 9, 8], rpe: 9, difficulty: "good", volumeKg: 2160,
  },
  {
    id: "eh-4", exerciseId: "incline-dumbbell-press", date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    weight: 36, sets: 3, reps: [10, 9, 8], rpe: 9, difficulty: "just_right", volumeKg: 972,
  },
];

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const WorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(() => {
    return safeParse<ActiveWorkoutSession | null>("kinetix_active_workout", null);
  });

  const [restTimer, setRestTimer] = useState<RestTimerState>({
    active: false,
    totalSeconds: 90,
    remainingSeconds: 90,
    exerciseName: "",
  });

  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>(() => {
    return safeParse("kinetix_workout_history", INITIAL_WORKOUT_HISTORY);
  });

  const [nutritionLog, setNutritionLog] = useState<NutritionLog>(() => {
    const saved = safeParse<NutritionLog | null>("kinetix_nutrition_log", null);
    const today = new Date().toISOString().split("T")[0];
    // Same day: keep the logged meals and targets as-is.
    if (saved && saved.date === today) {
      return saved;
    }
    // New day (or nothing saved): reset meals/water and recompute targets from body weight.
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null);
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
    return safeParse("kinetix_body_metrics", INITIAL_BODY_METRICS);
  });

  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(() => {
    return safeParse("kinetix_prs", INITIAL_PRS);
  });

  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>(() => {
    return safeParse("kinetix_exercise_history", INITIAL_EXERCISE_HISTORY);
  });

  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>(() => {
    return safeParse("kinetix_custom_routines", []);
  });

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem("kinetix_active_workout", JSON.stringify(activeSession));
    } else {
      localStorage.removeItem("kinetix_active_workout");
    }
  }, [activeSession]);

  useEffect(() => {
    localStorage.setItem("kinetix_workout_history", JSON.stringify(workoutHistory));
  }, [workoutHistory]);

  useEffect(() => {
    localStorage.setItem("kinetix_nutrition_log", JSON.stringify(nutritionLog));
  }, [nutritionLog]);

  useEffect(() => {
    localStorage.setItem("kinetix_body_metrics", JSON.stringify(bodyMetrics));
  }, [bodyMetrics]);

  useEffect(() => {
    localStorage.setItem("kinetix_prs", JSON.stringify(personalRecords));
  }, [personalRecords]);

  useEffect(() => {
    localStorage.setItem("kinetix_exercise_history", JSON.stringify(exerciseHistory));
  }, [exerciseHistory]);

  useEffect(() => {
    localStorage.setItem("kinetix_custom_routines", JSON.stringify(customRoutines));
  }, [customRoutines]);

  // Rest Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (restTimer.active && restTimer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev.remainingSeconds <= 1) {
            if (soundEnabled) {
              playRestTimerCompletedSound();
            }
            return { ...prev, remainingSeconds: 0, active: false };
          }
          if (soundEnabled && prev.remainingSeconds <= 4 && prev.remainingSeconds > 1) {
            playTickSound();
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.active, restTimer.remainingSeconds, soundEnabled]);

  const startRestTimer = useCallback(
    (seconds: number, exerciseName = "") => {
      setRestTimer({
        active: true,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        exerciseName,
      });
    },
    []
  );

  const stopRestTimer = useCallback(() => {
    setRestTimer((prev) => ({ ...prev, active: false, remainingSeconds: 0 }));
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      const nextRemaining = Math.max(0, prev.remainingSeconds + deltaSeconds);
      const nextTotal = Math.max(nextRemaining, prev.totalSeconds + deltaSeconds);
      return {
        ...prev,
        remainingSeconds: nextRemaining,
        totalSeconds: nextTotal,
        active: nextRemaining > 0,
      };
    });
  }, []);

  const startWorkoutFromRoutine = useCallback((routine: Routine | CustomRoutine) => {
    try {
      const workoutExercises: WorkoutExercise[] = routine.exercises.map((item: any, idx: number) => {
        const exDef = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId) || EXERCISES_DATABASE[0];
        const parsedReps = parseInt(item.targetReps.split("-")[0], 10) || 10;

        const lastHistory = exerciseHistory
          .filter((h) => h.exerciseId === item.exerciseId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const prevWeight = lastHistory ? lastHistory.weight : (exDef.category === "legs" ? 80 : 40);
        const prevReps = lastHistory ? Math.round(lastHistory.reps.reduce((a, b) => a + b, 0) / lastHistory.reps.length) : parsedReps;

        const sets: WorkoutSet[] = Array.from({ length: item.targetSets }).map((_, sIdx) => ({
          id: `set-${idx}-${sIdx}-${Date.now()}`,
          setNumber: sIdx + 1,
          type: "normal",
          weight: prevWeight,
          reps: parsedReps,
          rir: item.targetRir ?? 1,
          tempo: item.targetTempo || exDef.defaultTempo,
          completed: false,
          previousWeight: prevWeight,
          previousReps: prevReps,
          previousRir: 1,
        }));

        return {
          id: `wex-${idx}-${Date.now()}`,
          exerciseId: exDef.id,
          exercise: exDef,
          targetRestSeconds: item.restSeconds || 120,
          supersetGroupId: item.supersetGroupId,
          sets,
        };
      });

      // Add cardio block at the end (20 min treadmill)
      const cardioDef = EXERCISES_DATABASE.find((e) => e.id === "elliptical-machine-walk") || EXERCISES_DATABASE[0];
      const cardioSets: WorkoutSet[] = [
        { id: `cardio-${Date.now()}`, setNumber: 1, type: "normal", weight: 0, reps: 1, rir: 2, tempo: "--",
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
      // Add cardio block (20 min treadmill)
      const cardioDef = EXERCISES_DATABASE.find((e) => e.id === "elliptical-machine-walk") || EXERCISES_DATABASE[0];
      const cardioSets: WorkoutSet[] = [
        { id: `cardio-${Date.now()}`, setNumber: 1, type: "normal", weight: 0, reps: 1, rir: 2, tempo: "--",
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
    (workoutExerciseId: string, setId: string) => {
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
                  return { ...s, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : undefined };
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
    let totalSets = 0;
    let totalRir = 0;
    let rirCount = 0;
    const newPrs: PersonalRecord[] = [];
    const newHistoryEntries: ExerciseHistoryEntry[] = [];

    activeSession.exercises.forEach((wEx) => {
      let exerciseVolume = 0;
      let exerciseReps: number[] = [];
      let exerciseSets = 0;
      let maxWeight = 0;

      wEx.sets.forEach((s) => {
        if (s.completed) {
          totalSets++;
          exerciseSets++;
          const setVolume = s.weight * s.reps;
          totalVolumeKg += setVolume;
          exerciseVolume += setVolume;
          exerciseReps.push(s.reps);
          maxWeight = Math.max(maxWeight, s.weight);

          if (s.rir !== undefined) {
            totalRir += s.rir;
            rirCount++;
          }

          const e1rmObj = calculate1RM(s.weight, s.reps);
          const current1RM = e1rmObj.average;
          const existingPR = personalRecords.find((p) => p.exerciseId === wEx.exerciseId && p.type === "1RM");

          if (!existingPR || current1RM > existingPR.value) {
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
          rpe: rirCount > 0 ? Math.round((10 - totalRir / rirCount) * 10) / 10 : undefined,
          difficulty: difficultyStr,
          volumeKg: exerciseVolume,
        });
      }
    });

    const averageRir = rirCount > 0 ? Math.round((totalRir / rirCount) * 10) / 10 : 1.0;

    const completed: CompletedWorkout = {
      id: `completed-${Date.now()}`,
      routineName: activeSession.routineName,
      date: new Date().toISOString(),
      durationSeconds,
      totalVolumeKg,
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
  }, [stopRestTimer]);

  const ensureTodayLogic = useCallback((): { today: string; targets: { calories: number; protein: number; carbs: number; fats: number } } => {
    const today = new Date().toISOString().split("T")[0];
    const savedMetrics = safeParse<BodyMetricEntry[] | null>("kinetix_body_metrics", null);
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
      setNutritionLog((prev) => ({
        ...prev,
        calorieTarget: targets.calories,
        proteinTarget: targets.protein,
        carbsTarget: targets.carbs,
        fatsTarget: targets.fats,
      }));
    },
    []
  );

  const addBodyMetric = useCallback((entry: BodyMetricEntry) => {
    setBodyMetrics((prev) => [entry, ...prev]);
  }, []);

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
    localStorage.removeItem("kinetix_active_workout");
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
      const isCompound = ex?.equipment === "barbell";
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
        saveCustomRoutine,
        deleteCustomRoutine,
        deleteWorkoutHistory,
        clearWorkoutHistory,
        clearGhostSessions,
        getExerciseHistory,
        getNextWeight,
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
