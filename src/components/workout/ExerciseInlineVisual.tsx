import { mediaBackdrop } from "../../utils/mediaBackdrop";
import React, { useState, useMemo, useRef, useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "../FocusTrap";
import { useBackNav } from "../../context/BackNavContext";
import { Play, Pause, Repeat, Maximize2, Minimize2, StickyNote, RotateCcw, ImageOff } from "lucide-react";
import { Exercise } from "../../types";

/**
 * Visualización directa del ejercicio, estilo Hevy/GymVisual:
 * video real del movimiento sin tener que abrir la ficha.
 *
 * MEJORAS (UX):
 * - Tamaño ESTABLE desde la carga: el contenedor reserva el espacio
 *   (aspect-ratio 16:9 + altura máxima fija) y el medio va «absolute-fill»
 *   con object-contain. Nunca hay un «salto»/encogimiento al cargar.
 * - Botón AMPLIAR: abre el video/animación a pantalla completa con el
 *   movimiento completo (object-contain, sin recortes). Al cerrar se
 *   restaura la posición de scroll y los datos de la sesión no se tocan.
 * - ALTERNATIVA si falla el archivo: cadena mp4 → gif → poster → aviso con
 *   reintento y acceso al tutorial (en vez de un rectángulo negro mudo).
 * - Renombrado «Notas» → «Técnica»: solo muestra instrucciones de ejecución.
 * - Menos duplicados: el nombre ya vive en la cabecera del ejercicio, no se
 *   repite acá (salvo en modo compacto, donde el preview no tiene cabecera).
 */
interface Props {
  exercise: Exercise;
  cue?: string;
  onTutorial?: () => void;
  onReplace?: () => void;
  compact?: boolean;
  onGoToSets?: () => void;
}

type MediaKind = "video" | "gif" | "poster";

export const ExerciseInlineVisual: React.FC<Props> = (props) => (
  <ExerciseVisualContent key={props.exercise.id} {...props} />
);

const ExerciseVisualContent: React.FC<Props> = ({
  exercise,
  cue,
  onTutorial,
  onReplace,
  compact = false,
  onGoToSets,
}) => {
  const [showTechnique, setShowTechnique] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [backdrop, setBackdrop] = useState("#0a0a0a");
  const [slowLoading, setSlowLoading] = useState(false);
  const [inView, setInView] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { registerHandler } = useBackNav();
  const overlayId = useId();
  const mediaRoot = useRef<HTMLDivElement>(null);
  const manualPause = useRef(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const expandedVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackPosition = useRef(0);
  const scrollRestore = useRef<{ el: HTMLElement | null; top: number }>({ el: null, top: 0 });

  const mainCue =
    cue ??
    exercise.executionCues?.[0] ??
    exercise.setupCues?.[0] ??
    "Prioriza buena ejecución y controla el recorrido.";

  /** Cadena de respaldo del archivo: mp4 → gif → poster → aviso. */
  const candidates = useMemo(() => {
    const list: { kind: MediaKind; src: string }[] = [];
    if (exercise.videoUrl?.endsWith(".mp4")) list.push({ kind: "video", src: exercise.videoUrl });
    if (exercise.gifUrl) list.push({ kind: "gif", src: exercise.gifUrl });
    if (exercise.videoPosterUrl) list.push({ kind: "poster", src: exercise.videoPosterUrl });
    return list;
  }, [exercise]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const current = candidates[Math.min(candidateIdx, candidates.length - 1)];
  const mediaFailed = candidateIdx >= candidates.length || !current;
  const isVideo = current?.kind === "video";

  // Al cambiar de candidato, volver a mostrar el esqueleto hasta que cargue.
  const selectCandidate = (idx: number) => {
    setCandidateIdx(idx);
    setLoaded(false);
    setPlaying(!reducedMotion);
    setBackdrop("#0a0a0a");
  };
  const handleMediaError = () => {
    if (candidateIdx < candidates.length) selectCandidate(candidateIdx + 1);
  };

  const handleLoaded = (media: HTMLVideoElement | HTMLImageElement) => {
    setLoaded(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 8;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(media, 0, 0, 8, 8);
      // 4 esquinas × bloque 2×2 (16 muestras): promedia el ruido de compresión
      // en vez de un solo píxel por esquina (un artefacto cambiaba las bandas).
      const samples: number[][] = [];
      for (const [cx, cy] of [[0, 0], [6, 0], [0, 6], [6, 6]]) {
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            samples.push(Array.from(ctx.getImageData(cx + dx, cy + dy, 1, 1).data).slice(0, 3));
          }
        }
      }
      setBackdrop(mediaBackdrop(samples));
    } catch { /* Cross-origin sources retain a neutral frame. */ }
  };

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReducedMotion(preference.matches); if (preference.matches) { videoRef.current?.pause(); expandedVideoRef.current?.pause(); setPlaying(false); } };
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setSlowLoading(false);
    if (loaded || mediaFailed) return;
    const timer = window.setTimeout(() => setSlowLoading(true), 10000);
    return () => window.clearTimeout(timer);
  }, [loaded, mediaFailed, candidateIdx]);

  useEffect(() => {
    const root = mediaRoot.current;
    if (!root) return;
    const update = () => {
      const video = videoRef.current;
      const bounds = root.getBoundingClientRect();
      const visible = bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight && !document.hidden;
      setInView(visible);
      if (!video) return;
      if (!visible || expanded) video.pause();
      else if (!manualPause.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) void video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(update, { threshold: [0, 0.1] });
    observer.observe(root);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [expanded, candidateIdx]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) {
      setPlaying((p) => !p);
      return;
    }
    manualPause.current = !v.paused;
    if (v.paused) {
      void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const openExpanded = useCallback(() => {
    playbackPosition.current = videoRef.current?.currentTime ?? 0;
    // Guardar posición del scroll del entrenamiento para restaurarlo al cerrar.
    const scroller = document.querySelector(
      "#live-workout-logger .overflow-y-auto"
    ) as HTMLElement | null;
    scrollRestore.current = scroller ? { el: scroller, top: scroller.scrollTop } : { el: null, top: 0 };
    setExpanded(true);
  }, []);

  const closeExpanded = useCallback(() => {
    if (expandedVideoRef.current && videoRef.current) {
      videoRef.current.currentTime = expandedVideoRef.current.currentTime;
    }
    setExpanded(false);
    const { el, top } = scrollRestore.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = top;
      });
    }
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const video = videoRef.current;
    const resume = video ? !video.paused : false;
    video?.pause();
    const scroller = scrollRestore.current.el;
    const overflow = scroller?.style.overflowY;
    if (scroller) scroller.style.overflowY = "hidden";
    const unregister = registerHandler(`exercise-media-${overlayId}`, () => {
      closeExpanded();
      return true;
    }, 300);
    return () => {
      unregister();
      if (scroller) scroller.style.overflowY = overflow ?? "";
      if (resume && video?.isConnected) void video.play().catch(() => setPlaying(false));
    };
  }, [expanded, closeExpanded, registerHandler, overlayId]);

  /** Media en tamaño natural dentro de un contenedor con relación fija. */
  const renderInlineMedia = () => {
    if (mediaFailed) return <MediaFallback onRetry={() => selectCandidate(0)} onTutorial={onTutorial} />;
    if (isVideo) {
      return (
        <video
          ref={videoRef}
          key={current.src}
          src={current.src}
          poster={exercise.videoPosterUrl}
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={e => handleLoaded(e.currentTarget)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={handleMediaError}
          onClick={togglePlay}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
          aria-label={`Demostración de ${exercise.nameEs}`}
        />
      );
    }
    if (current.kind === "gif" && (!playing || !inView || expanded)) return exercise.videoPosterUrl
      ? <img src={exercise.videoPosterUrl} alt={`${exercise.nameEs} · demostración pausada`} className="absolute inset-0 w-full h-full object-contain" />
      : <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">Demostración pausada</div>;
    return (
      <img
        key={current.src}
        src={current.src}
        alt={`${exercise.nameEs} - demostración`}
        loading="lazy"
        onLoad={e => handleLoaded(e.currentTarget)}
        onError={handleMediaError}
        className="absolute inset-0 w-full h-full object-contain"
      />
    );
  };

  /** Media en el overlay ampliado: llena la pantalla sin recortar. */
  const renderExpandedMedia = () => {
    if (mediaFailed) return <MediaFallback onRetry={() => selectCandidate(0)} onTutorial={onTutorial ? () => { closeExpanded(); onTutorial(); } : undefined} />;
    if (isVideo) {
      return (
        <video
          key={`x-${current.src}`}
          ref={expandedVideoRef}
          src={current.src}
          poster={exercise.videoPosterUrl}
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          controls
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration)) video.currentTime = Math.min(playbackPosition.current, video.duration);
          }}
          onError={handleMediaError}
          className="w-full h-full object-contain"
          aria-label={`Demostración ampliada de ${exercise.nameEs}`}
        />
      );
    }
    if (current.kind === "gif" && !playing) return <button className="min-h-[48px] px-4 rounded-xl bg-neutral-800 text-white" onClick={() => setPlaying(true)}>Reproducir animación</button>;
    return (
      <img
        key={`x-${current.src}`}
        src={current.src}
        alt={`${exercise.nameEs} - demostración ampliada`}
        onError={handleMediaError}
        className="w-full h-full object-contain"
      />
    );
  };

  return (
    <div className="px-2 sm:px-5 pt-2">
      {/* Altura estable y generosa; contain conserva el movimiento completo. */}
      <div
        ref={mediaRoot}
        className="relative w-full mx-auto overflow-hidden rounded-2xl bg-black border border-neutral-800 shadow-xl"
        style={{ backgroundColor: backdrop, ...(compact ? { aspectRatio: "16 / 9", maxHeight: 210 } : { height: "clamp(260px, 44dvh, 440px)" }) }}
      >
        {renderInlineMedia()}
        {(isVideo || current?.kind === "gif") && !mediaFailed && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar demostración" : "Continuar demostración"}
            className="absolute bottom-2 left-2 z-10 min-h-[44px] min-w-[44px] rounded-xl bg-black/70 border border-white/20 text-white flex items-center justify-center"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}

        {/* Esqueleto mientras carga el archivo (nunca cambia el tamaño de la caja) */}
        {!loaded && !mediaFailed && (isVideo || playing) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-950/60 animate-shimmer" aria-hidden="true">
            <span className="w-5 h-5 rounded-full border-2 border-neutral-700 border-t-cyan-400 animate-spin" />
          </div>
        )}

        {/* Play cuando el video está pausado */}
        {isVideo && !playing && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Reproducir demostración"
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <span className="p-3.5 rounded-full bg-white text-black shadow-2xl">
              <Play className="w-5 h-5 fill-black" />
            </span>
          </button>
        )}

        {/* Botón AMPLIAR: movimiento completo, sin recortes */}
        {!mediaFailed && (
          <button
            type="button"
            onClick={openExpanded}
            aria-label="Ampliar video (pantalla completa)"
            title="Ampliar video"
            className="absolute top-2 right-2 min-h-[44px] min-w-[44px] rounded-xl bg-black/60 border border-white/20 text-white hover:bg-black/80 backdrop-blur flex items-center justify-center press-scale"
          >
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {slowLoading && !loaded && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-300" role="status">La demostración tarda en cargar.
        <button className="min-h-[44px] px-3 underline" onClick={handleMediaError}>Probar alternativa</button>
      </div>}
      {onGoToSets && <button type="button" onClick={onGoToSets} className="mt-2 w-full md:hidden min-h-[44px] rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 text-sm font-bold hover:bg-cyan-500/20">Ir a la serie actual ↓</button>}

      {/* Cue único + acciones. El nombre del ejercicio NO se repite (vive en la
          cabecera de la card), salvo en modo compacto que no tiene cabecera. */}
      <div className="pt-2.5">
        {compact && (
          <p className="text-sm font-black text-white leading-tight line-clamp-1 mb-1">{exercise.nameEs}</p>
        )}
        <p className="text-sm text-neutral-300 leading-relaxed">{mainCue}</p>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {onTutorial && (
            <button
              type="button"
              onClick={onTutorial}
              className="flex-1 min-w-[90px] min-h-[56px] px-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-[13px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors press-scale"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              Tutorial
            </button>
          )}
          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="flex-1 min-w-[90px] min-h-[56px] px-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-[13px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors press-scale"
            >
              <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
              Reemplazar
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTechnique((v) => !v)}
            aria-expanded={showTechnique}
            className={`flex-1 min-w-[90px] min-h-[56px] px-2 rounded-full text-[13px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors border press-scale ${
              showTechnique
                ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/40"
                : "bg-neutral-800 text-neutral-100 border-transparent hover:bg-neutral-700"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
            Técnica
          </button>
        </div>

        {showTechnique && (
          <div className="mt-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-1 animate-fadeIn">
            <p>
              <strong className="text-white">Posición inicial:</strong>{" "}
              {exercise.setupCues?.[0] ?? "—"}
            </p>
            <p>
              <strong className="text-white">Ejecución:</strong>{" "}
              {(exercise.executionCues ?? []).slice(0, 2).join(" · ") || "—"}
            </p>
            <p className="text-neutral-400 font-mono">
              Tempo {exercise.defaultTempo ?? "—"} · RIR {exercise.defaultRir ?? "—"}
            </p>
          </div>
        )}
      </div>

      {/* Overlay ampliado: pantalla completa, sin recortes del movimiento.
          Al cerrar se restaura el scroll y la sesión queda intacta. */}
      {expanded && createPortal(
        <FocusTrap>
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`${exercise.nameEs} ampliado`}
        >
          <div className="shrink-0 flex items-center justify-between gap-3 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
            <span className="text-sm font-black text-white truncate min-w-0">{exercise.nameEs}</span>
            {current?.kind === "gif" && <button type="button" className="min-h-[44px] px-3 text-sm rounded-xl bg-neutral-800 text-white" onClick={() => setPlaying(value => !value)}>{playing ? "Pausar" : "Reproducir"}</button>}
            <button
              type="button"
              onClick={closeExpanded}
              aria-label="Cerrar video ampliado"
              className="shrink-0 min-h-[44px] min-w-[44px] rounded-xl bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 flex items-center justify-center press-scale"
            >
              <Minimize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex-1 min-h-0 flex items-center justify-center p-3" style={{ backgroundColor: backdrop }}>
            {renderExpandedMedia()}
          </div>
          <div className="shrink-0 text-center text-[11px] text-neutral-400 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] line-clamp-2">
            {mainCue}
          </div>
        </div>
        </FocusTrap>, document.body
      )}
    </div>
  );
};

/** Alternativa cuando el archivo falla: reintento + tutorial (nunca un
 *  rectángulo negro mudo). */
const MediaFallback: React.FC<{ onRetry: () => void; onTutorial?: () => void }> = ({ onRetry, onTutorial }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-neutral-950 px-6 text-center">
    <ImageOff className="w-6 h-6 text-neutral-500" aria-hidden="true" />
    <p className="text-xs text-neutral-400 leading-snug">
      No se pudo cargar el video de este ejercicio.
    </p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[40px] px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold flex items-center gap-1.5 press-scale"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        Reintentar
      </button>
      {onTutorial && (
        <button
          type="button"
          onClick={onTutorial}
          className="min-h-[40px] px-3 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold press-scale"
        >
          Ver tutorial
        </button>
      )}
    </div>
  </div>
);

/** Miniatura para carrusel / listas (poster > gif > inicial).
 *  Con `showLabel` muestra el nombre corto debajo + estados activo/completado. */
export const ExerciseThumb: React.FC<{
  exercise: Exercise;
  size?: number;
  active?: boolean;
  done?: boolean;
  onClick?: () => void;
  label?: string;
  showLabel?: boolean;
}> = ({ exercise, size = 56, active, done, onClick, label, showLabel = false }) => {
  const thumbRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!active || !showLabel) return;
    const thumb = thumbRef.current;
    const rail = thumb?.parentElement?.parentElement;
    if (!thumb || !rail) return;
    const item = thumb.getBoundingClientRect();
    const bounds = rail.getBoundingClientRect();
    const delta = item.left < bounds.left ? item.left - bounds.left - 8
      : item.right > bounds.right ? item.right - bounds.right + 8 : 0;
    if (delta) rail.scrollBy({ left: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active, showLabel]);
  const src = exercise.videoPosterUrl ?? exercise.gifUrl ?? null;
  const fullLabel = label ?? exercise.nameEs;
  const shortLabel = (label ?? exercise.nameEs).replace(/\s+/g, " ").trim();

  const inner = src ? (
    <img
      src={src}
      alt={fullLabel}
      loading="lazy"
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="text-lg font-black text-neutral-300">
      {exercise.nameEs.charAt(0)}
    </span>
  );

  const circle = (
    <button
      ref={thumbRef}
      aria-current={active ? "step" : undefined}
      type="button"
      onClick={onClick}
      aria-label={fullLabel}
      title={exercise.nameEs}
      className={`relative rounded-full overflow-hidden bg-neutral-800 border-2 shrink-0 flex items-center justify-center transition-all press-scale ${
        active
          ? "border-cyan-400 scale-110 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
          : done
            ? "border-emerald-500/70 opacity-90"
            : "border-neutral-700 opacity-70"
      }`}
      style={{ width: size, height: size }}
    >
      {inner}
      {done && (
        <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-cyan-500 text-neutral-950 text-[11px] font-black flex items-center justify-center border-2 border-neutral-950">
          ✓
        </span>
      )}
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
      )}
    </button>
  );

  if (!showLabel) return circle;

  return (
    <div
      className={`flex flex-col items-center gap-1 shrink-0 w-[66px] transition-opacity ${
        active ? "opacity-100" : done ? "opacity-90" : "opacity-75"
      }`}
    >
      {circle}
      <span
        className={`w-full text-center truncate text-[11px] font-bold leading-tight ${
          active ? "text-cyan-300" : done ? "text-emerald-300" : "text-neutral-400"
        }`}
      >
        {shortLabel}
      </span>
    </div>
  );
};

