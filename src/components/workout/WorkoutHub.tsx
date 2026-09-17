import React, { useState, useMemo, useEffect } from "react";
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
  TrendingDown,
  Target,
  Trash2,
  X,
  AlertTriangle,
  ChevronDown,
  HelpCircle,
  SlidersHorizontal,
  Settings2,
  Check
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { useGoal } from "../../context/GoalContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { FocusTrap } from "../FocusTrap";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
const PlateCalculatorModal = React.lazy(() =>
  import("./PlateCalculatorModal").then((m) => ({ default: m.PlateCalculatorModal }))
);
const WarmupGeneratorModal = React.lazy(() =>
  import("./WarmupGeneratorModal").then((m) => ({ default: m.WarmupGeneratorModal }))
);
const TempoMetronomeModal = React.lazy(() =>
  import("./TempoMetronomeModal").then((m) => ({ default: m.TempoMetronomeModal }))
);
const SessionImportModal = React.lazy(() =>
  import("./SessionImportModal").then((m) => ({ default: m.SessionImportModal }))
);
import { Program, Routine, Exercise, WorkoutExercise, WorkoutSet, CompletedWorkout } from "../../types";
import { isTimeBased } from "../../utils/exerciseMode";
import {
  loadUserProfile,
  resolveFeaturedProgram,
  resolveAdaptedRoutineForEquipment,
  loadTodayEquipment,
  resolveCurrentEquipment,
  setTodayEquipment,
  shortenRoutine,
  daysSinceCompletion,
} from "../../utils/userProfile";
import { adaptRoutineToEquipment } from "../../utils/equipmentAdapter";
import { EquipmentAccess } from "../../types";
import {
  analyzeDeload,
  buildDeloadRoutine,
  getDeloadWeekState,
  getRecoverySignals,
  setDeloadWeekState,
} from "../../utils/deloadDetection";
import { getMesocycleInfo } from "../../utils/mesocycle";
import { getUndoneExercisesFromSession } from "../../utils/pendingExercises";
import { localDateKey } from "../../utils/dateUtils";
import { READINESS_VERDICTS } from "../../utils/goalEngine";
import { previewExerciseCount } from "../../utils/sessionPreview";
import { CardioToggle } from "./CardioToggle";

const GOAL_LABELS: Record<string, string> = {
  cut: "Definición",
  maintenance: "Mantenimiento",
  lean_bulk: "Lean bulk",
};

const EQUIPMENT_OPTIONS: { value: EquipmentAccess; label: string }[] = [
  { value: "home", label: "Casa" },
  { value: "basic", label: "Básico" },
  { value: "gym", label: "Gimnasio" },
];

interface WorkoutHubProps {
  onGoToPrograms: () => void;
  onGoToBiomechanics: () => void;
}

