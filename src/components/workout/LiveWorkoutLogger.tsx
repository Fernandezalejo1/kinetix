import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Disc,
  Flame,
  Activity,
  Info,
  Clock,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Minimize2,
  Trophy,
  Frown,
  Meh,
  Smile,
  Zap
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { SetType, Exercise, WorkoutExercise, DifficultyLevel } from "../../types";
import { PlateCalculatorModal } from "./PlateCalculatorModal";
import { WarmupGeneratorModal } from "./WarmupGeneratorModal";
import { TempoMetronomeModal } from "./TempoMetronomeModal";
import { ExerciseDetailModal } from "../exercises/ExerciseDetailModal";
import { ExerciseLibraryModal } from "../exercises/ExerciseLibraryModal";

/** Cardio Timer — 20 minute countdown for treadmill/cardio exercises.
 *  Uses a target END timestamp (not tick-counting) so the countdown keeps
 *  correct time even if the phone screen locks or the app is backgrounded and
 *  the browser throttles setInterval. */
const CARDIO_SECONDS = 20 * 60;
const CardioTimer: React.FC<{ exercise: WorkoutExercise }> = ({ exercise }) => {
  const [remaining, setRemaining] = useState(CARDIO_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const { completeSetAndTriggerTimer } = useWorkout();

  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setIsRunning(false);
        completeSetAndTriggerTimer(exercise.id, exercise.sets[0]?.id);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, endAt, exercise.id, exercise.sets, completeSetAndTriggerTimer]);

  const toggle = () => {
    if (!started || remaining <= 0) {
      setEndAt(Date.now() + CARDIO_SECONDS * 1000);
    } else if (isRunning) {
      setEndAt(null);
    } else {
      setEndAt(Date.now() + remaining * 1000);
    }
    setStarted(true);
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setRemaining(CARDIO_SECONDS);
    setIsRunning(false);
    setStarted(false);
    setEndAt(null);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = ((CARDIO_SECONDS - remaining) / CARDIO_SECONDS) * 100;
  const done = remaining === 0 && started;

  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-950/40 via-neutral-900 to-neutral-950 border border-cyan-500/20 p-6 text-center space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Cardio — {exercise.exercise.nameEs}</div>
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(23 23 23)" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#22d3ee" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white font-mono">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
            <span className="text-[10px] text-neutral-400 font-bold">{done ? "¡COMPLETADO!" : isRunning ? "EN PROGRESO" : "20:00 min"}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {!done ? (
            <>
              <button
                onClick={toggle}
                className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                  isRunning ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
                }`}
              >
                {isRunning ? <><Pause className="w-4 h-4 fill-white" />Pausar</> : <><Play className="w-4 h-4 fill-white" />{started ? "Reanudar" : "Iniciar Cardio"}</>}
              </button>
              {started && (
                <button
                  onClick={reset}
                  className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm border border-neutral-700 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">Cardio completado — 20 minutos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LiveWorkoutLogger: React.FC = () => {
  const {
    activeSession,
    isWorkoutModalOpen,
    setIsWorkoutModalOpen,
    restTimer,
    startRestTimer,
    stopRestTimer,
    adjustRestTimer,
    soundEnabled,
    setSoundEnabled,
    updateSet,
    addSet,
    removeSet,
    completeSetAndTriggerTimer,
    removeExerciseFromActiveWorkout,
    replaceExerciseInActiveWorkout,
    addExerciseToActiveWorkout,
    recordExerciseDifficulty,
    finishWorkout,
    cancelWorkout,
    weightUnit,
    setSelectedExerciseForDetail,
    selectedExerciseForDetail,
  } = useWorkout();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedExForPlate, setSelectedExForPlate] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForWarmup, setSelectedExForWarmup] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForTempo, setSelectedExForTempo] = useState<{ name: string; tempo: string } | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [replacingWExId, setReplacingWExId] = useState<string | null>(null);
  const [finishedSummary, setFinishedSummary] = useState<{ prsAchieved: any[]; totalVolumeKg: number } | null>(null);
  const [difficultySurvey, setDifficultySurvey] = useState<{ exerciseId: string; exerciseName: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { showToast } = useToast();

  const handleCancelConfirmed = () => {
    cancelWorkout();
    setConfirmCancel(false);
    showToast("Entrenamiento cancelado", "info");
  };

  // Auto-trigger difficulty survey when all working sets of an exercise are completed
  useEffect(() => {
    if (!activeSession || difficultySurvey) return;
    for (const wEx of activeSession.exercises) {
      const workingSets = wEx.sets.filter(s => s.type !== "warmup");
      if (workingSets.length === 0) continue;
      const allCompleted = workingSets.every(s => s.completed);
      const alreadyHasDifficulty = wEx.notes?.startsWith("difficulty:");
      if (allCompleted && !alreadyHasDifficulty) {
        setDifficultySurvey({ exerciseId: wEx.id, exerciseName: wEx.exercise.nameEs });
        break;
      }
    }
  }, [activeSession, difficultySurvey]);

  // Live session stopwatch timer
  useEffect(() => {
    let interval: any = null;
    if (activeSession) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - activeSession.startTime) / 1000);
        setElapsedSeconds(secs);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const checkAndShowDifficultySurvey = useCallback((wEx: WorkoutExercise) => {
    const allCompleted = wEx.sets.filter(s => s.type !== "warmup").every(s => s.completed);
    const hasWarmup = wEx.sets.some(s => s.type === "warmup");
    const workingSets = wEx.sets.filter(s => s.type !== "warmup");
    const alreadyHasDifficulty = wEx.notes?.startsWith("difficulty:");
    if (allCompleted && workingSets.length > 0 && !alreadyHasDifficulty && !difficultySurvey) {
      setDifficultySurvey({ exerciseId: wEx.id, exerciseName: wEx.exercise.nameEs });
    }
  }, [difficultySurvey]);

  if (!activeSession || !isWorkoutModalOpen) {
    if (finishedSummary) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto scrollbar-thin shadow-2xl p-6 sm:p-8 text-center space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">¡Sesión Científica Completada!</h2>
              <p className="text-sm text-neutral-400 mt-1">Estímulo anabólico y tensión mecánica registrados con éxito.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-400">Volumen de Tonelaje Total</span>
                <div className="text-2xl font-extrabold text-cyan-400 mt-1">
                  {finishedSummary.totalVolumeKg.toLocaleString()} <span className="text-sm text-neutral-400">kg</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-400">Récords Personales (PR)</span>
                <div className="text-2xl font-extrabold text-amber-400 mt-1">
                  {finishedSummary.prsAchieved.length} PRs
                </div>
              </div>
            </div>

            {finishedSummary.prsAchieved.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-left space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Hitos de Sobrecarga Progresiva</span>
                {finishedSummary.prsAchieved.map((pr: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs text-neutral-200">
                    <span>{pr.exerciseName}</span>
                    <span className="font-extrabold text-amber-300">1RM Estimado: {pr.value} kg</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setFinishedSummary(null)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-600/20"
            >
              Ver Análisis en Dashboard
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  const formatStopwatch = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinish = () => {
    const summary = finishWorkout();
    setFinishedSummary(summary);
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    if (difficultySurvey) {
      recordExerciseDifficulty(difficultySurvey.exerciseId, difficulty);
      setDifficultySurvey(null);

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const difficultyOptions: { level: DifficultyLevel; label: string; emoji: React.ReactNode; color: string; description: string }[] = [
    { level: "very_hard", label: "Muy difícil", emoji: <Frown className="w-6 h-6" />, color: "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20", description: "No pude completar todas las reps" },
    { level: "just_right", label: "Justo", emoji: <Meh className="w-6 h-6" />, color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20", description: "RIR 1-2, esfuerzo ideal" },
    { level: "good", label: "Bien", emoji: <Smile className="w-6 h-6" />, color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20", description: "Completé todo con buena técnica" },
    { level: "had_more", label: "Me sobraron reps", emoji: <Zap className="w-6 h-6" />, color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20", description: "Pude hacer más repeticiones" },
  ];

  // Calculate live session total tonnage
  const currentVolume = activeSession.exercises.reduce((acc, wex) => {
    return (
      acc +
      wex.sets.reduce((sAcc, s) => {
        return s.completed ? sAcc + s.weight * s.reps : sAcc;
      }, 0)
    );
  }, 0);

  const completedSetsCount = activeSession.exercises.reduce((acc, wex) => {
    return acc + wex.sets.filter((s) => s.completed).length;
  }, 0);

  return (
    <div
      id="live-workout-logger"
      className="fixed inset-0 z-50 text-neutral-100 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Floating Session Timer Header — a lightweight stopwatch that stays fixed
          at the top so it never takes over the center of the screen. Uses
          responsive (vw/clamp) sizing to stay legible from 4" to 7" screens. */}
      <div className="sticky top-0 z-20 shrink-0 px-3 sm:px-8 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-neutral-700"
           style={{ backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Active badge + routine name (compact) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-white tracking-tight truncate">
                {activeSession.routineName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                <span>{completedSetsCount} series</span>
                <span>•</span>
                <span className="text-purple-400 font-bold">{currentVolume.toLocaleString()} {weightUnit}</span>
              </div>
            </div>
          </div>

          {/* Floating stopwatch pill — the session time, prominent & responsive */}
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-neutral-950/80 border border-cyan-500/40 shadow-lg shadow-cyan-900/20 ml-auto shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            <span className="font-black text-white font-mono tabular-nums text-[clamp(1.1rem,5.5vw,1.75rem)] leading-none">
              {formatStopwatch(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700"
            title="Sonido de Temporizador"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsWorkoutModalOpen(false)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold"
            title="Minimizar (sigue en segundo plano)"
          >
            <Minimize2 className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Minimizar</span>
          </button>

          <button
            onClick={handleFinish}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizar
          </button>
        </div>
      </div>

      {/* Floating Smart Rest Timer Widget if Active */}
      {restTimer.active && (
        <div className="bg-neutral-900 border-b border-cyan-500/30 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg animate-fadeIn z-20">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  className="stroke-neutral-800 stroke-2 fill-none"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  className="stroke-cyan-400 stroke-2 fill-none transition-all duration-1000"
                  strokeDasharray={2 * Math.PI * 15}
                  strokeDashoffset={
                    2 * Math.PI * 15 * (1 - restTimer.remainingSeconds / Math.max(1, restTimer.totalSeconds))
                  }
                />
              </svg>
              <span className="absolute text-[11px] font-black font-mono text-cyan-400">
                {restTimer.remainingSeconds}
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Descanso: {restTimer.remainingSeconds}s restantes
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-xs">{restTimer.exerciseName || "Siguiente serie"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => adjustRestTimer(-15)}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono font-bold"
            >
              -15s
            </button>
            <button
              onClick={() => adjustRestTimer(30)}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono font-bold"
            >
              +30s
            </button>
            <button
              onClick={stopRestTimer}
              className="px-3 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-xs font-bold"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* Main Exercises Workout Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 max-w-4xl w-full mx-auto pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {activeSession.exercises.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/50 rounded-3xl border border-neutral-800 p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tu entrenamiento está vacío</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                Añade tus primeros ejercicios desde la biblioteca científica para comenzar a registrar series efectivas y tempo.
              </p>
            </div>
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
            >
              Añadir Ejercicio
            </button>
          </div>
        ) : (
          activeSession.exercises.map((wEx, exIndex) => {
            const firstWorkingSet = wEx.sets.find((s) => s.type !== "warmup") || wEx.sets[0];
            const currentWorkingWeight = firstWorkingSet ? firstWorkingSet.weight : 40;

            return (
              <div
                key={wEx.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* Exercise Header */}
                <div className="p-4 sm:p-5 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                        EJERCICIO {exIndex + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        {wEx.exercise.resistanceProfile === "lengthened" ? "Estiramiento" : "Contracción"}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        Tempo: <strong className="text-white">{wEx.exercise.defaultTempo}</strong>
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {wEx.exercise.nameEs}
                    </h3>
                  </div>

                  {/* Exercise Micro Utilities */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSelectedExForPlate({ name: wEx.exercise.nameEs, weight: currentWorkingWeight })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Calculadora de Discos en Barra"
                    >
                      <Disc className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Discos</span>
                    </button>

                    <button
                      onClick={() => setSelectedExForWarmup({ name: wEx.exercise.nameEs, weight: currentWorkingWeight })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Pirámide de Calentamiento Científica"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Calentar</span>
                    </button>

                    <button
                      onClick={() => setSelectedExForTempo({ name: wEx.exercise.nameEs, tempo: wEx.exercise.defaultTempo })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Metrónomo de Tempo en Vivo"
                    >
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Tempo</span>
                    </button>

                    <button
                      onClick={() => setSelectedExerciseForDetail(wEx.exercise)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-cyan-400 border border-neutral-700 transition-colors"
                      title="Ver Biomecánica y Anatomía"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setReplacingWExId(wEx.id);
                        setIsLibraryOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
                      title="Sustituir Ejercicio"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeExerciseFromActiveWorkout(wEx.id)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 border border-neutral-700 transition-colors"
                      title="Eliminar del entrenamiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cardio Timer — special rendering for cardio:20min */}
                {wEx.notes?.startsWith("cardio:") && (
                  <CardioTimer exercise={wEx} />
                )}

                {/* Sets Table — Desktop (hidden for cardio) */}
                {!wEx.notes?.startsWith("cardio:") && (
                <div className="p-4 sm:p-5 overflow-x-auto hidden md:block">
                  <table className="w-full text-left text-xs min-w-[540px]">
                    <thead>
                      <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-2">
                        <th className="py-2 w-12 text-center">SERIE</th>
                        <th className="py-2 w-28">ANTERIOR</th>
                        <th className="py-2 w-28 text-center">{weightUnit.toUpperCase()}</th>
                        <th className="py-2 w-24 text-center">REPS</th>
                        <th className="py-2 w-20 text-center">RIR</th>
                        <th className="py-2 w-14 text-center">CHECK</th>
                        <th className="py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {wEx.sets.map((set, sIdx) => {
                        const isWarmup = set.type === "warmup";
                        const isDrop = set.type === "dropset";
                        const isMyo = set.type === "myorep";

                        return (
                          <tr
                            key={set.id}
                            className={`transition-colors ${
                              set.completed
                                ? "bg-emerald-950/20 text-neutral-300"
                                : "hover:bg-neutral-800/30 text-white"
                            }`}
                          >
                            {/* Set Number & Type Pill */}
                            <td className="py-2.5 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-extrabold text-sm text-neutral-200">{set.setNumber}</span>
                                <select
                                  value={set.type}
                                  onChange={(e) =>
                                    updateSet(wEx.id, set.id, { type: e.target.value as SetType })
                                  }
                                  className="text-[9px] uppercase font-bold bg-transparent text-neutral-400 hover:text-cyan-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="normal" className="bg-neutral-900 text-white">Normal</option>
                                  <option value="warmup" className="bg-neutral-900 text-amber-400">Calent.</option>
                                  <option value="dropset" className="bg-neutral-900 text-purple-400">Drop Set</option>
                                  <option value="myorep" className="bg-neutral-900 text-blue-400">Myo-Rep</option>
                                  <option value="failure" className="bg-neutral-900 text-red-400">Fallo</option>
                                </select>
                              </div>
                            </td>

                            {/* Ghost Rep Previous Performance */}
                            <td className="py-2.5 text-neutral-400 font-mono text-[11px]">
                              {set.previousWeight ? (
                                <span>{set.previousWeight}k × {set.previousReps} @RIR{set.previousRir ?? 1}</span>
                              ) : (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>

                            {/* Weight Field */}
                            <td className="py-2.5 text-center">
                              <div className="inline-flex items-center bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                                <button
                                  type="button"
                                    onClick={() =>
                                      updateSet(wEx.id, set.id, {
                                        weight: Math.max(0, Math.round((set.weight - 2.5) * 10) / 10),
                                      })
                                    }
                                  className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="2.5"
                                  value={set.weight}
                                  onChange={(e) =>
                                    updateSet(wEx.id, set.id, {
                                      weight: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-14 text-center bg-transparent font-bold text-white text-sm focus:outline-none py-1.5"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSet(wEx.id, set.id, {
                                      weight: Math.round((set.weight + 2.5) * 10) / 10,
                                    })
                                  }
                                  className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Reps Field */}
                            <td className="py-2.5 text-center">
                              <div className="inline-flex items-center bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                                <button
                                  type="button"
                                    onClick={() =>
                                      updateSet(wEx.id, set.id, {
                                        reps: Math.max(1, set.reps - 1),
                                      })
                                    }
                                  className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.reps}
                                  onChange={(e) =>
                                    updateSet(wEx.id, set.id, {
                                      reps: parseInt(e.target.value, 10) || 0,
                                    })
                                  }
                                  className="w-10 text-center bg-transparent font-bold text-white text-sm focus:outline-none py-1.5"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSet(wEx.id, set.id, {
                                      reps: set.reps + 1,
                                    })
                                  }
                                  className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* RIR (Reps In Reserve) */}
                            <td className="py-2.5 text-center">
                              <select
                                value={set.rir ?? 1}
                                onChange={(e) =>
                                  updateSet(wEx.id, set.id, { rir: parseInt(e.target.value, 10) })
                                }
                                className="px-2 py-2 rounded-lg bg-neutral-950 border border-neutral-800 font-bold text-cyan-400 text-xs focus:outline-none"
                              >
                                <option value={0} className="bg-neutral-900 text-red-400">0 (Fallo)</option>
                                <option value={1} className="bg-neutral-900 text-cyan-400">1 RIR</option>
                                <option value={2} className="bg-neutral-900 text-cyan-400">2 RIR</option>
                                <option value={3} className="bg-neutral-900 text-neutral-300">3 RIR</option>
                                <option value={4} className="bg-neutral-900 text-neutral-400">4+ RIR</option>
                              </select>
                            </td>

                            {/* Complete Checkmark Button */}
                            <td className="py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => completeSetAndTriggerTimer(wEx.id, set.id)}
                                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md ${
                                  set.completed
                                    ? "bg-emerald-500 text-neutral-950 font-black shadow-emerald-500/30 scale-105"
                                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white border border-neutral-700"
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </td>

                            {/* Delete Set */}
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeSet(wEx.id, set.id)}
                                className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}

                {/* Sets Cards — Mobile (hidden for cardio) */}
                {!wEx.notes?.startsWith("cardio:") && (
                <div className="p-3 space-y-3 md:hidden">
                  {wEx.sets.map((set) => {
                    return (
                      <div
                        key={set.id}
                        className={`rounded-2xl border p-3 space-y-2.5 ${
                          set.completed
                            ? "bg-emerald-950/20 border-emerald-500/30"
                            : "bg-neutral-950/60 border-neutral-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${set.completed ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-300"}`}>
                              {set.setNumber}
                            </span>
                            <select
                              value={set.type}
                              onChange={(e) =>
                                updateSet(wEx.id, set.id, { type: e.target.value as SetType })
                              }
                              className="text-[11px] uppercase font-bold bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-neutral-300 focus:outline-none"
                            >
                              <option value="normal" className="bg-neutral-900 text-white">Normal</option>
                              <option value="warmup" className="bg-neutral-900 text-amber-400">Calent.</option>
                              <option value="dropset" className="bg-neutral-900 text-purple-400">Drop Set</option>
                              <option value="myorep" className="bg-neutral-900 text-blue-400">Myo-Rep</option>
                              <option value="failure" className="bg-neutral-900 text-red-400">Fallo</option>
                            </select>
                            {set.previousWeight ? (
                              <span className="text-[10px] font-mono text-neutral-500 truncate">
                                antes {set.previousWeight}k × {set.previousReps} @RIR{set.previousRir ?? 1}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSet(wEx.id, set.id)}
                            className="text-neutral-600 hover:text-red-400 transition-colors p-1.5 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Peso ({weightUnit})</label>
                            <div className="flex items-center justify-between bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    weight: Math.max(0, Math.round((set.weight - 2.5) * 10) / 10),
                                  })
                                }
                                className="w-11 h-11 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-neutral-900 text-base touch-target"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={set.weight}
                                onChange={(e) =>
                                  updateSet(wEx.id, set.id, {
                                    weight: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-14 text-center bg-transparent font-bold text-white text-sm focus:outline-none touch-target"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    weight: Math.round((set.weight + 2.5) * 10) / 10,
                                  })
                                }
                                className="w-11 h-11 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-cyan-600/20 text-cyan-300 text-base font-bold touch-target"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Reps</label>
                            <div className="flex items-center justify-between bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    reps: Math.max(1, set.reps - 1),
                                  })
                                }
                                className="w-11 h-11 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-neutral-900 text-base touch-target"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={set.reps}
                                onChange={(e) =>
                                  updateSet(wEx.id, set.id, {
                                    reps: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-14 text-center bg-transparent font-bold text-white text-sm focus:outline-none touch-target"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    reps: set.reps + 1,
                                  })
                                }
                                className="w-11 h-11 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-cyan-600/20 text-cyan-300 text-base font-bold touch-target"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">RIR (Reps en Reserva)</label>
                            <div className="grid grid-cols-5 gap-1.5">
                              {[0, 1, 2, 3, 4].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => updateSet(wEx.id, set.id, { rir: r })}
                                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                                    (set.rir ?? 1) === r
                                      ? r === 0
                                        ? "bg-red-500/20 border border-red-500/40 text-red-400"
                                        : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                                      : "bg-neutral-950 border border-neutral-800 text-neutral-500 active:text-white"
                                  }`}
                                >
                                  {r === 0 ? "Fallo" : r}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => completeSetAndTriggerTimer(wEx.id, set.id)}
                          className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                            set.completed
                              ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30"
                              : "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 active:bg-emerald-600 active:text-white"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          {set.completed ? "Serie Completada" : "Completar Serie"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Add Set Options Bar */}
                {!wEx.notes?.startsWith("cardio:") && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex items-center gap-2 pt-4 flex-wrap">
                  <button type="button" onClick={() => addSet(wEx.id, "normal")} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-1.5 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />Serie Normal
                  </button>
                  <button type="button" onClick={() => addSet(wEx.id, "dropset")} className="px-3 py-1.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1.5 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />Drop Set
                  </button>
                  <button type="button" onClick={() => addSet(wEx.id, "myorep")} className="px-3 py-1.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition-colors">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />Myo-Reps
                  </button>
                </div>
                )}

              </div>
            );
          })
        )}

        {/* Big Add Exercise Button */}
        <button
          onClick={() => {
            setReplacingWExId(null);
            setIsLibraryOpen(true);
          }}
          className="w-full py-5 rounded-3xl border-2 border-dashed border-neutral-800 hover:border-cyan-500 text-neutral-400 hover:text-cyan-400 font-bold text-sm flex items-center justify-center gap-2 transition-all bg-neutral-900/40 hover:bg-neutral-900 touch-target"
        >
          <Plus className="w-5 h-5" />
          Añadir Ejercicio a la Sesión
        </button>

        {/* Cancel session option */}
        <div className="text-center pt-4">
          <button
            onClick={() => setConfirmCancel(true)}
            className="text-xs text-red-400/80 hover:text-red-400 font-medium underline py-3 touch-target"
          >
            Descartar y cancelar sesión
          </button>
        </div>
      </div>

      {/* Cancel session confirmation */}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar entrenamiento"
        message="¿Seguro que deseas cancelar el entrenamiento en curso? Se perderá todo el progreso de esta sesión."
        confirmLabel="Cancelar sesión"
        danger
        onConfirm={handleCancelConfirmed}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Difficulty Survey Modal */}
      {difficultySurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">¿Cómo te fue?</h3>
              <p className="text-xs text-neutral-400">
                <strong className="text-white">{difficultySurvey.exerciseName}</strong> — Selecciona cómo se sintió
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => handleDifficultySelect(opt.level)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center touch-target ${opt.color}`}
                >
                  {opt.emoji}
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[10px] opacity-70 leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setDifficultySurvey(null)}
              className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-300 font-medium transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedExForPlate && (
        <PlateCalculatorModal
          isOpen={true}
          onClose={() => setSelectedExForPlate(null)}
          initialWeight={selectedExForPlate.weight}
          weightUnit={weightUnit}
        />
      )}

      {selectedExForWarmup && (
        <WarmupGeneratorModal
          isOpen={true}
          onClose={() => setSelectedExForWarmup(null)}
          exerciseName={selectedExForWarmup.name}
          initialWorkingWeight={selectedExForWarmup.weight}
          weightUnit={weightUnit}
        />
      )}

      {selectedExForTempo && (
        <TempoMetronomeModal
          isOpen={true}
          onClose={() => setSelectedExForTempo(null)}
          exerciseName={selectedExForTempo.name}
          initialTempo={selectedExForTempo.tempo}
        />
      )}

      {selectedExerciseForDetail && (
        <ExerciseDetailModal
          exercise={selectedExerciseForDetail}
          onClose={() => setSelectedExerciseForDetail(null)}
        />
      )}

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => {
          setIsLibraryOpen(false);
          setReplacingWExId(null);
        }}
        mode={replacingWExId ? "replace" : "select"}
        onSelectExercise={(ex) => {
          if (replacingWExId) {
            replaceExerciseInActiveWorkout(replacingWExId, ex);
          } else {
            addExerciseToActiveWorkout(ex);
          }
          setIsLibraryOpen(false);
          setReplacingWExId(null);
        }}
        onViewDetails={(ex) => setSelectedExerciseForDetail(ex)}
      />
    </div>
  );
};
