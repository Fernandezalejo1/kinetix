import React, { useState } from "react";
import {
  X,
  Video,
  Activity,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Sparkles,
  BarChart2,
  Box,
  Film,
  Zap,
  BookOpen,
  ArrowRight,
  Shield,
  Lightbulb
} from "lucide-react";
import { Exercise } from "../../types";
import { useWorkout } from "../../context/WorkoutContext";
import { getEnrichedExercise } from "../../utils/exerciseEnhancer";
import { ExerciseMediaVisualizer } from "./ExerciseMediaVisualizer";
import { ExerciseAnatomySection } from "./ExerciseAnatomySection";
import { ExerciseTechniqueSection } from "./ExerciseTechniqueSection";
import { ExerciseMistakesAndTipsSection } from "./ExerciseMistakesAndTipsSection";
import { ExerciseVariationsTreeSection } from "./ExerciseVariationsTreeSection";
import { ExerciseMobilitySection } from "./ExerciseMobilitySection";
import { ExerciseAnalyticsSection } from "./ExerciseAnalyticsSection";

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

export type ModalTab =
  | "media"
  | "anatomy"
  | "technique"
  | "mistakes"
  | "variations"
  | "mobility"
  | "analytics";

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise: rawExercise,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>("media");
  const { weightUnit } = useWorkout();

  if (!rawExercise) return null;

  // Enrich exercise with 100% complete data for all biomechanical components
  const exercise = getEnrichedExercise(rawExercise);

  const TABS: { id: ModalTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "media", label: "Video HD & Biomecánica", icon: Video, badge: "Animación & Función" },
    { id: "anatomy", label: "Anatomía & Músculos", icon: Activity, badge: "Agonistas & Sinergistas" },
    { id: "technique", label: "Técnica", icon: CheckCircle2, badge: "Fases & Cues" },
    { id: "mistakes", label: "Errores & Consejos", icon: AlertTriangle, badge: "Biomecánica" },
    { id: "variations", label: "Variantes & Árbol", icon: GitBranch, badge: "Progresiones" },
    { id: "mobility", label: "Movilidad & Estiramientos", icon: Sparkles, badge: "Pre / Post" },
    { id: "analytics", label: "Historial & Analytics", icon: BarChart2, badge: "Fuerza, PRs & Volumen" },
  ];

  return (
    <div
      id="exercise-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle: ${exercise.name}`}
        className="bg-neutral-900 border-neutral-800 sm:border rounded-none sm:rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl my-auto text-left flex flex-col max-h-[100dvh] sm:max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-6 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {exercise.category.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 capitalize">
                  {exercise.equipment}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {exercise.resistanceProfile === "lengthened"
                    ? "Sobrecarga en Estiramiento"
                    : exercise.resistanceProfile === "shortened"
                    ? "Sobrecarga en Acortamiento"
                    : "Curva Media Balanceada"}
                </span>
                {!exercise.analytics?.isEditorialEstimate && exercise.analytics?.hypertrophyTier && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {exercise.analytics.hypertrophyTier}
                </span>
              )}
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">{exercise.nameEs}</h2>
              <p className="text-xs text-neutral-400 font-medium">{exercise.name}</p>
            </div>

            <button
              onClick={onClose}
              aria-label="Cerrar ficha del ejercicio"
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-2xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
              title="Cerrar Ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10" />
          <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 sm:px-6 gap-1 overflow-x-auto text-xs font-semibold scrollbar-thin snap-x snap-mandatory">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all snap-start ${
                    isActive
                      ? "border-cyan-400 text-cyan-400 font-bold bg-neutral-900/40"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin flex-1 min-h-0 overscroll-contain space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] snap-y snap-mandatory">
          {/* TAB: MEDIA & VIDEOS */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <ExerciseMediaVisualizer exercise={exercise} />
            </div>
          )}

          {/* TAB 2: ANATOMY & MUSCLES (Músculos principales, Secundarios, Anatomía) */}
          {activeTab === "anatomy" && (
            <ExerciseAnatomySection exercise={exercise} />
          )}

          {/* TAB 3: TECHNIQUE (Técnica desglosada, Setup, Fases, Tempo, Respiración) */}
          {activeTab === "technique" && (
            <ExerciseTechniqueSection exercise={exercise} />
          )}

          {/* TAB 4: MISTAKES & TIPS (Errores frecuentes, Corrección, Consejos pro) */}
          {activeTab === "mistakes" && (
            <ExerciseMistakesAndTipsSection exercise={exercise} />
          )}

          {/* TAB 5: VARIATIONS & TREE (Variantes, Regresiones, Progresiones) */}
          {activeTab === "variations" && (
            <ExerciseVariationsTreeSection exercise={exercise} />
          )}

          {/* TAB 6: MOBILITY & STRETCHING (Movilidad previa, Estiramientos posteriores) */}
          {activeTab === "mobility" && (
            <ExerciseMobilitySection exercise={exercise} />
          )}

          {/* TAB 7: ANALYTICS (Curva 1RM, SFR, Fatiga axial, Estrés articular, Volumen) */}
          {activeTab === "analytics" && (
            <ExerciseAnalyticsSection exercise={exercise} weightUnit={weightUnit} />
          )}
        </div>

        {/* Modal Footer — safe-area, no fixed covering button */}
        <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-neutral-950 border-t border-neutral-800 flex items-center justify-center gap-2 shrink-0">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-neutral-500">Ficha Biomecánica KINETIX · usa la X arriba para cerrar</span>
        </div>
      </div>
    </div>
  );
};
