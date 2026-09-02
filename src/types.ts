export type MuscleGroup =
  | "chest"
  | "lats"
  | "upper_back"
  | "traps"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "lower_back";

export type SetType = "normal" | "warmup" | "dropset" | "myorep" | "restpause" | "failure";

export type ResistanceProfile = "lengthened" | "shortened" | "mid_range" | "linear" | "accommodating";

export interface ExercisePrimaryMuscleDetail {
  muscle: MuscleGroup;
  name: string;
  origin: string;
  insertion: string;
  action: string;
  fiberOrientation: string;
  contributionPct: number;
}

export interface ExerciseSecondaryMuscleDetail {
  muscle: MuscleGroup;
  name: string;
  role: "sinergista" | "estabilizador_dinamico" | "fijador_postural";
  contributionPct: number;
}

export interface ExerciseTechniquePhase {
  phase: "Setup & Posición Inicial" | "Fase Excéntrica (Bajada)" | "Punto de Máximo Estiramiento" | "Fase Concéntrica (Empuje/Tracción)" | "Contracción Máxima / Bloqueo";
  cues: string[];
  tempoCode: string;
  breathing: string;
}

export interface ExerciseMistakeDetail {
  mistake: string;
  consequence: string;
  riskLevel: "Bajo" | "Moderado" | "Alto";
  correction: string;
}

export interface ExerciseVariationDetail {
  name: string;
  equipment: string;
  difference: string;
  bestFor: string;
}

export interface ExerciseRegressionDetail {
  name: string;
  reason: string;
  targetLoadReduction: string;
}

export interface ExerciseProgressionDetail {
  name: string;
  mechanism: string;
  recommendedWhen: string;
}

export interface ExercisePreMobilityDetail {
  drill: string;
  targetJoint: string;
  setsReps: string;
  objective: string;
}

export interface ExercisePostStretchingDetail {
  stretch: string;
  targetMuscle: string;
  duration: string;
  type: "Pasivo" | "Activo / Cargado";
}

export interface ExerciseAnalyticsData {
  sfrScore: number; // Stimulus to Fatigue Ratio 0-10
  hypertrophyTier: "S-Tier" | "A-Tier" | "B-Tier";
  axialFatigue: "Nula" | "Baja" | "Moderada" | "Alta";
  jointStress: "Muy Bajo" | "Bajo" | "Moderado" | "Controlado";
  hypertrophyMechanism: "Tensión Mecánica Pura" | "Hipertrofia Mediada por Estiramiento" | "Estrés Metabólico";
  optimalRepRange: string;
  optimalWeeklySets: string;
  targetRir: string;
  e1rmCurve?: { weight: number; reps: number; e1rm: number }[];
}

export interface Exercise3DConfig {
  type: "humanoid_upper" | "humanoid_lower" | "humanoid_full" | "spine_hinge";
  jointAngles: { joint: string; startAngle: number; peakAngle: number; plane: string }[];
  highlightNodes: string[];
  barbellOrDumbbellPath: "linear_vertical" | "curved_arc" | "diagonal_hinge" | "horizontal_pull" | "circular_flye";
  tensionPeakDeg: number;
}

export interface Exercise {
  id: string;
  name: string;
  nameEs: string;
  category: "push" | "pull" | "legs" | "core";
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: "barbell" | "dumbbell" | "cable" | "machine" | "smith" | "bodyweight";
  resistanceProfile: ResistanceProfile;
  lengthTensionDescription: string;
  setupCues: string[];
  executionCues: string[];
  commonMistakes: { mistake: string; correction: string }[];
  preMobility: string[];
  postStretching: string[];
  progressions: string[];
  regressions: string[];
  defaultTempo: string; // e.g. "3-1-0-1" (eccentric, pause at stretch, concentric, pause at contraction)
  defaultRir: number; // e.g. 1-2
  executionMode?: "reps" | "time" | "explosive"; // NEW: how the exercise is performed
  videoUrl?: string;
  videoPosterUrl?: string;
  gifUrl?: string;
  thumbnailSvgType?: string;
  // 15 Comprehensive Components
  model3DConfig?: Exercise3DConfig;
  primaryMusclesDetail?: ExercisePrimaryMuscleDetail[];
  secondaryMusclesDetail?: ExerciseSecondaryMuscleDetail[];
  anatomyDetails?: {
    jointMoments: string;
    momentArmPeak: string;
    activeInsufficiency: string;
    stretchMediatedHypertrophyScore: number;
    lengthTensionPhase: string;
  };
  techniquePhases?: ExerciseTechniquePhase[];
  commonMistakesDetail?: ExerciseMistakeDetail[];
  proTips?: string[];
  variationsDetail?: ExerciseVariationDetail[];
  regressionsDetail?: ExerciseRegressionDetail[];
  progressionsDetail?: ExerciseProgressionDetail[];
  preMobilityDetail?: ExercisePreMobilityDetail[];
  postStretchingDetail?: ExercisePostStretchingDetail[];
  analytics?: ExerciseAnalyticsData;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  weight: number; // in kg (or user unit)
  reps: number;
  durationSeconds?: number; // NEW: for time-based exercises, actual seconds held
  rir?: number; // Reps in reserve (0 = failure, 1 = 1 rep left, etc.)
  rpe?: number; // 6 to 10
  tempo?: string; // e.g. "3-1-0-1"
  completed: boolean;
  completedAt?: number;
  previousWeight?: number;
  previousReps?: number;
  previousRir?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
  targetRestSeconds: number;
  supersetGroupId?: string; // if grouped into superset
  targetSets?: number; // plan objective (e.g. 4)
  targetReps?: string; // plan objective (e.g. "8-10")
  targetRir?: number; // plan objective (e.g. 1)
  targetTempo?: string; // plan objective (e.g. "3-1-0-1")
}

