import { nativeRemindersAvailable, requestNativeReminderPermission } from "../../utils/reminderNotifications";
import { safeParse, safeSet } from "../../utils/storage";
import React, { useState, useEffect, useRef } from "react";
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
  AlertCircle,
  Repeat,
  ChevronDown,
  MoreHorizontal,
  X,
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

/** Tipos de serie con nombre legible (el set de hoy es `normal`). */
const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "Normal",
  warmup: "Calentamiento",
  dropset: "Drop Set",
  myorep: "Myo-Reps",
  restpause: "Rest-Pause",
  failure: "Al fallo",
  cardio: "Cardio",
};

/** Qué significa cada tipo, en una línea (evita etiquetas técnicas sin contexto). */
const SET_TYPE_HELP: Record<SetType, string> = {
  normal: "Serie efectiva estándar, contada para el volumen del ejercicio.",
  warmup: "Aproximación para preparar el ejercicio; queda identificada en el registro.",
  dropset: "Bajás el peso sin descansar y seguís con la misma serie.",
  myorep: "Serie base al fallo + mini-series con pocas respiraciones de pausa.",
  restpause: "Pausas cortas dentro de la serie para sumar repeticiones, sin cambiar el peso.",
  failure: "Serie llevada al fallo técnico.",
  cardio: "Bloque de cardio, se registra con su propio temporizador.",
};

const SELECTABLE_SET_TYPES: SetType[] = ["normal", "warmup", "dropset", "myorep", "restpause", "failure"];
const PlateCalculatorModal = React.lazy(() =>
  import("./PlateCalculatorModal").then((m) => ({ default: m.PlateCalculatorModal }))
);
const WarmupGeneratorModal = React.lazy(() =>
  import("./WarmupGeneratorModal").then((m) => ({ default: m.WarmupGeneratorModal }))
);
const TempoMetronomeModal = React.lazy(() =>
  import("./TempoMetronomeModal").then((m) => ({ default: m.TempoMetronomeModal }))
);
const ExerciseLibraryModal = React.lazy(() =>
  import("../exercises/ExerciseLibraryModal").then((m) => ({ default: m.ExerciseLibraryModal }))
);
import { WorkoutSummaryModal } from "./WorkoutSummaryModal";
import { FocusTrap } from "../FocusTrap";
import { ExerciseInlineVisual, ExerciseThumb } from "./ExerciseInlineVisual";
import { ProgressionRecommendation } from "./ProgressionRecommendation";
import { RestTimerBar } from "./RestTimerBar";
import { useBackHandler } from "../../context/BackNavContext";
import { useElapsedSeconds } from "../../hooks/useElapsedSeconds";
import { isTimeBased } from "../../utils/exerciseMode";
import { CardioTimer, IsometricTimer } from "./timers";
import { formatDuration, formatStopwatch } from "../../utils/duration";
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
      <span className="text-xs text-neutral-400">Estimación, no medición</span>
    </span>
  );
};

/** Palabras sin peso léxico: se omiten al abreviar el nombre del ejercicio. */
const SHORT_NAME_STOP = new Set(["de", "del", "con", "en", "al", "a", "y", "e", "el", "la", "los", "las", "por"]);

/** Nombre corto para el carrusel: hasta 2 palabras significativas (sin
 *  artículos/preposiciones) para que las miniatura queden legibles en 360px. */
function shortExerciseName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return name;
  const significant = words.filter((w) => !SHORT_NAME_STOP.has(w.toLowerCase()));
  const picked = (significant.length >= 2 ? significant : words).slice(0, 2);
  const short = picked.join(" ");
  return short.length > 18 ? picked[0] : short;
}

