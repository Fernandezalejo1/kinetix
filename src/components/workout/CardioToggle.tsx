import React from "react";
import { Activity } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";

/** Toggle global de cardio: visible en cada punto de entrada de una sesión
 *  para que "lo que ves antes de iniciar" coincida con la sesión real. */
export const CardioToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { includeCardio, setIncludeCardio } = useWorkout();
  return (
    <label
      className={`flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer select-none press-scale ${className ?? ""}`}
      title="Agrega 20 min de elíptica al final de la sesión"
    >
      <span className="flex items-center gap-2 text-[11px] font-bold text-neutral-300">
        <Activity className="w-3.5 h-3.5 text-cyan-400" />
        Cardio al final (20 min de elíptica)
      </span>
      <input
        type="checkbox"
        checked={includeCardio}
        onChange={(e) => setIncludeCardio(e.target.checked)}
        className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
      />
    </label>
  );
};