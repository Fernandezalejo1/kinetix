import React, { useState } from "react";
import {
  Activity,
  Search,
  Dumbbell,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
  Bone
} from "lucide-react";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { Exercise } from "../../types";
import { AnatomyVisualizer } from "./AnatomyVisualizer";
import { ExerciseDetailModal } from "./ExerciseDetailModal";
import { MUSCLE_LANDMARKS_CONFIG } from "../../utils/scienceCalculators";

export const BiomechanicsHub: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProfile, setSelectedProfile] = useState<string>("all");
  const [activeExerciseDetail, setActiveExerciseDetail] = useState<Exercise | null>(null);
  const [previewAnatomyView, setPreviewAnatomyView] = useState<"front" | "back">("front");
  const [hoveredExercise, setHoveredExercise] = useState<Exercise>(EXERCISES_DATABASE[0]);

  const filteredExercises = EXERCISES_DATABASE.filter((ex) => {
    const matchesSearch =
      ex.nameEs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.primaryMuscles.some((m) =>
        (MUSCLE_LANDMARKS_CONFIG[m]?.nameEs || m).toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCat = selectedCategory === "all" || ex.category === selectedCategory;
    const matchesProfile = selectedProfile === "all" || ex.resistanceProfile === selectedProfile;

    return matchesSearch && matchesCat && matchesProfile;
  });

  return (
    <div id="biomechanics-hub" className="space-y-8 animate-fadeIn pb-16">
      {/* Top Biomechanics Masterclass Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CIENCIA APLICADA AL ENTRENAMIENTO
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Laboratorio Biomecánico & Curvas de Tensión
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Cada ejercicio en KINETIX está clasificado por su perfil de resistencia (sobrecarga en estiramiento vs acortamiento), brazos de momento y reclutamiento miofibrilar basado en EMG y estudios de resonancia magnética.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 shrink-0 text-xs text-neutral-300">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>
            Modelado con principios de <strong>Chris Beardsley & Kassem Hanson</strong>.
          </span>
        </div>
      </div>

      {/* Sección independiente: SALUD CERVICAL & POSTURA (fuera de los planes) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/20 border border-indigo-500/20 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
              <Bone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Salud Cervical & Postura (la "joroba")</h2>
              <p className="text-[11px] text-neutral-400">Guía aparte para corregir la cabeza/proyección cervical y ganar ~1cm</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Fuera de los planes · 10 min/día
          </span>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          La <strong className="text-white">"joroba"</strong> es una <strong className="text-white">cabeza adelantada (forward head posture)</strong>: los
          músculos flexores del cuello están débiles y estirados, y el trapecio superior/torácico rígido tira de la cabeza hacia adelante y abajo.
          Corregirla (cuello más erguido, trapecios engrosados y masaje de los flexores) puede devolverte <strong className="text-amber-300">~1 cm de altura percibida</strong>:
          es postura + masa muscular, no hueso. Hacela <strong className="text-white">2–3 veces por semana</strong> (máximo 10 min) y combiná con estiramiento cervical diario.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Paso 1: Reeducación postural */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/15 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 flex items-center justify-center text-xs font-black">1</span>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Retracción escapular (Postura)</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Sentado, llevá los hombros atrás y abajo ("pecho orgulloso") y meté el mentón suavemente hacia atrás sin mirar para abajo
              (<strong className="text-neutral-200">chin-tuck</strong>). Mantené 5 s × 10; 3–4 veces al día (sobre todo en la PC).
            </p>
          </div>

          {/* Paso 2: Band Pull Apart */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/15 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 flex items-center justify-center text-xs font-black">2</span>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Band Pull Apart & Face Pull</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              <strong className="text-neutral-200">Pull Apart</strong> (banda): separá las manos abriendo hasta el pecho, hombros abajo · 15–20 reps.
              <strong className="text-neutral-200">Face Pull</strong> (polea): jala a la cara girando externamente el hombro · 12–15 reps × 3.
              Fortalecen la espalda alta y trapecio que sostienen la cabeza.
            </p>
          </div>

          {/* Paso 3: Flexión cervical con lastre */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/15 sm:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 flex items-center justify-center text-xs font-black">3</span>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Flexión Cervical Lastrada (engrosá el cuello)</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Tumbado en el banco con la cabeza fuera del borde y un disco ligero en la frente (usá las manos de apoyo al inicio), flexioná el cuello
              llevando el mentón al pecho y descendé controlado · <strong className="text-neutral-200">3 series × 10–12 · tempo 3-1-2-1 · poco peso</strong>.
              Los flexores cervicales se hipertrofian como cualquier músculo; sumá peso en incrementos de 1–2 kg <strong className="text-amber-300">muy gradual</strong>
              (la cervical es frágil). Este es el ejercicio que más "engruesa" la zona del cuello/joroba.
            </p>
          </div>

          {/* Estiramiento */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/15 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 flex items-center justify-center text-xs font-black">4</span>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Trabajo móvil con la máquina de tracción</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Máquina militar/remolón con apoyo de nuca (el que usás en prensa de hombros) puede servir de soporte; si no, usá band-pull-apart diario.
              Estiramiento cervical suave (rotaciones y flexiones laterales lentas, mentón al pecho 20 s) cada noche. Evitá café 6 h antes de dormir en turno nocturno.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[11px] font-bold text-white">Incluido en tu biblioteca:</span>
          <button
            onClick={() => { setSelectedCategory("all"); setSearchTerm("cervical"); }}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-700 text-[11px] font-bold text-neutral-300 hover:text-indigo-300 hover:border-indigo-500 transition-all"
          >
            Ver "Flexión Cervical" en la biblioteca
          </button>
          <button
            onClick={() => { setSelectedCategory("pull"); setSearchTerm("face pull"); }}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-700 text-[11px] font-bold text-neutral-300 hover:text-indigo-300 hover:border-indigo-500 transition-all"
          >
            Ver "Face Pull" / "Band Pull Apart"
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Anatomy Visualizer on Left + Searchable List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Live Dynamic Anatomy Vector Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col items-center justify-between space-y-6">
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white">Visualizador Anatómico 3D</h3>
              <p className="text-xs text-neutral-400">Reclutamiento del ejercicio seleccionado</p>
            </div>
            <div className="flex gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 ml-auto">
              <button
                onClick={() => setPreviewAnatomyView("front")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  previewAnatomyView === "front" ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Frontal
              </button>
              <button
                onClick={() => setPreviewAnatomyView("back")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  previewAnatomyView === "back" ? "bg-cyan-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Dorsal
              </button>
            </div>
          </div>

          <div className="py-2">
            <AnatomyVisualizer
              primaryMuscles={hoveredExercise.primaryMuscles}
              secondaryMuscles={hoveredExercise.secondaryMuscles}
              viewMode={previewAnatomyView}
              className="w-52 h-72"
            />
          </div>

          <div className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                {hoveredExercise.category.toUpperCase()}
              </span>
              <span className="text-[11px] font-mono text-purple-300 font-bold">
                {hoveredExercise.defaultTempo}
              </span>
            </div>
            <h4 className="text-base font-black text-white">{hoveredExercise.nameEs}</h4>
            <p className="text-xs text-neutral-300 line-clamp-2">{hoveredExercise.lengthTensionDescription}</p>

            <button
              onClick={() => setActiveExerciseDetail(hoveredExercise)}
              className="w-full mt-2 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Info className="w-4 h-4" />
              Abrir Ficha Biomecánica Completa
            </button>
          </div>
        </div>

        {/* Right Side: Search, Filters & Exercise Directory */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por ejercicio, músculo objetivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {["all", "push", "pull", "legs", "core"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-cyan-600 text-white"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "Todos" : cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-2.5 max-h-none lg:max-h-[580px] overflow-y-auto scrollbar-thin pr-1">
            {filteredExercises.map((ex) => {
              const isHovered = hoveredExercise.id === ex.id;
              const primaryStr = ex.primaryMuscles
                .map((m) => MUSCLE_LANDMARKS_CONFIG[m]?.nameEs || m)
                .join(", ");

              return (
                <div
                  key={ex.id}
                  onMouseEnter={() => setHoveredExercise(ex)}
                  onClick={() => {
                    setHoveredExercise(ex);
                    setActiveExerciseDetail(ex);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isHovered
                      ? "bg-neutral-900 border-cyan-500/50 shadow-md shadow-cyan-500/5"
                      : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-cyan-400 shrink-0">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-white">{ex.nameEs}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {ex.equipment}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {primaryStr} • <span className="text-purple-300 font-medium">{ex.resistanceProfile === "lengthened" ? "Estiramiento" : "Contracción"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveExerciseDetail(ex);
                      }}
                      className="p-2 rounded-xl text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {activeExerciseDetail && (
        <ExerciseDetailModal
          exercise={activeExerciseDetail}
          onClose={() => setActiveExerciseDetail(null)}
        />
      )}
    </div>
  );
};
