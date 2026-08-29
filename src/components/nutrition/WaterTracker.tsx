import React from "react";
import { Droplets, Minus, Plus, CheckCircle2 } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { computeWaterTarget } from "../../data/nutritionData";

export const WaterTracker: React.FC = () => {
  const { nutritionLog, bodyMetrics, addWater, removeWater } = useWorkout();
  const { showToast } = useToast();

  const lastWeight = bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? null;
  const goal = computeWaterTarget(lastWeight);
  const consumed = nutritionLog.waterMl;
  const remaining = Math.max(0, goal - consumed);
  const pct = Math.min(100, (consumed / goal) * 100);
  const isDone = consumed >= goal;

  const step = 250;
  const handleAdd = () => {
    addWater(step);
    showToast(`+${step} ml de agua registrados`, "success");
  };
  const handleRemove = () => {
    removeWater(step);
    showToast(`−${step} ml de agua quitados`, "info");
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-neutral-900 to-neutral-950 border border-cyan-500/25 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Hidratación</h3>
            <p className="text-[11px] text-neutral-400">
              35 ml/kg de peso corporal (mín. 2.5 L) · {Math.round(goal / 1000 * 10) / 10} L objetivo diario
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isDone
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
          }`}
        >
          {isDone ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Meta cumplida
            </span>
          ) : (
            `Faltan ${Math.max(0, Math.round(remaining / 1000 * 10) / 10)} L`
          )}
        </span>
      </div>

      <div>
        <div className="flex items-end justify-between font-mono text-sm mb-1.5">
          <span className="text-white font-black">
            {consumed.toLocaleString("es-ES")} <span className="text-neutral-400 text-xs font-normal">ml</span>
          </span>
          <span className="text-neutral-500 text-xs">/ {goal.toLocaleString("es-ES")} ml</span>
        </div>
        <div className="h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDone ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 to-cyan-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-neutral-500 font-mono">
          <span>0</span>
          <span className={consumed >= goal / 2 ? "text-cyan-400 font-bold" : ""}>50%</span>
          <span className={isDone ? "text-emerald-400 font-bold" : ""}>100%</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRemove}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors text-xs font-bold touch-target"
          aria-label="Quitar 250 ml"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-colors touch-target min-w-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="truncate">Vaso 250 ml</span>
        </button>
        <button
          onClick={() => {
            addWater(500);
            showToast("+500 ml de agua registrados", "success");
          }}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold transition-colors touch-target"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Botella</span>
        </button>
      </div>
    </div>
  );
};