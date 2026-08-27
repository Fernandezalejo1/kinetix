import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCw, ZoomIn, ZoomOut, Eye, Layers, Compass, Crosshair, Sparkles } from "lucide-react";
import { Exercise } from "../../types";

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
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [showJointAngles, setShowJointAngles] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"full" | "xray" | "muscles" | "kinematics">("full");

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
  // timelineProgress: 0 = start, 0.5 = maximum stretch / depth, 1 = finish
  // Smooth cosine wave
  const phaseCycle = (1 - Math.cos(timelineProgress * Math.PI * 2)) / 2; // 0 to 1 and back to 0

  // Category specific joint kinematics
  const isPush = exercise.category === "push";
  const isPull = exercise.category === "pull";
  const isLegs = exercise.category === "legs";
  const isCore = exercise.category === "core";

  // Joint angle calculations based on phaseCycle
  const elbowAngle = isPush
    ? Math.round(170 - phaseCycle * 90) // 170° (lockout) down to 80° (chest touch)
    : isPull
    ? Math.round(180 - phaseCycle * 105) // 180° (stretch) down to 75° (peak pull)
    : Math.round(160 - phaseCycle * 20);

  const shoulderAngle = isPush
    ? Math.round(30 + phaseCycle * 65)
    : isPull
    ? Math.round(165 - phaseCycle * 110)
    : 45;

  const kneeAngle = isLegs
    ? Math.round(175 - phaseCycle * 110) // 175° down to 65° in deep squat
    : 175;

  const hipAngle = isLegs
    ? Math.round(180 - phaseCycle * 100) // 180° down to 80°
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
            3D Biomechanics Engine
          </div>
          <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/30 text-[10px] font-mono text-purple-300">
            {Math.round(rotationY)}° Azimut | {Math.round(rotationX)}° Tilt
          </span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-700/80 backdrop-blur-md pointer-events-auto">
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
            title="Esqueleto Óseo"
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

      {/* 3D Interactive Canvas Render (Isometric SVG 3D Biomechanical Rig) */}
      <div className="relative flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden">
        {/* Subtle 3D Grid Floor */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.15) 0%, transparent 70%),
              linear-gradient(to right, #262626 1px, transparent 1px),
              linear-gradient(to bottom, #262626 1px, transparent 1px)`,
            backgroundSize: "100% 100%, 30px 30px, 30px 30px",
            transform: `perspective(600px) rotateX(60deg) rotateZ(${rotationY * 0.2}deg) scale(${zoom})`,
          }}
        />

        {/* 3D Humanoid / Kinematic Model */}
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
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
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

            {/* SKELETON BASE RIG */}
            {showSkeleton && (
              <g id="skeleton-bones" stroke="#737373" strokeWidth="3.5" strokeLinecap="round">
                {/* Spine */}
                <line x1="150" y1="90" x2="150" y2="185" stroke="#a3a3a3" strokeWidth="4" />

                {/* Pelvis bar */}
                <line x1="125" y1="185" x2="175" y2="185" stroke="#d4d4d4" strokeWidth="5" />

                {/* Shoulder girdle */}
                <line x1="105" y1="95" x2="195" y2="95" stroke="#d4d4d4" strokeWidth="5" />

                {/* Head */}
                <circle cx="150" cy="55" r="18" fill="#171717" stroke="#06b6d4" strokeWidth="2.5" />

                {/* LEGS KINEMATICS */}
                {isLegs ? (
                  <>
                    {/* Left Leg: Hip -> Knee (dynamic flex) -> Ankle */}
                    <line
                      x1="130"
                      y1="185"
                      x2={130 - phaseCycle * 25}
                      y2={250 + phaseCycle * 15}
                      stroke="#06b6d4"
                      strokeWidth="5"
                    />
                    <line
                      x1={130 - phaseCycle * 25}
                      y1={250 + phaseCycle * 15}
                      x2="125"
                      y2="330"
                      stroke="#06b6d4"
                      strokeWidth="5"
                    />

                    {/* Right Leg: Hip -> Knee -> Ankle */}
                    <line
                      x1="170"
                      y1="185"
                      x2={170 + phaseCycle * 25}
                      y2={250 + phaseCycle * 15}
                      stroke="#06b6d4"
                      strokeWidth="5"
                    />
                    <line
                      x1={170 + phaseCycle * 25}
                      y1={250 + phaseCycle * 15}
                      x2="175"
                      y2="330"
                      stroke="#06b6d4"
                      strokeWidth="5"
                    />

                    {/* Feet */}
                    <line x1="110" y1="330" x2="135" y2="330" stroke="#a3a3a3" strokeWidth="4" />
                    <line x1="165" y1="330" x2="190" y2="330" stroke="#a3a3a3" strokeWidth="4" />
                  </>
                ) : (
                  <>
                    {/* Static standard legs */}
                    <line x1="130" y1="185" x2="125" y2="260" stroke="#525252" />
                    <line x1="125" y1="260" x2="125" y2="330" stroke="#525252" />
                    <line x1="170" y1="185" x2="175" y2="260" stroke="#525252" />
                    <line x1="175" y1="260" x2="175" y2="330" stroke="#525252" />
                  </>
                )}

                {/* ARMS KINEMATICS */}
                {isPush ? (
                  <>
                    {/* Left Arm: Shoulder (105,95) -> Elbow -> Hand */}
                    <line
                      x1="105"
                      y1="95"
                      x2={70 + (1 - phaseCycle) * 20}
                      y2={110 + phaseCycle * 35}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />
                    <line
                      x1={70 + (1 - phaseCycle) * 20}
                      y1={110 + phaseCycle * 35}
                      x2="95"
                      y2={115 + phaseCycle * 25}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />

                    {/* Right Arm: Shoulder (195,95) -> Elbow -> Hand */}
                    <line
                      x1="195"
                      y1="95"
                      x2={230 - (1 - phaseCycle) * 20}
                      y2={110 + phaseCycle * 35}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />
                    <line
                      x1={230 - (1 - phaseCycle) * 20}
                      y1={110 + phaseCycle * 35}
                      x2="205"
                      y2={115 + phaseCycle * 25}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />

                    {/* Barbell / Dumbbells */}
                    <line
                      x1="70"
                      y1={115 + phaseCycle * 25}
                      x2="230"
                      y2={115 + phaseCycle * 25}
                      stroke="#e2e8f0"
                      strokeWidth="6"
                      strokeLinecap="square"
                    />
                    {/* Weight plates */}
                    <rect x="60" y={95 + phaseCycle * 25} width="10" height="40" rx="3" fill="#06b6d4" />
                    <rect x="230" y={95 + phaseCycle * 25} width="10" height="40" rx="3" fill="#06b6d4" />
                  </>
                ) : isPull ? (
                  <>
                    {/* Pulling kinematics */}
                    <line
                      x1="105"
                      y1="95"
                      x2={80 - phaseCycle * 10}
                      y2={60 + phaseCycle * 55}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />
                    <line
                      x1={80 - phaseCycle * 10}
                      y1={60 + phaseCycle * 55}
                      x2="100"
                      y2={40 + phaseCycle * 65}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />
                    <line
                      x1="195"
                      y1="95"
                      x2={220 + phaseCycle * 10}
                      y2={60 + phaseCycle * 55}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />
                    <line
                      x1={220 + phaseCycle * 10}
                      y1={60 + phaseCycle * 55}
                      x2="200"
                      y2={40 + phaseCycle * 65}
                      stroke="#22d3ee"
                      strokeWidth="5"
                    />

                    {/* Pulldown bar */}
                    <line
                      x1="70"
                      y1={40 + phaseCycle * 65}
                      x2="230"
                      y2={40 + phaseCycle * 65}
                      stroke="#38bdf8"
                      strokeWidth="5"
                    />
                  </>
                ) : (
                  <>
                    {/* Neutral arms */}
                    <line x1="105" y1="95" x2="85" y2="145" stroke="#737373" />
                    <line x1="85" y1="145" x2="80" y2="195" stroke="#737373" />
                    <line x1="195" y1="95" x2="215" y2="145" stroke="#737373" />
                    <line x1="215" y1="145" x2="220" y2="195" stroke="#737373" />
                  </>
                )}
              </g>
            )}

            {/* MUSCLE OVERLAY MESH */}
            {showMuscles && (
              <g id="muscle-highlights" filter="url(#neonGlow)">
                {/* Chest Glow */}
                {(exercise.primaryMuscles.includes("chest") || exercise.secondaryMuscles.includes("chest")) && (
                  <path
                    d="M115 100 Q150 95 185 100 L180 135 Q150 145 120 135 Z"
                    fill="url(#muscleGlow)"
                    opacity={0.8 + Math.sin(phaseCycle * Math.PI) * 0.2}
                  />
                )}

                {/* Lats / Back Glow */}
                {(exercise.primaryMuscles.includes("lats") || exercise.primaryMuscles.includes("upper_back")) && (
                  <path
                    d="M110 105 Q150 115 190 105 L175 165 Q150 160 125 165 Z"
                    fill="url(#muscleGlow)"
                    opacity={0.8 + Math.sin(phaseCycle * Math.PI) * 0.2}
                  />
                )}

                {/* Quads Glow */}
                {(exercise.primaryMuscles.includes("quads") || exercise.secondaryMuscles.includes("quads")) && (
                  <>
                    <ellipse
                      cx={130 - phaseCycle * 15}
                      cy={220 + phaseCycle * 8}
                      rx="14"
                      ry="26"
                      fill="url(#muscleGlow)"
                      opacity={0.85}
                    />
                    <ellipse
                      cx={170 + phaseCycle * 15}
                      cy={220 + phaseCycle * 8}
                      rx="14"
                      ry="26"
                      fill="url(#muscleGlow)"
                      opacity={0.85}
                    />
                  </>
                )}

                {/* Delts Glow */}
                {(exercise.primaryMuscles.includes("side_delts") || exercise.primaryMuscles.includes("front_delts")) && (
                  <>
                    <circle cx="105" cy="95" r="14" fill="url(#muscleGlow)" opacity={0.85} />
                    <circle cx="195" cy="95" r="14" fill="url(#muscleGlow)" opacity={0.85} />
                  </>
                )}

                {/* Biceps / Triceps Glow */}
                {(exercise.primaryMuscles.includes("biceps") || exercise.primaryMuscles.includes("triceps")) && (
                  <>
                    <ellipse cx="85" cy="120" rx="9" ry="18" fill="url(#muscleGlow)" opacity={0.9} />
                    <ellipse cx="215" cy="120" rx="9" ry="18" fill="url(#muscleGlow)" opacity={0.9} />
                  </>
                )}

                {/* Glutes / Hamstrings Glow */}
                {(exercise.primaryMuscles.includes("glutes") || exercise.primaryMuscles.includes("hamstrings")) && (
                  <path
                    d="M120 180 Q150 175 180 180 L185 215 Q150 225 115 215 Z"
                    fill="url(#muscleGlow)"
                    opacity={0.85}
                  />
                )}
              </g>
            )}

            {/* FORCE VECTORS & TRAJECTORY PATH */}
            {showForceVectors && (
              <g id="force-vectors">
                {/* Trajectory dashed path */}
                <path
                  d="M150 70 L150 150"
                  stroke="#c084fc"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                {/* Force Arrow */}
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
                {/* Elbow / Arm Marker */}
                <rect x="18" y="105" width="55" height="18" rx="4" fill="#09090b" stroke="#06b6d4" strokeWidth="1" />
                <text x="23" y="118" fill="#22d3ee">Codo:{elbowAngle}°</text>

                {/* Shoulder Marker */}
                <rect x="225" y="85" width="60" height="18" rx="4" fill="#09090b" stroke="#a855f7" strokeWidth="1" />
                <text x="230" y="98" fill="#c084fc">Hombro:{shoulderAngle}°</text>

                {/* Knee / Hip Marker if legs */}
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
            <span className="text-[10px] uppercase font-bold text-neutral-400">Tensión Muscular</span>
            <span className="font-mono font-bold text-cyan-400">{currentTensionPct}%</span>
          </div>
          <div className="w-32 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-75"
              style={{ width: `${currentTensionPct}%` }}
            />
          </div>
          <div className="text-[9px] text-neutral-400 flex items-center justify-between">
            <span>{phaseCycle > 0.6 ? "Excéntrico / Estiramiento" : phaseCycle < 0.2 ? "Bloqueo / Acortamiento" : "Concéntrico"}</span>
            <span className="font-bold text-purple-400">{exercise.resistanceProfile}</span>
          </div>
        </div>

        {/* Drag Guidance Prompt */}
        <div className="absolute top-12 left-3 text-[10px] text-neutral-400/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none">
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
            <span className="text-[10px] text-neutral-400">Velocidad:</span>
            {[0.5, 1, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  playbackSpeed === spd
                    ? "bg-neutral-800 text-cyan-400 border border-neutral-700"
                    : "text-neutral-500 hover:text-neutral-300"
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
