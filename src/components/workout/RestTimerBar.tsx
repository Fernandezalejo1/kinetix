// =============================================================
// KINETIX — Cápsula flotante de descanso (RestTimer).
//
// Componente presentacional: NO guarda estado de tiempo. Recibe el restante
// calculado por `useRestTimer` (fuente única = `endAt`) y delega los ajustes
// (−15 s / +30 s / Saltar → onAdjust / onSkip).
//
// Independiente del reloj de sesión (`workoutElapsedTime`): completar una
// serie reinicia SOLO este temporizador, jamás el reloj del header.
//
// LAYOUT: cápsula fija abajo a la derecha, flotando por ENCIMA del contenido.
// No empuja el scroll, no desplaza nada y se eleva automáticamente por encima
// del teclado móvil (visualViewport) y de la zona segura inferior. Plegada
// muestra anillo de progreso + MM:SS; al tocarla despliega −15 s / +30 s /
// Saltar. =============================================================
import React, { useEffect, useState, useRef, useId } from "react";
import { useBackNav } from "../../context/BackNavContext";
import { ChevronUp } from "lucide-react";
import { formatStopwatch } from "../../utils/duration";

interface Props {
  remainingSeconds: number;
  totalSeconds: number;
  exerciseName?: string;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Altura del teclado superpuesto (px). Usa visualViewport para detectarlo
 *  sin asumir comportamiento del navegador (Android redimensiona, iOS no). */
function useKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) {
      setOverlap(0);
      return;
    }
    const measure = () => {
      // Teclado = alto del layout que quedó tapado por el teclado visible.
      const kb = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setOverlap(Math.round(kb));
    };
    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return overlap;
}

export const RestTimerBar: React.FC<Props> = ({
  remainingSeconds,
  totalSeconds,
  exerciseName,
  onAdjust,
  onSkip,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { registerHandler } = useBackNav();
  const kbHeight = useKeyboardOverlap();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    const unregister = registerHandler(`rest-controls-${panelId}`, () => {
      setOpen(false);
      return true;
    }, 250);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      unregister();
    };
  }, [open, panelId, registerHandler]);

  const time = formatStopwatch(remainingSeconds);
  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / Math.max(1, totalSeconds)));

  return (
    <div
      ref={rootRef}
      className="fixed right-3 z-40 flex flex-col items-end select-none"
      style={{
        bottom: `calc(${kbHeight}px + env(safe-area-inset-bottom, 0px) + 0.75rem)`,
      }}
      role="timer"
      aria-label={`Descanso restante: ${time}`}
      data-rest-capsule=""
    >
      {/* Panel de controles (se despliega hacia arriba, nunca tapa la cápsula) */}
      {open && (
        <div id={panelId} className="mb-2 w-[252px] max-w-[calc(100vw-24px)] rounded-2xl bg-neutral-900/95 border border-cyan-500/30 shadow-2xl backdrop-blur px-2.5 py-2.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-2 px-1 pb-1.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300/90 shrink-0">Descanso</span>
            <span className="text-[11px] text-neutral-400 truncate min-w-0">{exerciseName || "Siguiente serie"}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onAdjust(-15)}
              className="min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold tabular-nums press-scale"
            >
              −15 s
            </button>
            <button
              type="button"
              onClick={() => onAdjust(30)}
              className="min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold tabular-nums press-scale"
            >
              +30 s
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="min-h-[44px] rounded-xl bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 text-xs font-bold press-scale"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* Cápsula plegada: anillo + MM:SS + qué sigue */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Descanso ${time}${open ? ", ocultar controles" : ", mostrar controles"}`}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-neutral-900/95 backdrop-blur border border-cyan-500/40 shadow-2xl press-scale min-h-[48px]"
      >
        <span className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r={RADIUS} className="stroke-neutral-700 stroke-2 fill-none" />
            <circle
              cx="18"
              cy="18"
              r={RADIUS}
              className="stroke-cyan-400 stroke-2 fill-none transition-all duration-1000"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * progress}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-xs font-black font-mono tabular-nums text-cyan-300 whitespace-nowrap">
            {time}
          </span>
        </span>
        <span className="text-left min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-cyan-300/80 leading-none">Descanso</span>
          <span className="block text-[11px] text-neutral-300 truncate max-w-[112px] leading-tight mt-0.5">
            {exerciseName || "Siguiente serie"}
          </span>
        </span>
        <ChevronUp
          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

