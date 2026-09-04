import React, { useState, useMemo, memo, useCallback } from "react";
import {
  Activity,
  Trophy,
  Flame,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Sliders,
  Scale,
  Gauge,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Dumbbell,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import {
  computeWeeklyVolumeStatus,
  computeAllAutoProgressions,
  calculateAutoProgression,
  MUSCLE_LANDMARKS_CONFIG,
  calculate1RM
} from "../../utils/scienceCalculators";
import { MuscleGroup, Exercise } from "../../types";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { MuscleRanksPanel } from "./MuscleRanksPanel";
import { ManualPrForm, DeletePrButton } from "./ManualPrForm";

/** Etiquetas cortas en español para los badges (el catálogo usa códigos en inglés). */
const EQUIPMENT_ES: Record<string, string> = {
  barbell: "Barra",
  dumbbell: "Mancuerna",
  cable: "Polea",
  machine: "Máquina",
  smith: "Smith",
  bodyweight: "Corporal",
};
const CATEGORY_ES: Record<string, string> = {
  push: "Empuje",
  pull: "Tracción",
  legs: "Piernas",
  core: "Core",
};
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  Cell
} from "recharts";

export const ScienceDashboard: React.FC = () => {
  const { workoutHistory, personalRecords, weightUnit, setSelectedExerciseForDetail } = useWorkout();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup>("chest");
  const [heatmapView, setHeatmapView] = useState<"front" | "back">("front");
  
  // Auto-Progression section states
  const [progressionFilter, setProgressionFilter] = useState<"all" | "push" | "pull" | "legs" | "increase">("all");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [showPrForm, setShowPrForm] = useState(false);

  // Simulator states
  const [simExerciseId, setSimExerciseId] = useState<string>("barbell-bench-press");
  const [simWeight, setSimWeight] = useState<number>(100);
  const [simReps, setSimReps] = useState<number>(8);
  const [simRir, setSimRir] = useState<number>(2);

  // FASE 5-6: Enhanced computed metrics
  const weekStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekWorkouts = workoutHistory.filter((w) => new Date(w.date) >= weekAgo);
    const lastWeekWorkouts = workoutHistory.filter((w) => new Date(w.date) >= twoWeeksAgo && new Date(w.date) < weekAgo);
    const thisWeekVolume = thisWeekWorkouts.reduce((acc, w) => acc + w.totalVolumeKg, 0);
    const lastWeekVolume = lastWeekWorkouts.reduce((acc, w) => acc + w.totalVolumeKg, 0);
    const thisWeekSets = thisWeekWorkouts.reduce((acc, w) => acc + w.totalSets, 0);
    const lastWeekSets = lastWeekWorkouts.reduce((acc, w) => acc + w.totalSets, 0);
    const thisWeekDuration = thisWeekWorkouts.reduce((acc, w) => acc + w.durationSeconds, 0);
    const volumeDelta = lastWeekVolume > 0 ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100 : 0;
    const setsDelta = lastWeekSets > 0 ? thisWeekSets - lastWeekSets : thisWeekSets;
    const uniqueExercises = new Set(thisWeekWorkouts.flatMap((w) => w.exercises.map((e) => e.exerciseId || e.exercise?.id))).size;
    const streakDays = (() => {
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 30; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStr = d.toISOString().slice(0, 10);
        if (workoutHistory.some((w) => w.date.slice(0, 10) === dayStr)) {
          streak++;
        } else if (i > 0) break;
      }
      return streak;
    })();
    return {
      thisWeekWorkouts: thisWeekWorkouts.length,
      lastWeekWorkouts: lastWeekWorkouts.length,
      thisWeekVolume,
      lastWeekVolume,
      thisWeekSets,
      lastWeekSets,
      thisWeekDuration: Math.round(thisWeekDuration / 60),
      volumeDelta: Math.round(volumeDelta * 10) / 10,
      setsDelta,
      uniqueExercises,
      streakDays,
    };
  }, [workoutHistory]);

  // Memoize heavy computations to prevent freeze
  const recentWorkoutExercises = useMemo(() => workoutHistory.flatMap((w) => w.exercises), [workoutHistory]);
  const volumeLandmarks = useMemo(() => computeWeeklyVolumeStatus(recentWorkoutExercises), [recentWorkoutExercises]);

  const autoProgressions = useMemo(
    () => computeAllAutoProgressions(recentWorkoutExercises, EXERCISES_DATABASE, weightUnit),
    [recentWorkoutExercises, weightUnit]
  );

  const filteredProgressions = useMemo(() => autoProgressions.filter((item) => {
    if (progressionFilter === "increase") return item.deltaWeight > 0;
    if (progressionFilter === "all") return true;
    return item.category === progressionFilter;
  }), [autoProgressions, progressionFilter]);

  const selectedSimExercise = useMemo(() => EXERCISES_DATABASE.find((e) => e.id === simExerciseId) || EXERCISES_DATABASE[0], [simExerciseId]);
  const simRecommendation = useMemo(
    () => calculateAutoProgression(
      selectedSimExercise,
      [{ id: "sim-set-1", setNumber: 1, type: "normal", weight: simWeight, reps: simReps, rir: simRir, completed: true }],
      weightUnit
    ),
    [selectedSimExercise, simWeight, simReps, simRir, weightUnit]
  );
  const sim1RM = useMemo(() => calculate1RM(simWeight, simReps), [simWeight, simReps]);

  const readyToIncreaseCount = useMemo(() => autoProgressions.filter((a) => a.deltaWeight > 0).length, [autoProgressions]);
  const avgDeltaWeight = useMemo(() =>
    readyToIncreaseCount > 0
      ? Math.round((autoProgressions.filter((a) => a.deltaWeight > 0).reduce((acc, a) => acc + a.deltaWeight, 0) / readyToIncreaseCount) * 10) / 10
      : 0,
    [autoProgressions, readyToIncreaseCount]
  );

  const tonnageTrendData = useMemo(() => workoutHistory.slice().reverse().map((w, idx) => ({
    name: `Sesión ${idx + 1}`,
    date: new Date(w.date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    tonnage: w.totalVolumeKg,
    sets: w.totalSets,
    routine: w.routineName,
  })), [workoutHistory]);

  const radarData = useMemo(() => [
    { subject: "Pectoral", A: volumeLandmarks.find((v) => v.muscle === "chest")?.currentSets || 0, fullMark: 20 },
    { subject: "Dorsal", A: volumeLandmarks.find((v) => v.muscle === "lats")?.currentSets || 0, fullMark: 20 },
    { subject: "Espalda Alta", A: volumeLandmarks.find((v) => v.muscle === "upper_back")?.currentSets || 0, fullMark: 20 },
    { subject: "Deltoides Lat.", A: volumeLandmarks.find((v) => v.muscle === "side_delts")?.currentSets || 0, fullMark: 20 },
    { subject: "Cuádriceps", A: volumeLandmarks.find((v) => v.muscle === "quads")?.currentSets || 0, fullMark: 20 },
    { subject: "Isquiosurales", A: volumeLandmarks.find((v) => v.muscle === "hamstrings")?.currentSets || 0, fullMark: 20 },
  ], [volumeLandmarks]);

  const selectedLandmark = volumeLandmarks.find((v) => v.muscle === selectedMuscle) || volumeLandmarks[0];

  const getHeatmapColor = (muscle: MuscleGroup) => {
    const item = volumeLandmarks.find((v) => v.muscle === muscle);
    if (!item || item.currentSets === 0) return "#262626"; // neutral-800
    if (item.currentSets < item.mev) return "#3b82f6"; // Under MEV (blue)
    if (item.currentSets >= item.mev && item.currentSets <= item.mav) return "#10b981"; // Optimal MAV (emerald)
    if (item.currentSets > item.mav && item.currentSets <= item.mrv) return "#f59e0b"; // Near MRV (amber)
    return "#ef4444"; // Over MRV (red)
  };

  return (
    <div id="science-dashboard" className="space-y-8 animate-fadeIn pb-16">
      {/* Top Science Metrics Summary Banner */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sesiones 7d</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {weekStats.thisWeekWorkouts}
          </div>
          <span className={`text-[10px] sm:text-[11px] font-bold mt-1 flex items-center gap-1 ${weekStats.thisWeekWorkouts >= weekStats.lastWeekWorkouts ? "text-emerald-400" : "text-amber-400"}`}>
            {weekStats.thisWeekWorkouts >= weekStats.lastWeekWorkouts
              ? <><TrendingUp className="w-3 h-3" /> +{weekStats.thisWeekWorkouts - weekStats.lastWeekWorkouts} vs anterior</>
              : <>{weekStats.thisWeekWorkouts - weekStats.lastWeekWorkouts} vs anterior</>}
          </span>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Tonelaje 7d</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white truncate">
            {weekStats.thisWeekVolume > 0 ? weekStats.thisWeekVolume.toLocaleString() : "—"}{" "}
            {weekStats.thisWeekVolume > 0 && <span className="text-sm font-normal text-neutral-400">{weightUnit}</span>}
          </div>
          <span className={`text-[10px] sm:text-[11px] font-bold mt-1 block ${weekStats.volumeDelta >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
            {workoutHistory.length > 0
              ? (weekStats.volumeDelta >= 0 ? `+${weekStats.volumeDelta}%` : `${weekStats.volumeDelta}%`) + " vs anterior"
              : "Completá tu primer entrenamiento para ver tu tonelaje"}
          </span>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Ejercicios Únicos</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {weekStats.uniqueExercises}
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 mt-1 block">
            {weekStats.thisWeekSets} series totales
          </span>
        </div>

        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900 border border-neutral-800 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Racha & PRs</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {weekStats.streakDays} <span className="text-sm font-normal text-neutral-400">días</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 mt-1 block">
            {personalRecords.length} PRs · {weekStats.thisWeekDuration}min
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: PROGRESIÓN AUTOMÁTICA BASADA EN RIR/RPE */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-cyan-500/30 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                MOTOR RIR / RPE ADAPTATIVO
              </span>
              <span className="text-xs text-neutral-400 font-medium">Algoritmo de Sobrecarga Progresiva</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              Progresión Automática de Cargas
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl leading-relaxed">
              Calcula y recomienda automáticamente el incremento exacto de peso y objetivos de repeticiones para tu próxima sesión según el RIR (repeticiones en reserva), RPE y reclutamiento de unidades motoras.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Listos para Subir</span>
              <span className="text-xl font-black text-emerald-400">{readyToIncreaseCount} ejercicios</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Salto Promedio</span>
              <span className="text-xl font-black text-cyan-400">{readyToIncreaseCount > 0 ? `+${avgDeltaWeight} ${weightUnit}` : "—"}</span>
            </div>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
          <div className="flex gap-2 overflow-x-auto text-xs font-bold">
            {[
              { id: "all", label: "Todos los Ejercicios" },
              { id: "increase", label: `Listos para Subir (${readyToIncreaseCount})` },
              { id: "push", label: "Empuje (Push)" },
              { id: "pull", label: "Tracción (Pull)" },
              { id: "legs", label: "Piernas (Legs)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setProgressionFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  progressionFilter === f.id
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                    : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-neutral-400 font-mono">
            {filteredProgressions.length} recomendaciones calculadas
          </span>
        </div>

        {/* Auto-Progression Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProgressions.length === 0 && (
            <p className="text-xs text-neutral-500 leading-relaxed col-span-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
              Sin sesiones registradas todavía: completá un entrenamiento real (peso + reps + RIR) y acá vas a ver
              la recomendación de carga para cada ejercicio. Nada se estima sin datos.
            </p>
          )}
          {filteredProgressions.map((prog) => {
            const isExpanded = expandedExerciseId === prog.exerciseId;
            const fullEx = EXERCISES_DATABASE.find((e) => e.id === prog.exerciseId);

            return (
              <div
                key={prog.exerciseId}
                className={`p-5 rounded-3xl border transition-all space-y-4 ${
                  prog.deltaWeight > 0
                    ? "bg-neutral-950/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/70"
                    : "bg-neutral-950/80 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {/* Top Info Header: en móvil se apila (nombre a ancho completo
                    arriba, píldora debajo) para que ningún nombre quede
                    comprimido letra por letra. */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 break-words">
                        {(CATEGORY_ES[prog.category] ?? prog.category).toUpperCase()} • {(EQUIPMENT_ES[prog.equipment] ?? prog.equipment).toUpperCase()}
                      </span>
                      {prog.isCompound && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                          Multiarticular
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-white break-words">{prog.exerciseName}</h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black self-start sm:shrink-0 border text-center max-w-full ${
                      prog.action === "increase"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : prog.action === "micro_increase"
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                        : prog.action === "rep_progression"
                        ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {prog.actionLabel}
                  </span>
                </div>

                {/* Main Visual Weight Transition Card */}
                <div className="p-3 sm:p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                  {/* Previous Performance */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Última Sesión
                    </span>
                    <div className="text-lg font-black text-neutral-300">
                      {prog.currentWeight > 0 ? (
                        <>{prog.currentWeight} <span className="text-xs font-normal text-neutral-400">{weightUnit}</span></>
                      ) : (
                        <span className="text-sm">P. corporal</span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 block">
                      {prog.lastReps} reps @ RIR {prog.averageRir}
                    </span>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <div
                      className={`p-2 rounded-xl flex items-center justify-center ${
                        prog.deltaWeight > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-black mt-1 ${
                        prog.deltaWeight > 0 ? "text-emerald-400" : "text-neutral-400"
                      }`}
                    >
                      {prog.deltaWeight > 0 ? `+${prog.deltaWeight} ${weightUnit}` : "Consolidar"}
                    </span>
                  </div>

                  {/* Next Recommended Weight */}
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Próxima Sesión
                    </span>
                    <div className="text-xl font-black text-white">
                      {prog.recommendedWeight > 0 ? (
                        <>{prog.recommendedWeight}{" "}
                        <span className="text-xs font-normal text-cyan-300">{weightUnit}</span></>
                      ) : (
                        <span className="text-sm">P. corporal</span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                      Objetivo: {prog.targetRepsNext}
                    </span>
                  </div>
                </div>

                {/* RIR Gauge Visual Bar */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-[11px]">
                    <span className="font-bold text-neutral-300 flex items-center gap-1.5 min-w-0">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="break-words">Esfuerzo Percibido: <strong className="text-white font-mono">RIR {prog.averageRir} (RPE {prog.averageRpe})</strong></span>
                    </span>
                    <span
                      className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        prog.averageRir >= 2
                          ? "bg-emerald-500/20 text-emerald-300"
                          : prog.averageRir === 1
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {prog.averageRir >= 2 ? "Estímulo Óptimo MAV" : prog.averageRir === 1 ? "Alta Cercanía al Fallo" : "Fallo Real"}
                    </span>
                  </div>

                  {/* 4-Step RIR Visual Bar */}
                  <div className="grid grid-cols-4 gap-1 h-2 rounded-full overflow-hidden bg-neutral-900 p-0.5 border border-neutral-800">
                    <div
                      className={`h-full rounded-sm transition-all ${
                        prog.averageRir === 0 ? "bg-amber-500 shadow-sm" : "bg-neutral-800"
                      }`}
                      title="RIR 0 (Fallo Concéntrico)"
                    />
                    <div
                      className={`h-full rounded-sm transition-all ${
                        prog.averageRir === 1 ? "bg-purple-500 shadow-sm" : "bg-neutral-800"
                      }`}
                      title="RIR 1 (1 rep en reserva)"
                    />
                    <div
                      className={`h-full rounded-sm transition-all ${
                        prog.averageRir === 2 ? "bg-emerald-500 shadow-sm" : "bg-neutral-800"
                      }`}
                      title="RIR 2 (Sweet spot hipertrofia)"
                    />
                    <div
                      className={`h-full rounded-sm transition-all ${
                        prog.averageRir >= 3 ? "bg-blue-500 shadow-sm" : "bg-neutral-800"
                      }`}
                      title="RIR 3+ (Submáximo / Sobrecarga alta)"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-neutral-500 gap-0.5">
                    <span>RIR 0</span>
                    <span>RIR 1</span>
                    <span className="text-emerald-400 font-bold">RIR 2</span>
                    <span>RIR 3+</span>
                  </div>
                </div>

                {/* Scientific Rationale Accordion */}
                <div className="pt-2 border-t border-neutral-900">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>Fundamento Científico:</strong> {prog.scientificRationale}
                  </p>

                  <div className="mt-2 p-2.5 rounded-xl bg-neutral-900 text-[11px] text-neutral-300 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{prog.nextSessionTip}</span>
                    </span>

                    {fullEx && (
                      <button
                        onClick={() => setSelectedExerciseForDetail(fullEx)}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline shrink-0"
                      >
                        Ver Biomecánica
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===================================================================== */}
        {/* INTERACTIVE SUBSECTION: SIMULADOR DE SOBRECARGA RIR */}
        {/* ===================================================================== */}
        <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-inner space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">Simulador Interactivo de Progresión RIR</h3>
                <p className="text-xs text-neutral-400">Prueba cualquier carga y RIR para predecir tu próximo incremento objetivo</p>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <select
                value={simExerciseId}
                onChange={(e) => setSimExerciseId(e.target.value)}
                className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500 w-full sm:w-auto sm:max-w-[280px] min-w-0"
              >
                {EXERCISES_DATABASE.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.nameEs || ex.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Controls Sliders */}
            <div className="lg:col-span-6 space-y-4">
              {/* Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-neutral-300">
                  <span>Peso Levantado en la Sesión</span>
                  <span className="font-mono text-cyan-400 text-sm font-black">
                    {simWeight} {weightUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={2.5}
                  value={simWeight}
                  onChange={(e) => setSimWeight(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Reps Slider */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between gap-x-3 text-xs font-bold text-neutral-300">
                  <span>Repeticiones Realizadas</span>
                  <span className="font-mono text-purple-400 text-sm font-black">
                    {simReps} reps
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={simReps}
                  onChange={(e) => setSimReps(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* RIR Slider */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between gap-x-3 text-xs font-bold text-neutral-300">
                  <span>RIR Percibido (Repeticiones en Reserva)</span>
                  <span className="font-mono text-emerald-400 text-sm font-black">
                    {simRir === 0 ? "RIR 0 (Fallo Total / RPE 10)" : `RIR ${simRir} (RPE ${10 - simRir})`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={simRir}
                  onChange={(e) => setSimRir(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="hidden sm:flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Fallo Concéntrico (0)</span>
                  <span>1 Rep</span>
                  <span>2 Reps (Óptimo MAV)</span>
                  <span>3 Reps</span>
                  <span>4+ Reps (Ligero)</span>
                </div>
              </div>
            </div>

            {/* Right Live Recommendation Card */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-neutral-900 border border-cyan-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  PREDICCIÓN PARA TU PRÓXIMA SESIÓN
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Confianza: {simRecommendation.confidenceScore}%
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pt-1">
                <div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {simRecommendation.recommendedWeight}{" "}
                    <span className="text-base font-normal text-cyan-300">{weightUnit}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">
                    {simRecommendation.deltaWeight > 0 ? `+${simRecommendation.deltaWeight} ${weightUnit} de Sobrecarga (+${simRecommendation.deltaPercent}%)` : "Mantener carga actual"}
                  </span>
                </div>

                <div className="text-right ml-auto">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block">1RM Estimado</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{sim1RM.average} {weightUnit}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>{simRecommendation.actionLabel}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  {simRecommendation.scientificRationale}
                </p>
              </div>

              <div className="text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1 font-mono">
                <span>Objetivo sugerido: <strong className="text-white">{simRecommendation.targetRepsNext} @ RIR {simRecommendation.targetRirNext}</strong></span>
                <span className="text-cyan-400 font-bold">{simRecommendation.progressionType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Volume Landmarks (MEV / MAV / MRV) & Interactive Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Muscle Heatmap Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-white tracking-tight">Mapa de Calor Muscular</h3>
              <p className="text-xs text-neutral-400">Densidad de series efectivas en los últimos 7 días</p>
            </div>
            <div className="flex gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 ml-auto">
              <button
                onClick={() => setHeatmapView("front")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  heatmapView === "front" ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Frontal
              </button>
              <button
                onClick={() => setHeatmapView("back")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  heatmapView === "back" ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Dorsal
              </button>
            </div>
          </div>

          {/* SVG Heatmap Graphic */}
          <div className="flex items-center justify-center py-4 relative">
            <svg viewBox="0 0 200 320" className="w-56 h-72 drop-shadow-md select-none">
              {heatmapView === "front" ? (
                <g id="heatmap-front">
                  <ellipse cx="100" cy="30" rx="14" ry="18" fill="#262626" stroke="#404040" />
                  <path d="M85 52 Q100 60 115 52 L125 70 Q100 68 75 70 Z" fill={getHeatmapColor("traps")} stroke="#171717" />
                  <path d="M62 70 Q75 68 76 82 Q65 92 58 78 Z" fill={getHeatmapColor("front_delts")} stroke="#171717" />
                  <path d="M138 70 Q125 68 124 82 Q135 92 142 78 Z" fill={getHeatmapColor("front_delts")} stroke="#171717" />
                  <path d="M56 75 Q60 88 52 100 Q48 85 56 75 Z" fill={getHeatmapColor("side_delts")} stroke="#171717" />
                  <path d="M144 75 Q140 88 148 100 Q152 85 144 75 Z" fill={getHeatmapColor("side_delts")} stroke="#171717" />
                  <path d="M75 72 Q100 70 100 80 L99 105 Q78 108 68 90 Z" fill={getHeatmapColor("chest")} stroke="#171717" />
                  <path d="M125 72 Q100 70 100 80 L101 105 Q122 108 132 90 Z" fill={getHeatmapColor("chest")} stroke="#171717" />
                  <path d="M52 102 Q60 115 54 130 Q46 120 52 102 Z" fill={getHeatmapColor("biceps")} stroke="#171717" />
                  <path d="M148 102 Q140 115 146 130 Q154 120 148 102 Z" fill={getHeatmapColor("biceps")} stroke="#171717" />
                  <path d="M54 134 Q60 155 50 175 Q42 155 54 134 Z" fill={getHeatmapColor("forearms")} stroke="#171717" />
                  <path d="M146 134 Q140 155 150 175 Q158 155 146 134 Z" fill={getHeatmapColor("forearms")} stroke="#171717" />
                  <path d="M84 108 L116 108 L112 165 L88 165 Z" fill={getHeatmapColor("abs")} stroke="#171717" />
                  <path d="M74 172 Q98 170 98 190 L94 240 Q70 238 68 195 Z" fill={getHeatmapColor("quads")} stroke="#171717" />
                  <path d="M126 172 Q102 170 102 190 L106 240 Q130 238 132 195 Z" fill={getHeatmapColor("quads")} stroke="#171717" />
                  <path d="M70 248 Q90 250 86 295 L74 295 Q64 270 70 248 Z" fill={getHeatmapColor("calves")} stroke="#171717" />
                  <path d="M130 248 Q110 250 114 295 L126 295 Q136 270 130 248 Z" fill={getHeatmapColor("calves")} stroke="#171717" />
                </g>
              ) : (
                <g id="heatmap-back">
                  <ellipse cx="100" cy="30" rx="14" ry="18" fill="#262626" stroke="#404040" />
                  <path d="M80 50 Q100 45 120 50 L135 85 L100 115 L65 85 Z" fill={getHeatmapColor("upper_back")} stroke="#171717" />
                  <path d="M58 72 Q68 70 66 88 Q54 92 58 72 Z" fill={getHeatmapColor("rear_delts")} stroke="#171717" />
                  <path d="M142 72 Q132 70 134 88 Q146 92 142 72 Z" fill={getHeatmapColor("rear_delts")} stroke="#171717" />
                  <path d="M52 98 Q60 112 56 130 Q46 118 52 98 Z" fill={getHeatmapColor("triceps")} stroke="#171717" />
                  <path d="M148 98 Q140 112 144 130 Q154 118 148 98 Z" fill={getHeatmapColor("triceps")} stroke="#171717" />
                  <path d="M66 90 Q100 118 100 145 L78 152 Q62 125 66 90 Z" fill={getHeatmapColor("lats")} stroke="#171717" />
                  <path d="M134 90 Q100 118 100 145 L122 152 Q138 125 134 90 Z" fill={getHeatmapColor("lats")} stroke="#171717" />
                  <path d="M88 145 L112 145 L110 172 L90 172 Z" fill={getHeatmapColor("lower_back")} stroke="#171717" />
                  <path d="M72 172 Q100 170 100 185 L98 208 Q70 208 68 185 Z" fill={getHeatmapColor("glutes")} stroke="#171717" />
                  <path d="M128 172 Q100 170 100 185 L102 208 Q130 208 132 185 Z" fill={getHeatmapColor("glutes")} stroke="#171717" />
                  <path d="M70 210 Q96 210 94 245 L72 245 Q64 228 70 210 Z" fill={getHeatmapColor("hamstrings")} stroke="#171717" />
                  <path d="M130 210 Q104 210 106 245 L128 245 Q136 228 130 210 Z" fill={getHeatmapColor("hamstrings")} stroke="#171717" />
                  <path d="M68 250 Q92 250 86 295 L74 295 Q62 272 68 250 Z" fill={getHeatmapColor("calves")} stroke="#171717" />
                  <path d="M132 250 Q108 250 114 295 L126 295 Q138 272 132 250 Z" fill={getHeatmapColor("calves")} stroke="#171717" />
                </g>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-neutral-800 text-[10px] font-bold text-center">
            <div className="p-1.5 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-500/20">
              &lt; MEV (Mínimo)
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              MAV (Óptimo)
            </div>
            <div className="p-1.5 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/20">
              Cerca MRV
            </div>
            <div className="p-1.5 rounded-lg bg-red-950/40 text-red-400 border border-red-500/20">
              &gt; MRV (Límite)
            </div>
          </div>
        </div>

        {/* Volume Landmarks Bars Card */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Hitos de Volumen Científico (Dr. Mike Israetel)</h3>
              <p className="text-xs text-neutral-400">MEV (Mínimo Efectivo) vs MAV (Adaptativo Óptimo) vs MRV (Máximo Recuperable)</p>
            </div>
          </div>

          {/* Muscle Selector Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {volumeLandmarks.map((vl) => (
              <button
                key={vl.muscle}
                onClick={() => setSelectedMuscle(vl.muscle)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedMuscle === vl.muscle
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {vl.nameEs} ({vl.currentSets})
              </button>
            ))}
          </div>

          {/* Detailed Selected Muscle Landmark Box */}
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{selectedLandmark.nameEs}</span>
                <div className="text-2xl font-black text-white mt-0.5">
                  {selectedLandmark.currentSets} <span className="text-sm font-normal text-neutral-400">series efectivas esta semana</span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                  selectedLandmark.status === "optimal"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : selectedLandmark.status === "under"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {selectedLandmark.status === "optimal"
                  ? "Estímulo Óptimo (MAV)"
                  : selectedLandmark.status === "under"
                  ? "Sub-óptimo (< MEV)"
                  : "Cercano a Límite (MRV)"}
              </span>
            </div>

            {/* Visual Landmark Bar with MEV, MAV, MRV markers */}
            <div className="space-y-1.5">
              <div className="relative h-4 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (selectedLandmark.currentSets / Math.max(1, selectedLandmark.mrv * 1.1)) * 100)}%`,
                  }}
                />
              </div>

              {/* Landmark ticks */}
              <div className="flex justify-between text-[11px] font-mono text-neutral-400 pt-1">
                <span>0 series</span>
                <span className="text-blue-400 font-bold">MEV: {selectedLandmark.mev}s</span>
                <span className="text-emerald-400 font-bold">MAV: {selectedLandmark.mav}s</span>
                <span className="text-amber-400 font-bold">MRV: {selectedLandmark.mrv}s</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed pt-2 border-t border-neutral-900">
              <strong>Recomendación del preparador:</strong> Para {selectedLandmark.nameEs.toLowerCase()}, tu volumen actual de {selectedLandmark.currentSets} series estimula adecuadamente la síntesis proteica miofibrilar. Mantén el RIR entre 0-2 en cada serie de trabajo.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Charts Grid (Tonnage & 1RM Progression) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tonnage Trend Chart */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Sobrecarga de Tonelaje (Volumen de Carga)</h3>
              <p className="text-xs text-neutral-400">Tonelaje (Peso × Repeticiones × Series) por sesión</p>
            </div>
          </div>

          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tonnageTrendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} />
                <YAxis stroke="#737373" fontSize={10} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                  formatter={(val: any) => [`${val.toLocaleString()} ${weightUnit}`, "Tonelaje"]}
                />
                <Area type="monotone" dataKey="tonnage" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#tonnageGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Muscle Balance Radar */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Equilibrio Estructural y Agonista-Antagonista</h3>
            <p className="text-xs text-neutral-400">Ratio empuje vs tracción y cadena posterior</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#404040" />
                <PolarAngleAxis dataKey="subject" stroke="#a3a3a3" fontSize={9} />
                <Radar name="Series Actuales" dataKey="A" stroke="#c084fc" fill="#c084fc" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Balance simétrico óptimo: bajo riesgo de pinzamiento acromial o descompensación postural.</span>
          </div>
        </div>
      </div>

      {/* Section: Rangos por Músculo (gamificación LoL) */}
      <MuscleRanksPanel />

      {/* Section 3: Personal Records Wall (solo datos reales: sesiones o carga manual) */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black text-white tracking-tight break-words">Muro de Récords Personales (1RM & Hitos)</h3>
              <p className="text-xs text-neutral-400">De tus sesiones o cargados a mano. Nada estimado sin datos.</p>
            </div>
          </div>
          <button
            onClick={() => setShowPrForm((v) => !v)}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shrink-0"
          >
            {showPrForm ? "Cerrar" : "+ Cargar 1RM"}
          </button>
        </div>

        {showPrForm && <ManualPrForm onDone={() => setShowPrForm(false)} />}

        {personalRecords.length === 0 ? (
          <p className="text-xs text-neutral-500 leading-relaxed p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            Todavía no hay récords: se crean solos al superar tu 1RM en una sesión, o cargalos manualmente con
            el botón de arriba.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {personalRecords.map((pr) => (
              <div
                key={pr.id}
                className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 space-y-2 group hover:shadow-lg hover:shadow-amber-500/5 min-w-0"
              >
                <div className="flex justify-between items-center gap-2 text-xs">
                  <span className="font-bold text-amber-400 uppercase tracking-wider truncate">{pr.type}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-neutral-500">{pr.date}</span>
                    <DeletePrButton prId={pr.id} prName={pr.exerciseName} />
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors break-words">
                  {pr.exerciseName}
                </h4>
                <div className="text-2xl font-black text-white break-words">
                  {pr.value} <span className="text-sm font-normal text-neutral-400">{weightUnit}</span>
                </div>
                {pr.previousValue && (
                  <div className="text-[11px] font-bold text-emerald-400 break-words">
                    +{Math.round((pr.value - pr.previousValue) * 10) / 10} {weightUnit} progreso
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
