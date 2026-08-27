import React, { useState } from "react";
import { Activity, Zap, Compass, Sparkles } from "lucide-react";
import { Exercise } from "../../types";
import { AnatomyVisualizer } from "./AnatomyVisualizer";
import { MUSCLE_LANDMARKS_CONFIG } from "../../utils/scienceCalculators";

interface ExerciseAnatomySectionProps {
  exercise: Exercise;
}

export const ExerciseAnatomySection: React.FC<ExerciseAnatomySectionProps> = ({
  exercise,
}) => {
  const [anatomyView, setAnatomyView] = useState<"front" | "back">("front");

  return (
    <div className="space-y-6">
      {/* 2-Column Layout: Visual Anatomical Mannequin + Primary/Secondary Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-xl">
        {/* SVG Anatomy Visualizer */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800/80 pb-6 md:pb-0 md:pr-6">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setAnatomyView("front")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                anatomyView === "front"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Vista Frontal
            </button>
            <button
              onClick={() => setAnatomyView("back")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                anatomyView === "back"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Vista Posterior
            </button>
          </div>

          <AnatomyVisualizer
            primaryMuscles={exercise.primaryMuscles}
            secondaryMuscles={exercise.secondaryMuscles}
            viewMode={anatomyView}
            className="w-48 h-64"
          />

          <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              Músculo Principal
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
              Sinergista / Secundario
            </div>
          </div>
        </div>

        {/* Primary & Secondary Breakdown Details */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Músculos Principales (Agonistas)
              </span>
              <span className="text-[11px] font-bold text-cyan-400">
                {exercise.primaryMuscles.length} grupos
              </span>
            </div>

            <div className="space-y-2.5">
              {exercise.primaryMusclesDetail?.map((pm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-neutral-900 border border-cyan-500/20 space-y-1.5 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white text-sm">{pm.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-500/20">
                      Contribución: {pm.contributionPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-neutral-300 pt-1 border-t border-neutral-800">
                    <div>
                      <span className="text-neutral-500 font-medium">Origen:</span> {pm.origin}
                    </div>
                    <div>
                      <span className="text-neutral-500 font-medium">Inserción:</span> {pm.insertion}
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    <span className="text-neutral-500 font-medium">Acción biomecánica:</span> {pm.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Muscles */}
          {exercise.secondaryMusclesDetail && exercise.secondaryMusclesDetail.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5" />
                Músculos Secundarios & Sinergistas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {exercise.secondaryMusclesDetail.map((sm, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-900 border border-purple-500/20 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-200">{sm.name}</span>
                      <span className="text-[10px] text-purple-400 capitalize">{sm.role.replace("_", " ")}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Estabilización dinámica y co-activación
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deep Anatomical & Biomechanical Principles */}
      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          Anatomía Funcional, Momentos Articulares & Tensión Mecánica
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Momentos Articulares
            </span>
            <p className="text-neutral-300 text-xs leading-relaxed">
              {exercise.anatomyDetails?.jointMoments || exercise.lengthTensionDescription}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Pico de Brazo de Momento
            </span>
            <p className="text-neutral-300 text-xs leading-relaxed">
              {exercise.anatomyDetails?.momentArmPeak || "Tensión máxima en la posición de estiramiento sarcomérico."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Insuficiencia Activa
            </span>
            <p className="text-neutral-300 text-xs leading-relaxed">
              {exercise.anatomyDetails?.activeInsufficiency || "Alineación óptima libre de desventaja mecánica activa."}
            </p>
          </div>
        </div>

        {/* Stretch-Mediated Hypertrophy Score Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-neutral-900 to-purple-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Índice de Hipertrofia Mediada por Estiramiento: {exercise.anatomyDetails?.stretchMediatedHypertrophyScore || 9.4} / 10
              </div>
              <div className="text-[11px] text-neutral-400">
                {exercise.anatomyDetails?.lengthTensionPhase || "Sobrecarga específica en posición de sarcómeros elongados."}
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
            {exercise.resistanceProfile.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};
