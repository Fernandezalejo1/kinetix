import React, { useState } from "react";
import { X, Disc } from "lucide-react";
import { calculatePlates } from "../../utils/scienceCalculators";

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
  weightUnit: "kg" | "lbs";
}

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialWeight = 100,
  weightUnit,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight);
  const [barWeight, setBarWeight] = useState<number>(20);

  if (!isOpen) return null;

  const result = calculatePlates(targetWeight, barWeight);

  return (
    <div
      id="plate-calculator-modal"
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
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Disc className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Calculadora de Discos</h3>
              <p className="text-xs text-neutral-400 truncate">Distribución exacta por lado en barra olímpica</p>
            </div>
          </div>
          <button
            id="close-plate-calc-btn"
            onClick={onClose}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1 min-h-0 overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Target Weight Slider & Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                Peso Objetivo Total
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="2.5"
                  min={barWeight}
                  max="400"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Math.max(barWeight, parseFloat(e.target.value) || barWeight))}
                  className="w-24 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-right font-bold text-white text-lg focus:outline-none focus:border-blue-500"
                />
                <span className="text-sm font-semibold text-neutral-300">{weightUnit}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[60, 80, 100, 120, 140, 160].map((w) => (
                <button
                  key={w}
                  onClick={() => setTargetWeight(w)}
                  className={`py-2.5 text-xs font-semibold rounded-lg border transition-all ${
                    targetWeight === w
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  {w}k
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400 pt-2 border-t border-neutral-800">
              <span>Tipo de Barra:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Olímpica 20kg", val: 20 },
                  { label: "Técnica 15kg", val: 15 },
                  { label: "Mancuerna 5kg", val: 5 },
                ].map((b) => (
                  <button
                    key={b.val}
                    onClick={() => setBarWeight(b.val)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${
                      barWeight === b.val
                        ? "bg-neutral-700 text-white border border-neutral-600"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Barbell Representation */}
          <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 flex flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <span className="text-xs text-neutral-400 font-medium">Carga por cada lado:</span>
              <div className="text-3xl font-extrabold text-blue-400 tracking-tight">
                {result.perSideKg} <span className="text-base font-normal text-neutral-400">{weightUnit}</span>
              </div>
            </div>

            {/* Graphical Plates Stack */}
            <div className="flex items-center justify-center h-28 w-full max-w-sm overflow-x-auto py-2">
              {/* Left Bar Sleeve */}
              <div className="h-4 w-12 bg-neutral-600 rounded-l-sm" />
              <div className="h-10 w-3 bg-neutral-500" />

              {/* Plates on bar sleeve */}
              {result.plates.length === 0 ? (
                <span className="text-xs text-neutral-500 italic px-4">Barra vacía</span>
              ) : (
                <div className="flex items-center gap-1 px-2">
                  {result.plates.flatMap((p) =>
                    Array.from({ length: p.count }).map((_, idx) => {
                      const heightClass =
                        p.weight >= 25
                          ? "h-24 w-5"
                          : p.weight >= 20
                          ? "h-22 w-4.5"
                          : p.weight >= 15
                          ? "h-20 w-4"
                          : p.weight >= 10
                          ? "h-16 w-3.5"
                          : p.weight >= 5
                          ? "h-13 w-3"
                          : "h-10 w-2.5";
                      return (
                        <div
                          key={`${p.weight}-${idx}`}
                          style={{ backgroundColor: p.colorHex }}
                          className={`${heightClass} rounded-sm shadow-md flex items-center justify-center relative group border border-black/30`}
                          title={`${p.weight} kg`}
                        >
                          <span className="text-[9px] font-black text-black rotate-90 select-none">
                            {p.weight}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Center Bar Handle */}
              <div className="h-4 w-16 bg-neutral-700" />
            </div>

            {/* Plate Breakdown List */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-800">
              {result.plates.map((p) => (
                <div
                  key={p.weight}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40 inline-block shadow-sm"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <span className="font-semibold text-neutral-200">{p.weight} {weightUnit}</span>
                  </div>
                  <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    × {p.count * 2} <span className="text-[10px] text-neutral-400">({p.count}/lado)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-neutral-900/80 border-t border-neutral-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
