import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Activity } from "lucide-react";
import { playTickSound, unlockAudio } from "../../utils/scienceCalculators";
import { useWorkout } from "../../context/WorkoutContext";

interface TempoMetronomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTempo?: string; // e.g. "3-1-0-1"
  exerciseName?: string;
}

export const TempoMetronomeModal: React.FC<TempoMetronomeModalProps> = ({
  isOpen,
  onClose,
  initialTempo = "3-1-0-1",
  exerciseName = "Ejercicio",
}) => {
  const [tempoString, setTempoString] = useState(initialTempo);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseSecond, setPhaseSecond] = useState(1);
  const [repCount, setRepCount] = useState(0);
  const [soundActive, setSoundActive] = useState(true);
  const { soundEnabled } = useWorkout();

  // Parse tempo: e.g. "3-1-0-1" => [3, 1, 0, 1]
  const parsedPhases = tempoString.split("-").map((v) => parseInt(v, 10) || 0);
  const eccentric = parsedPhases[0] ?? 3;
  const bottomPause = parsedPhases[1] ?? 1;
  const concentric = Math.max(1, parsedPhases[2] ?? 1);
  const topPause = parsedPhases[3] ?? 0;

  // Memoize so the phases array reference stays stable between renders. Without
  // this, the run effect below would tear down and set up a new interval on
  // every second (each render produced a fresh array), causing timing jitter.
  const phases = useMemo(
    () =>
      [
        { name: "Excéntrico (Bajar / Estirar)", duration: eccentric, color: "text-blue-400", bg: "bg-blue-500", desc: "Máxima tensión mecánica en elongación" },
        { name: "Pausa en Estiramiento", duration: bottomPause, color: "text-purple-400", bg: "bg-purple-500", desc: "Disipa energía elástica para reclutamiento puro" },
        { name: "Concéntrico (Subir / Empujar)", duration: concentric, color: "text-emerald-400", bg: "bg-emerald-500", desc: "Máxima intención de aceleración voluntaria" },
        { name: "Contracción Pico", duration: topPause, color: "text-amber-400", bg: "bg-amber-500", desc: "Estabilidad y control articular" },
      ].filter((p) => p.duration > 0),
    [eccentric, bottomPause, concentric, topPause]
  );

  // Refs that always hold the latest phase/second so the interval closure never
  // reads stale state (fixes the metronome getting stuck on phase 0).
  const phaseRef = useRef(currentPhaseIndex);
  const secondRef = useRef(phaseSecond);
  phaseRef.current = currentPhaseIndex;
  secondRef.current = phaseSecond;

  // The run effect depends ONLY on isRunning/phases toggles, not on the phase
  // index or second, so the interval is created once and never recreated each
  // second while running.
  useEffect(() => {
    let timer: any = null;
    if (isRunning && phases.length > 0) {
      unlockAudio();
      timer = setInterval(() => {
        if (soundActive && soundEnabled) {
          playTickSound();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(30);
          }
        }

        const idx = phaseRef.current;
        const activePhase = phases[idx];
        setPhaseSecond((prevSec) => {
          if (prevSec < activePhase.duration) {
            return prevSec + 1;
          }
          const nextIdx = (idx + 1) % phases.length;
          if (nextIdx === 0) {
            setRepCount((r) => r + 1);
          }
          setCurrentPhaseIndex(nextIdx);
          phaseRef.current = nextIdx;
          return 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, phases, soundActive, soundEnabled]);

  // Reset refs back to state so they stay in sync.
  useEffect(() => {
    phaseRef.current = currentPhaseIndex;
    secondRef.current = phaseSecond;
  }, [currentPhaseIndex, phaseSecond]);

  // Prevent phase drift if the tempo string changes while running
  useEffect(() => {
    if (!isOpen && isRunning) {
      setIsRunning(false);
    }
  }, [isOpen, isRunning, setIsRunning]);

  if (!isOpen) return null;

  const activePhase = phases[currentPhaseIndex] || phases[0];

  return (
    <div
      id="tempo-metronome-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Metrónomo de Tempo</h3>
              <p className="text-xs text-neutral-400 truncate">{exerciseName} • {tempoString}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metronome Center Visualizer */}
        <div className="p-4 sm:p-6 space-y-6 text-center overflow-y-auto scrollbar-thin flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Reps Counter Banner */}
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Repeticiones Completadas</span>
            <span className="text-xl font-extrabold text-white">{repCount} <span className="text-xs text-neutral-500 font-normal">reps</span></span>
          </div>

          {/* Big Animated Phase Indicator */}
          <div className="relative py-8 flex flex-col items-center justify-center">
            <div
              className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                isRunning ? "border-purple-500 shadow-purple-500/20 scale-105" : "border-neutral-700"
              }`}
            >
              <span className="text-4xl font-black text-white">
                {phaseSecond}
                <span className="text-lg font-normal text-neutral-400">/{activePhase.duration}s</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mt-1">
                Fase {currentPhaseIndex + 1} de {phases.length}
              </span>
            </div>

            <div className="mt-4">
              <h4 className={`text-xl font-black tracking-tight ${activePhase.color}`}>
                {activePhase.name}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                {activePhase.desc}
              </p>
            </div>
          </div>

          {/* Phase progress timeline bar */}
          <div className="grid grid-flow-col auto-cols-fr gap-1.5 pt-2">
            {phases.map((p, idx) => {
              const isCurrent = idx === currentPhaseIndex;
              return (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-center border transition-all ${
                    isCurrent
                      ? "bg-purple-950/40 border-purple-500 text-white font-bold"
                      : "bg-neutral-950 border-neutral-800 text-neutral-500"
                  }`}
                >
                  <div className="text-[10px] uppercase truncate">{p.name.split(" ")[0]}</div>
                  <div className="text-xs font-black">{p.duration}s</div>
                </div>
              );
            })}
          </div>

          {/* Tempo Quick Presets */}
          <div className="flex flex-wrap gap-2 justify-center">
            {["3-1-0-1", "3-1-1-0", "4-0-1-0", "2-1-1-1"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTempoString(t);
                  setCurrentPhaseIndex(0);
                  setPhaseSecond(1);
                }}
                className={`px-3 py-2 text-xs rounded-lg border font-mono font-medium ${
                  tempoString === t
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => setSoundActive(!soundActive)}
            className="p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700"
            title="Audio Ticks"
          >
            {soundActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsRunning(false);
                setCurrentPhaseIndex(0);
                setPhaseSecond(1);
                setRepCount(0);
              }}
              className="p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700"
              title="Reiniciar"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                unlockAudio();
                setIsRunning(!isRunning);
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                isRunning
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" /> Iniciar Tempo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
