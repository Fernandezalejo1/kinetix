import React, { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { calculate1RM } from "../../utils/scienceCalculators";
import { localDateKey } from "../../utils/dateUtils";

/** Carga manual de un 1RM: medido en sesión o estimado (peso × reps).
 *  Nunca se inventa nada: el valor sale de lo que el usuario declara. */
export const ManualPrForm: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const { personalRecords, weightUnit, addPersonalRecord } = useWorkout();
  const { showToast } = useToast();

  const [exerciseId, setExerciseId] = useState(EXERCISES_DATABASE[0]?.id ?? "");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");

  const exercise = useMemo(
    () => EXERCISES_DATABASE.find((e) => e.id === exerciseId) ?? EXERCISES_DATABASE[0],
    [exerciseId]
  );

  const estimated = useMemo(() => {
    const w = parseFloat(weight);
    const r = Math.max(1, Math.min(36, parseInt(reps, 10) || 1));
    if (!(w > 0) || !exercise) return null;
    return r === 1 ? w : calculate1RM(w, r).average;
  }, [weight, reps, exercise]);

  const handleSave = () => {
    const w = parseFloat(weight);
    const r = Math.max(1, Math.min(36, parseInt(reps, 10) || 1));
    if (!(w > 0) || !exercise || estimated === null) {
      showToast("Ingresá un peso válido mayor a 0.", "error");
      return;
    }
    const prev = personalRecords.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
    addPersonalRecord({
      exerciseId: exercise.id,
      exerciseName: exercise.nameEs || exercise.name,
      type: "1RM",
      value: Math.round(estimated * 10) / 10,
      reps: r,
      date: localDateKey(),
      previousValue: prev?.value,
    });
    showToast(`1RM de ${exercise.nameEs || exercise.name} guardado: ${Math.round(estimated * 10) / 10} ${weightUnit}.`, "success");
    setWeight("");
    setReps("1");
    onDone?.();
  };

  return (
    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
      <p className="text-[11px] font-black text-white uppercase tracking-wider">Cargar 1RM manual</p>
      <label className="block min-w-0">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ejercicio</span>
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="w-full mt-1 px-2.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 min-w-0"
        >
          {EXERCISES_DATABASE.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nameEs || e.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Peso ({weightUnit})</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Ej: 100"
            className="w-full mt-1 px-2.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 min-w-0"
          />
        </label>
        <label className="block min-w-0">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Reps</span>
          <input
            type="number"
            min={1}
            max={36}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full mt-1 px-2.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 min-w-0"
          />
        </label>
      </div>
      {estimated !== null && (
        <p className="text-[11px] text-neutral-400">
          e1RM estimado: <strong className="text-amber-300">{Math.round(estimated * 10) / 10} {weightUnit}</strong>
          {parseInt(reps, 10) > 1 ? " (fórmula promedio Brzycki/Epley/Wathan)" : " (peso directo de 1 rep)"}
        </p>
      )}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
      >
        <Plus className="w-4 h-4" /> Guardar récord
      </button>
    </div>
  );
};

/** Botón chico para borrar un PR (con confirmación). */
export const DeletePrButton: React.FC<{ prId: string; prName: string }> = ({ prId, prName }) => {
  const { deletePersonalRecord } = useWorkout();
  const { showToast } = useToast();
  return (
    <button
      onClick={() => {
        if (window.confirm(`¿Borrar el récord "${prName}"?`)) {
          deletePersonalRecord(prId);
          showToast("Récord borrado.", "info");
        }
      }}
      className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      aria-label={`Borrar récord ${prName}`}
      title="Borrar récord"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
};
