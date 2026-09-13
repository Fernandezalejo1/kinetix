import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  Check,
  Disc,
  Flame,
  Activity,
  Info,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Minimize2,
  Frown,
  Meh,
  Smile,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  Repeat,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { SetType, WorkoutExercise, WorkoutSet, DifficultyLevel, PersonalRecord, CompletedWorkout } from "../../types";

// P2: motivos de sesión parcial (etiquetado honesto del "por qué no se completó").
const PARTIAL_REASONS = [
  "Me quedé sin tiempo",
  "Fatiga / baja energía",
  "Dolor o molestia",
  "Calidad de sueño",
];
const PlateCalculatorModal = React.lazy(() =>
  import("./PlateCalculatorModal").then((m) => ({ default: m.PlateCalculatorModal }))
);
const WarmupGeneratorModal = React.lazy(() =>
  import("./WarmupGeneratorModal").then((m) => ({ default: m.WarmupGeneratorModal }))
);
const TempoMetronomeModal = React.lazy(() =>
  import("./TempoMetronomeModal").then((m) => ({ default: m.TempoMetronomeModal }))
);
const ExerciseDetailModal = React.lazy(() =>
  import("../exercises/ExerciseDetailModal").then((m) => ({ default: m.ExerciseDetailModal }))
);
const ExerciseLibraryModal = React.lazy(() =>
  import("../exercises/ExerciseLibraryModal").then((m) => ({ default: m.ExerciseLibraryModal }))
);
import { WorkoutSummaryModal } from "./WorkoutSummaryModal";
import { FocusTrap } from "../FocusTrap";
import { analyzeDoubleProgression } from "../../utils/doubleProgression";
import { resolveLiveProgression } from "../../utils/progressionEngine";
import { isTimeBased } from "../../utils/exerciseMode";
import { CardioTimer, IsometricTimer } from "./timers";
import { kgToDisplay, displayToKg, formatWeight } from "../../utils/weightUnits";
import { e1rmFromSet } from "../../utils/startingLoads";
import { velocityZoneForSet } from "../../utils/velocity";

const ZONE_COLOR: Record<string, string> = {
  fuerza: "text-violet-400",
  potencia: "text-cyan-400",
  velocidad: "text-amber-400",
};

function velocityChip(wEx: WorkoutExercise, set: WorkoutSet): { label: string; color: string } | null {
  if (!set.completed || !(set.weight > 0) || !(set.reps > 0)) return null;
  const est = e1rmFromSet(set.weight, set.reps, set.rir);
  const vbt = velocityZoneForSet(wEx.exercise?.category, set.weight, est.valid ? est.average : null);
  if (!vbt) return null;
  return {
    label: `${vbt.velocityMs.toFixed(2)} m/s · ${vbt.zone}`,
    color: ZONE_COLOR[vbt.zone] ?? "text-cyan-400",
  };
}

const VelocityChip: React.FC<{ wEx: WorkoutExercise; set: WorkoutSet }> = ({ wEx, set }) => {
  const info = velocityChip(wEx, set);
  if (!info) return null;
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span className={`font-mono font-bold ${info.color}`}>≈ {info.label}</span>
      <span className="hidden group-hover:inline text-[11px] text-neutral-400 cursor-help" title="Estimación sin encoder (proxy carga-velocidad, ±0.05 m/s) — no es una medición real de velocidad">ⓘ</span>
    </span>
  );
};

/** Double Progression Banner — live guidance per exercise.
 *  Regla: primero progresar reps dentro del rango objetivo y SOLO al llegar al
 *  tope con el RIR objetivo ejecutado (o más duro), autorizar subir el peso. */
