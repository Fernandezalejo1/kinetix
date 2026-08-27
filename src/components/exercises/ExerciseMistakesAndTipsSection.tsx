import React from "react";
import { AlertTriangle, Lightbulb, CheckCircle2, ShieldAlert } from "lucide-react";
import { Exercise } from "../../types";

interface ExerciseMistakesAndTipsSectionProps {
  exercise: Exercise;
}

export const ExerciseMistakesAndTipsSection: React.FC<ExerciseMistakesAndTipsSectionProps> = ({
  exercise,
}) => {
  return (
    <div className="space-y-6">
      {/* Common Mistakes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Errores Frecuentes & Correcciones Biomecánicas
          </h3>
          <span className="text-[11px] text-neutral-400">
            {exercise.commonMistakesDetail?.length || exercise.commonMistakes.length} fallos identificados
          </span>
        </div>

        <div className="space-y-3">
          {exercise.commonMistakesDetail?.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-neutral-950 border border-red-500/20 hover:border-red-500/40 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Error #{idx + 1}: {item.mistake}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    item.riskLevel === "Alto"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  Riesgo {item.riskLevel}
                </span>
              </div>

              <div className="text-xs text-neutral-400 bg-red-950/20 p-2.5 rounded-xl border border-red-500/10">
                <strong className="text-red-300">Consecuencia:</strong> {item.consequence}
              </div>

              <div className="flex items-start gap-2 text-xs text-neutral-200 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-400">Corrección Científica:</strong> {item.correction}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips / Consejos Section */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Consejos Pro & Perlas de Biomecánica
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exercise.proTips?.map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex items-start gap-3 text-xs"
            >
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/20 text-[10px]">
                {idx + 1}
              </span>
              <p className="text-neutral-200 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
