import React from "react";
import { Sparkles, Play, ShieldCheck, HeartPulse } from "lucide-react";
import { Exercise } from "../../types";

interface ExerciseMobilitySectionProps {
  exercise: Exercise;
}

export const ExerciseMobilitySection: React.FC<ExerciseMobilitySectionProps> = ({
  exercise,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Pre-Workout Specific Mobility Drills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
            Movilidad Previa & Calentamiento Específico
          </h3>
          <span className="text-[11px] text-neutral-400">Antes de las series de aproximación</span>
        </div>

        <div className="space-y-3">
          {exercise.preMobilityDetail?.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/30">
                    {idx + 1}
                  </span>
                  {item.drill}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-amber-300 font-mono text-[10px] border border-neutral-800">
                  {item.setsReps}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-300 pt-1 border-t border-neutral-900">
                <div>
                  <span className="text-neutral-500 font-medium">Articulación Diana:</span> {item.targetJoint}
                </div>
                <div>
                  <span className="text-neutral-500 font-medium">Objetivo Biomecánico:</span> {item.objective}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Post-Workout Stretching */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Estiramientos Posteriores & Descompresión
          </h3>
          <span className="text-[11px] text-neutral-400">Al finalizar la sesión o en reposo</span>
        </div>

        <div className="space-y-3">
          {exercise.postStretchingDetail?.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold flex items-center justify-center text-[10px] border border-cyan-500/30">
                    {idx + 1}
                  </span>
                  {item.stretch}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/20">
                  {item.duration}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-300 pt-1 border-t border-neutral-900">
                <span>
                  <strong className="text-neutral-400">Grupo muscular:</strong> {item.targetMuscle}
                </span>
                <span className="text-purple-400 font-medium">
                  Tipo: {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
