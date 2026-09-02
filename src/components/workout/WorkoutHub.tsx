import React, { useState, useMemo } from "react";
import {
  Play,
  Calendar,
  Flame,
  Clock,
  Dumbbell,
  Trophy,
  Plus,
  ArrowRight,
  Disc,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { PREBUILT_PROGRAMS } from "../../data/programsData";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { PlateCalculatorModal } from "./PlateCalculatorModal";
import { WarmupGeneratorModal } from "./WarmupGeneratorModal";
import { TempoMetronomeModal } from "./TempoMetronomeModal";
import { Program, Routine } from "../../types";
import { isTimeBased } from "../../utils/exerciseMode";

interface WorkoutHubProps {
  onGoToPrograms: () => void;
  onGoToBiomechanics: () => void;
}

export const WorkoutHub: React.FC<WorkoutHubProps> = ({
  onGoToPrograms,
  onGoToBiomechanics,
}) => {
  const {
    activeSession,
    setIsWorkoutModalOpen,
    startWorkoutFromRoutine,
    startEmptyWorkout,
    workoutHistory,
    deleteWorkoutHistory,
    clearWorkoutHistory,
    clearGhostSessions,
    getExerciseHistory,
    weightUnit,
    nutritionLog,
  } = useWorkout();

  const [isPlateOpen, setIsPlateOpen] = useState(false);
  const [isWarmupOpen, setIsWarmupOpen] = useState(false);
  const [isTempoOpen, setIsTempoOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [selectedExHistory, setSelectedExHistory] = useState<any | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "ghost" | "clearAll" | "deleteOne";
    id?: string;
    name?: string;
  }>(null);
  const { showToast } = useToast();

  const runConfirmed = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "ghost") {
      clearGhostSessions();
      showToast("Sesión activa fantasma eliminada", "success");
    } else if (confirmAction.type === "clearAll") {
      clearWorkoutHistory();
      showToast("Historial de entrenamiento eliminado", "success");
    } else if (confirmAction.type === "deleteOne") {
      deleteWorkoutHistory(confirmAction.id!);
      showToast("Sesión eliminada del historial", "success");
    }
    setConfirmAction(null);
  };

  // Use the program/routine the user selected in Programas (persisted) so the
  // home "today" recommendation and the day list NEVER jump back to nightwing.
  const featuredProgram: Program =
    (() => {
      try {
        const savedId = localStorage.getItem("kinetix_selected_program");
        return PREBUILT_PROGRAMS.find((p) => p.id === savedId) || PREBUILT_PROGRAMS[0];
      } catch {
        return PREBUILT_PROGRAMS[0];
      }
    })();
  const nextRoutine: Routine =
    (() => {
      try {
        const savedProgramId = localStorage.getItem("kinetix_selected_program");
        const savedRoutineId = localStorage.getItem("kinetix_selected_routine");
        const program = PREBUILT_PROGRAMS.find((p) => p.id === savedProgramId) || featuredProgram;
        return program.routines.find((r) => r.id === savedRoutineId) || program.routines[0];
      } catch {
        return featuredProgram.routines[0];
      }
    })();

  // FASE 6: Weekly summary stats
  const weekStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeek = workoutHistory.filter((w) => new Date(w.date) >= weekAgo);
    const lastWeek = workoutHistory.filter((w) => new Date(w.date) >= twoWeeksAgo && new Date(w.date) < weekAgo);
    const thisWeekVol = thisWeek.reduce((a, w) => a + w.totalVolumeKg, 0);
    const lastWeekVol = lastWeek.reduce((a, w) => a + w.totalVolumeKg, 0);
    const thisWeekSets = thisWeek.reduce((a, w) => a + w.totalSets, 0);
    const totalPRs = thisWeek.reduce((a, w) => a + w.prCount, 0);
    const volDelta = lastWeekVol > 0 ? Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100) : 0;
    return { workouts: thisWeek.length, volume: thisWeekVol, sets: thisWeekSets, prs: totalPRs, volDelta };
  }, [workoutHistory]);

  // FASE 6b: Today's progress summary
  const todayStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("es-ES");
    const todayWorkouts = workoutHistory.filter((w) => {
      const d = new Date(w.date);
      return d.toLocaleDateString("es-ES") === todayStr;
    });
    const todaySets = todayWorkouts.reduce((a, w) => a + w.totalSets, 0);
    return {
      workouts: todayWorkouts.length,
      sets: todaySets,
      meals: nutritionLog.meals.length,
      hasNutritionGoal: nutritionLog.calorieTarget > 0,
    };
  }, [workoutHistory, nutritionLog]);

  return (
    <div id="workout-hub" className="space-y-8 animate-fadeIn pb-16">
      {/* Hero Quick Start Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl relative overflow-hidden group">
        {/* Background glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SISTEMA KINETIX
              </span>
              <span className="text-xs text-neutral-400 font-medium">Periodización & RIR de Alta Calidad</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activeSession ? "Sesión Activa en Curso" : "¿Listo para entrenar hoy?"}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {activeSession
                ? `Tienes la rutina "${activeSession.routineName}" iniciada con ${activeSession.exercises.length} ejercicios registrados.`
                : `Rutina recomendada para hoy: "${nextRoutine.name}". Diseñada con sobrecarga en la posición alargada (lengthened-bias).`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {activeSession ? (
              <button
                onClick={() => setIsWorkoutModalOpen(true)}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Continuar Entrenamiento
              </button>
            ) : (
              <>
                <button
                  onClick={() => startWorkoutFromRoutine(nextRoutine)}
                  className="px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Iniciar: {nextRoutine.name.split("(")[0]}
                </button>
                <button
                  onClick={() => startEmptyWorkout("Entrenamiento Libre")}
                  className="px-5 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm rounded-2xl border border-neutral-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Sesión Libre
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Today's Progress Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-500/5 via-neutral-900 to-neutral-950 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-white tracking-tight">Resumen de hoy</h3>
          </div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Sesiones */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Sesiones</span>
              <span className="text-[10px] font-black text-white">{todayStats.workouts}/1</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, todayStats.workouts * 100)}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1.5">
              {todayStats.workouts >= 1 ? "¡Meta cumplida!" : "Entrená hoy para mantener el ritmo"}
            </p>
          </div>

          {/* Series */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Series</span>
              <span className="text-[10px] font-black text-purple-400">{todayStats.sets}</span>
            </div>
            <div className="text-lg font-black text-white">{todayStats.sets > 0 ? `${todayStats.sets} hoy` : "Sin registrar"}</div>
            <p className="text-[10px] text-neutral-500 mt-1.5">Volumen de calidad en las sesiones de hoy</p>
          </div>

          {/* Comidas */}
          <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Comidas</span>
              <span className="text-[10px] font-black text-white">{todayStats.meals}/4</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (todayStats.meals / 4) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1.5">Registrá tus comidas en Nutrición</p>
          </div>
        </div>
      </div>

      {/* Weekly Summary Bar */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <Target className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-xl font-black text-white">{weekStats.workouts}</div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Sesiones</span>
        </div>
        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <Layers className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <div className="text-xl font-black text-purple-400">{weekStats.volume.toLocaleString()}</div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Tonelaje</span>
        </div>
        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-xl font-black text-emerald-400">{weekStats.sets}</div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Series</span>
        </div>
        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-black text-amber-400">{weekStats.prs}</div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">PRs</span>
        </div>
      </div>

      {/* Science Quick Tools Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setIsPlateOpen(true)}
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-blue-500/40 transition-all flex items-center gap-3 text-left group"
        >
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
              Calculadora de Discos
            </h4>
            <p className="text-[11px] text-neutral-400">Distribución exacta por lado en barra</p>
          </div>
        </button>

        <button
          onClick={() => setIsWarmupOpen(true)}
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-all flex items-center gap-3 text-left group"
        >
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Pirámide de Calentamiento
            </h4>
            <p className="text-[11px] text-neutral-400">Potenciación SNC sin fatiga metabólica</p>
          </div>
        </button>

        <button
          onClick={() => setIsTempoOpen(true)}
          className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/40 transition-all flex items-center gap-3 text-left group"
        >
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
              Metrónomo de Tempo
            </h4>
            <p className="text-[11px] text-neutral-400">Control excéntrico de tensión mecánica</p>
          </div>
        </button>
      </div>

      {/* Suggested Routines Split Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Rutinas de tu Programa Activo</h3>
            <p className="text-xs text-neutral-400">{featuredProgram.title} ({featuredProgram.daysPerWeek} días/sem)</p>
          </div>
          <button
            onClick={onGoToPrograms}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Explorar todos los programas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredProgram.routines.map((routine, idx) => (
            <div
              key={routine.id}
              className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
                    DÍA {idx + 1} • {routine.targetSplit}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {routine.exercises.length} Ejercicios
                  </span>
                </div>
                <h4 className="text-lg font-black text-white">{routine.name}</h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{routine.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800 gap-2">
                <span className="text-[11px] text-neutral-500 font-medium truncate max-w-[200px]">
                  {routine.exercises.slice(0, 3).map((e) => {
                    const ex = EXERCISES_DATABASE.find((dbEx) => dbEx.id === e.exerciseId);
                    return ex?.nameEs || e.exerciseId;
                  }).join(" • ")}...
                </span>

                <button
                  onClick={() => startWorkoutFromRoutine(routine)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Iniciar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Workout History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Historial de Entrenamientos</h3>
            <p className="text-xs text-neutral-400">{workoutHistory.length} sesiones registradas</p>
          </div>
          <div className="flex items-center gap-2">
            {activeSession && (
              <button
                onClick={() => setConfirmAction({ type: "ghost" })}
                className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-all"
              >
                Limpiar sesión activa
              </button>
            )}
            {workoutHistory.length > 0 && (
              <button
                onClick={() => setConfirmAction({ type: "clearAll" })}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-[11px] font-bold border border-red-500/30 transition-all"
              >
                Borrar todo
              </button>
            )}
          </div>
        </div>

        {workoutHistory.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
            No hay entrenamientos registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {workoutHistory.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedSession(log)}
                className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/30 hover:bg-neutral-800/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-black text-sm shrink-0">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate">{log.routineName}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {Math.floor(log.durationSeconds / 60)} min
                      </span>
                      <span>•</span>
                      <span className="text-cyan-400 font-bold">{log.totalSets} series</span>
                      <span>•</span>
                      <span className="text-purple-400 font-bold">
                        {log.totalVolumeKg.toLocaleString()} {weightUnit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {log.prCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-amber-300 text-[11px] font-bold">
                      <Trophy className="w-3.5 h-3.5" />
                      {log.prCount} PR
                    </div>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: "deleteOne", id: log.id, name: log.routineName })}
                    className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/40 transition-all"
                    title="Eliminar sesión"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals for Quick Tools */}
      <PlateCalculatorModal
        isOpen={isPlateOpen}
        onClose={() => setIsPlateOpen(false)}
        weightUnit={weightUnit}
      />
      <WarmupGeneratorModal
        isOpen={isWarmupOpen}
        onClose={() => setIsWarmupOpen(false)}
        exerciseName="Press de Banca / Sentadilla"
        weightUnit={weightUnit}
      />
      <TempoMetronomeModal
        isOpen={isTempoOpen}
        onClose={() => setIsTempoOpen(false)}
      />

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedSession(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedSession.routineName}</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(selectedSession.date).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setSelectedSession(null)} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Duración</span>
                  <p className="text-sm font-black text-cyan-400 mt-1">{Math.floor(selectedSession.durationSeconds / 60)} min</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Volumen</span>
                  <p className="text-sm font-black text-purple-400 mt-1">{selectedSession.totalVolumeKg.toLocaleString()} {weightUnit}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Series</span>
                  <p className="text-sm font-black text-emerald-400 mt-1">{selectedSession.totalSets}</p>
                </div>
              </div>
            </div>

            {/* Exercises List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 overscroll-contain scrollbar-thin">
              {selectedSession.exercises?.map((wEx: any, idx: number) => {
                const isTime = isTimeBased(wEx.exercise, wEx.targetReps);
                return (
                <div key={wEx.id || idx} className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                  <div className="px-4 py-3 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors" onClick={() => wEx.exerciseId && setSelectedExHistory({ id: wEx.exerciseId, name: wEx.exercise?.nameEs || wEx.exerciseId })}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-black flex items-center justify-center border border-cyan-500/20">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">{wEx.exercise?.nameEs || wEx.exerciseId} <span className="text-[9px] text-cyan-400 font-normal">ver historial →</span></h4>
                        <p className="text-[10px] text-neutral-500">{wEx.exercise?.equipment || ''} • {wEx.exercise?.category || ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-neutral-500 uppercase">
                          <th className="text-center py-1 w-10">#</th>
                          <th className="text-center py-1">Tipo</th>
                          {!isTime && <th className="text-center py-1">{weightUnit.toUpperCase()}</th>}
                          <th className="text-center py-1">{isTime ? "Duración" : "Reps"}</th>
                          <th className="text-center py-1">RIR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wEx.sets?.map((set: any) => (
                          <tr key={set.id} className="border-t border-neutral-800/50">
                            <td className="text-center py-1.5 text-neutral-400 font-mono">{set.setNumber}</td>
                            <td className="text-center py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                set.type === 'dropset' ? 'bg-purple-500/20 text-purple-300' :
                                set.type === 'myorep' ? 'bg-blue-500/20 text-blue-300' :
                                set.type === 'warmup' ? 'bg-amber-500/20 text-amber-300' :
                                'bg-neutral-800 text-neutral-400'
                              }`}>{set.type === 'normal' ? 'W' : set.type.slice(0, 4)}</span>
                            </td>
                            {!isTime && <td className={`text-center py-1.5 font-bold ${set.completed ? 'text-cyan-400' : 'text-neutral-500'}`}>{set.weight || 0}</td>}
                            <td className={`text-center py-1.5 font-bold ${set.completed ? 'text-white' : 'text-neutral-500'}`}>
                              {isTime ? `${set.durationSeconds ?? set.reps}s` : set.reps}
                            </td>
                            <td className="text-center py-1.5 text-neutral-400">{set.rir ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exercise History Modal */}
      {selectedExHistory && (() => {
        const history = getExerciseHistory(selectedExHistory.id);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedExHistory(null)}>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedExHistory.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{history.length} sesiones registradas</p>
                  </div>
                  <button onClick={() => setSelectedExHistory(null)} className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 overscroll-contain scrollbar-thin">
                {history.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-8">Sin historial para este ejercicio</p>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-neutral-400">
                          {new Date(entry.date).toLocaleDateString("es-ES", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs font-bold text-cyan-400">{entry.volumeKg.toLocaleString()} {weightUnit}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entry.reps.map((r: number, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                            <span className="font-bold text-white">{entry.weight}</span>
                            <span className="text-neutral-400"> × {r}</span>
                            {entry.rpe && <span className="text-neutral-500"> @{entry.rpe}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "ghost"
            ? "Eliminar sesión activa"
            : confirmAction?.type === "clearAll"
            ? "Borrar todo el historial"
            : "Eliminar sesión"
        }
        message={
          confirmAction?.type === "ghost"
            ? "¿Eliminar la sesión activa fantasma? El entrenamiento en curso no se ve afectado."
            : confirmAction?.type === "clearAll"
            ? `¿Eliminar las ${workoutHistory.length} sesiones del historial? Esta acción no se puede deshacer.`
            : `¿Eliminar la sesión "${confirmAction?.name}" del historial? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={runConfirmed}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