export interface ActiveWorkoutSession {
  id: string;
  routineName: string;
  startTime: number; // timestamp
  endTime?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  rating?: number; // 1-5
  perceivedFatigue?: number; // 1-10
}

export interface CompletedWorkout {
  id: string;
  routineName: string;
  date: string;
  startTime?: number;
  endTime?: number;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  exercises: WorkoutExercise[];
  prCount: number;
  averageRir: number;
  fatigueScore?: number;
  energyLevel?: number;
  comments?: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  targetSplit: string;
  estimatedDurationMin: number;
  /** Marca una versión "deload" (descarga) de la rutina: menos volumen/carga. */
  deload?: boolean;
  exercises: {
    exerciseId: string;
    targetSets: number;
    targetReps: string; // e.g. "8-10" or "10-12"
    targetRir: number;
    targetTempo: string;
    restSeconds: number;
    supersetGroupId?: string;
  }[];
}

export interface Program {
  id: string;
  title: string;
  subtitle: string;
  scienceBasis: string;
  level: "Principiante" | "Intermedio" | "Avanzado" | "Élite";
  daysPerWeek: number;
  durationWeeks: number;
  focus: string;
  routines: Routine[];
}

export interface VolumeLandmarks {
  muscle: MuscleGroup;
  nameEs: string;
  mev: number; // Minimum Effective Volume (sets/week)
  mav: number; // Maximum Adaptive Volume (sets/week)
  mrv: number; // Maximum Recoverable Volume (sets/week)
  currentSets: number;
  status: "under" | "optimal" | "approaching_mrv" | "overreaching";
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: "1RM" | "3RM" | "5RM" | "max_weight" | "max_volume";
  value: number; // weight or volume
  reps?: number;
  date: string;
  previousValue?: number;
}

export interface MealItem {
  id: string;
  time: string;
  dishName: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  mpsQuality?: string;
  timingRecommendation?: string;
  microNutrients?: string[];
  imageUrl?: string;
}

export type NutritionGoal = "cut" | "maintenance" | "lean_bulk" | "bulk" | "keto";

export type ActivityLevel = "sedentario" | "ligero" | "moderado";

/** Perfil personal para cálculo nutricional exacto (Mifflin-St Jeor + NEAT del usuario). */
export interface NutritionProfile {
  age: number;
  heightCm: number;
  sex: "masculino" | "femenino";
  activityLevel: ActivityLevel;
  /** Horario laboral (ej. "17:00" – "02:00" = turno nocturno de escritorio). */
  workStart: string;
  workEnd: string;
  /** Déficit calórico en % (15 = -15%). Solo aplica al objetivo "cut". */
  deficitPercent: number;
}

export interface NutritionLog {
  date: string;
  meals: MealItem[];
  waterMl: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
}

export interface BodyMetricEntry {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  estimatedBodyFat?: number;
  photoUrl?: string;
  notes?: string;
}

export interface AutoProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  category: "push" | "pull" | "legs" | "core";
  equipment: string;
  currentWeight: number;
  lastReps: number;
  averageRir: number;
  averageRpe: number;
  recommendedWeight: number;
  deltaWeight: number;
  deltaPercent: number;
  action: "increase" | "micro_increase" | "maintain" | "rep_progression" | "deload";
  actionLabel: string;
  targetRepsNext: string;
  targetRirNext: number;
  scientificRationale: string;
  confidenceScore: number;
  progressionType: string;
  fatigueStatus: "optima" | "baja" | "moderada" | "elevada";
  nextSessionTip: string;
  isCompound: boolean;
}

export type DifficultyLevel = "very_hard" | "just_right" | "good" | "had_more";

export interface ExerciseHistoryEntry {
  id: string;
  exerciseId: string;
  date: string;
  weight: number;
  sets: number;
  reps: number[];
  rpe?: number;
  difficulty?: DifficultyLevel;
  notes?: string;
  volumeKg: number;
}

export interface CustomRoutine {
  id: string;
  name: string;
  description: string;
  targetSplit: string;
  estimatedDurationMin: number;
  isCustom: true;
  exercises: CustomRoutineExercise[];
}

export interface CustomRoutineExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetRir: number;
  targetTempo: string;
  restSeconds: number;
  supersetGroupId?: string;
  notes?: string;
}

export interface DashboardMetrics {
  bodyWeight: number;
  bodyWeightChange: number;
  weeklyVolume: number;
  weeklyVolumeChange: number;
  totalPrs: number;
  weeklySetsPerMuscle: Record<string, number>;
  totalTrainingTime: number;
  estimatedCalories: number;
  consecutiveDays: number;
  strengthProgress: number;
  physiqueProgress: number;
}

