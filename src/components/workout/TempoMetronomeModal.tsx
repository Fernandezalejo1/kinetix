import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Activity, Minimize2, Maximize2 } from "lucide-react";
import { playTickSound, unlockAudio } from "../../utils/scienceCalculators";
import { useWorkout } from "../../context/WorkoutContext";
import { FocusTrap } from "../FocusTrap";

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
  const [minimized, setMinimized] = useState(false);
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
        { name: "Excéntrico (Bajar / Estirar)", shortName: "Excéntrico", duration: eccentric, color: "text-cyan-400", bg: "bg-cyan-500", desc: "Máxima tensión mecánica en elongación" },
        { name: "Pausa en Estiramiento", shortName: "Pausa Abajo", duration: bottomPause, color: "text-cyan-300", bg: "bg-cyan-500", desc: "Disipa energía elástica para reclutamiento puro" },
        { name: "Concéntrico (Subir / Empujar)", shortName: "Concéntrico", duration: concentric, color: "text-emerald-400", bg: "bg-emerald-500", desc: "Máxima intención de aceleración voluntaria" },
        { name: "Contracción Pico", shortName: "Pico", duration: topPause, color: "text-amber-300", bg: "bg-amber-500", desc: "Estabilidad y control articular" },
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
    let timer: ReturnType<typeof setInterval> | null = null;
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

  // Reset minimized state when modal closes
  useEffect(() => {
    if (!isOpen) setMinimized(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const activePhase = phases[currentPhaseIndex] || phases[0];

  /* ---- Modo mínimo flotante ---- */
  if (minimized) {
    return (
      <div
        id="tempo-metronome-mini"
        className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:inset-x-auto sm:w-72 z-50 animate-slideUp"
      >
        <div className="bg-neutral-900/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl p-3 flex items-center gap-3 safe-area-bottom">
          {/* Phase indicator mini dot */}
          <div className={`w-3 h-3 rounded-full shrink-0 transition-colors duration-300 ${isRunning ? activePhase.bg : "bg-neutral-600"}`} />

          {/* Phase + timer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 truncate">{activePhase.shortName}</span>
              <span className="text-sm font-black font-mono text-white leading-none">{phaseSecond}s</span>
            </div>
            <span className="text-[11px] text-neutral-400">Rep {repCount} · Fase {currentPhaseIndex + 1}/{phases.length}</span>
          </div>

          {/* Controls */}
          <button
            onClick={() => {
              unlockAudio();
              setIsRunning(!isRunning);
            }}
            className={`p-2.5 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${isRunning ? "bg-cyan-600 text-white" : "bg-neutral-800 text-neutral-300 border border-neutral-700"}`}
            title={isRunning ? "Pausar" : "Reanudar"}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={() => setMinimized(false)}
            className="p-2.5 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700"
            title="Expandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <FocusTrap>
      <div
        id="tempo-metronome-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Metrónomo de Tempo"
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Metrónomo de Tempo</h3>
              <p className="text-xs text-neutral-400 truncate">{exerciseName} • {tempoString}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMinimized(true)}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center"
              title="Minimizar como barra flotante"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                onClose();
              }}
              aria-label="Cerrar metrónomo de tempo"
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Metronome Center Visualizer */}
      <div className="p-4 sm:p-6 space-y-6 text-center overflow-y-auto scrollbar-thin flex-1 min-h-0 overscroll-contain pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/* Reps Counter Banner */}
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 rounded-xl border border-neutral-800">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Repeticiones Completadas</span>
            <span className="text-xl font-extrabold text-white">{repCount} <span className="text-xs text-neutral-400 font-normal">reps</span></span>
          </div>

          {/* Big Animated Phase Indicator */}
          <div className="relative py-6 flex flex-col items-center justify-center">
            <div
              className={`w-40 h-40 min-w-[160px] min-h-[160px] rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                isRunning ? "border-cyan-500 shadow-cyan-500/20 scale-105" : "border-neutral-600"
              }`}
            >
              <span className="text-4xl font-black text-white">
                {phaseSecond}
                <span className="text-lg font-normal text-neutral-400">/{activePhase.duration}s</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mt-1">
                Fase {currentPhaseIndex + 1} de {phases.length}
              </span>
            </div>

            <div className="mt-4 px-2">
              <h4
                className={`text-lg font-black tracking-tight leading-tight ${activePhase.color}`}
                title={activePhase.name}
              >
                {activePhase.name}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {activePhase.desc}
              </p>
            </div>

            {/* Progress indicator dots - more visible */}
            <div className="flex items-center gap-2 mt-4" aria-hidden="true">
              {phases.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentPhaseIndex
                      ? "w-6 bg-cyan-500 shadow shadow-cyan-500/40"
                      : idx < currentPhaseIndex
                      ? "w-2.5 bg-cyan-800"
                      : "w-2.5 bg-neutral-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Phase progress timeline bar */}
          <div className="grid grid-flow-col auto-cols-fr gap-2 pt-2">
            {phases.map((p, idx) => {
              const isCurrent = idx === currentPhaseIndex;
              const label = p.shortName || p.name;
              return (
                <div
                  key={idx}
                  title={p.name}
                  className={`p-2.5 rounded-xl text-center border transition-all min-h-[56px] flex flex-col items-center justify-center ${
                    isCurrent
                      ? "bg-cyan-950/50 border-cyan-500 text-white font-bold shadow shadow-cyan-500/10"
                      : "bg-neutral-950 border-neutral-700 text-neutral-300"
                  }`}
                >
                  <div className="text-[12px] font-semibold leading-none whitespace-nowrap">{label}</div>
                  <div className="text-xs font-black mt-1">{p.duration}s</div>
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
                className={`min-h-[36px] px-3.5 py-2 text-xs rounded-xl border font-mono font-bold transition-colors ${
                  tempoString === t
                    ? "bg-cyan-500 border-cyan-400 text-black shadow shadow-cyan-500/20"
                    : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between shrink-0 safe-area-bottom">
          <button
            onClick={() => setSoundActive(!soundActive)}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 flex items-center justify-center"
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
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 flex items-center justify-center"
              title="Reiniciar"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                unlockAudio();
                setIsRunning(!isRunning);
              }}
              className={`flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl text-sm font-bold shadow-lg transition-all ${
                isRunning
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Iniciar Tempo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
};
