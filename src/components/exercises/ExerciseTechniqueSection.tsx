import React from "react";
import { CheckCircle2, Clock, Wind, Target } from "lucide-react";
import { Exercise } from "../../types";

interface ExerciseTechniqueSectionProps {
  exercise: Exercise;
}

export const ExerciseTechniqueSection: React.FC<ExerciseTechniqueSectionProps> = ({
  exercise,
}) => {
  return (
    <div className="space-y-6">
      {/* Tempo and Breathing Highlight Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Tempo Óptimo
          </div>
          <div className="text-xl font-black font-mono text-white">{exercise.defaultTempo}</div>
          <p className="text-[11px] text-neutral-400">Excéntrica - Pausa Estiramiento - Concéntrica - Pausa Acortamiento</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
            <Target className="w-4 h-4" />
            RIR Recomendado
          </div>
          <div className="text-xl font-black text-white">{exercise.defaultRir} RIR</div>
          <p className="text-[11px] text-neutral-400">Entre 0 y 2 repeticiones en reserva para hipertrofia máxima</p>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Wind className="w-4 h-4" />
            Respiración & Bracing
          </div>
          <div className="text-sm font-bold text-white">Maniobra de Valsalva</div>
          <p className="text-[11px] text-neutral-400">Inhala y fija el core antes de bajar; exhala al pasar el punto crítico</p>
        </div>
      </div>

      {/* Phase by Phase Step-by-Step Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
          Guía Técnica Paso a Paso (Biomecánica de Alta Precisión)
        </h3>

        <div className="space-y-3">
          {exercise.techniquePhases?.map((phase, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 hover:border-neutral-700 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-xs flex items-center justify-center border border-cyan-500/30">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-white">{phase.phase}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-cyan-400">
                    Tempo: {phase.tempoCode}
                  </span>
                </div>
              </div>

              {/* Cues List */}
              <div className="space-y-2">
                {phase.cues.map((cue, cIdx) => (
                  <div key={cIdx} className="flex items-start gap-2.5 text-xs text-neutral-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{cue}</span>
                  </div>
                ))}
              </div>

              {/* Breathing for this phase */}
              <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-400 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60">
                <Wind className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span><strong className="text-purple-300">Respiración:</strong> {phase.breathing}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
