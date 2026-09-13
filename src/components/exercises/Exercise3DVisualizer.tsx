import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, RotateCw, ZoomIn, ZoomOut, Layers, Compass, Crosshair, Sparkles, Repeat2 } from "lucide-react";
import { Exercise, MuscleGroup } from "../../types";

const ANATOMY_FRONT = "/assets/anatomy/frontal.webp";
const ANATOMY_BACK = "/assets/anatomy/trasera.webp";

const BACK_VIEW_MUSCLES = new Set([
  "lats",
  "upper_back",
  "lower_back",
  "glutes",
  "hamstrings",
  "rear_delts",
  "traps",
  "triceps",
]);

interface Exercise3DVisualizerProps {
  exercise: Exercise;
  className?: string;
}

export const Exercise3DVisualizer: React.FC<Exercise3DVisualizerProps> = ({
  exercise,
  className = "w-full h-80",
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [timelineProgress, setTimelineProgress] = useState(0.3); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [rotationY, setRotationY] = useState(25); // degrees
  const [rotationX, setRotationX] = useState(10); // degrees
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layer toggles
  const [showMuscles, setShowMuscles] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [showJointAngles, setShowJointAngles] = useState(true);

  const allMuscles = useMemo(
    () => [...new Set([...exercise.primaryMuscles, ...exercise.secondaryMuscles])],
    [exercise]
  );

  // Auto-select view side based on the exercise TARGET muscles (primary only):
  // posterior-chain exercises show the back anatomy, the rest show the front.
  const autoViewSide: "front" | "back" = exercise.primaryMuscles.some((m) => BACK_VIEW_MUSCLES.has(m))
    ? "back"
    : "front";
  const [overrideSide, setOverrideSide] = useState<"front" | "back" | null>(null);
  useEffect(() => setOverrideSide(null), [exercise.id]);
  const viewSide: "front" | "back" = overrideSide ?? autoViewSide;

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setTimelineProgress((prev) => {
        const next = prev + delta * 0.4 * playbackSpeed;
        return next > 1 ? 0 : next;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Mouse / Touch Drag for 360 Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationY((prev) => (prev + dx * 0.6) % 360);
    setRotationX((prev) => Math.max(-45, Math.min(45, prev - dy * 0.4)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Compute kinematic animation parameters based on category
  const phaseCycle = (1 - Math.cos(timelineProgress * Math.PI * 2)) / 2; // 0 to 1 and back to 0

  const isPush = exercise.category === "push";
  const isPull = exercise.category === "pull";
  const isLegs = exercise.category === "legs";
  const isCore = exercise.category === "core";

  const elbowAngle = isPush
    ? Math.round(170 - phaseCycle * 90)
    : isPull
    ? Math.round(180 - phaseCycle * 105)
    : Math.round(160 - phaseCycle * 20);

  const shoulderAngle = isPush
    ? Math.round(30 + phaseCycle * 65)
    : isPull
    ? Math.round(165 - phaseCycle * 110)
    : 45;

  const kneeAngle = isLegs
    ? Math.round(175 - phaseCycle * 110)
    : 175;

  const hipAngle = isLegs
    ? Math.round(180 - phaseCycle * 100)
    : isCore
    ? Math.round(180 - phaseCycle * 50)
    : 180;

  // Muscle tension percentage
  const currentTensionPct = Math.round(
    exercise.resistanceProfile === "lengthened"
      ? 60 + phaseCycle * 40
      : exercise.resistanceProfile === "shortened"
      ? 100 - phaseCycle * 40
      : 70 + Math.sin(phaseCycle * Math.PI) * 30
  );

  const has = (m: MuscleGroup) => allMuscles.includes(m);
  const pulse = (base: number) => base + Math.sin(phaseCycle * Math.PI) * 0.2;
  const glow = (opacity: number) => (showMuscles ? pulse(opacity) : 0.9);

  return (
    <div
      className={`relative bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden select-none flex flex-col ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D Viewport Controls Overlay Top */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-lg bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Atlas Anatómico
          </div>
          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/30 text-[11px] font-mono text-purple-300">
            {Math.round(rotationY)}° Azimut | {Math.round(rotationX)}° Tilt
          </span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-700/80 backdrop-blur-md pointer-events-auto">
          <button
            onClick={() => setOverrideSide(viewSide === "front" ? "back" : "front")}
            title="Alternar Frontal / Trasera"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              viewSide === "back" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            }`}
          >
            <Repeat2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowMuscles(!showMuscles)}
            title="Músculos Activos"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showMuscles ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            title="Esqueleto Óseo (X-Ray)"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showSkeleton ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowJointAngles(!showJointAngles)}
            title="Ángulos Articulares"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showJointAngles ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowForceVectors(!showForceVectors)}
            title="Vector de Fuerza"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              showForceVectors ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Interactive Canvas Render */}
      <div className="relative flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden">
        {/* Subtle 3D Grid Floor */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.15) 0%, transparent 70%),
              linear-gradient(to right, #262626 1px, transparent 1px),
              linear-gradient(to bottom, #262626 1px, transparent 1px)`,
            backgroundSize: "100% 100%, 30px 30px, 30px 30px",
            transform: `perspective(600px) rotateX(60deg) rotateZ(${rotationY * 0.2}deg) scale(${zoom})`,
          }}
        />

        {/* Anatomical Figure + Biomechanical Overlays */}
        <div
          className="transition-transform duration-75 flex items-center justify-center"
          style={{
            transform: `perspective(800px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${zoom})`,
            transformStyle: "preserve-3d",
          }}
        >
          <svg viewBox="0 0 300 360" className="w-72 h-80 drop-shadow-2xl overflow-visible">
            <defs>
              <radialGradient id="muscleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="secondaryGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ANATOMICAL BASE IMAGE (front / back) */}
            <image
              href={viewSide === "back" ? ANATOMY_BACK : ANATOMY_FRONT}
              x="0"
              y="0"
              width="300"
              height="360"
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none"
              style={{ opacity: showSkeleton ? 0.35 : 1, transition: "opacity 200ms ease" }}
            />

            {/* X-RAY BONE RIG (optional overlay) */}
            {showSkeleton && (
              <g id="skeleton-bones" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity="0.55">
                <line x1="150" y1="90" x2="150" y2="185" stroke="#a3e3cc" strokeWidth="3" />
                <line x1="125" y1="185" x2="175" y2="185" stroke="#6ee7b7" strokeWidth="4" />
                <line x1="105" y1="95" x2="195" y2="95" stroke="#6ee7b7" strokeWidth="4" />
                <circle cx="150" cy="55" r="16" fill="none" stroke="#34d399" strokeWidth="2" />

                {isLegs ? (
                  <>
                    <line x1="130" y1="185" x2={130 - phaseCycle * 25} y2={250 + phaseCycle * 15} />
                    <line x1={130 - phaseCycle * 25} y1={250 + phaseCycle * 15} x2="125" y2="330" />
                    <line x1="170" y1="185" x2={170 + phaseCycle * 25} y2={250 + phaseCycle * 15} />
                    <line x1={170 + phaseCycle * 25} y1={250 + phaseCycle * 15} x2="175" y2="330" />
                  </>
                ) : (
                  <>
                    <line x1="130" y1="185" x2="125" y2="260" />
                    <line x1="125" y1="260" x2="125" y2="330" />
                    <line x1="170" y1="185" x2="175" y2="260" />
                    <line x1="175" y1="260" x2="175" y2="330" />
                  </>
                )}

                {isPush ? (
                  <>
                    <line x1="105" y1="95" x2={70 + (1 - phaseCycle) * 20} y2={110 + phaseCycle * 35} />
                    <line x1={70 + (1 - phaseCycle) * 20} y1={110 + phaseCycle * 35} x2="95" y2={115 + phaseCycle * 25} />
                    <line x1="195" y1="95" x2={230 - (1 - phaseCycle) * 20} y2={110 + phaseCycle * 35} />
                    <line x1={230 - (1 - phaseCycle) * 20} y1={110 + phaseCycle * 35} x2="205" y2={115 + phaseCycle * 25} />
                  </>
                ) : isPull ? (
                  <>
                    <line x1="105" y1="95" x2={80 - phaseCycle * 10} y2={60 + phaseCycle * 55} />
                    <line x1={80 - phaseCycle * 10} y1={60 + phaseCycle * 55} x2="100" y2={40 + phaseCycle * 65} />
                    <line x1="195" y1="95" x2={220 + phaseCycle * 10} y2={60 + phaseCycle * 55} />
                    <line x1={220 + phaseCycle * 10} y1={60 + phaseCycle * 55} x2="200" y2={40 + phaseCycle * 65} />
                  </>
                ) : (
                  <>
                    <line x1="105" y1="95" x2="85" y2="145" />
                    <line x1="85" y1="145" x2="80" y2="195" />
                    <line x1="195" y1="95" x2="215" y2="145" />
                    <line x1="215" y1="145" x2="220" y2="195" />
                  </>
                )}
              </g>
            )}

            {/* MUSCLE HIGHLIGHT OVERLAY */}
            {showMuscles && (
              <g id="muscle-highlights" filter="url(#neonGlow)">
                {/* FRONT VIEW MUSCLES */}
                {viewSide === "front" && (
                  <>
                    {/* Chest */}
                    {(has("chest")) && (
                      <path
                        d="M115 100 Q150 95 185 100 L180 135 Q150 145 120 135 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.85)}
                      />
                    )}

                    {/* Delts */}
                    {(has("front_delts") || has("side_delts")) && (
                      <>
                        <circle cx="105" cy="95" r="15" fill="url(#muscleGlow)" opacity={glow(0.9)} />
                        <circle cx="195" cy="95" r="15" fill="url(#muscleGlow)" opacity={glow(0.9)} />
                      </>
                    )}

                    {/* Biceps */}
                    {has("biceps") && (
                      <>
                        <ellipse cx="84" cy="122" rx="9" ry="20" fill="url(#muscleGlow)" opacity={glow(0.95)} />
                        <ellipse cx="216" cy="122" rx="9" ry="20" fill="url(#muscleGlow)" opacity={glow(0.95)} />
                      </>
                    )}

                    {/* Forearms */}
                    {has("forearms") && (
                      <>
                        <ellipse cx="82" cy="165" rx="7" ry="16" fill="url(#muscleGlow)" opacity={glow(0.7)} />
                        <ellipse cx="218" cy="165" rx="7" ry="16" fill="url(#muscleGlow)" opacity={glow(0.7)} />
                      </>
                    )}

                    {/* Abs */}
                    {has("abs") && (
                      <path
                        d="M133 152 Q150 148 167 152 L164 192 Q150 198 136 192 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.85)}
                      />
                    )}

                    {/* Quads */}
                    {(has("quads")) && (
                      <>
                        <ellipse cx={130 - phaseCycle * 8} cy="224" rx="14" ry="26" fill="url(#muscleGlow)" opacity={glow(0.88)} />
                        <ellipse cx={170 + phaseCycle * 8} cy="224" rx="14" ry="26" fill="url(#muscleGlow)" opacity={glow(0.88)} />
                      </>
                    )}
                  </>
                )}

                {/* BACK VIEW MUSCLES */}
                {viewSide === "back" && (
                  <>
                    {/* Lats / Upper back */}
                    {(has("lats") || has("upper_back")) && (
                      <path
                        d="M110 105 Q150 115 190 105 L175 168 Q150 162 125 168 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.88)}
                      />
                    )}

                    {/* Traps */}
                    {has("traps") && (
                      <path
                        d="M120 72 Q150 65 180 72 L172 92 Q150 87 128 92 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.85)}
                      />
                    )}

                    {/* Rear delts */}
                    {has("rear_delts") && (
                      <>
                        <circle cx="105" cy="95" r="15" fill="url(#muscleGlow)" opacity={glow(0.9)} />
                        <circle cx="195" cy="95" r="15" fill="url(#muscleGlow)" opacity={glow(0.9)} />
                      </>
                    )}

                    {/* Triceps */}
                    {has("triceps") && (
                      <>
                        <ellipse cx="84" cy="122" rx="9" ry="20" fill="url(#muscleGlow)" opacity={glow(0.95)} />
                        <ellipse cx="216" cy="122" rx="9" ry="20" fill="url(#muscleGlow)" opacity={glow(0.95)} />
                      </>
                    )}

                    {/* Lower back / Erectors */}
                    {has("lower_back") && (
                      <path
                        d="M137 176 Q150 173 163 176 L163 202 Q150 207 137 202 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.82)}
                      />
                    )}

                    {/* Glutes / Hamstrings */}
                    {(has("glutes") || has("hamstrings")) && (
                      <path
                        d="M120 182 Q150 177 180 182 L185 218 Q150 228 115 218 Z"
                        fill="url(#muscleGlow)"
                        opacity={glow(0.88)}
                      />
                    )}

                    {/* Calves */}
                    {has("calves") && (
                      <>
                        <ellipse cx="128" cy="290" rx="10" ry="20" fill="url(#muscleGlow)" opacity={glow(0.85)} />
                        <ellipse cx="172" cy="290" rx="10" ry="20" fill="url(#muscleGlow)" opacity={glow(0.85)} />
                      </>
                    )}
                  </>
                )}
              </g>
            )}

            {/* FORCE VECTORS & TRAJECTORY PATH */}
            {showForceVectors && (
              <g id="force-vectors">
                <path
                  d="M150 70 L150 150"
                  stroke="#c084fc"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <line
                  x1="150"
                  y1={isPull ? 140 : 120}
                  x2="150"
                  y2={isPull ? 175 : 85}
                  stroke="#a855f7"
                  strokeWidth="3.5"
                  markerEnd="url(#arrowhead)"
                />
                <circle cx="150" cy={isPull ? 175 : 85} r="4" fill="#c084fc" />
              </g>
            )}

            {/* REAL-TIME JOINT ANGLE HUD MARKERS */}
            {showJointAngles && (
              <g id="joint-angles" fontSize="10" fontFamily="monospace" fontWeight="bold">
                <rect x="18" y="105" width="55" height="18" rx="4" fill="#09090b" stroke="#06b6d4" strokeWidth="1" />
                <text x="23" y="118" fill="#22d3ee">Codo:{elbowAngle}°</text>

                <rect x="225" y="85" width="60" height="18" rx="4" fill="#09090b" stroke="#a855f7" strokeWidth="1" />
                <text x="230" y="98" fill="#c084fc">Hombro:{shoulderAngle}°</text>

                {isLegs && (
                  <>
                    <rect x="225" y="245" width="65" height="18" rx="4" fill="#09090b" stroke="#10b981" strokeWidth="1" />
                    <text x="230" y="258" fill="#34d399">Rodilla:{kneeAngle}°</text>
                    <rect x="18" y="180" width="65" height="18" rx="4" fill="#09090b" stroke="#f59e0b" strokeWidth="1" />
                    <text x="23" y="193" fill="#fbbf24">Cadera:{hipAngle}°</text>
                  </>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Live Tension Meter HUD Card Bottom-Right */}
        <div className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-neutral-950/90 border border-neutral-800 backdrop-blur-md text-xs space-y-1.5 shadow-xl pointer-events-none">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[11px] uppercase font-bold text-neutral-400">Tensión Muscular</span>
            <span className="font-mono font-bold text-cyan-400">{currentTensionPct}%</span>
          </div>
          <div className="w-32 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-75"
              style={{ width: `${currentTensionPct}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{phaseCycle > 0.6 ? "Excéntrico / Estiramiento" : phaseCycle < 0.2 ? "Bloqueo / Acortamiento" : "Concéntrico"}</span>
            <span className="font-bold text-purple-400">{exercise.resistanceProfile}</span>
          </div>
        </div>

        {/* Drag Guidance Prompt */}
        <div className="absolute top-12 left-3 text-[11px] text-neutral-400/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none">
          Arrastra para rotar 360° | Zoom con botones
        </div>
      </div>

      {/* Playback Controls & Timeline Bar Bottom */}
      <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 flex flex-col gap-2 z-20">
        {/* Scrub Timeline */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={timelineProgress}
            onChange={(e) => {
              setIsPlaying(false);
              setTimelineProgress(parseFloat(e.target.value));
            }}
            className="flex-1 accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />

          <span className="text-[11px] font-mono text-neutral-400 w-10 text-right">
            {Math.round(timelineProgress * 100)}%
          </span>
        </div>

        {/* Action Buttons (Speed, Zoom, Reset Angle) */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-900">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400">Velocidad:</span>
            {[0.5, 1, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  playbackSpeed === spd
                    ? "bg-neutral-800 text-cyan-400 border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-300"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setRotationY(25);
                setRotationX(10);
                setZoom(1);
              }}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
              title="Reiniciar Cámara 3D"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};