export const LiveWorkoutLogger: React.FC<{ onGoToAnalytics?: () => void }> = ({ onGoToAnalytics }) => {
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
  } = useWorkout();

  // FIX (bloqueante 4): los datos SIEMPRE se guardan en kg (unidad canónica).
  // Con unidad "lbs" el input muestra libras y lo ingresado se convierte a kg;
  // los botones y chips operan en la unidad visible.
  const weightDisplay = (kg: number) => kgToDisplay(kg, weightUnit);
  const weightKgFromDisplay = (disp: number) => displayToKg(disp, weightUnit);
  const [weightSteps, setWeightSteps] = useState<Record<string, number>>(() => safeParse("kinetix_weight_steps", {}));
  const weightChips = weightUnit === "lbs" ? [-11, -5.5, -2.5, 2.5, 5.5, 11] : [-5, -2.5, 1.25, 2.5, 5, 10];
  const fmtW = (kg: number) => formatWeight(kg, weightUnit);

  // ── Reloj de sesión (workoutElapsedTime) ────────────────────────────────
  // Fuente única de verdad: `activeSession.startTime` (timestamp persistido).
  // No es el descanso: completar una serie, cambiar de ejercicio o minimizar
  // NO lo reinician ni lo alteran.
  const elapsedSeconds = useElapsedSeconds(activeSession?.startTime);
  const [selectedExForPlate, setSelectedExForPlate] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForWarmup, setSelectedExForWarmup] = useState<{ name: string; weight: number } | null>(null);
  const [selectedExForTempo, setSelectedExForTempo] = useState<{ name: string; tempo: string } | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [replacingWExId, setReplacingWExId] = useState<string | null>(null);
  const [finishMinutes, setFinishMinutes] = useState("");
  const [oldSessionAcknowledged, setOldSessionAcknowledged] = useState(false);
  const [difficultySurvey, setDifficultySurvey] = useState<{ exerciseId: string; exerciseName: string; targetRir?: number } | null>(null);
  // Encuestas de esfuerzo que el usuario ya omitió en ESTA sesión: no se vuelven
  // a ofrecer hasta la próxima sesión (antes "Omitir" reabría la encuesta).
  const [dismissedSurveys, setDismissedSurveys] = useState<Record<string, boolean>>({});
  // Transición al resumen: se descarta al tocar "Seguir con la sesión".
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // P2: encuesta sRPE post-sesión (Foster 1-10) antes de cerrar.
  const [srpeSurvey, setSrpeSurvey] = useState(false);
  const [srpeValue, setSrpeValue] = useState<number | null>(null);
  // P2: motivo opcional cuando la sesión termina con series sin completar.
  const [partialReason, setPartialReason] = useState<string | null>(null);
  const [confirmRemoveEx, setConfirmRemoveEx] = useState<string | null>(null);
  // Simplificación del registro en vivo: por defecto solo la serie activa
  // muestra sus controles completos. El resto se pliega para no tener que
  // desplazarse por decenas de controles.
  const [openSetIds, setOpenSetIds] = useState<Record<string, boolean>>({});
  const [completedOpenIds, setCompletedOpenIds] = useState<Record<string, boolean>>({});
  const [setTypeOpenIds, setSetTypeOpenIds] = useState<Record<string, boolean>>({});
  const [exMenuId, setExMenuId] = useState<string | null>(null);
  const [collapsedExIds, setCollapsedExIds] = useState<Record<string, boolean>>({});
  const [overrideExId, setOverrideExId] = useState<string | null>(null);
  const [headerSettingsOpen, setHeaderSettingsOpen] = useState(false);
  const [quickAdjustIds, setQuickAdjustIds] = useState<Record<string, boolean>>({});
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    workout: CompletedWorkout | null;
    prs: PersonalRecord[];
  }>({ isOpen: false, workout: null, prs: [] });
  const { showToast } = useToast();

  // Screen Wake Lock API — evita que la pantalla se apague mientras entrenas
  useEffect(() => {
    if (!isWorkoutModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isWorkoutModalOpen]);

  const sessionId = activeSession?.id;
  useEffect(() => {
    let wakeLockSentinel: WakeLockSentinel | null = null;
    let isReleased = false;

    const requestWakeLock = async () => {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator && sessionId) {
        try {
          const lock = await navigator.wakeLock.request("screen");
          if (isReleased) await lock.release();
          else wakeLockSentinel = lock;
        } catch {
          // Ignorar si el usuario denegó o el sistema no lo permite
        }
      }
    };

    if (sessionId) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && sessionId && !isReleased) {
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
  }, [sessionId]);

  useEffect(() => {
    setOverrideExId(null);
    setCollapsedExIds({});
    setOpenSetIds({});
    setCompletedOpenIds({});
    setOldSessionAcknowledged(false);
    setDifficultySurvey(null);
    setDismissedSurveys({});
    setCompletionDismissed(false);
  }, [activeSession?.id]);

  const handleCancelConfirmed = () => {
    cancelWorkout();
    setConfirmCancel(false);
    showToast("Entrenamiento descartado", "info");
  };

  // Atrás en las encuestas modales internas: cierran ellas, no toda la sesión.
  useBackHandler(
    "workout-srpe-survey",
    srpeSurvey ? () => { setSrpeSurvey(false); return true; } : null,
    200
  );
  useBackHandler(
    "workout-difficulty-survey",
    difficultySurvey ? () => { setDifficultySurvey(null); return true; } : null,
    200
  );
  useBackHandler(
    "workout-confirm-cancel",
    confirmCancel ? () => { setConfirmCancel(false); return true; } : null,
    210
  );
  // Atrás/Escape cierra el sheet de opciones del ejercicio (no navega).
  useBackHandler(
    "workout-ex-menu",
    exMenuId ? () => { setExMenuId(null); return true; } : null,
    150
  );

  // Transición suave entre ejercicios: al completar la última serie del activo,
  // el siguiente se expande y se desplaza a la vista. Se omite el montaje
  // inicial (no saltar el scroll al abrir/restaurar la sesión) y solo actúa
  // cuando el ejercicio activo CAMBIA (no en cada update de series).
  const initialActiveMounted = useRef(false);
  const prevActiveExerciseId = useRef<string | null>(null);
  useEffect(() => {
    if (!activeSession) return;
    const nextId =
      activeSession.exercises.find((e) => e.sets.some((s) => !s.completed))?.id ??
      activeSession.exercises[activeSession.exercises.length - 1]?.id ??
      null;
    if (!nextId) return;
    if (!initialActiveMounted.current) {
      initialActiveMounted.current = true;
      prevActiveExerciseId.current = nextId;
      return;
    }
    if (prevActiveExerciseId.current === nextId) return;
    prevActiveExerciseId.current = nextId;
    setOverrideExId(null);
    setCollapsedExIds(prev => ({ ...prev, [nextId]: false }));
    const el = document.getElementById(`live-ex-${nextId}`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.exercises]);

  // ¿Está TODO el trabajo de la sesión marcado? Con una serie pendiente NO lo
  // está. Es una TRANSICIÓN, no otra pausa: la banda inferior ofrece el resumen
  // y se puede seguir sumando series.
  // Se calcula acá arriba (y no junto a los contadores) porque el efecto de
  // reinicio tiene que correr SIEMPRE, antes del return temprano sin sesión.
  const sessionComplete = Boolean(
    activeSession &&
      activeSession.exercises.length > 0 &&
      activeSession.exercises.every((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed))
  );

  useEffect(() => {
    if (!sessionComplete) setCompletionDismissed(false);
  }, [sessionComplete]);

  // Live session stopwatch timer
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

  // P2: "Finalizar" abre la encuesta sRPE; el cierre real va en doFinish.
  const handleFinish = () => {
    if (!activeSession) return;
    setFinishMinutes("");
    setSrpeValue(null);
    setPartialReason(null);
    setSrpeSurvey(true);
  };

  const doFinish = (srpe: number | undefined, reason?: string | null) => {
    if (!activeSession) return;
    if (finishMinutes && (!Number.isFinite(Number(finishMinutes)) || Number(finishMinutes) < 1 || Number(finishMinutes) > 1440)) {
      showToast("Ingresá una duración entre 1 y 1440 minutos", "info");
      return;
    }
    const { prsAchieved, completed } = finishWorkout(srpe, reason ?? undefined, finishMinutes ? Number(finishMinutes) * 60 : undefined);
    if (!completed) return;
    setSrpeSurvey(false);
    setSummaryModal({
      isOpen: true,
      workout: completed,
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
    { level: "just_right", label: "Justo", emoji: <Meh className="w-6 h-6" />, color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20", description: "El esfuerzo coincidió con mi objetivo" },
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

  const totalSetsCount = activeSession.exercises.reduce((acc, wex) => acc + wex.sets.length, 0);

  // Ejercicio "activo": el primero con series pendientes. Se muestra expandido;
  // los demás quedan como filas compactas (menos desplazamiento para entrenar).
  const activeExerciseId =
    activeSession.exercises.find((e) => e.sets.some((s) => !s.completed))?.id ??
    activeSession.exercises[activeSession.exercises.length - 1]?.id ??
    null;

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
      {/* Header compacto: rutina + progreso + reloj en una fila; las acciones
          quedan en una fila fina con "Finalizar" como secundario (ghost). La
          acción primaria de la sesión es "Completar serie" en cada ejercicio. */}
      <div className="sticky top-0 z-20 shrink-0 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2 border-b border-neutral-800/70"
           style={{ backgroundColor: '#161616' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Rutina + progreso + volumen en una sola línea (compacta) */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981] shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-tight">
              <h2 className="text-[13px] sm:text-sm font-black text-white tracking-tight truncate">
                {activeSession.routineName}
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono tabular-nums truncate">
                <span className="text-neutral-300">{completedSetsCount}/{totalSetsCount} series</span>
                <span aria-hidden="true"> · </span>
                <span className="text-purple-300 font-bold">
                  {kgToDisplay(currentVolume, weightUnit).toLocaleString("es-AR")} {weightUnit}
                </span>
              </p>
            </div>
          </div>

          {/* Reloj de sesión: DURACIÓN total (no es el descanso). Compacto,
              con ancho mínimo reservado para que no salte cada segundo. */}
          <div
            className="shrink-0 flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full bg-neutral-950/80 border border-cyan-500/40"
            role="timer"
            aria-label={`Duración del entrenamiento: ${formatStopwatch(elapsedSeconds)}`}
            title="Duración total del entrenamiento"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
            <span className="font-black text-white font-mono tabular-nums text-sm leading-none min-w-[3.2rem] text-right">
              {formatStopwatch(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Barra fina de progreso + acciones compactas en la misma fila.
            "Finalizar" es secundario (ghost); Minimizar/Ajustes solo-icono.
            El alto es ~2/3 del anterior: nada de filas de 48px en el header. */}
        <div className="flex items-center gap-2 pt-2 pb-1 min-w-0">
          <div
            className="flex-1 min-w-0 h-1 bg-neutral-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, totalSetsCount)}
            aria-valuenow={completedSetsCount}
            aria-label="Series completadas de la sesión"
          >
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${totalSetsCount > 0 ? Math.min(100, (completedSetsCount / totalSetsCount) * 100) : 0}%` }}
            />
          </div>

          <button
            onClick={handleFinish}
            aria-label="Finalizar entrenamiento"
            className="shrink-0 min-h-[38px] px-3 rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-[11px] sm:text-xs font-black flex items-center gap-1.5 press-scale"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Finalizar</span>
          </button>

          <button
            onClick={() => setIsWorkoutModalOpen(false)}
            aria-label="Minimizar (la sesión sigue activa)"
            title="Minimizar (la sesión sigue activa)"
            className="shrink-0 min-h-[38px] min-w-[38px] rounded-lg bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 flex items-center justify-center press-scale"
          >
            <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>

          <button
            onClick={() => setHeaderSettingsOpen((v) => !v)}
            aria-expanded={headerSettingsOpen}
            aria-label="Ajustes de la sesión"
            title="Ajustes de la sesión"
            className="shrink-0 min-h-[38px] min-w-[38px] rounded-lg bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 flex items-center justify-center press-scale"
          >
            <Repeat className={`w-4 h-4 ${autoStartTimer ? "text-cyan-400" : "text-neutral-300"} shrink-0`} aria-hidden="true" />
          </button>
        </div>

        {/* P1: autoregulación aplicada (visible, porque cambia los pesos) */}
        {activeSession.notes?.startsWith("readiness:") && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
            {activeSession.notes.includes("descanso")
              ? "Energía baja hoy: −10% carga · +1 RIR"
              : "Energía media hoy: +1 RIR"}
          </p>
        )}

        {headerSettingsOpen && (
          <div className="mt-2 p-2 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5 animate-fadeIn">
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-full min-h-[48px] px-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2 min-w-0 text-xs font-bold text-neutral-200">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" /> : <VolumeX className="w-4 h-4 text-neutral-400 shrink-0" />}
                <span className="min-w-0">Sonido del temporizador</span>
              </span>
              <span className={`shrink-0 whitespace-nowrap text-[11px] font-black px-2 py-0.5 rounded-full border ${soundEnabled ? "text-cyan-300 border-cyan-500/40 bg-cyan-500/10" : "text-neutral-400 border-neutral-700"}`}>
                {soundEnabled ? "Activado" : "Desactivado"}
              </span>
            </button>
            {nativeRemindersAvailable() && <button className="w-full min-h-[48px] rounded-xl border border-neutral-700 text-sm text-cyan-200" onClick={async () => { const granted = await requestNativeReminderPermission(); showToast(granted ? "Avisos de descanso habilitados" : "Podés habilitar las notificaciones desde los ajustes del teléfono", granted ? "success" : "info"); }}>Habilitar avisos con pantalla bloqueada</button>}
            <button
              type="button"
              role="switch"
              aria-checked={autoStartTimer}
              onClick={() => setAutoStartTimer(!autoStartTimer)}
              className="w-full min-h-[48px] px-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2 min-w-0 text-xs font-bold text-neutral-200">
                <Repeat className={`w-4 h-4 shrink-0 ${autoStartTimer ? "text-cyan-400" : "text-neutral-400"}`} />
                <span className="min-w-0">Iniciar descanso al completar la serie</span>
              </span>
              <span className={`shrink-0 whitespace-nowrap text-[11px] font-black px-2 py-0.5 rounded-full border ${autoStartTimer ? "text-cyan-300 border-cyan-500/40 bg-cyan-500/10" : "text-neutral-400 border-neutral-700"}`}>
                {autoStartTimer ? "Activado" : "Desactivado"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Descanso activo: cápsula FLOTANTE fija abajo a la derecha (position:fixed,
          z-40). No empuja el scroll ni el contenido; sube por encima del teclado
          (visualViewport) y de la zona segura. El resto corre en useRestTimer. */}
      {restTimer.active && (
        <RestTimerBar
          remainingSeconds={restTimer.remainingSeconds}
          totalSeconds={restTimer.totalSeconds}
          exerciseName={restTimer.exerciseName}
          onAdjust={adjustRestTimer}
          onSkip={stopRestTimer}
        />
      )}

      {/* Última serie de la sesión: transición al resumen (en vez de otra
          pausa). La banda es fija abajo, así que no hay que desplazarse
          hasta el final de la lista para cerrar el entrenamiento. */}
      {sessionComplete && !completionDismissed && !restTimer.active && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 bg-neutral-950/95 backdrop-blur border-t border-emerald-500/40 animate-fadeIn"
        >
          <div className="max-w-4xl w-full mx-auto flex items-center gap-2 sm:gap-3">
            <span className="min-w-0 flex-1 text-xs sm:text-sm font-black text-emerald-200 leading-tight">
              Sesión completada
              <span className="block text-[11px] font-medium text-neutral-300">
                {completedSetsCount} de {totalSetsCount} series registradas
              </span>
            </span>
            <button
              type="button"
              onClick={() => setCompletionDismissed(true)}
              className="shrink-0 min-h-[48px] px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold press-scale"
            >
              Seguir
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="shrink-0 min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black press-scale"
            >
              Ver resumen
            </button>
          </div>
        </div>
      )}

      {!oldSessionAcknowledged && Date.now() - activeSession.startTime > 4 * 60 * 60 * 1000 && <div className="shrink-0 px-3 py-2 bg-amber-950 text-sm text-amber-100">Esta sesión lleva varias horas abierta.
        <button className="min-h-[44px] px-3 underline" onClick={() => setOldSessionAcknowledged(true)}>Continuar</button>
        <button className="min-h-[44px] px-3 underline" onClick={handleFinish}>Finalizar y ajustar duración</button>
      </div>}
      {/* Carrusel de ejercicios estilo referencia: miniaturas circulares
          con estado, para saltar sin abrir nada. Solo si hay 2+ ejercicios.
          El scroll horizontal está CONTENIDO acá (overscroll-x-contain +
          overflow-y-hidden): la página nunca se desplaza en horizontal. */}
      {activeSession.exercises.length > 1 && (
        <div className="shrink-0 min-w-0 px-3 sm:px-6 py-2 border-b border-neutral-800 bg-neutral-950/60">
          <div
            className="flex items-center gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-thin py-1 max-w-4xl w-full mx-auto min-w-0"
            style={{ touchAction: "pan-x" } as React.CSSProperties}
          >
            {activeSession.exercises.map((wEx, i) => {
              const done = wEx.sets.length > 0 && wEx.sets.every((s) => s.completed);
              const isActive = wEx.id === (overrideExId ?? activeExerciseId);
              return (
                <ExerciseThumb
                  key={wEx.id}
                  exercise={wEx.exercise}
                  size={isActive ? 60 : 52}
                  active={isActive}
                  done={done}
                  showLabel
                  label={`${i + 1}. ${shortExerciseName(wEx.exercise.nameEs)}`}
                  onClick={() => {
                    setOverrideExId(wEx.id);
                    setCollapsedExIds((prev) => ({ ...prev, [wEx.id]: false }));
                    requestAnimationFrame(() => {
                      document.getElementById(`live-ex-${wEx.id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
                    });
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main Exercises Workout Area. `overflow-x-hidden`: el scroll horizontal
          vive SOLO en el carrusel, nunca en la página. El padding inferior deja
          la última card/botón por encima de la navegación inferior y de la
          barra de gestos (safe-area). */}
      <div
        className="flex-1 min-h-0 overscroll-contain overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-6 max-w-4xl w-full mx-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          // Solo se reserva espacio inferior cuando algo FLOTA encima del scroll
          // (cápsula de descanso o banda de sesión completada). Sin descanso ni
          // banda, el contenido recupera esos ~76px que antes quedaban vacíos.
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${restTimer.active ? 88 : sessionComplete && !completionDismissed ? 104 : 12}px)`,
        } as React.CSSProperties}
      >
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
            const weightStep = weightSteps[wEx.exerciseId] ?? (weightUnit === "lbs" ? 5 : 2.5);
            const firstWorkingSet = wEx.sets.find((s) => s.type !== "warmup") || wEx.sets[0];
            const currentWorkingWeight = firstWorkingSet ? firstWorkingSet.weight : 40;

            const hasSuperset = Boolean(wEx.supersetGroupId);
            const isTimedEx = Boolean(wEx.notes?.startsWith("cardio:")) || isTimeBased(wEx.exercise, wEx.targetReps);
            const doneCount = wEx.sets.filter((s) => s.completed).length;
            const completedSetsMobile = wEx.sets.filter((s) => s.completed);
            const pendingSetsMobile = wEx.sets.filter((s) => !s.completed);
            const isActiveExercise = wEx.id === activeExerciseId;
            const isExpanded =
              (overrideExId ? overrideExId === wEx.id : isActiveExercise && !collapsedExIds[wEx.id]);
            const nextPending = pendingSetsMobile[0] ?? null;

            const toggleExercise = () => {
              if (isExpanded) {
                setOverrideExId(null);
                setCollapsedExIds((prev) => ({ ...prev, [wEx.id]: true }));
              } else {
                setOverrideExId(wEx.id);
                setCollapsedExIds((prev) => ({ ...prev, [wEx.id]: false }));
              }
            };

            /** Editor de serie: fila compacta siempre visible; los controles
             *  (peso, reps, RIR, completar) se abren en la serie que se toca.
             *  La serie activa está abierta por defecto. */
            const renderSetEditor = (target: WorkoutExercise, set: WorkoutSet, isActiveSet: boolean) => {
              const isOpen = isActiveSet || Boolean(openSetIds[set.id]);
              // Estilo Hevy: la fila cerrada siempre muestra el contexto
              // (anterior real o estimación), sin obligar a abrir el editor.
              const ghostShort = set.previousIsEstimate
                ? "Sin historial · elegí tu carga"
                : set.previousWeight
                  ? `Anterior ${fmtW(set.previousWeight)} ${weightUnit} × ${set.previousReps}`
                  : null;
              return (
                <div
                  key={set.id}
                  id={`live-set-${set.id}`}
                  tabIndex={-1}
                  className={`rounded-2xl border overflow-hidden ${
                    set.completed
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : isActiveSet
                        ? "bg-neutral-950 border-cyan-500/50 ring-1 ring-cyan-500/20"
                        : "bg-neutral-950/60 border-neutral-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenSetIds((prev) => ({ ...prev, [set.id]: !prev[set.id] }))}
                    aria-expanded={isOpen}
                    className="w-full px-3 py-2 min-h-[56px] flex items-center gap-3 text-left"
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                        set.completed
                          ? "bg-emerald-500 text-neutral-950"
                          : isActiveSet
                            ? "bg-cyan-500 text-neutral-950"
                            : "bg-neutral-800 text-neutral-200"
                      }`}
                    >
                      {set.completed ? <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" /> : set.setNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white tabular-nums">
                        {fmtW(set.weight)} {weightUnit} × {set.reps}
                        <span className="text-neutral-200"> @RIR {set.rir ?? 1}</span>
                      </span>
                      <span className="block text-xs text-neutral-300">
                        {isActiveSet
                          ? "Serie activa"
                          : isOpen
                            ? "Editar esta serie"
                            : set.completed
                              ? ghostShort ? `Completada · ${ghostShort}` : "Completada"
                              : ghostShort ?? "Pendiente · tocá para editar"}
                        {set.type !== "normal" ? ` · ${SET_TYPE_LABELS[set.type]}` : ""}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-300 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-3">
                      {set.previousIsEstimate && !set.completed && (
                        <p className="text-xs text-cyan-300">
                          Sin historial: elegí la carga de esta serie. Usá 0 si no lleva peso externo.
                        </p>
                      )}
                      {!set.previousIsEstimate && set.previousWeight ? (
                        <p className="text-xs text-neutral-300 tabular-nums">
                          Última vez: {fmtW(set.previousWeight)} {weightUnit} × {set.previousReps} @RIR {set.previousRir ?? 1}
                          {set.weight !== set.previousWeight && !set.completed && (
                            <span className={`ml-1 font-bold ${set.weight > set.previousWeight ? "text-emerald-300" : "text-amber-300"}`}>
                              · ajustado a {fmtW(set.weight)} {weightUnit}
                            </span>
                          )}
                        </p>
                      ) : null}

                      <div className="space-y-2.5">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-neutral-200">Peso</span>
                            <span className="text-xs text-neutral-400">{weightUnit}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateSet(target.id, set.id, {
                                  weight: Math.max(0, weightKgFromDisplay(weightDisplay(set.weight) - weightStep)),
                                })
                              }
                              className="w-12 h-12 shrink-0 rounded-xl bg-neutral-800 text-white text-2xl font-bold flex items-center justify-center active:bg-neutral-700"
                              aria-label={`Bajar peso de la serie ${set.setNumber}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              onFocus={e => e.currentTarget.scrollIntoView({ block: "center", behavior: "auto" })}
                              inputMode="decimal"
                              min="0"
                              step="any"
                              value={weightDisplay(set.weight)}
                              onChange={(e) =>
                                updateSet(target.id, set.id, {
                                  weight: weightKgFromDisplay(parseFloat(e.target.value) || 0),
                                })
                              }
                              aria-label={`Peso de la serie ${set.setNumber} en ${weightUnit}`}
                              className="flex-1 min-w-0 h-12 text-center rounded-xl bg-neutral-900 border border-neutral-700 font-black text-white text-lg tabular-nums focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateSet(target.id, set.id, {
                                  weight: weightKgFromDisplay(weightDisplay(set.weight) + weightStep),
                                })
                              }
                              className="w-12 h-12 shrink-0 rounded-xl bg-cyan-600/20 text-cyan-200 text-2xl font-bold flex items-center justify-center active:bg-cyan-600/40"
                              aria-label={`Subir peso de la serie ${set.setNumber}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-neutral-200">Repeticiones</span>
                            <span className="text-xs text-neutral-400">{wEx.targetReps ? `objetivo ${wEx.targetReps}` : ""}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateSet(target.id, set.id, { reps: Math.max(1, set.reps - 1) })}
                              className="w-12 h-12 shrink-0 rounded-xl bg-neutral-800 text-white text-2xl font-bold flex items-center justify-center active:bg-neutral-700"
                              aria-label={`Bajar repeticiones de la serie ${set.setNumber}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              onFocus={e => e.currentTarget.scrollIntoView({ block: "center", behavior: "auto" })}
                              inputMode="numeric"
                              min="1"
                              max="99"
                              value={set.reps}
                              onChange={(e) =>
                                updateSet(target.id, set.id, {
                                  reps: Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                })
                              }
                              aria-label={`Repeticiones de la serie ${set.setNumber}`}
                              className="flex-1 min-w-0 h-12 text-center rounded-xl bg-neutral-900 border border-neutral-700 font-black text-white text-lg tabular-nums focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateSet(target.id, set.id, { reps: Math.min(99, set.reps + 1) })}
                              className="w-12 h-12 shrink-0 rounded-xl bg-cyan-600/20 text-cyan-200 text-2xl font-bold flex items-center justify-center active:bg-cyan-600/40"
                              aria-label={`Subir repeticiones de la serie ${set.setNumber}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-neutral-200">RIR · repeticiones en reserva</span>
                            <span className="text-xs text-neutral-400">
                              {(set.rir ?? 1) === 0 ? "al fallo" : `${set.rir ?? 1} en reserva`}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[0, 1, 2, 3, 4].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateSet(target.id, set.id, { rir: r })}
                                aria-pressed={(set.rir ?? 1) === r}
                                aria-label={r === 0 ? "Serie al fallo" : `RIR ${r}`}
                                className={`min-h-[48px] rounded-xl text-xs font-bold transition-all ${
                                  (set.rir ?? 1) === r
                                    ? r === 0
                                      ? "bg-red-500/20 border border-red-500/50 text-red-200"
                                      : "bg-cyan-500/20 border border-cyan-500/50 text-cyan-100"
                                    : "bg-neutral-900 border border-neutral-800 text-neutral-300 active:text-white"
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
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.vibrate) {
                            navigator.vibrate(35);
                          }
                          completeSetAndTriggerTimer(target.id, set.id);
                          const nextSet = target.sets.find((candidate) => !candidate.completed && candidate.id !== set.id);
                          if (!set.completed && nextSet) requestAnimationFrame(() => {
                            document.getElementById(`live-set-${nextSet.id}`)?.scrollIntoView({
                              block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                            });
                          });
                        }}
                        className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all press-scale ${
                          set.completed
                            ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30"
                            : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                        {set.completed ? "Desmarcar serie" : "Completar serie"}
                      </button>

                      {set.completed && <VelocityChip wEx={target} set={set} />}

                      {/* Ajustes especializados: ocultos por defecto */}
                      <button
                        type="button"
                        onClick={() => setSetTypeOpenIds((prev) => ({ ...prev, [set.id]: !prev[set.id] }))}
                        aria-expanded={Boolean(setTypeOpenIds[set.id])}
                        className="w-full min-h-[44px] rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-200 flex items-center justify-center gap-2"
                      >
                        <MoreHorizontal className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                        Opciones de serie
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${setTypeOpenIds[set.id] ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>

                      {setTypeOpenIds[set.id] && (
                        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                          <label className="block text-xs text-neutral-200">Incremento de peso ({weightUnit})
                            <select className="ml-2 min-h-[44px] bg-neutral-950 rounded-lg" value={weightStep} onChange={e => setWeightSteps(prev => { const next = { ...prev, [wEx.exerciseId]: Number(e.target.value) }; safeSet("kinetix_weight_steps", next); return next; })}>
                              {[0.25, 0.5, 1, 2.5, 5, 10].map(step => <option key={step} value={step}>{step}</option>)}
                            </select>
                          </label>
                          <div>
                            <span className="block text-xs font-bold text-neutral-200 mb-1.5">Tipo de serie</span>
                            <div className="flex flex-wrap gap-1.5">
                              {SELECTABLE_SET_TYPES.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  aria-pressed={set.type === t}
                                  onClick={() => updateSet(target.id, set.id, { type: t })}
                                  className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border transition-all ${
                                    set.type === t
                                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-100"
                                      : "bg-neutral-950 border-neutral-800 text-neutral-300"
                                  }`}
                                >
                                  {SET_TYPE_LABELS[t]}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed mt-2">{SET_TYPE_HELP[set.type]}</p>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => setQuickAdjustIds((prev) => ({ ...prev, [set.id]: !prev[set.id] }))}
                              aria-expanded={Boolean(quickAdjustIds[set.id])}
                              className="w-full min-h-[44px] rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-200 flex items-center justify-center gap-2"
                            >
                              Ajustes rápidos de peso y reps
                              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${quickAdjustIds[set.id] ? "rotate-180" : ""}`} aria-hidden="true" />
                            </button>
                            {quickAdjustIds[set.id] && (
                              <div className="mt-2 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {weightChips.map((delta) => (
                                    <button
                                      key={`w${delta}`}
                                      type="button"
                                      onClick={() =>
                                        updateSet(target.id, set.id, {
                                          weight: Math.max(0, weightKgFromDisplay(weightDisplay(set.weight) + delta)),
                                        })
                                      }
                                      className={`min-h-[44px] min-w-[56px] px-2 rounded-xl text-xs font-bold border ${
                                        delta > 0
                                          ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/25"
                                          : "bg-neutral-950 text-neutral-300 border-neutral-800"
                                      }`}
                                    >
                                      {delta > 0 ? `+${delta}` : delta} {weightUnit}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {[-2, -1, 1, 2, 5].map((delta) => (
                                    <button
                                      key={`r${delta}`}
                                      type="button"
                                      onClick={() => updateSet(target.id, set.id, { reps: Math.max(1, set.reps + delta) })}
                                      className={`min-h-[44px] min-w-[56px] px-2 rounded-xl text-xs font-bold border ${
                                        delta > 0
                                          ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/25"
                                          : "bg-neutral-950 text-neutral-300 border-neutral-800"
                                      }`}
                                      aria-label={`${delta > 0 ? "Sumar" : "Restar"} ${Math.abs(delta)} repeticiones`}
                                    >
                                      {delta > 0 ? `+${delta}` : delta} reps
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSet(target.id, set.id)}
                            className="w-full min-h-[44px] rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-bold flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            Quitar esta serie
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div
                key={wEx.id}
                id={`live-ex-${wEx.id}`}
                className={`bg-neutral-900 rounded-3xl overflow-hidden shadow-xl transition-all scroll-mt-24 ${
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

                {/* Cabecera del ejercicio: plegable. El ejercicio activo se abre
                    solo; los demás resumen su estado y su próxima serie. */}
                <div className="bg-neutral-950/60 border-b border-neutral-800">
                  <button
                    type="button"
                    onClick={toggleExercise}
                    aria-expanded={isExpanded}
                    className="w-full min-w-0 text-left px-3.5 sm:px-4 py-2.5 min-h-[64px] flex items-center gap-3"
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        pendingSetsMobile.length > 0 && isActiveExercise
                          ? "bg-cyan-500 text-neutral-950"
                          : doneCount === wEx.sets.length && wEx.sets.length > 0
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-neutral-800 text-neutral-200"
                      }`}
                    >
                      {exIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          className={`min-w-0 font-black tracking-tight line-clamp-2 leading-tight ${
                            isActiveExercise ? "text-lg text-white" : "text-sm text-neutral-100"
                          }`}
                        >
                          {wEx.exercise.nameEs}
                        </span>
                        {isActiveExercise && pendingSetsMobile.length > 0 && (
                          <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                            Próximo pendiente
                          </span>
                        )}
                        {doneCount === wEx.sets.length && wEx.sets.length > 0 && (
                          <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                            Completado
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-neutral-300 mt-0.5 tabular-nums">
                        {doneCount}/{wEx.sets.length} series
                        {wEx.targetRestSeconds > 0 ? ` · descanso ${formatDuration(wEx.targetRestSeconds)}` : ""}
                        {!isExpanded && nextPending && !isTimedEx ? ` · siguiente: ${fmtW(nextPending.weight)} ${weightUnit} × ${nextPending.reps}` : ""}
                      </span>
                    </span>
                    {!isTimedEx && (
                      <ChevronDown
                        className={`w-5 h-5 text-neutral-300 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3.5 sm:px-4 pb-3 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs text-neutral-300">
                        Tempo {wEx.exercise.defaultTempo ?? "—"} ·{" "}
                        {wEx.exercise.resistanceProfile === "lengthened" ? "carga en estiramiento" : "carga en contracción"}
                      </p>

                      {/* Acciones secundarias del ejercicio en un menú etiquetado
                          (antes: 6 botones sueltos, 4 solo con icono). */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setExMenuId(exMenuId === wEx.id ? null : wEx.id)}
                          aria-expanded={exMenuId === wEx.id}
                          aria-haspopup="menu"
                          className="min-h-[44px] px-3 rounded-xl bg-neutral-800 text-neutral-100 text-xs font-bold border border-neutral-700 flex items-center gap-2 press-scale"
                        >
                          <MoreHorizontal className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                          Opciones del ejercicio
                        </button>
                        {exMenuId === wEx.id && (
                          <div
                            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-0 sm:p-4"
                            onClick={() => setExMenuId(null)}
                          >
                            <div
                              role="menu"
                              aria-label={`Opciones de ${wEx.exercise.nameEs}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-neutral-900 border border-neutral-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm max-h-[82dvh] overflow-y-auto scrollbar-thin p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-1 shadow-2xl animate-slideUp"
                            >
                              <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-1 sm:hidden" aria-hidden="true" />
                              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                                <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 truncate">
                                  {wEx.exercise.nameEs}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setExMenuId(null)}
                                  aria-label="Cerrar opciones"
                                  className="p-2 -m-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                >
                                  <X className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setSelectedExForPlate({ name: wEx.exercise.nameEs, weight: currentWorkingWeight }); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-neutral-100 hover:bg-neutral-800"
                              >
                                <Disc className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
                                Calculadora de discos
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setSelectedExForWarmup({ name: wEx.exercise.nameEs, weight: currentWorkingWeight }); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-neutral-100 hover:bg-neutral-800"
                              >
                                <Flame className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                                Pirámide de calentamiento
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setSelectedExForTempo({ name: wEx.exercise.nameEs, tempo: wEx.exercise.defaultTempo }); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-neutral-100 hover:bg-neutral-800"
                              >
                                <Activity className="w-4 h-4 text-purple-400 shrink-0" aria-hidden="true" />
                                Metrónomo de tempo
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setSelectedExerciseForDetail(wEx.exercise); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-neutral-100 hover:bg-neutral-800"
                              >
                                <Info className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
                                Biomecánica y anatomía
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setReplacingWExId(wEx.id); setIsLibraryOpen(true); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-neutral-100 hover:bg-neutral-800"
                              >
                                <ArrowRightLeft className="w-4 h-4 text-neutral-300 shrink-0" aria-hidden="true" />
                                Sustituir ejercicio
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => { setConfirmRemoveEx(wEx.id); setExMenuId(null); }}
                                className="w-full min-h-[52px] px-4 rounded-xl flex items-center gap-3 text-left text-sm font-bold text-red-200 hover:bg-red-950/50 border-t border-neutral-800"
                              >
                                <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                                Quitar del entrenamiento
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cuerpo del ejercicio: solo el ejercicio expandido muestra
                    sus controles (progresión, temporizadores, series y barra
                    de acciones); los plegados quedan en el resumen de la
                    cabecera. Los de tiempo/cardio siempre están expandidos. */}
                {isExpanded && (
                <>
                {/* La demostración permanece visible al abrir el ejercicio. */}
                <ExerciseInlineVisual
                  exercise={wEx.exercise}
                  onGoToSets={!isTimedEx && nextPending ? () => {
                    document.getElementById(`live-set-${nextPending.id}`)?.focus({ preventScroll: true });
                    document.getElementById(`live-set-${nextPending.id}`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                  } : undefined}
                  onTutorial={() => setSelectedExerciseForDetail(wEx.exercise)}
                  onReplace={() => { setReplacingWExId(wEx.id); setIsLibraryOpen(true); }}
                />

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
                                <span className="text-cyan-400/90 font-bold">Sin historial</span>
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
                                  onFocus={e => e.currentTarget.scrollIntoView({ block: "center", behavior: "auto" })}
                              inputMode="decimal"
                                  step="any"
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
                                  onFocus={e => e.currentTarget.scrollIntoView({ block: "center", behavior: "auto" })}
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
                                      reps: Math.min(99, set.reps + 1),
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
                                aria-label={`${set.completed ? "Desmarcar" : "Completar"} serie ${set.setNumber} de ${wEx.exercise.nameEs}`}
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
                                aria-label={`Eliminar serie ${set.setNumber} de ${wEx.exercise.nameEs}`}
                                onClick={() => removeSet(wEx.id, set.id)}
                                className="text-neutral-400 hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] p-2"
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

                {/* Sets Cards — Mobile: una serie activa con controles cómodos y
                    el resto plegado (antes cada serie mostraba ~12 controles). */}
                {!wEx.notes?.startsWith("cardio:") && !isTimeBased(wEx.exercise, wEx.targetReps) && (
                <div className="p-3 space-y-2 md:hidden">
                  {completedSetsMobile.length > 0 && (
                    <div className="rounded-2xl bg-neutral-950/50 border border-neutral-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCompletedOpenIds((prev) => ({ ...prev, [wEx.id]: !prev[wEx.id] }))}
                        aria-expanded={Boolean(completedOpenIds[wEx.id])}
                        className="w-full min-w-0 min-h-[48px] px-3 flex items-center justify-between gap-2 text-left"
                      >
                        <span className="flex items-center gap-2 min-w-0 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {completedSetsMobile.length} {completedSetsMobile.length === 1 ? "serie completada" : "series completadas"}
                          </span>
                        </span>
                        {/* El resumen de la última serie usa `shrink-0`; el rótulo de la
                            izquierda trunca antes que comprimirse (antes usaba un
                            breakpoint `xs:` inexistente y quedaba siempre oculto). */}
                        <span className="text-[11px] text-neutral-300 font-mono whitespace-nowrap shrink-0 tabular-nums">
                          {fmtW(completedSetsMobile[completedSetsMobile.length - 1].weight)} {weightUnit} × {completedSetsMobile[completedSetsMobile.length - 1].reps}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-neutral-300 shrink-0 transition-transform ${completedOpenIds[wEx.id] ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                      {completedOpenIds[wEx.id] && (
                        <div className="p-2 pt-0 space-y-2">
                          {completedSetsMobile.map((set) => renderSetEditor(wEx, set, false))}
                        </div>
                      )}
                    </div>
                  )}

                  {pendingSetsMobile.map((set, i) => renderSetEditor(wEx, set, i === 0))}

                  {pendingSetsMobile.length === 0 && wEx.sets.length > 0 && (
                    <p className="text-xs text-emerald-300 font-bold px-1 py-2 flex items-center gap-2 min-w-0">
                      <Check className="w-4 h-4 stroke-[3] shrink-0" aria-hidden="true" />
                      <span className="min-w-0">Ejercicio completado · sumá una serie extra si querés seguir</span>
                    </p>
                  )}
                </div>
                )}


                {!isTimedEx && <details className="mx-4 mb-3 rounded-xl border border-neutral-700">
                  <summary className="min-h-[48px] cursor-pointer px-3 py-3 text-sm font-bold text-neutral-200">Objetivo y progresión</summary>
                  <ProgressionRecommendation wEx={wEx} weightUnit={weightUnit} />
                </details>}
                {doneCount === wEx.sets.length && doneCount > 0 && !isTimedEx && !dismissedSurveys[wEx.id] && (
                  <button
                    className="mx-4 mb-3 min-h-[44px] text-sm font-bold text-cyan-200 text-left"
                    onClick={() => setDifficultySurvey({ exerciseId: wEx.id, exerciseName: wEx.exercise.nameEs, targetRir: wEx.targetRir ?? wEx.exercise.defaultRir })}
                  >
                    ¿Cómo se sintió? · valorar esfuerzo (opcional)
                  </button>
                )}

                {/* Barra de series: la acción rápida es una serie normal; Drop Set,
                    Myo-Reps y el resto viven en "Opciones de serie". */}
                {!wEx.notes?.startsWith("cardio:") && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex items-center gap-2 pt-3 flex-wrap">
                  <button type="button" onClick={() => addSet(wEx.id, "normal")} className="shrink-0 whitespace-nowrap px-3.5 min-h-[48px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-bold border border-neutral-700 flex items-center gap-1.5 transition-colors press-scale">
                    <Plus className="w-4 h-4 text-cyan-400" aria-hidden="true" />Añadir serie
                  </button>
                  {/* Descanso manual: con el automático apagado (ajustes del
                      header) esta es la vía clara para arrancarlo. */}
                  {!restTimer.active && (
                    <button
                      type="button"
                      onClick={() => startRestTimer(wEx.targetRestSeconds || 90, wEx.exercise.nameEs || wEx.exercise.name)}
                      className="shrink-0 whitespace-nowrap px-3.5 min-h-[48px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-200 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 transition-colors press-scale"
                    >
                      <Clock className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                      Iniciar descanso {formatDuration(wEx.targetRestSeconds || 90)}
                    </button>
                  )}
                  <button type="button" onClick={() => addSet(wEx.id, "dropset")} className="shrink-0 whitespace-nowrap px-3.5 min-h-[48px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center gap-1.5 transition-colors press-scale">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />Añadir Drop Set
                  </button>
                </div>
                )}
                </>
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
            Cancelar entrenamiento
          </button>
        </div>
      </div>

      {/* Cancel session confirmation: opciones explícitas y sin ambigüedad */}
      <ConfirmDialog
        open={confirmCancel}
        title="¿Descartar el entrenamiento?"
        message="Se perderá TODO el progreso de la sesión actual (series, pesos y tiempo). La sesión puede retomarse si seguís entrenando."
        confirmLabel="Descartar entrenamiento"
        cancelLabel="Seguir entrenando"
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
          <div role="dialog" aria-modal="true" aria-label="Esfuerzo percibido de la sesión" className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl p-6 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">¿Qué tan dura fue la sesión?</h3>
              <p className="text-xs text-neutral-400">
                sRPE 1-10 · sirve para calcular tu carga interna y detectar sobrecarga
              </p>
            </div>

            <label className="block text-sm text-neutral-300">Duración real (minutos, opcional)
              <input type="number" min="1" max="1440" inputMode="numeric" value={finishMinutes} onChange={e => setFinishMinutes(e.target.value)} className="mt-2 w-full min-h-[44px] rounded-xl bg-neutral-950 px-3" placeholder="Usar el tiempo transcurrido" />
            </label>
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

            <button className="w-full min-h-[44px] text-sm text-neutral-300" onClick={() => setSrpeSurvey(false)}>Volver al entrenamiento</button>
            <div className="flex gap-2">
              <button
                onClick={() => doFinish(undefined, partialReason)}
                className="flex-1 py-3 text-xs text-neutral-400 hover:text-neutral-300 font-medium transition-colors min-h-[48px]"
              >
                Guardar sin valorar
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
          <div role="dialog" aria-modal="true" aria-label="Encuesta de dificultad" className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl p-6 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">¿Cómo te fue?</h3>
              <p className="text-xs text-neutral-400">
                <strong className="text-white">{difficultySurvey.exerciseName}</strong>
                {difficultySurvey.targetRir != null
                  ? ` — objetivo RIR ${difficultySurvey.targetRir}. ¿Qué tan cerca quedaste?`
                  : " — Selecciona cómo se sintió"}
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

            {/* Omitir vale para TODA la sesión: el ejercicio no vuelve a pedir
                valoración hasta el próximo entrenamiento. */}
            <button
              onClick={() => {
                setDismissedSurveys((prev) => ({ ...prev, [difficultySurvey.exerciseId]: true }));
                setDifficultySurvey(null);
              }}
              className="w-full min-h-[44px] text-xs text-neutral-400 hover:text-neutral-300 font-medium transition-colors"
            >
              Ahora no (no volver a preguntar hoy)
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

        {/* La ficha del ejercicio se renderiza UNA sola vez, en App (capa
            global). Antes se montaba también aquí, con el mismo estado del
            contexto: al abrirla desde el entrenamiento aparecían dos fichas
            idénticas superpuestas. */}

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

