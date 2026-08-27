import React from "react";
import { GitBranch, ArrowDownRight, ArrowUpRight, Layers } from "lucide-react";
import { Exercise } from "../../types";

interface ExerciseVariationsTreeSectionProps {
  exercise: Exercise;
}

export const ExerciseVariationsTreeSection: React.FC<ExerciseVariationsTreeSectionProps> = ({
  exercise,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Variations (Variantes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Variantes Biomecánicas & Alternativas
          </h3>
          <span className="text-[11px] text-neutral-400">Mismo patrón motor</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {exercise.variationsDetail?.map((v, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors space-y-2 text-xs"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-white text-sm">{v.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 text-[10px] border border-neutral-800">
                  {v.equipment}
                </span>
              </div>
              <div className="text-[11px] text-neutral-300">
                <strong className="text-cyan-400">Diferencia:</strong> {v.difference}
              </div>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                <strong className="text-neutral-300">Ideal para:</strong> {v.bestFor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Regressions (Regresiones) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4" />
            Regresiones (Menor Complejidad o Molestias Articulares)
          </h3>
          <span className="text-[11px] text-neutral-400">Punto de partida o descarga</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exercise.regressionsDetail?.map((r, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/20 hover:border-amber-500/40 transition-colors space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-300">{r.name}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                  {r.targetLoadReduction}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">{r.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Progressions (Progresiones) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Progresiones Avanzadas (Sobrecarga de Estímulo)
          </h3>
          <span className="text-[11px] text-neutral-400">Nivel intermedio / avanzado</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exercise.progressionsDetail?.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-300">{p.name}</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                <strong className="text-emerald-400">Mecanismo:</strong> {p.mechanism}
              </p>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                <strong className="text-neutral-300">Cuándo aplicar:</strong> {p.recommendedWhen}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