const DoubleProgressionBanner: React.FC<{ wEx: WorkoutExercise }> = ({ wEx }) => {
  const { updateSet } = useWorkout();
  const { showToast } = useToast();
  const a = useMemo(() => resolveLiveProgression(wEx) as ReturnType<typeof analyzeDoubleProgression>, [wEx]);

  const applyIncrease = useCallback(() => {
    const delta = a.deltaWeight;
    let applied = 0;
    wEx.sets.forEach((s) => {
      if (!s.completed && s.type !== "warmup") {
        updateSet(wEx.id, s.id, { weight: Math.round((s.weight + delta) * 4) / 4 });
        applied += 1;
      }
    });
    showToast(applied > 0 ? `Sobrecarga +${delta} kg aplicada a ${applied} serie(s) restantes` : "No hay series restantes para sobrecargar");
  }, [wEx, a.deltaWeight, updateSet, showToast]);

  if (!a.range) return null;

  if (a.status === "target_reached") {
    return (
      <div className="px-4 sm:px-5 pt-3">
        <div className="flex items-center gap-2 flex-wrap text-[11px] bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-emerald-300">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="min-w-0 flex-1"><strong className="font-black">{a.message}</strong></span>
          <button
            onClick={applyIncrease}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-lg shadow-emerald-600/20 transition-colors"
          >
            Aplicar +{a.deltaWeight} kg a las series restantes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-5 pt-3">
      <div className="flex items-center gap-2 flex-wrap text-[11px] bg-neutral-950/50 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-400">
        <Target className="w-4 h-4 text-cyan-400 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong className="text-white">{a.targetSets ? `${a.targetSets}×` : ""}{a.range.min}–{a.range.max} reps</strong>
          <span className="text-neutral-400"> · RIR {a.targetRir ?? "—"} · hoy {a.maxReps}/{a.range.max}</span>
          <span className="block text-neutral-400 mt-0.5">{a.message}</span>
        </span>
      </div>
    </div>
  );
};

export const LiveWorkoutLogger: React.FC<{ onGoToAnalytics?: () => void }> = ({ onGoToAnalytics }) => {
  const {
    activeSession,
    isWorkoutModalOpen,
    setIsWorkoutModalOpen,
    restTimer,
    startRestTimer: _startRestTimer,
    stopRestTimer,
    adjustRestTimer,
    soundEnabled,
    setSoundEnabled,
    autoStartTimer,
    setAutoStartTimer,
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

  // FIX (bloqueante 4): los datos SIEMPRE se guardan en kg (unidad canónica).
  // Con unidad "lbs" el input muestra libras y lo ingresado se convierte a kg;
  // los botones y chips operan en la unidad visible.
  const weightDisplay = (kg: number) => kgToDisplay(kg, weightUnit);
  const weightKgFromDisplay = (disp: number) => displayToKg(disp, weightUnit);
  const weightStep = weightUnit === "lbs" ? 5 : 2.5;
  const weightChips = weightUnit === "lbs" ? [-11, -5.5, -2.5, 2.5, 5.5, 11] : [-5, -2.5, 1.25, 2.5, 5, 10];
  const fmtW = (kg: number) => formatWeight(kg, weightUnit);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedExForPlate, setSelectedExForPlate] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForWarmup, setSelectedExForWarmup] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForTempo, setSelectedExForTempo] = useState<{ name: string; tempo: string } | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [replacingWExId, setReplacingWExId] = useState<string | null>(null);
  const [difficultySurvey, setDifficultySurvey] = useState<{ exerciseId: string; exerciseName: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // P2: encuesta sRPE post-sesión (Foster 1-10) antes de cerrar.
  const [srpeSurvey, setSrpeSurvey] = useState(false);
  const [srpeValue, setSrpeValue] = useState<number | null>(null);
  // P2: motivo opcional cuando la sesión termina con series sin completar.
  const [partialReason, setPartialReason] = useState<string | null>(null);
  const [confirmRemoveEx, setConfirmRemoveEx] = useState<string | null>(null);
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    workout: CompletedWorkout | null;
    prs: PersonalRecord[];
  }>({ isOpen: false, workout: null, prs: [] });
  const { showToast } = useToast();

  // Screen Wake Lock API — evita que la pantalla se apague mientras entrenas
  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinel | null = null;
    let isReleased = false;

    const requestWakeLock = async () => {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator && activeSession) {
        try {
          wakeLockSentinel = await navigator.wakeLock.request("screen");
        } catch {
          // Ignorar si el usuario denegó o el sistema no lo permite
        }
      }
    };

    if (activeSession) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeSession && !isReleased) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isReleased = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [activeSession]);

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
    let interval: ReturnType<typeof setInterval> | null = null;
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

  if (!activeSession || !isWorkoutModalOpen) {
    if (summaryModal.isOpen && summaryModal.workout) {
      return (
        <WorkoutSummaryModal
          isOpen={summaryModal.isOpen}
          workout={summaryModal.workout}
          prs={summaryModal.prs}
          weightUnit={weightUnit}
          onClose={() => {
            setSummaryModal({ isOpen: false, workout: null, prs: [] });
            onGoToAnalytics?.();
          }}
        />
      );
    }
    return null;
  }

  const formatStopwatch = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // P2: "Finalizar" abre la encuesta sRPE; el cierre real va en doFinish.
  const handleFinish = () => {
    if (!activeSession) return;
    setSrpeValue(null);
    setPartialReason(null);
    setSrpeSurvey(true);
  };

  const doFinish = (srpe: number | undefined, reason?: string | null) => {
    if (!activeSession) return;
    const durSecs = Math.max(60, Math.floor((Date.now() - activeSession.startTime) / 1000));
    const effectiveSets = activeSession.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
    const routineTitle = activeSession.routineName;
    const exercisesSnapshot = [...activeSession.exercises];

    const { prsAchieved, totalVolumeKg } = finishWorkout(srpe, reason ?? undefined);

    const completedObj: CompletedWorkout = {
      id: `completed-${Date.now()}`,
      routineName: routineTitle,
      date: new Date().toISOString(),
      durationSeconds: durSecs,
      totalVolumeKg,
      totalSets: effectiveSets,
      exercises: exercisesSnapshot,
      prCount: prsAchieved.length,
      averageRir: null,
      srpe,
      sessionLoad: srpe != null ? Math.round(srpe * (durSecs / 60)) : undefined,
    };

    setSrpeSurvey(false);
    setSummaryModal({
      isOpen: true,
      workout: completedObj,
      prs: prsAchieved,
    });
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
    <FocusTrap>
      <div
        id="live-workout-logger"
        role="dialog"
        aria-modal="true"
        aria-label="Entrenamiento en vivo"
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
                <span className="text-purple-400 font-bold">{kgToDisplay(currentVolume, weightUnit).toLocaleString("es-AR")} {weightUnit}</span>
              </div>
              {/* P1: badge de autoregulación por readiness */}
              {activeSession.notes?.startsWith("readiness:") && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                  {activeSession.notes.includes("descanso")
                    ? "Readiness bajo: −10% carga · +1 RIR"
                    : "Readiness medio: +1 RIR"}
                </p>
              )}
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
            className="p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Sonido de Temporizador"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setAutoStartTimer(!autoStartTimer)}
            className="p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={autoStartTimer ? "Auto-iniciar temporizador tras cada serie (activo)" : "Auto-iniciar temporizador tras cada serie (desactivado)"}
            aria-pressed={autoStartTimer}
          >
            <Repeat className={`w-4 h-4 ${autoStartTimer ? "text-cyan-400" : "text-neutral-400"}`} />
          </button>

          <button
            onClick={() => setIsWorkoutModalOpen(false)}
            className="px-4 min-h-[44px] rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center justify-center"
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
              className="px-3 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-mono font-bold"
            >
              -15s
            </button>
            <button
              onClick={() => adjustRestTimer(30)}
              className="px-3 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-mono font-bold"
            >
              +30s
            </button>
            <button
              onClick={stopRestTimer}
              className="px-3 min-h-[44px] bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs font-bold"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* Main Exercises Workout Area */}
      <div className="flex-1 min-h-0 overscroll-contain overflow-y-auto p-3 sm:p-6 space-y-6 max-w-4xl w-full mx-auto pb-[calc(7rem+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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

            const hasSuperset = Boolean(wEx.supersetGroupId);

            return (
              <div
                key={wEx.id}
                className={`bg-neutral-900 rounded-3xl overflow-hidden shadow-xl transition-all ${
                  hasSuperset
                    ? "border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                    : "border border-neutral-800"
                }`}
              >
                {/* Banner de Superserie si aplica */}
                {hasSuperset && (
                  <div className="bg-gradient-to-r from-purple-950/90 via-neutral-900 to-cyan-950/90 border-b border-purple-500/40 px-4 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-purple-300">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SUPERSERIE — GRUPO {wEx.supersetGroupId}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                      Alternar series sin descanso
                    </span>
                  </div>
                )}

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
                      className="flex items-center gap-1 px-3 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Calculadora de Discos en Barra"
                    >
                      <Disc className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Discos</span>
                    </button>

                    <button
                      onClick={() => setSelectedExForWarmup({ name: wEx.exercise.nameEs, weight: currentWorkingWeight })}
                      className="flex items-center gap-1 px-3 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Pirámide de Calentamiento Científica"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Calentar</span>
                    </button>

                    <button
                      onClick={() => setSelectedExForTempo({ name: wEx.exercise.nameEs, tempo: wEx.exercise.defaultTempo })}
                      className="flex items-center gap-1 px-3 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors"
                      title="Metrónomo de Tempo en Vivo"
                    >
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Tempo</span>
                    </button>

                    <button
                      onClick={() => setSelectedExerciseForDetail(wEx.exercise)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-cyan-400 border border-neutral-700 transition-colors flex items-center justify-center"
                      title="Ver Biomecánica y Anatomía"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setReplacingWExId(wEx.id);
                        setIsLibraryOpen(true);
                      }}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors flex items-center justify-center"
                      title="Sustituir Ejercicio"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setConfirmRemoveEx(wEx.id)}
                      className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 border border-neutral-700 transition-colors flex items-center justify-center"
                      title="Eliminar del entrenamiento"
                      aria-label={`Eliminar ${wEx.exercise.nameEs || wEx.exercise.name} del entrenamiento`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Double Progression — live objective guidance */}
                {!isTimeBased(wEx.exercise, wEx.targetReps) && (
                  <DoubleProgressionBanner wEx={wEx} />
                )}

                {/* Cardio Timer — special rendering for cardio:20min */}
                {wEx.notes?.startsWith("cardio:") && (
                  <CardioTimer exercise={wEx} />
                )}

                {/* Isometric Timer — time-based exercises (planks/holds) */}
                {!wEx.notes?.startsWith("cardio:") && isTimeBased(wEx.exercise, wEx.targetReps) && (
                  <IsometricTimer exercise={wEx} />
                )}

                {/* Sets Table — Desktop (hidden for cardio & time-based) */}
                {!wEx.notes?.startsWith("cardio:") && !isTimeBased(wEx.exercise, wEx.targetReps) && (
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
                      {wEx.sets.map((set) => {
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
                                  className="text-[11px] uppercase font-bold bg-transparent text-neutral-400 hover:text-cyan-400 focus:outline-none cursor-pointer"
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
                              {set.previousIsEstimate ? (
                                <span className="text-cyan-400/90 font-bold">
                                  Carga inicial sugerida · {fmtW(set.weight)}
                                </span>
                              ) : set.previousWeight ? (
                                <span>{fmtW(set.previousWeight)} × {set.previousReps} @RIR{set.previousRir ?? 1}
                                  {set.weight !== set.previousWeight && !set.completed && (
                                    <span className={`ml-1 font-black ${set.weight > set.previousWeight ? "text-emerald-400" : "text-amber-400"}`}>
                                      {set.weight > set.previousWeight ? "↑" : "↓"}{fmtW(set.weight)}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>

                            {/* Weight Field */}
                            <td className="py-2.5 text-center">
                              <div className="inline-flex items-center bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                                <button
                                  type="button"
                                    onClick={() =>
                                      updateSet(wEx.id, set.id, {
                                      weight: Math.max(0, weightKgFromDisplay(weightDisplay(set.weight) - weightStep)),
                                      })
                                    }
                                  className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step={weightStep}
                                  value={weightDisplay(set.weight)}
                                  onChange={(e) =>
                                    updateSet(wEx.id, set.id, {
                                      weight: weightKgFromDisplay(parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  className="w-14 text-center bg-transparent font-bold text-white text-sm focus:outline-none py-1.5"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSet(wEx.id, set.id, {
                                      weight: weightKgFromDisplay(weightDisplay(set.weight) + weightStep),
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
                              {set.completed && (
                                <span className="block mt-1 text-[11px]">
                                  <VelocityChip wEx={wEx} set={set} />
                                </span>
                              )}
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
                                className="text-neutral-400 hover:text-red-400 transition-colors p-1"
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

                {/* Sets Cards — Mobile (hidden for cardio & time-based) */}
                {!wEx.notes?.startsWith("cardio:") && !isTimeBased(wEx.exercise, wEx.targetReps) && (
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
                            {set.previousIsEstimate ? (
                              <span className="text-[11px] font-mono text-cyan-400/90 truncate">
                                carga inicial sugerida · {fmtW(set.weight)}
                              </span>
                            ) : set.previousWeight ? (
                              <span className="text-[11px] font-mono text-neutral-400 truncate">
                                antes {fmtW(set.previousWeight)} × {set.previousReps} @RIR{set.previousRir ?? 1}
                                {set.weight !== set.previousWeight && !set.completed && (
                                  <span className={`ml-1 font-bold ${set.weight > set.previousWeight ? "text-emerald-400" : "text-amber-400"}`}>
                                    · auto {set.weight > set.previousWeight ? "↑" : "↓"} {fmtW(set.weight)}
                                  </span>
                                )}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSet(wEx.id, set.id)}
                            className="text-neutral-400 hover:text-red-400 transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Peso ({weightUnit})</label>
                            <div className="flex items-center justify-between bg-neutral-950 rounded-xl border border-neutral-800 p-1 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    weight: Math.max(0, weightKgFromDisplay(weightDisplay(set.weight) - weightStep)),
                                  })
                                }
                                className="w-9 h-10 shrink-0 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-neutral-900 text-base touch-target"
                                aria-label={`Bajar peso de la serie ${set.setNumber}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step={weightStep}
                                value={weightDisplay(set.weight)}
                                onChange={(e) =>
                                  updateSet(wEx.id, set.id, {
                                    weight: weightKgFromDisplay(parseFloat(e.target.value) || 0),
                                  })
                                }
                                onBlur={(e) => {
                                  const raw = parseFloat(e.target.value);
                                  if (!Number.isFinite(raw)) return;
                                  // Anti-errores de tipeo: ajusta a múltiplo del paso (2.5 kg / 5 lbs)
                                  const snapped = Math.max(0, Math.round(raw / weightStep) * weightStep);
                                  if (Math.abs(snapped - raw) > 0.001) {
                                    updateSet(wEx.id, set.id, { weight: weightKgFromDisplay(snapped) });
                                  }
                                }}
                                className="flex-1 min-w-0 text-center bg-transparent font-bold text-white text-sm focus:outline-none touch-target"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    weight: weightKgFromDisplay(weightDisplay(set.weight) + weightStep),
                                  })
                                }
                                className="w-9 h-10 shrink-0 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-cyan-600/20 text-cyan-300 text-base font-bold touch-target"
                                aria-label={`Subir peso de la serie ${set.setNumber}`}
                              >
                                +
                              </button>
                            </div>
                            {/* Chips de ajuste rápido de peso */}
                            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none py-0.5">
                              {weightChips.map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  onClick={() =>
                                    updateSet(wEx.id, set.id, {
                                      weight: Math.max(0, weightKgFromDisplay(weightDisplay(set.weight) + delta)),
                                    })
                                  }
                                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 transition-colors ${
                                    delta > 0
                                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 active:bg-cyan-500/30"
                                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 active:bg-neutral-800"
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Reps</label>
                            <div className="flex items-center justify-between bg-neutral-950 rounded-xl border border-neutral-800 p-1 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    reps: Math.max(1, set.reps - 1),
                                  })
                                }
                                className="w-9 h-10 shrink-0 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-neutral-900 text-base touch-target"
                                aria-label={`Bajar reps de la serie ${set.setNumber}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="99"
                                value={set.reps}
                                onChange={(e) =>
                                  updateSet(wEx.id, set.id, {
                                    reps: Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                  })
                                }
                                className="flex-1 min-w-0 text-center bg-transparent font-bold text-white text-sm focus:outline-none touch-target"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSet(wEx.id, set.id, {
                                    reps: set.reps + 1,
                                  })
                                }
                                className="w-9 h-10 shrink-0 flex items-center justify-center text-neutral-400 active:text-white rounded-lg bg-cyan-600/20 text-cyan-300 text-base font-bold touch-target"
                                aria-label={`Subir reps de la serie ${set.setNumber}`}
                              >
                                +
                              </button>
                            </div>
                            {/* Chips de ajuste rápido de reps */}
                            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none py-0.5">
                              {[-2, -1, 1, 2, 5].map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  onClick={() =>
                                    updateSet(wEx.id, set.id, {
                                      reps: Math.max(1, set.reps + delta),
                                    })
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 transition-colors ${
                                    delta > 0
                                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 active:bg-cyan-500/30"
                                      : "bg-neutral-900 text-neutral-400 border border-neutral-800 active:bg-neutral-800"
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">RIR (Reps en Reserva)</label>
                            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                              {[0, 1, 2, 3, 4].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => updateSet(wEx.id, set.id, { rir: r })}
                                  className={`min-h-[44px] rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                                    (set.rir ?? 1) === r
                                      ? r === 0
                                        ? "bg-red-500/20 border border-red-500/40 text-red-400"
                                        : "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                                      : "bg-neutral-950 border border-neutral-800 text-neutral-400 active:text-white"
                                  }`}
                                >
                                  {r === 0 ? "Fallo" : r}
                                </button>
                              ))}
                            </div>
                            {set.completed && (
                              <div className="mt-1.5 text-[11px]">
                                <VelocityChip wEx={wEx} set={set} />
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== "undefined" && navigator.vibrate) {
                              navigator.vibrate(35);
                            }
                            completeSetAndTriggerTimer(wEx.id, set.id);
                          }}
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
                  <button type="button" onClick={() => addSet(wEx.id, "normal")} className="px-3 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-1.5 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />Serie Normal
                  </button>
                  <button type="button" onClick={() => addSet(wEx.id, "dropset")} className="px-3 min-h-[44px] rounded-xl bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1.5 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />Drop Set
                  </button>
                  <button type="button" onClick={() => addSet(wEx.id, "myorep")} className="px-3 min-h-[44px] rounded-xl bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition-colors">
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

      {/* Confirm removing a single exercise from the active session */}
      <ConfirmDialog
        open={confirmRemoveEx !== null}
        title="Eliminar ejercicio"
        message="¿Eliminar este ejercicio de la sesión? Se borrarán todas sus series y el progreso registrado."
        confirmLabel="Eliminar"
        danger
        onConfirm={() => {
          if (confirmRemoveEx) removeExerciseFromActiveWorkout(confirmRemoveEx);
          setConfirmRemoveEx(null);
        }}
        onCancel={() => setConfirmRemoveEx(null)}
      />

      {/* P2: Encuesta sRPE post-sesión (Foster 1-10, carga interna = sRPE × min) */}
      {srpeSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-label="Esfuerzo percibido de la sesión" className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">¿Qué tan dura fue la sesión?</h3>
              <p className="text-xs text-neutral-400">
                sRPE 1-10 · sirve para calcular tu carga interna y detectar sobrecarga
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="sRPE 1 a 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={srpeValue === v}
                  aria-label={`sRPE ${v}`}
                  onClick={() => setSrpeValue(v)}
                  className={`min-h-[48px] rounded-xl border-2 text-base font-black transition-all touch-target ${
                    srpeValue === v
                      ? "bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/30"
                      : "bg-neutral-950 text-neutral-300 border-neutral-800"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-neutral-400">
              1-2 muy suave · 3-4 moderado · 5-6 duro · 7-8 muy duro · 9-10 máximo
            </p>

            {/* P2: motivo de sesión parcial (visible solo si quedan series sin completar) */}
            {(() => {
              const incomplete = activeSession.exercises.some((wex) => wex.sets.some((s) => !s.completed));
              if (!incomplete) return null;
              return (
                <>
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      Quedaron series sin completar — ¿por qué?
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2" role="radiogroup" aria-label="Motivo de sesión parcial">
                      {PARTIAL_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={partialReason === r}
                          onClick={() => setPartialReason(partialReason === r ? null : r)}
                          className={`min-h-[44px] px-2 rounded-xl border text-[11px] font-bold transition-colors touch-target ${
                            partialReason === r
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                              : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-600"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="flex gap-2">
              <button
                onClick={() => doFinish(undefined, partialReason)}
                className="flex-1 py-3 text-xs text-neutral-400 hover:text-neutral-300 font-medium transition-colors min-h-[48px]"
              >
                Omitir
              </button>
              <button
                onClick={() => doFinish(srpeValue ?? undefined, partialReason)}
                disabled={srpeValue == null}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black transition-colors min-h-[48px]"
              >
                Guardar y finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Difficulty Survey Modal */}
      {difficultySurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div role="dialog" aria-modal="true" aria-label="Encuesta de dificultad" className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
                  <span className="text-[11px] opacity-70 leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setDifficultySurvey(null)}
              className="w-full py-2.5 text-xs text-neutral-400 hover:text-neutral-300 font-medium transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      )}

      {/* Modals con carga diferida (Suspense) */}
      <React.Suspense fallback={null}>
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
      </React.Suspense>
    </div>
    </FocusTrap>
  );
};
