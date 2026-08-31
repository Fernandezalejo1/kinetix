import React, { useState } from "react";
import {
  BookOpen,
  Play,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Activity,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2
} from "lucide-react";
import { PREBUILT_PROGRAMS } from "../../data/programsData";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { Program, Routine, CustomRoutine } from "../../types";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { MUSCLE_LANDMARKS_CONFIG } from "../../utils/scienceCalculators";
import { RoutineEditorModal } from "./RoutineEditorModal";

export const ProgramsExplorer: React.FC = () => {
  const { startWorkoutFromRoutine, setSelectedExerciseForDetail, customRoutines, deleteCustomRoutine } = useWorkout();
  const { showToast } = useToast();
  // Persist the selected program + routine so the choice survives tab switches
  // and reloads (previously it always reset to the first program on remount).
  const [selectedProgram, setSelectedProgram] = useState<Program>(() => {
    try {
      const savedId = localStorage.getItem("kinetix_selected_program");
      return PREBUILT_PROGRAMS.find((p) => p.id === savedId) || PREBUILT_PROGRAMS[0];
    } catch {
      return PREBUILT_PROGRAMS[0];
    }
  });
  const [selectedRoutine, setSelectedRoutine] = useState<Routine>(() => {
    try {
      const savedRoutineId = localStorage.getItem("kinetix_selected_routine");
      const savedProgId = localStorage.getItem("kinetix_selected_program");
      const program = PREBUILT_PROGRAMS.find((p) => p.id === savedProgId) || PREBUILT_PROGRAMS[0];
      return program.routines.find((r) => r.id === savedRoutineId) || program.routines[0];
    } catch {
      return PREBUILT_PROGRAMS[0].routines[0];
    }
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<CustomRoutine | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"programs" | "custom">("programs");
  const [routineToDelete, setRoutineToDelete] = useState<CustomRoutine | null>(null);

  const handleDeleteConfirmed = () => {
    if (routineToDelete) {
      deleteCustomRoutine(routineToDelete.id);
      showToast("Rutina eliminada", "success");
    }
    setRoutineToDelete(null);
  };

  const handleSelectProgram = (program: Program) => {
    setSelectedProgram(program);
    setSelectedRoutine(program.routines[0]);
    try {
      localStorage.setItem("kinetix_selected_program", program.id);
      localStorage.setItem("kinetix_selected_routine", program.routines[0].id);
    } catch {}
  };

  const handleStartWorkout = (routine: Routine) => {
    startWorkoutFromRoutine(routine);
  };

  return (
    <div id="programs-explorer" className="space-y-8 animate-fadeIn pb-16">
      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
        <button
          onClick={() => setActiveTab("programs")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "programs"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4 inline mr-1.5" />
          Programas Científicos
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "custom"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Edit3 className="w-4 h-4 inline mr-1.5" />
          Mis Rutinas ({customRoutines.length})
        </button>
      </div>

      {/* Custom Routines Tab */}
      {activeTab === "custom" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Mis Rutinas Personalizadas</h2>
              <p className="text-xs text-neutral-400">Crea y edita rutinas completamente a tu medida</p>
            </div>
            <button
              onClick={() => { setEditingRoutine(undefined); setIsEditorOpen(true); }}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Rutina
            </button>
          </div>

          {customRoutines.length === 0 ? (
            <div className="p-10 text-center bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
                <Edit3 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No tienes rutinas personalizadas</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                  Crea tu primera rutina con ejercicios, series, repeticiones, tempo y superseries.
                </p>
              </div>
              <button
                onClick={() => { setEditingRoutine(undefined); setIsEditorOpen(true); }}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
              >
                <Plus className="w-4 h-4 inline mr-1.5" />
                Crear Mi Primera Rutina
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {routine.targetSplit}
                      </span>
                      <h3 className="text-base font-black text-white mt-2 truncate">{routine.name}</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">{routine.description}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-400 font-mono">
                    {routine.exercises.length} ejercicios · {routine.estimatedDurationMin} min
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => { setEditingRoutine(routine); setIsEditorOpen(true); }}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => startWorkoutFromRoutine(routine)}
                      className="flex-1 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Iniciar
                    </button>
                    <button
                      onClick={() => setRoutineToDelete(routine)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-400 border border-neutral-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setEditingRoutine(undefined); setIsEditorOpen(true); }}
                className="p-5 rounded-3xl border-2 border-dashed border-neutral-800 hover:border-cyan-500 text-neutral-400 hover:text-cyan-400 font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[160px]"
              >
                <Plus className="w-5 h-5" />
                Crear Nueva Rutina
              </button>
            </div>
          )}
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === "programs" && (
      <div className="space-y-8">
      {/* Program Selector Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Programas Basados en Ciencia</h2>
            <p className="text-xs text-neutral-400">Diseñados bajo periodización de sobrecarga y curvas de tensión óptimas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PREBUILT_PROGRAMS.map((prog) => {
            const isSelected = selectedProgram.id === prog.id;
            return (
              <div
                key={prog.id}
                onClick={() => handleSelectProgram(prog)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-neutral-900 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {prog.daysPerWeek} DÍAS / SEMANA
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">
                      {prog.level}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white">{prog.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{prog.subtitle}</p>
                </div>

                <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1 pt-2 border-t border-neutral-900">
                  <Layers className="w-3.5 h-3.5" />
                  {prog.routines.length} Rutinas Específicas
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Program Details & Rationale */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{selectedProgram.focus}</span>
            <h3 className="text-2xl font-black text-white tracking-tight mt-1">{selectedProgram.title}</h3>
            <p className="text-xs text-neutral-300 max-w-2xl mt-1 leading-relaxed">{selectedProgram.scienceBasis}</p>
          </div>
        </div>

        {/* Routine Day Tabs inside this Program */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 text-xs border-b border-neutral-800">
          {selectedProgram.routines.map((routine) => {
            const isCur = selectedRoutine.id === routine.id;
            return (
              <button
                key={routine.id}
                onClick={() => {
                  setSelectedRoutine(routine);
                  try { localStorage.setItem("kinetix_selected_routine", routine.id); } catch {}
                }}
                className={`py-3 px-4 font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                  isCur
                    ? "border-cyan-400 text-cyan-400 bg-neutral-800/40 rounded-t-xl"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <Activity className="w-4 h-4" />
                {routine.name}
              </button>
            );
          })}
        </div>

        {/* Selected Routine Workout Plan Box */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="min-w-0">
              <h4 className="text-lg font-black text-white">{selectedRoutine.name}</h4>
              <p className="text-xs text-neutral-400">{selectedRoutine.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => handleStartWorkout(selectedRoutine)}
                className="flex-1 sm:flex-none px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Iniciar Este Entrenamiento
              </button>
            </div>
          </div>

          {/* Exercises in Routine List */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Secuencia de Ejercicios & Sobrecarga de Tensión:
            </span>

            {selectedRoutine.exercises.map((re, idx) => {
              const ex = EXERCISES_DATABASE.find((e) => e.id === re.exerciseId) || EXERCISES_DATABASE[0];
              const primaryStr = ex.primaryMuscles
                .map((m) => MUSCLE_LANDMARKS_CONFIG[m]?.nameEs || m)
                .join(", ");

              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-neutral-900 text-neutral-300 font-black text-xs flex items-center justify-center border border-neutral-800 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-bold text-white">{ex.nameEs}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {ex.resistanceProfile === "lengthened" ? "Estiramiento" : "Contracción"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {primaryStr} • Tempo: <strong className="text-white font-mono">{re.targetTempo}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-mono">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-cyan-400">{re.targetSets} series × {re.targetReps}</div>
                      <div className="text-[11px] text-purple-300 font-bold">RIR {re.targetRir} • {re.restSeconds}s descanso</div>
                    </div>

                    <button
                      onClick={() => setSelectedExerciseForDetail(ex)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-cyan-400 border border-neutral-800 transition-colors"
                      title="Ver Biomecánica"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Routine Editor Modal */}
      <RoutineEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingRoutine(undefined); }}
        routine={editingRoutine}
      />

      {/* Delete routine confirmation */}
      <ConfirmDialog
        open={routineToDelete !== null}
        title="Eliminar rutina"
        message={`¿Eliminar la rutina "${routineToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setRoutineToDelete(null)}
      />
    </div>
  );
};
