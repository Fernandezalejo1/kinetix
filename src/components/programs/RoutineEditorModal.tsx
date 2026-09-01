import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Dumbbell,
  Save,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  Link2,
  Unlink2
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { ExerciseLibraryModal } from "../exercises/ExerciseLibraryModal";
import { ExerciseDetailModal } from "../exercises/ExerciseDetailModal";
import { CustomRoutine, CustomRoutineExercise, Exercise } from "../../types";
import { EXERCISES_DATABASE } from "../../data/exercisesData";

interface RoutineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine?: CustomRoutine;
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  isOpen,
  onClose,
  routine,
}) => {
  const { saveCustomRoutine, deleteCustomRoutine, weightUnit } = useWorkout();
  const [name, setName] = useState(routine?.name || "Mi Rutina");
  const [description, setDescription] = useState(routine?.description || "");
  const [targetSplit, setTargetSplit] = useState(routine?.targetSplit || "Push (Empuje)");
  const [duration, setDuration] = useState(routine?.estimatedDurationMin || 50);
  const [exercises, setExercises] = useState<CustomRoutineExercise[]>(routine?.exercises || []);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<Exercise | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [supersetMode, setSupersetMode] = useState(false);
  const [supersetPair, setSupersetPair] = useState<number[]>([]);

  if (!isOpen) return null;

  const addExercise = (exercise: Exercise) => {
    const newEx: CustomRoutineExercise = {
      exerciseId: exercise.id,
      targetSets: 3,
      targetReps: "8-10",
      targetRir: 1,
      targetTempo: exercise.defaultTempo,
      restSeconds: 120,
      notes: "",
    };
    setExercises((prev) => [...prev, newEx]);
    setIsLibraryOpen(false);
  };

  const updateExercise = (idx: number, updates: Partial<CustomRoutineExercise>) => {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, ...updates } : ex)));
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveExercise = (fromIdx: number, direction: "up" | "down") => {
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= exercises.length) return;
    setExercises((prev) => {
      const updated = [...prev];
      [updated[fromIdx], updated[toIdx]] = [updated[toIdx], updated[fromIdx]];
      return updated;
    });
  };

  const toggleSuperset = (idx: number) => {
    if (supersetPair.includes(idx)) {
      setSupersetPair((prev) => prev.filter((i) => i !== idx));
    } else {
      if (supersetPair.length >= 2) {
        setSupersetPair([idx]);
      } else {
        setSupersetPair((prev) => [...prev, idx]);
      }
    }
  };

  const applySuperset = () => {
    if (supersetPair.length === 2) {
      const groupId = `superset-${Date.now()}`;
      setExercises((prev) =>
        prev.map((ex, i) =>
          supersetPair.includes(i) ? { ...ex, supersetGroupId: groupId } : ex
        )
      );
      setSupersetPair([]);
      setSupersetMode(false);
    }
  };

  const removeSuperset = (idx: number) => {
    const groupId = exercises[idx].supersetGroupId;
    if (groupId) {
      setExercises((prev) =>
        prev.map((ex) => (ex.supersetGroupId === groupId ? { ...ex, supersetGroupId: undefined } : ex))
      );
    }
  };

  const handleSave = () => {
    const routineToSave: CustomRoutine = {
      id: routine?.id || `custom-${Date.now()}`,
      name,
      description,
      targetSplit,
      estimatedDurationMin: duration,
      isCustom: true,
      exercises,
    };
    saveCustomRoutine(routineToSave);
    onClose();
  };

  const splitOptions = [
    "Push (Empuje)", "Pull (Tracción)", "Legs (Pierna)", "Upper (Tren Superior)",
    "Lower (Tren Inferior)", "Full Body", "Torso", "Personalizado"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] overflow-hidden flex flex-col safe-area-bottom">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{routine ? "Editar Rutina" : "Crear Rutina"}</h2>
              <p className="text-[11px] text-neutral-400">Personaliza tu entrenamiento completo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Nombre de la Rutina</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Ej: Push A (Empuje)"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enfoque y objetivos de la rutina"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">División</label>
                <select
                  value={targetSplit}
                  onChange={(e) => setTargetSplit(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500"
                >
                  {splitOptions.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Duración (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Ejercicios ({exercises.length})</h3>
              <div className="flex gap-2">
                {supersetMode && supersetPair.length > 0 && (
                  <button
                    onClick={applySuperset}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center gap-1"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Superset ({supersetPair.length}/2)
                  </button>
                )}
                <button
                  onClick={() => { setSupersetMode(!supersetMode); setSupersetPair([]); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    supersetMode
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {supersetMode ? "Cancelar" : "Superset"}
                </button>
              </div>
            </div>

            {exercises.length === 0 && (
              <div className="p-8 text-center bg-neutral-950/50 rounded-2xl border border-dashed border-neutral-800 text-neutral-400 text-xs space-y-2">
                <Dumbbell className="w-8 h-8 mx-auto text-neutral-600" />
                <p>No hay ejercicios. Toca "+" para añadir.</p>
              </div>
            )}

            {exercises.map((ex, idx) => {
              const exDef = EXERCISES_DATABASE.find((e) => e.id === ex.exerciseId);
              const isExpanded = expandedIdx === idx;
              const isSupersetPair = supersetPair.includes(idx);
              const hasSuperset = !!ex.supersetGroupId;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isSupersetPair
                      ? "bg-purple-950/20 border-purple-500/40"
                      : hasSuperset
                      ? "bg-neutral-950/60 border-purple-500/20"
                      : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {/* Exercise Card Header */}
                  <div className="p-3 flex items-center gap-2">
                    {supersetMode && (
                      <button
                        onClick={() => toggleSuperset(idx)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border transition-all ${
                          isSupersetPair
                            ? "bg-purple-500 text-white border-purple-400"
                            : "bg-neutral-800 text-neutral-400 border-neutral-700"
                        }`}
                      >
                        {isSupersetPair ? "S" : idx + 1}
                      </button>
                    )}
                    {!supersetMode && (
                      <span className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-black shrink-0">
                        {idx + 1}
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white truncate">{exDef?.nameEs || ex.exerciseId}</h4>
                        {hasSuperset && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 shrink-0">
                            SS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono">
                        {ex.targetSets} × {ex.targetReps} @ RIR {ex.targetRir} · {ex.restSeconds}s descanso
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!supersetMode && (
                        <>
                          <button
                            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => moveExercise(idx, "up")}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors disabled:opacity-30"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          {hasSuperset && (
                            <button
                              onClick={() => removeSuperset(idx)}
                              className="p-1.5 rounded-lg hover:bg-neutral-800 text-purple-400 hover:text-purple-300 transition-colors"
                              title="Quitar del superset"
                            >
                              <Unlink2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeExercise(idx)}
                            className="p-1.5 rounded-lg hover:bg-red-900/40 text-neutral-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Settings */}
                  {isExpanded && !supersetMode && (
                    <div className="px-3 pb-3 pt-1 border-t border-neutral-800/50 space-y-3 animate-slideUp">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Series</label>
                          <input
                            type="number"
                            value={ex.targetSets}
                            onChange={(e) => updateExercise(idx, { targetSets: parseInt(e.target.value) || 3 })}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Reps</label>
                          <input
                            type="text"
                            value={ex.targetReps}
                            onChange={(e) => updateExercise(idx, { targetReps: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500 text-center"
                            placeholder="8-10"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">RIR</label>
                          <select
                            value={ex.targetRir}
                            onChange={(e) => updateExercise(idx, { targetRir: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm font-bold focus:outline-none"
                          >
                            {[0, 1, 2, 3].map((r) => (
                              <option key={r} value={r} className="bg-neutral-900">{r}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Tempo</label>
                          <input
                            type="text"
                            value={ex.targetTempo}
                            onChange={(e) => updateExercise(idx, { targetTempo: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500 text-center"
                            placeholder="3-1-0-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Descanso (segundos)</label>
                        <input
                          type="number"
                          value={ex.restSeconds}
                          onChange={(e) => updateExercise(idx, { restSeconds: parseInt(e.target.value) || 120 })}
                          className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm font-bold focus:outline-none focus:border-cyan-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase mb-1">Notas</label>
                        <input
                          type="text"
                          value={ex.notes || ""}
                          onChange={(e) => updateExercise(idx, { notes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                          placeholder="Instrucciones especiales..."
                        />
                      </div>
                      {exDef && (
                        <button
                          onClick={() => setSelectedExerciseForDetail(exDef)}
                          className="w-full py-2 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors"
                        >
                          Ver Biomecánica del Ejercicio
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Exercise Button */}
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-cyan-500 text-neutral-400 hover:text-cyan-400 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5" />
              Añadir Ejercicio
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="px-4 sm:px-6 py-4 border-t border-neutral-800 flex items-center gap-3 shrink-0">
          {routine && (
            <button
              onClick={() => {
                deleteCustomRoutine(routine.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-950/30 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-900/40 transition-colors"
            >
              Eliminar
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-bold hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={exercises.length === 0}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Guardar Rutina
          </button>
        </div>
      </div>

      {/* Sub-modals */}
      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        mode="select"
        onSelectExercise={addExercise}
        onViewDetails={(ex) => setSelectedExerciseForDetail(ex)}
      />

      {selectedExerciseForDetail && (
        <ExerciseDetailModal
          exercise={selectedExerciseForDetail}
          onClose={() => setSelectedExerciseForDetail(null)}
        />
      )}
    </div>
  );
};
