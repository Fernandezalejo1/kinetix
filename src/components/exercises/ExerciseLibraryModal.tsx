import React, { useState } from "react";
import { X, Search, Filter, Plus, Info, Dumbbell, Sparkles } from "lucide-react";
import { Exercise } from "../../types";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { MUSCLE_LANDMARKS_CONFIG } from "../../utils/scienceCalculators";

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise?: (exercise: Exercise) => void;
  onViewDetails: (exercise: Exercise) => void;
  mode?: "browse" | "select" | "replace";
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
  onViewDetails,
  mode = "browse",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedProfile, setSelectedProfile] = useState<string>("all");

  if (!isOpen) return null;

  const filteredExercises = EXERCISES_DATABASE.filter((ex) => {
    const matchesSearch =
      ex.nameEs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.primaryMuscles.some((m) =>
        (MUSCLE_LANDMARKS_CONFIG[m]?.nameEs || m).toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCat = selectedCategory === "all" || ex.category === selectedCategory;
    const matchesEquip = selectedEquipment === "all" || ex.equipment === selectedEquipment;
    const matchesProfile = selectedProfile === "all" || ex.resistanceProfile === selectedProfile;

    return matchesSearch && matchesCat && matchesEquip && matchesProfile;
  });

  return (
    <div
      id="exercise-library-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border-neutral-800 sm:border rounded-none sm:rounded-2xl w-full max-w-4xl max-h-[100dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:p-6 sm:pt-6 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                {mode === "replace" ? "Sustituir por Ejercicio Equivalente" : mode === "select" ? "Añadir Ejercicio al Entrenamiento" : "Biblioteca Científica de Ejercicios"}
              </h3>
              <p className="text-xs text-neutral-400 truncate">Biomecánica, curvas de longitud-tensión y técnica con evidencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/90 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ejercicio, músculo (pectoral, dorsal, cuádriceps...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Quick Category Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 text-xs">
            {[
              { id: "all", label: "Todos los Patrones" },
              { id: "push", label: "Push (Empuje)" },
              { id: "pull", label: "Pull (Tracción)" },
              { id: "legs", label: "Legs (Pierna)" },
              { id: "core", label: "Core / Abdomen" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-lg font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Additional Specific Filters */}
          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-2.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todo el Equipamiento</option>
              <option value="barbell">Barra Olímpica</option>
              <option value="dumbbell">Mancuerna</option>
              <option value="cable">Poleas / Cables</option>
              <option value="machine">Máquinas Guiadas</option>
            </select>

            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="px-2.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-cyan-500 max-w-full"
            >
              <option value="all">Todas las Curvas de Resistencia</option>
              <option value="lengthened">Sobrecarga en Estiramiento (Stretch-Mediated)</option>
              <option value="shortened">Sobrecarga en Acortamiento</option>
              <option value="mid_range">Curva Media Balanceada</option>
            </select>
          </div>
        </div>

        {/* Exercise Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {filteredExercises.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-neutral-400">
              <Dumbbell className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-semibold">No se encontraron ejercicios con estos filtros.</p>
            </div>
          ) : (
            filteredExercises.map((ex) => {
              const primaryStr = ex.primaryMuscles
                .map((m) => MUSCLE_LANDMARKS_CONFIG[m]?.nameEs || m)
                .join(", ");

              return (
                <div
                  key={ex.id}
                  className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {ex.category}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                            {ex.equipment}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {ex.nameEs}
                        </h4>
                        <p className="text-[11px] text-neutral-400">{ex.name}</p>
                      </div>

                      <button
                        onClick={() => onViewDetails(ex)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
                        title="Ver Biomecánica & Anatomía"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="text-neutral-400">Objetivo: </span>
                      <strong className="text-neutral-200">{primaryStr}</strong>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-purple-300 font-medium">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>
                        {ex.resistanceProfile === "lengthened"
                          ? "Sobrecarga en Estiramiento"
                          : ex.resistanceProfile === "shortened"
                          ? "Sobrecarga en Contracción"
                          : "Curva Media"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900 gap-2">
                    <button
                      onClick={() => onViewDetails(ex)}
                      className="px-3 py-2.5 text-xs text-neutral-300 hover:text-white font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
                    >
                      Ver Ficha Técnica
                    </button>

                    {onSelectExercise && (
                      <button
                        onClick={() => {
                          onSelectExercise(ex);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {mode === "replace" ? "Seleccionar" : "Añadir"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
