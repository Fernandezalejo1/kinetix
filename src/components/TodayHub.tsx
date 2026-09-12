import React, { useMemo, useState } from "react";
import {
  Play,
  Clock,
  Plus,
  Layers,
  Activity,
  Utensils,
  ArrowRight,
  CalendarCheck,
  Zap,
  RefreshCcw,
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import { useGoal } from "../context/GoalContext";
import { Routine, Program } from "../types";
import {
  loadUserProfile,
  resolveFeaturedProgram,
  resolveAdaptedRoutine,
  adaptProgramRoutines,
  shortenRoutine,
  daysSinceCompletion,
} from "../utils/userProfile";
import { localDateKey } from "../utils/dateUtils";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { WeeklyReviewModal } from "./analytics/WeeklyReviewModal";

interface TodayHubProps {
  onGoToWorkout: () => void;
  onGoToPrograms: () => void;
  onGoToBiomechanics: () => void;
}

const PHASE_LABEL: Record<string, { label: string; emoji?: string }> = {
  cut: { label: "Definición", emoji: "🔥" },
  maintenance: { label: "Mantenimiento" },
  lean_bulk: { label: "Volumen limpio" },
};

export const TodayHub: React.FC<TodayHubProps> = ({
  onGoToWorkout,
  onGoToPrograms,
  onGoToBiomechanics,
}) => {
  const {
    activeSession,
    setIsWorkoutModalOpen,
    startWorkoutFromRoutine,
    startEmptyWorkout,
    workoutHistory,
    nutritionLog,
    includeCardio,
    setIncludeCardio,
  } = useWorkout();
  const { phase } = useGoal();
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const userProfile = loadUserProfile();
  const featuredProgram: Program = resolveFeaturedProgram(userProfile);
  // Rutinas ya adaptadas al equipamiento del perfil (home/básico/gimnasio):
  // "Hoy te toca" y su versión corta nunca sugieren ejercicios imposibles.
  const programRoutines: Routine[] = adaptProgramRoutines(featuredProgram, userProfile);
  // FASE 2: "Hoy te toca" inteligente — elige la rutina que hace más tiempo
  // que no se entrena (rotación del microciclo), nunca la ya completada hoy.
  const nextRoutine: Routine = resolveAdaptedRoutine(userProfile, workoutHistory);
  const nextLastDays: number | null = daysSinceCompletion(nextRoutine, workoutHistory);

  // Cardio inyectado al final de la sesión (solo si la rutina no lo prescribe
  // ya y el toggle está activo): el conteo de "Hoy" debe coincidir con lo real.
  const routineHasCardio = (r: Routine | null): boolean =>
    !!r && r.exercises.some((item) => {
      const def = EXERCISES_DATABASE.find((e) => e.id === item.exerciseId);
      return def && (def.executionMode === "time" || /min/i.test(String(item.targetReps ?? "")));
    });
  const cardioCount = (r: Routine) => (includeCardio && !routineHasCardio(r) ? 1 : 0);
  const nextExerciseCount = nextRoutine.exercises.length + cardioCount(nextRoutine);

  const userMinutes = userProfile?.sessionMinutes ?? 45;
  const shortFit: Routine | null = nextRoutine.estimatedDurationMin > userMinutes
    ? shortenRoutine(nextRoutine, userMinutes) : null;

  const todayStats = useMemo(() => {
    const today = localDateKey();
    const todayWorkouts = workoutHistory.filter((w) => localDateKey(new Date(w.date)) === today);
    const sets = todayWorkouts.reduce((a, w) => a + w.totalSets, 0);
    return {
      workouts: todayWorkouts.length,
      sets,
      meals: nutritionLog.meals.length,
      todayKey: today,
    };
  }, [workoutHistory, nutritionLog]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const phaseInfo = PHASE_LABEL[phase?.id ?? ""];

  const todayLabel = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div id="today-hub" className="space-y-6 animate-fadeIn pb-16">
      {/* Encabezado del día */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-cyan-400" /> HOY
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight capitalize mt-1">
            {greeting} 👋
          </h1>
          <p className="text-xs text-neutral-400 mt-1 capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-300">
            {phaseInfo ? `${phaseInfo.emoji ?? ""} ${phaseInfo.label}` : "Plan KINETIX"}
          </span>
        </div>
      </div>

      {/* Sesión activa: continuar */}
      {activeSession && (
        <button
          onClick={() => setIsWorkoutModalOpen(true)}
          className="w-full p-4 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-neutral-900 to-neutral-950 border border-emerald-500/40 text-left hover:border-emerald-400 transition-all group press-scale"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
              <Play className="w-5 h-5 fill-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Sesión activa</p>
              <p className="text-sm font-black text-white truncate mt-0.5">{activeSession.routineName}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {activeSession.exercises.length} ejercicios · tocá para continuar
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-300 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </button>
      )}

      {/* Tarjeta de decisión: la rutina de hoy */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Hoy te toca
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-bold">
                <Clock className="w-3.5 h-3.5" /> ~{nextRoutine.estimatedDurationMin} min
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-3">
              {nextRoutine.targetSplit}
            </h2>
            <p className="text-sm text-neutral-400 mt-1 max-w-xl leading-relaxed">
              {nextRoutine.name}
              <span className="text-neutral-500">
                {" · "}{nextExerciseCount} ejercicios
                {nextLastDays === null
                  ? " · primera vez con esta rutina"
                  : nextLastDays === 0
                    ? " · entrenada hoy"
                    : ` · última vez hace ${nextLastDays} ${nextLastDays === 1 ? "día" : "días"}`}
              </span>
            </p>
            {nextRoutine.description && (
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed max-w-md">{nextRoutine.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={() => startWorkoutFromRoutine(nextRoutine)}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black shadow-xl shadow-cyan-600/25 transition-all press-scale"
            >
              <Play className="w-4 h-4 fill-white shrink-0" />
              Iniciar sesión
            </button>
            {shortFit && (
              <button
                onClick={() => startWorkoutFromRoutine(shortFit)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-black border border-cyan-500/30 transition-all press-scale"
                title={`Rutina que entra en tus ${userMinutes} min preferidos`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                Versión {shortFit.estimatedDurationMin} min
              </button>
            )}
            <button
              onClick={() => startEmptyWorkout("Entrenamiento Libre")}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-bold border border-neutral-700 transition-all press-scale"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Sesión libre
            </button>
          </div>

          <label
            className="flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer select-none press-scale"
            title="Agrega 20 min de elíptica al final de la sesión"
          >
            <span className="flex items-center gap-2 text-[11px] font-bold text-neutral-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Cardio al final (20 min de elíptica)
            </span>
            <input
              type="checkbox"
              checked={includeCardio}
              onChange={(e) => setIncludeCardio(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
            <button onClick={onGoToWorkout} className="flex items-center gap-1 font-bold text-neutral-400 hover:text-white transition-colors">
              Cambiar sesión <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-neutral-700">·</span>
            <button
              onClick={() => setIsReviewOpen(true)}
              className="flex items-center gap-1 font-bold text-neutral-400 hover:text-white transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Revisión semanal
            </button>
            <span className="text-neutral-700">·</span>
            <span>
              Sobrecarga progresiva: subís peso solo cuando cumplís el objetivo de reps con el RIR planificado.
            </span>
          </div>
        </div>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <CalendarCheck className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-xl font-black text-white tabular-nums">{todayStats.workouts}</div>
          <span className="text-[9px] font-bold text-neutral-500 uppercase">Sesiones hoy</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-xl font-black text-emerald-400 tabular-nums">{todayStats.sets}</div>
          <span className="text-[9px] font-bold text-neutral-500 uppercase">Series hoy</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Utensils className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-black text-amber-400 tabular-nums">{todayStats.meals}</div>
          <span className="text-[9px] font-bold text-neutral-500 uppercase">Comidas</span>
        </div>
      </div>

      {/* Navegación rápida */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onGoToPrograms}
          className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 flex items-center gap-3 text-left transition-all press-scale"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">Programas</h4>
            <p className="text-[10px] text-neutral-500 line-clamp-1">Cambiar rutinas y splits</p>
          </div>
        </button>
        <button
          onClick={onGoToBiomechanics}
          className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 flex items-center gap-3 text-left transition-all press-scale"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">Ejercicios</h4>
            <p className="text-[10px] text-neutral-500 line-clamp-1">Biblioteca y biomecánica</p>
          </div>
        </button>
      </div>

      <WeeklyReviewModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} />
    </div>
  );
};