import React, { useState } from "react";
import { X, Flame, ShieldAlert, CheckCircle } from "lucide-react";
import { generateWarmupPyramid } from "../../utils/scienceCalculators";

interface WarmupGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  initialWorkingWeight?: number;
  weightUnit: "kg" | "lbs";
}

export const WarmupGeneratorModal: React.FC<WarmupGeneratorModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  initialWorkingWeight = 100,
  weightUnit,
}) => {
  const [workingWeight, setWorkingWeight] = useState<number>(initialWorkingWeight);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  if (!isOpen) return null;

  const steps = generateWarmupPyramid(workingWeight);

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div
      id="warmup-generator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Pirámide de Calentamiento</h3>
              <p className="text-xs text-neutral-400 truncate">{exerciseName}</p>
            </div>
          </div>
          <button
            id="close-warmup-btn"
            onClick={onClose}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1 min-h-0 overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Target Working Weight */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">Peso de la 1ª Serie Efectiva</label>
              <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Calcula la potenciación post-activación (PAP)</div>
            </div>
            <div className="flex items-center gap-1.5 ml-auto w-full sm:w-auto justify-end">
              <button
                type="button"
                aria-label="Disminuir peso"
                onClick={() => setWorkingWeight((w) => Math.max(20, Number((w - 2.5).toFixed(1))))}
                className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xl font-bold hover:bg-neutral-800 active:bg-neutral-700 transition-colors shrink-0"
              >
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                step="2.5"
                min="20"
                max="400"
                value={workingWeight}
                onChange={(e) => setWorkingWeight(Math.max(20, parseFloat(e.target.value) || 20))}
                className="w-28 min-h-[48px] px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-center font-bold text-white text-[16px] leading-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                aria-label="Aumentar peso"
                onClick={() => setWorkingWeight((w) => Math.min(400, Number((w + 2.5).toFixed(1))))}
                className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xl font-bold hover:bg-neutral-800 active:bg-neutral-700 transition-colors shrink-0"
              >
                +
              </button>
              <span className="text-sm font-semibold text-neutral-300 min-w-[32px] text-center">{weightUnit}</span>
            </div>
          </div>

          {/* Scientific Note */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs leading-relaxed text-blue-200">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-blue-300" />
            <span>
              <strong className="text-blue-100">Principio de Eric Helms & Dr. Israetel:</strong> Calienta para potenciar el sistema nervioso central (SNC) y lubricar articulaciones, reduciendo las repeticiones a medida que sube la carga para acumular <strong className="text-blue-100">cero fatiga metabólica</strong> antes de las series efectivas.
            </span>
          </div>

          {/* Pyramid Steps List */}
          <div className="space-y-2.5">
            {steps.map((step, idx) => {
              const isDone = completedSteps.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-2 ${
                    isDone
                      ? "bg-emerald-950/30 border-emerald-500/40 text-neutral-300"
                      : "bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
                        isDone
                          ? "bg-emerald-500 text-black font-bold"
                          : "border border-neutral-700 bg-neutral-900 hover:border-neutral-500"
                      }`}
                    >
                      {isDone && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{step.stepName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {step.percentage}% de carga
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">{step.purpose}</p>
                    </div>
                  </div>

                  <div className="text-right ml-auto shrink-0">
                    <span className="text-base font-extrabold text-cyan-400">
                      {step.weight} {weightUnit}
                    </span>
                    <div className="text-xs font-semibold text-neutral-400">
                      × {step.reps} {step.reps === 1 ? "rep" : "reps"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-neutral-900/80 border-t border-neutral-800 flex justify-end shrink-0 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black text-[15px] font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
          >
            Entendido, ¡A Entrenar!
          </button>
        </div>
      </div>
    </div>
  );
};
