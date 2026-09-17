import React, { useMemo, useState } from "react";
import {
  Play,
  Clock,
  Layers,
  Activity,
  Utensils,
  ArrowRight,
  CalendarCheck,
  Zap,
  RefreshCcw,
  Dumbbell,
  ChevronDown,
  AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import { useGoal } from "../context/GoalContext";
import { Routine } from "../types";
import {
  loadUserProfile,
  resolveAdaptedRoutineForEquipment,
  shortenRoutine,
  daysSinceCompletion,
  loadTodayEquipment,
  setTodayEquipment,
} from "../utils/userProfile";
import { EquipmentAccess } from "../types";
import { localDateKey } from "../utils/dateUtils";
import { previewExerciseCount } from "../utils/sessionPreview";
import { WeeklyReviewModal } from "./analytics/WeeklyReviewModal";

interface TodayHubProps {
  onGoToWorkout: () => void;
  onGoToPrograms: () => void;
  onGoToBiomechanics: () => void;
  onGoToNutrition: () => void;
}

const PHASE_LABEL: Record<string, { label: string; emoji?: string }> = {
  cut: { label: "Definición", emoji: "🔥" },
  maintenance: { label: "Mantenimiento" },
  lean_bulk: { label: "Volumen limpio" },
};

const EQUIPMENT_OPTIONS: { value: EquipmentAccess; label: string }[] = [
  { value: "home", label: "Casa" },
  { value: "basic", label: "Básico" },
  { value: "gym", label: "Gimnasio" },
];

export const TodayHub: React.FC<TodayHubProps> = ({
  onGoToWorkout,
  onGoToPrograms,
  onGoToBiomechanics,
  onGoToNutrition,
}) => {
  const {
    activeSession,
    setIsWorkoutModalOpen,
    startWorkoutFromRoutine,
    startEmptyWorkout,
    workoutHistory,
    nutritionLog,
    includeCardio,
  } = useWorkout();
  const { phase } = useGoal();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  // Explicaciones largas (programación, progresión, justificación) plegadas:
  // la primera vista responde qué toca, cuánto dura y qué hacer.
  const [showDetails, setShowDetails] = useState(false);
  // P3: dónde se entrena HOY (override diario del equipamiento del perfil).
  const [todayEquipment, setTodayEquipmentState] = useState<EquipmentAccess | null>(() => loadTodayEquipment());

  const userProfile = loadUserProfile();
  // "Hoy te toca" y su versión corta nunca sugieren ejercicios imposibles:
  // se adaptan al equipamiento real de HOY (override → perfil → gimnasio).
  const nextRoutine: Routine = resolveAdaptedRoutineForEquipment(userProfile, workoutHistory, todayEquipment);
  const nextLastDays: number | null = daysSinceCompletion(nextRoutine, workoutHistory);

  const changeTodayEquipment = (e: EquipmentAccess) => {
    setTodayEquipmentState(e);
    setTodayEquipment(e);
  };
  const currentEquipment = todayEquipment ?? userProfile?.equipment ?? "gym";

  // Cardio inyectado al final de la sesión: el conteo de "Hoy" debe coincidir
  // con lo que realmente se inicia (toggle global + rutinas que ya prescriben cardio).
  const nextExerciseCount = previewExerciseCount(nextRoutine, includeCardio);

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
          <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-cyan-400" /> HOY
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight capitalize mt-1">
            {greeting} 👋
          </h1>
          <p className="text-xs text-neutral-400 mt-1 capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-300">
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
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Sesión activa</p>
              <p className="text-sm font-black text-white truncate mt-0.5">{activeSession.routineName}</p>
              <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                Continuar entrenamiento · {activeSession.exercises.length} ejercicios
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
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Hoy te toca
              </span>
              <span className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold">
                <Clock className="w-3.5 h-3.5 text-neutral-400" /> ~{nextRoutine.estimatedDurationMin} min
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-300 font-bold tabular-nums">{nextExerciseCount} ejercicios</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-3">
              {nextRoutine.targetSplit}
            </h2>
            <p className="text-sm text-neutral-300 mt-1 max-w-xl leading-relaxed">
              {nextRoutine.name}
              <span className="text-neutral-400">
                {nextLastDays === null
                  ? " · primera vez con esta rutina"
                  : nextLastDays === 0
                    ? " · entrenada hoy"
                    : ` · última vez hace ${nextLastDays} ${nextLastDays === 1 ? "día" : "días"}`}
              </span>
            </p>
            {/* Advertencia que cambia la decisión (no se pliega en "Ver detalles") */}
            {shortFit && (
              <p className="mt-2 flex items-start gap-2 text-xs font-bold text-amber-300 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Esta sesión dura ~{nextRoutine.estimatedDurationMin} min y tus preferencias marcan {userMinutes} min.
                  Hay una versión corta de ~{shortFit.estimatedDurationMin} min disponible en Ajustar entrenamiento.
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {/* Un único botón principal: iniciar o continuar según corresponda. */}
            {activeSession ? (
              <p className="text-xs text-neutral-300 leading-relaxed">
                Tenés una sesión activa: continuála desde la tarjeta de arriba. Al terminar, esta sesión
                programada queda disponible.
              </p>
            ) : (
              <button
                onClick={() => startWorkoutFromRoutine(nextRoutine)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black shadow-xl shadow-cyan-600/25 transition-all press-scale"
              >
                <Play className="w-4 h-4 fill-white shrink-0" />
                <span className="truncate">
                  Iniciar entrenamiento
                  <span className="block text-[11px] font-bold text-cyan-100/90 normal-case">
                    {nextExerciseCount} ejercicios · ~{nextRoutine.estimatedDurationMin} min
                  </span>
                </span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-x-4">
              <button
                onClick={onGoToWorkout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors min-h-[44px]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Ajustar entrenamiento
              </button>
              {!activeSession && (
                <button
                  onClick={() => startEmptyWorkout("Entrenamiento Libre")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white transition-colors min-h-[44px]"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-neutral-400" />
                  Entrenamiento libre
                </button>
              )}
              <button
                onClick={() => setShowDetails((v) => !v)}
                aria-expanded={showDetails}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white transition-colors min-h-[44px]"
              >
                Ver detalles
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Explicaciones largas (programación, progresión, duración) + lugar
                de entrenamiento: mismo dato único que usa Entrenar. */}
            {showDetails && (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 animate-fadeIn">
                {nextRoutine.description && (
                  <p className="text-xs text-neutral-300 leading-relaxed">{nextRoutine.description}</p>
                )}
                <p className="text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-white">Progresión:</strong> subís peso solo cuando cumplís el objetivo de
                  repeticiones con el RIR planificado. El peso inicial sale de tu historial y de la dificultad percibida.
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-white">Duración:</strong> ~{nextRoutine.estimatedDurationMin} min para{" "}
                  {nextExerciseCount} ejercicios
                  {shortFit ? ` · hay una versión corta de ~${shortFit.estimatedDurationMin} min` : ""}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsReviewOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-colors min-h-[44px]"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Revisión semanal
                  </button>
                  <button
                    onClick={onGoToWorkout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-colors min-h-[44px]"
                  >
                    Cambiar de sesión
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-neutral-900 border border-neutral-800">
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
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del día — cada tarjeta navega a su sección */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={onGoToWorkout}
          className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 text-center min-w-0 transition-all press-scale"
          title="Ver sesiones de hoy"
        >
          <CalendarCheck className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
          <div className="text-xl font-black text-white tabular-nums">{todayStats.workouts}</div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Sesiones hoy</span>
        </button>
        <button
          onClick={onGoToWorkout}
          className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 text-center min-w-0 transition-all press-scale"
          title="Ver series de hoy"
        >
          <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-xl font-black text-emerald-400 tabular-nums">{todayStats.sets}</div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Series hoy</span>
        </button>
        <button
          onClick={onGoToNutrition}
          className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 text-center min-w-0 transition-all press-scale"
          title="Registrar comidas de hoy"
        >
          <Utensils className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-black text-amber-400 tabular-nums">{todayStats.meals}</div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Comidas</span>
        </button>
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
            <p className="text-[11px] text-neutral-400 line-clamp-1">Cambiar rutinas y splits</p>
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
            <p className="text-[11px] text-neutral-400 line-clamp-1">Biblioteca y biomecánica</p>
          </div>
        </button>
      </div>

      <WeeklyReviewModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} />
    </div>
  );
};