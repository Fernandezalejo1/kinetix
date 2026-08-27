import React, { useState } from "react";
import { Video, Film, Box, Sparkles, ExternalLink, Activity, Info, Flame, CheckCircle2, Dumbbell, ShieldAlert, Target } from "lucide-react";
import { Exercise } from "../../types";
import { Exercise3DVisualizer } from "./Exercise3DVisualizer";
import { ExerciseAnimationPlayer } from "./ExerciseAnimationPlayer";

interface ExerciseMediaVisualizerProps {
  exercise: Exercise;
}

export const ExerciseMediaVisualizer: React.FC<ExerciseMediaVisualizerProps> = ({
  exercise,
}) => {
  const [mediaMode, setMediaMode] = useState<"video" | "gif" | "3d">("video");

  // YouTube search query fallback
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${exercise.nameEs} ${exercise.name} tecnica correcta hipertrofia gymvisual`
  )}`;

  // Determine what the exercise is and what it does
  const getExerciseFunctionBio = () => {
    const name = (exercise.nameEs + " " + exercise.name + " " + exercise.id).toLowerCase();
    
    if (name.includes("smith") && name.includes("incline") && name.includes("bench")) {
      return {
        whatIs: "Ejercicio básico multiarticular de empuje horizontal sobre banco inclinado a 30-45° con barra guiada en rieles verticales.",
        whatDoes: "Produce la aducción horizontal y flexión del húmero con prioridad en el fascículo clavicular del pectoral mayor (por la inclinación), asistido por el deltoides anterior y el tríceps braquial en la extensión del codo; la guía de la Smith elimina el componente de estabilización horizontal y fija una trayectoria vertical determinada.",
        biomechanics: "La barra guiada mantiene la escápula retraída y deprimida contra el banco durante todo el recorrido, permitiendo concentrarse en el estiramiento del pectoral superior sin depender del equilibrio. Al ser una máquina, el punto muerto es solo muscular y no de palanca: conviene pausar 2s abajo y controlar la negativa en 3s para aprovechar la sobrecarga en estiramiento.",
      };
    }
    if (name.includes("banca") || name.includes("bench press") || name.includes("pecho")) {
      return {
        whatIs: "Ejercicio básico multiarticular de empuje horizontal para la cadena anterior superior.",
        whatDoes: "Produce la aducción horizontal y flexión del húmero, activando de forma prioritaria el pectoral mayor (fibras esternocostales y claviculares) con asistencia del deltoides anterior y tríceps braquial en la extensión del codo.",
        biomechanics: "Mantiene la escápula retraída y deprimida durante todo el recorrido para proteger el manguito rotador y maximizar el brazo de momento en el pectoral.",
      };
    }
    if (name.includes("sentadilla") || name.includes("squat") || name.includes("hack") || name.includes("prensa")) {
      return {
        whatIs: "Movimiento multiarticular de triple extensión (cadera, rodilla y tobillo) para el tren inferior.",
        whatDoes: "Produce la extensión de la rodilla mediante el cuádriceps (vasto medial, lateral e intermedio) combinada con la potente extensión de cadera por el glúteo mayor y aductor mayor.",
        biomechanics: "Favorece una trayectoria vertical de la carga manteniendo el centro de masas sobre la mitad del pie con rigidez intraabdominal.",
      };
    }
    if (name.includes("peso muerto") || name.includes("deadlift") || name.includes("rdl") || name.includes("rumano")) {
      return {
        whatIs: "Patrón de bisagra de cadera fundamental para el desarrollo de la cadena posterior completa.",
        whatDoes: "Extiende la cadera con alta tensión mecánica en isquiosurales y glúteo mayor, mientras los erectores espinales, dorsales y trapecios estabilizan la columna de forma isométrica.",
        biomechanics: "Enfocado en el estiramiento excéntrico bajo carga de los isquiotibiales con espalda neutra y retracción escapular activa.",
      };
    }
    if (name.includes("jalon") || name.includes("pulldown") || name.includes("dominada") || name.includes("pullup")) {
      return {
        whatIs: "Ejercicio multiarticular de tracción vertical para la espalda superior y media.",
        whatDoes: "Realiza la aducción y extensión del hombro, reclutando intensamente el dorsal ancho, redondo mayor y fibras inferiores del trapecio, con flexión de codo por el bíceps braquial.",
        biomechanics: "Comienza con la depresión escapular antes de flexionar los brazos para aislar el dorsal y evitar sobrecargar los antebrazos.",
      };
    }
    if (name.includes("remo") || name.includes("row")) {
      return {
        whatIs: "Patrón de tracción horizontal multiarticular para la densidad y grosor de la espalda.",
        whatDoes: "Produce la extensión del hombro y retracción de las escápulas, reclutando el dorsal ancho, romboides, trapecio medio y deltoides posterior.",
        biomechanics: "Conduce los codos pegados o en 45° al torso para maximizar la activación del dorsal frente a la rotación interna.",
      };
    }
    if (name.includes("press militar") || name.includes("shoulder") || name.includes("overhead")) {
      return {
        whatIs: "Ejercicio multiarticular de empuje vertical para el hombro y la cintura escapular.",
        whatDoes: "Flexiona y abduce el hombro verticalmente estimulando el deltoides anterior y lateral, mientras el tríceps y trapecio superior extienden los codos y elevan la clavícula.",
        biomechanics: "Requiere bloqueo del core y glúteos para evitar hiperextensión lumbar durante el bloqueo superior.",
      };
    }
    if (name.includes("lateral") || name.includes("pajaros") || name.includes("rear delt")) {
      return {
        whatIs: "Ejercicio monoarticular de aislamiento para la cabeza lateral o posterior del deltoides.",
        whatDoes: "Abduce el húmero en el plano escapular (30° anterior) aplicando tensión directa y continua sobre el deltoides lateral sin asistencia de la espalda baja.",
        biomechanics: "Inicia el movimiento con los codos y mantén el antebrazo alineado para inhibir la compensación del trapecio superior.",
      };
    }
    if (name.includes("curl") || name.includes("biceps") || name.includes("martillo") || name.includes("preacher")) {
      return {
        whatIs: "Ejercicio monoarticular de flexión de codo para hipertrofia de brazos.",
        whatDoes: "Flexiona la articulación del codo y supina el antebrazo, concentrando la tensión en las cabezas larga y corta del bíceps braquial y el braquial anterior.",
        biomechanics: "Fija los codos a los costados del torso para evitar el balanceo inercial y asegurar el recorrido completo.",
      };
    }
    if (name.includes("triceps") || name.includes("pushdown") || name.includes("frances") || name.includes("extension triceps")) {
      return {
        whatIs: "Ejercicio monoarticular de extensión de codo para el tríceps braquial.",
        whatDoes: "Extiende el antebrazo contra resistencia, estimulando las cabezas lateral, medial y larga del tríceps braquial con pico de contracción al final.",
        biomechanics: "Mantén los hombros estables y el torso erguido o ligeramente inclinado para aislar el codo sin usar el peso corporal.",
      };
    }
    if (name.includes("crunch") || name.includes("plank") || name.includes("abdominal") || name.includes("rollout") || name.includes("rueda")) {
      return {
        whatIs: "Ejercicio específico de flexión o estabilización anti-extensión del core.",
        whatDoes: "Flexiona la columna vertebral aproximando las costillas a la pelvis, generando tensión isométrica o concéntrica en el recto abdominal y oblicuos.",
        biomechanics: "Evita tirar del cuello o flexionar desde la cadera; concéntrate en redondear la columna dorsal y vaciar el aire en la contracción.",
      };
    }
    return {
      whatIs: `Ejercicio técnico de fuerza y acondicionamiento para ${exercise.category.toUpperCase()}.`,
      whatDoes: `Recluta principalmente ${exercise.primaryMuscles.join(", ")} con asistencia estabilizadora de ${exercise.secondaryMuscles.join(", ")}.`,
      biomechanics: "Ejecución controlada respetando el tempo óptimo y los rangos articulares seguros.",
    };
  };

  const bioInfo = getExerciseFunctionBio();

  return (
    <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xl space-y-4 text-left">
      {/* Exercise "Qué es y Qué hace" Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border-b border-neutral-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Target className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                ¿Qué es y Qué hace?
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Biomecánica Oficial
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Análisis motor y función anatómica de {exercise.nameEs}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en YouTube</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
              ¿Qué es?
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed font-medium">
              {bioInfo.whatIs}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              ¿Qué hace y cómo actúa?
            </span>
            <p className="text-xs text-neutral-200 leading-relaxed font-medium">
              {bioInfo.whatDoes}
            </p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/30 text-xs text-cyan-200/90 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-cyan-300 font-semibold">Clave Biomecánica: </strong>
            {bioInfo.biomechanics}
          </p>
        </div>
      </div>

      {/* Media Type Selector Tab Header */}
      <div className="flex flex-wrap items-center justify-between px-4 pt-1 gap-2">
        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setMediaMode("video")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mediaMode === "video"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5 text-cyan-200" />
            Video HD Oficial
          </button>
          <button
            onClick={() => setMediaMode("gif")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mediaMode === "gif"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5 text-red-200" />
            GIF 60 FPS
          </button>
          <button
            onClick={() => setMediaMode("3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mediaMode === "3d"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5 text-emerald-200" />
            Visor 3D Interactivo
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 text-neutral-300 border border-neutral-800">
            {mediaMode === "video" ? "Modo Video HD & Cues" : mediaMode === "gif" ? "Loop Continuo" : "WebGL 360°"}
          </span>
        </div>
      </div>

      {/* Main Media Player Container */}
      <div className="px-4 pb-4">
        {mediaMode === "video" && (
          <div className="space-y-3">
            {exercise.videoUrl && exercise.videoUrl.endsWith(".mp4") ? (
              <div className="rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl">
                <video
                  src={exercise.videoUrl}
                  controls
                  preload="none"
                  loop
                  muted
                  playsInline
                  className="w-full h-auto max-h-[500px] object-contain"
                  poster={exercise.videoPosterUrl}
                />
                <div className="px-4 py-2.5 bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    Video HD Oficial - {exercise.nameEs}
                  </span>
                  <a href={exercise.videoUrl} download className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Descargar
                  </a>
                </div>
              </div>
            ) : (
              <ExerciseAnimationPlayer exercise={exercise} mode="video" />
            )}
          </div>
        )}

        {mediaMode === "gif" && (
          <div className="space-y-3">
            {exercise.gifUrl && exercise.gifUrl.endsWith(".gif") ? (
              <div className="rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl">
                <img
                  src={exercise.gifUrl}
                  alt={`${exercise.nameEs} - Animación GIF`}
                  className="w-full h-auto max-h-[500px] object-contain"
                  loading="lazy"
                />
                <div className="px-4 py-2.5 bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-red-400 font-bold flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    GIF Animación - {exercise.nameEs}
                  </span>
                  <a href={exercise.gifUrl} download className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Descargar GIF
                  </a>
                </div>
              </div>
            ) : (
              <ExerciseAnimationPlayer exercise={exercise} mode="gif" />
            )}
          </div>
        )}

        {mediaMode === "3d" && (
          <div className="w-full">
            <Exercise3DVisualizer exercise={exercise} className="w-full h-80 sm:h-96" />
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="px-4 py-2.5 bg-neutral-900/60 border-t border-neutral-800/80 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>
            Músculo Motor Activo en Rojo: <strong className="text-white">{exercise.primaryMuscles.join(", ")}</strong>
          </span>
        </div>

        <div className="text-[11px] text-neutral-400 font-mono">
          Tempo Sugerido: <strong className="text-cyan-400">{exercise.defaultTempo}</strong>
        </div>
      </div>
    </div>
  );
};

