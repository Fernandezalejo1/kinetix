import React from "react";
import { Plus, Minus, Zap } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";

const TARGETS = {
  sodium: { label: "Sodio", target: 4000, step: 500, unit: "mg" },
  potassium: { label: "Potasio", target: 3500, step: 500, unit: "mg" },
  magnesium: { label: "Magnesio", target: 400, step: 100, unit: "mg" },
} as const;

type Nutrient = keyof typeof TARGETS;

export const ElectrolytesTracker: React.FC = () => {
  const { nutritionLog, addElectrolyte, removeElectrolyte } = useWorkout();
  const { showToast } = useToast();

  const values: Record<Nutrient, number> = {
    sodium: nutritionLog.sodiumMg ?? 0,
    potassium: nutritionLog.potassiumMg ?? 0,
    magnesium: nutritionLog.magnesiumMg ?? 0,
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-950/40 via-neutral-900 to-neutral-950 border border-violet-500/25 shadow-2xl space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/25">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-white tracking-tight">Electrolitos (Keto)</h3>
          <p className="text-[11px] text-neutral-400">Clave en keto: sal, potasio y magnesio diarios</p>
        </div>
      </div>
      {(Object.keys(TARGETS) as Nutrient[]).map((key) => {
        const cfg = TARGETS[key];
        const val = values[key];
        const pct = Math.min(100, (val / cfg.target) * 100);
        const done = val >= cfg.target;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-end justify-between text-sm">
              <span className="text-white font-bold text-xs">{cfg.label}</span>
              <span className="font-mono text-xs text-neutral-300">
                {val.toLocaleString("es-AR")} <span className="text-neutral-500">/ {cfg.target.toLocaleString("es-AR")} {cfg.unit}</span>
              </span>
            </div>
            <div className="h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => removeElectrolyte(key, cfg.step)}
                className="flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold"
                aria-label={`Quitar ${cfg.step} ${cfg.unit} de ${cfg.label}`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  addElectrolyte(key, cfg.step);
                  showToast(`+${cfg.step} ${cfg.unit} de ${cfg.label}`, "success");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" /> +{cfg.step} {cfg.unit}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