export const WorkoutHub: React.FC<WorkoutHubProps> = ({
  onGoToPrograms,
  onGoToBiomechanics: _onGoToBiomechanics,
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
    carryOverPendingExercise,
    weightUnit,
    nutritionLog,
    includeCardio,
  } = useWorkout();

  const [isPlateOpen, setIsPlateOpen] = useState(false);
  const [isWarmupOpen, setIsWarmupOpen] = useState(false);
  const [isTempoOpen, setIsTempoOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CompletedWorkout | null>(null);
  const [selectedExHistory, setSelectedExHistory] = useState<{ id: string; name: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "ghost" | "clearAll" | "deleteOne";
    id?: string;
    name?: string;
  }>(null);
  const { showToast } = useToast();
  const { readinessLog } = useGoal();
  const [showWhy, setShowWhy] = useState(false);
  // "Ajustar entrenamiento" = una sola decisión secundaria: elige QUÉ se inicia
  // (plan de hoy, versión corta o descarga) en lugar de duplicar botones de
  // arranque que parecen hacer lo mismo.
  const [showAdapt, setShowAdapt] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [routineChoice, setRoutineChoice] = useState<"plan" | "short" | "deload">("plan");

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
  // Si no hay selección explícita, usa la recomendación del perfil del
  // onboarding (explicable, determinista).
  const userProfile = loadUserProfile();
  const featuredProgram: Program = resolveFeaturedProgram(userProfile);
  // Rutinas del programa adaptadas al equipamiento VIGENTE (override de hoy →
  // perfil → gym). Si hoy entrenás en casa, la lista muestra los equivalentes
  // de peso corporal, no la barra/polea del plan original.
  const programRoutines: Routine[] = featuredProgram.routines.map((r) =>
    adaptRoutineToEquipment(r, resolveCurrentEquipment())
  );
  // P3: override diario del lugar de entrenamiento (casa/básico/gimnasio).
  const [todayEquipment, setTodayEquipmentState] = useState<EquipmentAccess | null>(() => loadTodayEquipment());
  const nextRoutine: Routine = resolveAdaptedRoutineForEquipment(userProfile, workoutHistory, todayEquipment);
  const changeTodayEquipment = (e: EquipmentAccess) => {
    setTodayEquipmentState(e);
    setTodayEquipment(e);
  };
  const currentEquipment = todayEquipment ?? userProfile?.equipment ?? "gym";

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

  // Última sesión (no de hoy) con ejercicios sin completar, para poder
  // retomarlos en el día actual ("sumar a hoy").
  const pendingCarryover = useMemo(() => {
    const today = localDateKey();
    const nonToday = workoutHistory
      .filter((w) => localDateKey(new Date(w.date)) !== today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const session of nonToday) {
      const undone = getUndoneExercisesFromSession(session);
      if (undone.length > 0) {
        return { session, undone };
      }
    }
    return null;
  }, [workoutHistory]);

  const handleCarryOver = (exercise: Exercise, pending?: WorkoutExercise | null) => {
    carryOverPendingExercise(exercise, pending);
    showToast(`${exercise?.nameEs || "Ejercicio"} sumado a la sesión de hoy`, "success");
  };

  // IDEA 2: Deload por acumulación real + mesociclo 4+1 (P1) + recuperación (P2: sueño/readiness).
  const deload = useMemo(
    () => analyzeDeload(workoutHistory, 4, getRecoverySignals()),
    [workoutHistory]
  );
  const mesocycle = useMemo(() => getMesocycleInfo(workoutHistory), [workoutHistory]);
  const deloadRoutine = useMemo<Routine | null>(
    () => (nextRoutine && deload.status !== "none" ? buildDeloadRoutine(nextRoutine) : null),
    [nextRoutine, deload.status]
  );
  const [deloadWeek, setDeloadWeek] = useState(() => getDeloadWeekState());

  // Opción "versión corta": solo existe si la sesión de hoy no entra en el
  // tiempo preferido del perfil (si entra, ofrecerla sería ruido).
  const shortRoutine = useMemo<Routine | null>(() => {
    const minutes = userProfile?.sessionMinutes;
    if (!minutes || nextRoutine.estimatedDurationMin <= minutes) return null;
    const shortened = shortenRoutine(nextRoutine, minutes);
    return shortened.estimatedDurationMin < nextRoutine.estimatedDurationMin ? shortened : null;
  }, [nextRoutine, userProfile?.sessionMinutes]);

  // Ajuste vigente elegido en "Ajustar entrenamiento" (uno solo, siempre visible
  // en el botón principal: evita varios botones que parecen arrancar lo mismo).
  const chosenRoutine: Routine =
    routineChoice === "short" && shortRoutine
      ? shortRoutine
      : routineChoice === "deload" && deloadRoutine
        ? deloadRoutine
        : nextRoutine;

  // Si cambia el plan del día (equipamiento, rotación), el ajuste vuelve al plan.
  useEffect(() => {
    setRoutineChoice("plan");
  }, [nextRoutine.id]);

  const nextLastDays = daysSinceCompletion(nextRoutine, workoutHistory);
  const activeSetsDone = activeSession
    ? activeSession.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.completed).length, 0)
    : 0;
  const activeSetsTotal = activeSession
    ? activeSession.exercises.reduce((acc, e) => acc + e.sets.length, 0)
    : 0;

  // Readiness de hoy para el panel "Adaptar sesión" (veredicto ya persistido
  // por GoalHub; acá solo se muestra la consecuencia antes de arrancar).
  const todayKey = localDateKey();
  const todayReadiness = readinessLog.find((r) => r.date === todayKey);
  const verdictMeta = todayReadiness ? READINESS_VERDICTS[todayReadiness.verdict] : null;
  const adjLabel = todayReadiness
    ? todayReadiness.verdict === "descanso"
      ? "−10% de carga · RIR +1 (recuperación prioritaria)"
      : todayReadiness.verdict === "moderado"
      ? "RIR +1 hoy (fatiga acumulada)"
      : "Sin ajustes: estás listo/a para darle"
    : "Registrá tu readiness en Objetivos y la sesión se ajusta sola en arranque";

  const startDeloadWeek = () => {
    if (!deloadRoutine) return;
    startWorkoutFromRoutine(deloadRoutine);
    setDeloadWeek({ active: true, startedAt: Date.now(), routineId: deloadRoutine.id });
    setDeloadWeekState({ active: true, startedAt: Date.now(), routineId: deloadRoutine.id });
    showToast(`Semana de descarga iniciada · ${deloadRoutine.name}`);
  };

  const startChosenRoutine = () => {
    if (routineChoice === "deload" && deloadRoutine) {
      startDeloadWeek();
      return;
    }
    startWorkoutFromRoutine(chosenRoutine);
  };

  const endDeloadWeek = () => {
    setDeloadWeek({ active: false });
    setDeloadWeekState({ active: false });
    showToast("Semana de descarga finalizada. Volvé a la sobrecarga progresiva.", "success");
  };

  return (
    <div id="workout-hub" className="space-y-8 animate-fadeIn pb-16">
      {/* Hero Quick Start Banner */}
      <div className="p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl relative overflow-hidden group">
        {/* Background glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="space-y-2 max-w-2xl min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {activeSession ? "SESIÓN ACTIVA" : "HOY TE TOCA"}
              </span>
              {!activeSession && (
                <>
                  <span className="flex items-center gap-1 text-xs text-neutral-300 font-bold">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    ~{chosenRoutine.estimatedDurationMin} min
                  </span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-xs text-neutral-300 font-bold tabular-nums">
                    {previewExerciseCount(chosenRoutine, includeCardio)} ejercicios
                  </span>
                </>
              )}
              {/* P4 DUP: día de rotación aplicado a la rutina de hoy. */}
              {!activeSession && nextRoutine.dupDay && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Rotación · {nextRoutine.dupDay}
                </span>
              )}
              {/* Advertencia que SÍ cambia la decisión: descarga en curso o sugerida. */}
              {!activeSession && (mesocycle.isDeloadWeek || deload.status === "due" || deloadWeek.active) && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {deloadWeek.active ? "Descarga activa" : deload.status === "due" ? "Descarga recomendada" : "Descarga sugerida"}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {activeSession ? activeSession.routineName : chosenRoutine.targetSplit}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {activeSession
                ? `${activeSession.exercises.length} ejercicios · ${activeSetsDone}/${activeSetsTotal} series registradas.`
                : <>
                    {chosenRoutine.name}
                    <span className="text-neutral-400">
                      {nextLastDays === null
                        ? " · primera vez con esta rutina"
                        : nextLastDays === 0
                          ? " · entrenada hoy"
                          : ` · última vez hace ${nextLastDays} ${nextLastDays === 1 ? "día" : "días"}`}
                    </span>
                  </>}
            </p>
            {!activeSession && (
              <button
                onClick={() => setShowWhy((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showWhy ? "Ocultar explicación" : "¿Por qué este entrenamiento?"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`} />
              </button>
            )}
            {showWhy && !activeSession && (
              <div className="pt-1 animate-fadeIn">
                <ul className="space-y-1.5 text-[11px] text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">→</span>
                    <span><strong className="text-white">Programa:</strong> {featuredProgram.title} · meta {GOAL_LABELS[userProfile?.goal ?? "lean_bulk"]}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">→</span>
                    <span><strong className="text-white">Rutina de hoy:</strong> {nextRoutine.name} — {previewExerciseCount(nextRoutine, includeCardio)} ejercicios{userProfile?.sessionMinutes ? ` · ~${userProfile.sessionMinutes} min` : ""}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">→</span>
                    <span><strong className="text-white">Mesociclo:</strong> semana {mesocycle.weekInCycle}/5 · {mesocycle.phaseLabel}{mesocycle.isDeloadWeek ? " (descarga: volumen bajo, RIR alto para disipar fatiga)" : " (sobrecarga progresiva: subís cuando llegás al tope del rango)"}</span>
                  </li>
                  {nextRoutine.dupDay && (
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">→</span>
                      <span><strong className="text-white">Rotación:</strong> hoy toca {nextRoutine.dupDay} para distribuir la tensión del día</span>
                    </li>
                  )}
                  {verdictMeta && (
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">→</span>
                      <span><strong className="text-white">Energía de hoy:</strong> {verdictMeta.label} — {adjLabel}</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">→</span>
                    <span><strong className="text-white">Ajuste automático:</strong> el peso inicial sale de tu historial + dificultad percibida, y tu energía de hoy lo regula antes de arrancar</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Acciones previas al entrenamiento: UNA principal, UNA secundaria
              (ajustar) y una alternativa de entrenamiento libre con etiqueta
              completa (antes el botón quedaba solo con un "+" en móvil). */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {activeSession ? (
              <button
                onClick={() => setIsWorkoutModalOpen(true)}
                className="w-full sm:flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 press-scale"
              >
                <Play className="w-4 h-4 fill-white shrink-0" />
                <span className="truncate">Continuar entrenamiento</span>
              </button>
            ) : (
              <>
                <button
                  onClick={startChosenRoutine}
                  className="w-full sm:flex-1 px-6 py-4 bg-gradient-to-br from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-600/40 ring-2 ring-cyan-400/30 transition-all flex items-center justify-center gap-2 press-scale min-w-0"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span className="truncate">
                    Iniciar entrenamiento
                    <span className="block text-[11px] font-bold text-cyan-100/80 normal-case">
                      {chosenRoutine.name.split("(")[0].trim()} · {chosenRoutine.estimatedDurationMin} min
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setShowAdapt((v) => !v)}
                  aria-expanded={showAdapt}
                  className={`w-full sm:w-auto px-5 py-3.5 font-bold text-sm rounded-2xl border transition-all flex items-center justify-center gap-2 press-scale shrink-0 ${
                    showAdapt || routineChoice !== "plan"
                      ? "bg-neutral-700 border-neutral-500 text-white"
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>Ajustar entrenamiento</span>
                </button>
                <button
                  onClick={() => startEmptyWorkout("Entrenamiento Libre")}
                  className="w-full sm:w-auto px-5 py-3.5 bg-transparent hover:bg-neutral-800/80 text-neutral-300 hover:text-white font-bold text-sm rounded-2xl border border-neutral-800 transition-all flex items-center justify-center gap-2 press-scale shrink-0"
                >
                  <Dumbbell className="w-4 h-4 shrink-0 text-neutral-400" />
                  <span>Entrenamiento libre</span>
                </button>
              </>
            )}
          </div>

          {/* Configuración compacta: lugar de hoy, cardio y cómo se ajusta el plan.
              Plegada por defecto para que la primera vista solo muestre la decisión. */}
          {!activeSession && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowConfig((v) => !v)}
                aria-expanded={showConfig}
                className="inline-flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white transition-colors min-h-[44px]"
              >
                <Settings2 className="w-4 h-4 text-cyan-400" />
                Configuración de hoy
                <span className="text-neutral-400 font-medium normal-case">
                  ({currentEquipment === "home" ? "casa" : currentEquipment === "basic" ? "equipamiento básico" : "gimnasio"}
                  {includeCardio ? " · con cardio" : ""})
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showConfig ? "rotate-180" : ""}`} />
              </button>
              {showConfig && (
                <div className="p-3 sm:p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5 animate-fadeIn">
                  <CardioToggle />
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full px-3 py-2 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <span className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                      <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                      Hoy entreno en
                    </span>
                    <div className="flex gap-1" role="radiogroup" aria-label="Lugar de entrenamiento de hoy">
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={currentEquipment === opt.value}
                          onClick={() => changeTodayEquipment(opt.value)}
                          className={`px-3 min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                            currentEquipment === opt.value
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/25"
                              : "bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800"
                          }`}
                        >
                          {currentEquipment === opt.value && <Check className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong className="text-white">Ajuste automático:</strong>{" "}
                    {todayReadiness
                      ? `readiness de hoy ${verdictMeta?.label?.toLowerCase() ?? ""} — ${adjLabel}.`
                      : "sin readiness registrado hoy; el peso inicial sale de tu historial y de la dificultad percibida de la última sesión."}
                    {" "}El lugar de hoy cambia los ejercicios por sus equivalentes de equipamiento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Ajustar entrenamiento": elige QUÉ se va a iniciar (no arranca nada por
          su cuenta). El botón principal del hero refleja la elección. */}
      {showAdapt && !activeSession && (
        <div className="p-4 sm:p-5 rounded-3xl bg-neutral-950 border border-cyan-500/25 animate-fadeIn space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Ajustar el entrenamiento de hoy</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {todayReadiness
                  ? `Energía de hoy: ${verdictMeta?.label ?? ""}. Se aplicará: ${adjLabel}.`
                  : "Todavía no registraste tu readiness de hoy. Sin él, la sesión arranca con el ajuste de peso por historial."}
              </p>
              {deloadRoutine && (
                <p className="text-xs text-amber-300/90">
                  Detectamos acumulación de fatiga: la descarga baja −10-15% la carga y sube el RIR.
                </p>
              )}
            </div>
          </div>

          <div role="radiogroup" aria-label="Qué entrenamiento iniciar" className="space-y-2">
            <button
              type="button"
              role="radio"
              aria-checked={routineChoice === "plan"}
              onClick={() => { setRoutineChoice("plan"); setShowAdapt(false); }}
              className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 min-h-[56px] ${
                routineChoice === "plan"
                  ? "bg-cyan-500/10 border-cyan-500/50"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${routineChoice === "plan" ? "border-cyan-400" : "border-neutral-600"}`}>
                {routineChoice === "plan" && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">Plan de hoy (recomendado)</span>
                <span className="block text-xs text-neutral-300 truncate">
                  {nextRoutine.name.split("(")[0].trim()} · ~{nextRoutine.estimatedDurationMin} min · {previewExerciseCount(nextRoutine, includeCardio)} ejercicios
                </span>
              </span>
            </button>

            {shortRoutine && (
              <button
                type="button"
                role="radio"
                aria-checked={routineChoice === "short"}
                onClick={() => { setRoutineChoice("short"); setShowAdapt(false); showToast(`Versión corta seleccionada · ~${shortRoutine.estimatedDurationMin} min`); }}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 min-h-[56px] ${
                  routineChoice === "short"
                    ? "bg-cyan-500/10 border-cyan-500/50"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${routineChoice === "short" ? "border-cyan-400" : "border-neutral-600"}`}>
                  {routineChoice === "short" && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">Versión corta</span>
                  <span className="block text-xs text-neutral-300 truncate">
                    ~{shortRoutine.estimatedDurationMin} min · entra en tus {userProfile?.sessionMinutes} min preferidos · conserva los ejercicios prioritarios
                  </span>
                </span>
              </button>
            )}

            {deloadRoutine && (
              <button
                type="button"
                role="radio"
                aria-checked={routineChoice === "deload"}
                onClick={() => { setRoutineChoice("deload"); setShowAdapt(false); showToast("Descarga seleccionada · −10-15% carga, RIR más alto", "info"); }}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 min-h-[56px] ${
                  routineChoice === "deload"
                    ? "bg-teal-500/10 border-teal-500/50"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${routineChoice === "deload" ? "border-teal-400" : "border-neutral-600"}`}>
                  {routineChoice === "deload" && <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">Sesión de descarga</span>
                  <span className="block text-xs text-neutral-300 truncate">{deloadRoutine.name}</span>
                </span>
              </button>
            )}
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            El ajuste elegido se aplica al pulsar <strong className="text-neutral-200">Iniciar entrenamiento</strong>. Para "semana de descarga" completa, usá el aviso de descarga de más abajo.
          </p>
        </div>
      )}

      {/* Pendientes de la última sesión (ejercicios no completados) */}
      {pendingCarryover && pendingCarryover.undone.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border border-amber-500/40 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    NO COMPLETO
                  </span>
                  <span className="text-[11px] text-neutral-400 font-bold">
                    {new Date(pendingCarryover.session.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-2">Ejercicios sin terminar</h3>
                <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                  Dejaste series incompletas en "{pendingCarryover.session.routineName}". Sumá los que te faltaron a la sesión de hoy.
                  {pendingCarryover.session.partialReason && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5">
                      Motivo: {pendingCarryover.session.partialReason}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {pendingCarryover.undone.map(({ wEx, incompleteSets }) => (
              <div
                key={wEx.id}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-950 border border-amber-500/20"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {wEx.exercise?.nameEs || wEx.exerciseId}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {incompleteSets} serie{incompleteSets > 1 ? "s" : ""} sin completar
                      {wEx.targetSets ? ` · plan ${wEx.targetSets}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCarryOver(wEx.exercise, wEx)}
                  className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black rounded-xl transition-colors shadow-lg shadow-amber-600/20 flex items-center gap-1.5 shrink-0 press-scale"
                >
                  <Plus className="w-4 h-4" />
                  Sumar a hoy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IDEA 2: Deload automático por acumulación real */}
      {deloadWeek.active ? (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-500/10 via-neutral-900 to-neutral-950 border border-teal-500/30 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/15 text-teal-300 border border-teal-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    SEMANA DE DESCARGA ACTIVA
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-2">Recuperación en curso</h3>
                <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                  Estás en tu semana de descarga: menos volumen, −10-15% de carga y más reps en reserva
                  (RIR más alto). Esto disipa la fatiga sistémica y te deja listo para volver con
                  sobrecarga progresiva.
                </p>
              </div>
            </div>
            <button
              onClick={endDeloadWeek}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg shadow-teal-600/20 shrink-0"
            >
              Finalizar descarga
            </button>
          </div>
          {deloadRoutine && (
            <button
              onClick={() => startWorkoutFromRoutine(deloadRoutine)}
              className="w-full p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-teal-300 text-xs font-bold">
                <Play className="w-4 h-4 fill-teal-300" />
                Volver a iniciar: {deloadRoutine.name}
              </span>
            </button>
          )}
        </div>
      ) : deload.status === "due" && deloadRoutine ? (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500/10 via-neutral-900 to-neutral-950 border border-rose-500/30 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/20 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  DELOAD RECOMENDADO
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-2">
                Sobrecarga real acumulada ({deload.consecutiveOverloadWeeks} semanas)
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed mt-1">{deload.summary}</p>
              <ul className="mt-2 space-y-1">
                {deload.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-400">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startDeloadWeek}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition-colors shadow-lg shadow-rose-600/20"
            >
              Iniciar semana de descarga
            </button>
            <button
              onClick={() => startWorkoutFromRoutine(deloadRoutine)}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 transition-colors"
            >
              Solo hoy: {deloadRoutine.name}
            </button>
          </div>
        </div>
      ) : deload.status === "ready" ? (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <TrendingDown className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <span>
            <strong className="font-black text-amber-300">Alerta temprana de fatiga.</strong> {deload.summary}
          </span>
        </div>
      ) : null}
      {/* Estado del día en UNA línea: el resumen con tarjetas vive en Inicio
          (evitamos repetir el mismo bloque completo en dos pestañas) y aquí ya
          no se repite la invitación a iniciar (está arriba, una sola vez). */}
      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
        <p className="text-xs text-neutral-300 min-w-0">
          <span className="font-bold text-white">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}
          </span>
          {" · "}
          {todayStats.workouts === 0
            ? "aún no entrenaste hoy; tu sesión programada está lista arriba."
            : `${todayStats.workouts} ${todayStats.workouts === 1 ? "sesión" : "sesiones"} hoy · ${todayStats.sets} ${todayStats.sets === 1 ? "serie" : "series"} registradas · ${todayStats.meals} ${todayStats.meals === 1 ? "comida" : "comidas"}.`}
        </p>
      </div>

      {/* Weekly Summary Bar */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Target className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-cyan-400 mx-auto mb-0.5 sm:mb-1" />
          <div className="text-lg sm:text-xl font-black text-white tabular-nums truncate">{weekStats.workouts}</div>
          <span className="text-[11px] sm:text-[11px] font-bold text-neutral-400 uppercase">Sesiones</span>
        </div>
        <div className="p-2 sm:p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-400 mx-auto mb-0.5 sm:mb-1" />
          <div className="text-lg sm:text-xl font-black text-purple-400 tabular-nums truncate min-w-0">{weekStats.volume.toLocaleString()}</div>
          <span className="text-[11px] sm:text-[11px] font-bold text-neutral-400 uppercase">Tonelaje</span>
        </div>
        <div className="p-2 sm:p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Activity className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-400 mx-auto mb-0.5 sm:mb-1" />
          <div className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums truncate">{weekStats.sets}</div>
          <span className="text-[11px] sm:text-[11px] font-bold text-neutral-400 uppercase">Series</span>
        </div>
        <div className="p-2 sm:p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center min-w-0">
          <Trophy className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-400 mx-auto mb-0.5 sm:mb-1" />
          <div className="text-lg sm:text-xl font-black text-amber-400 tabular-nums truncate">{weekStats.prs}</div>
          <span className="text-[11px] sm:text-[11px] font-bold text-neutral-400 uppercase">PRs</span>
        </div>
      </div>

      {/* Science Quick Tools Bar — 2×2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={() => setIsPlateOpen(true)}
          className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-blue-500/40 transition-all flex items-center gap-2.5 sm:gap-3 text-left group press-scale"
        >
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Disc className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
              Calculadora de Discos
            </h4>
            <p className="text-[11px] sm:text-[11px] text-neutral-400 line-clamp-2">Distribución exacta por lado en barra</p>
          </div>
        </button>

        <button
          onClick={() => setIsWarmupOpen(true)}
          className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-all flex items-center gap-2.5 sm:gap-3 text-left group press-scale"
        >
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
              Pirámide de Calentamiento
            </h4>
            <p className="text-[11px] sm:text-[11px] text-neutral-400 line-clamp-2">Potenciación SNC sin fatiga metabólica</p>
          </div>
        </button>

        <button
          onClick={() => setIsTempoOpen(true)}
          className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/40 transition-all flex items-center gap-2.5 sm:gap-3 text-left group press-scale"
        >
          <div className="p-2.5 sm:p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
              Metrónomo de Tempo
            </h4>
            <p className="text-[11px] sm:text-[11px] text-neutral-400 line-clamp-2">Control excéntrico de tensión mecánica</p>
          </div>
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-neutral-900 to-neutral-900 border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center gap-2.5 sm:gap-3 text-left group press-scale relative overflow-hidden"
        >
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-white">DESTACADO</span>
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
              Importar Sesión
            </h4>
            <p className="text-[11px] sm:text-[11px] text-neutral-400 line-clamp-2">Carga sesiones reales previas (SBS v28)</p>
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
            className="min-h-[44px] px-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Explorar todos los programas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {programRoutines.map((routine, idx) => (
            <div
              key={routine.id}
              className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3 sm:space-y-4 press-scale"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] sm:text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 whitespace-nowrap">
                    DÍA {idx + 1} • {routine.targetSplit}
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono text-cyan-400 font-bold whitespace-nowrap">
                    {previewExerciseCount(routine, includeCardio)} Ejercicios
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white line-clamp-2">{routine.name}</h4>
                <p className="text-[11px] sm:text-xs text-neutral-400 mt-1 line-clamp-2">{routine.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800 gap-2">
                <span className="text-[11px] sm:text-[11px] text-neutral-400 font-medium truncate min-w-0">
                  {routine.exercises.slice(0, 3).map((e) => {
                    const ex = EXERCISES_DATABASE.find((dbEx) => dbEx.id === e.exerciseId);
                    return ex?.nameEs || e.exerciseId;
                  }).join(" • ")}...
                </span>

                <button
                  onClick={() => startWorkoutFromRoutine(routine)}
                  className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] sm:text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 shrink-0 touch-target press-scale"
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            {activeSession && (
              <button
                onClick={() => setConfirmAction({ type: "ghost" })}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] sm:text-[11px] font-bold border border-amber-500/30 transition-all touch-target press-scale"
              >
                Limpiar activa
              </button>
            )}
            {workoutHistory.length > 0 && (
              <button
                onClick={() => setConfirmAction({ type: "clearAll" })}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-[11px] sm:text-[11px] font-bold border border-red-500/30 transition-all touch-target press-scale"
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
            {workoutHistory.map((log) => {
              const undone = getUndoneExercisesFromSession(log);
              const hasPending = undone.length > 0;
              return (
              <div
                key={log.id}
                onClick={() => setSelectedSession(log)}
                className="p-3.5 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/30 hover:bg-neutral-800/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer press-scale"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    hasPending
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}>
                    <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-white truncate">{log.routineName}</h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-neutral-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {new Date(log.date).toLocaleDateString("es-ES", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {Math.floor(log.durationSeconds / 60)} min
                      </span>
                      <span className="text-cyan-400 font-bold">{log.totalSets} series</span>
                      <span className="text-purple-400 font-bold">
                        {log.totalVolumeKg.toLocaleString()} {weightUnit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-[52px] sm:pl-0">
                  {hasPending && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-xl text-amber-300 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {undone.reduce((acc, u) => acc + u.incompleteSets, 0)} sin completar
                    </div>
                  )}
                  {log.prCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl text-amber-300 text-[11px] font-bold">
                      <Trophy className="w-3.5 h-3.5" />
                      {log.prCount} PR
                    </div>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: "deleteOne", id: log.id, name: log.routineName })}
                    className="p-2.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/40 transition-all touch-target press-scale"
                    title="Eliminar sesión"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals for Quick Tools (carga diferida) */}
      <React.Suspense fallback={null}>
        {isPlateOpen && (
          <PlateCalculatorModal
            isOpen={isPlateOpen}
            onClose={() => setIsPlateOpen(false)}
            weightUnit={weightUnit}
          />
        )}
        {isWarmupOpen && (
          <WarmupGeneratorModal
            isOpen={isWarmupOpen}
            onClose={() => setIsWarmupOpen(false)}
            exerciseName="Press de Banca / Sentadilla"
            weightUnit={weightUnit}
          />
        )}
        {isTempoOpen && (
          <TempoMetronomeModal
            isOpen={isTempoOpen}
            onClose={() => setIsTempoOpen(false)}
          />
        )}
        {isImportOpen && (
          <SessionImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
        )}
      </React.Suspense>

      {/* Session Detail Modal */}
      {selectedSession && (
        <FocusTrap>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedSession(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Detalle de sesión: ${selectedSession.routineName}`} className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white break-words">{selectedSession.routineName}</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(selectedSession.date).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setSelectedSession(null)} aria-label="Cerrar detalle de sesión" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[11px] text-neutral-400 font-bold uppercase">Duración</span>
                  <p className="text-sm font-black text-cyan-400 mt-1">{Math.floor(selectedSession.durationSeconds / 60)} min</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[11px] text-neutral-400 font-bold uppercase">Volumen</span>
                  <p className="text-sm font-black text-purple-400 mt-1">{selectedSession.totalVolumeKg.toLocaleString()} {weightUnit}</p>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                  <span className="text-[11px] text-neutral-400 font-bold uppercase">Series</span>
                  <p className="text-sm font-black text-emerald-400 mt-1">{selectedSession.totalSets}</p>
                </div>
              </div>
              {/* P2: sRPE + carga interna si la sesión la registró */}
              {selectedSession.srpe != null && (
                <p className="text-[11px] text-neutral-400 mt-3">
                  sRPE <span className="text-purple-300 font-bold">{selectedSession.srpe}/10</span>
                  {" · "}Carga interna <span className="text-purple-300 font-bold">{selectedSession.sessionLoad ?? "—"} UA</span>
                </p>
              )}
            </div>

            {/* Exercises List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 overscroll-contain scrollbar-thin">
              {selectedSession.exercises?.map((wEx: WorkoutExercise, idx: number) => {
                const isTime = isTimeBased(wEx.exercise, wEx.targetReps);
                const incompleteSets = wEx.sets?.filter(
                  (s: WorkoutSet) => !s.completed && s.type !== "warmup" && s.type !== "cardio"
                ).length ?? 0;
                return (
                <div key={wEx.id || idx} className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                  <div className={`px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors ${
                    incompleteSets > 0
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-neutral-900/50 border-neutral-800"
                  }`} onClick={() => wEx.exerciseId && setSelectedExHistory({ id: wEx.exerciseId, name: wEx.exercise?.nameEs || wEx.exerciseId })}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border ${
                        incompleteSets > 0
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">{wEx.exercise?.nameEs || wEx.exerciseId} <span className="text-[11px] text-cyan-400 font-normal">ver historial →</span></h4>
                        <p className="text-[11px] text-neutral-400">{wEx.exercise?.equipment || ''} • {wEx.exercise?.category || ''}</p>
                      </div>
                    </div>
                    {incompleteSets > 0 && (
                      <span className="ml-3 px-2 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                        NO COMPLETO · {incompleteSets} serie{incompleteSets > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10 hidden sm:block" />
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full min-w-[360px] text-[13px]">
                        <thead>
                          <tr className="text-[11px] text-neutral-400 uppercase tracking-wider">
                            <th className="text-center py-2 w-10 shrink-0">#</th>
                            <th className="text-center py-2 shrink-0">Tipo</th>
                            {!isTime && <th className="text-center py-2 shrink-0">{weightUnit.toUpperCase()}</th>}
                            <th className="text-center py-2 shrink-0">{isTime ? "Duración" : "Reps"}</th>
                            <th className="text-center py-2 shrink-0">RIR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wEx.sets?.map((set: WorkoutSet) => (
                            <tr key={set.id} className="border-t border-neutral-800/50">
                              <td className="text-center py-2 text-neutral-400 font-mono tabular-nums">{set.setNumber}</td>
                              <td className="text-center py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold uppercase truncate inline-block max-w-[60px] ${
                                  set.type === 'dropset' ? 'bg-purple-500/20 text-purple-300' :
                                  set.type === 'myorep' ? 'bg-blue-500/20 text-blue-300' :
                                  set.type === 'warmup' ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-neutral-800 text-neutral-400'
                                }`}>{set.type === 'normal' ? 'W' : set.type.slice(0, 4)}</span>
                              </td>
                              {!isTime && <td className={`text-center py-2 font-bold tabular-nums truncate ${set.completed ? 'text-cyan-400' : 'text-neutral-400'}`}>{set.weight || 0}</td>}
                              <td className={`text-center py-2 font-bold tabular-nums truncate ${set.completed ? 'text-white' : 'text-neutral-400'}`}>
                                {isTime ? `${set.durationSeconds ?? set.reps}s` : set.reps}
                              </td>
                              <td className="text-center py-2 text-neutral-400 tabular-nums">{set.rir ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-center sm:hidden pt-1">
                      <span className="text-[11px] text-neutral-400">← desliza para ver más →</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
        </FocusTrap>
      )}

      {/* Exercise History Modal */}
      {selectedExHistory && (() => {
        const history = getExerciseHistory(selectedExHistory.id);
        return (
          <FocusTrap>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={() => setSelectedExHistory(null)}>
            <div role="dialog" aria-modal="true" aria-label={`Historial: ${selectedExHistory.name}`} className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedExHistory.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{history.length} sesiones registradas</p>
                  </div>
                  <button onClick={() => setSelectedExHistory(null)} aria-label="Cerrar historial del ejercicio" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 overscroll-contain scrollbar-thin">
                {history.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-8">Sin historial para este ejercicio</p>
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
                            {entry.rpe && <span className="text-neutral-400"> @{entry.rpe}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          </FocusTrap>
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
