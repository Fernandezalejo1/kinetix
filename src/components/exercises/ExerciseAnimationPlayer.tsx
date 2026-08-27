import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Info,
  Sliders,
  Crosshair,
  Eye,
  Sun,
  Moon,
  Compass
} from "lucide-react";
import { Exercise } from "../../types";

interface ExerciseAnimationPlayerProps {
  exercise: Exercise;
  mode: "video" | "gif";
}

export const ExerciseAnimationPlayer: React.FC<ExerciseAnimationPlayerProps> = ({
  exercise,
  mode,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 1 loop
  const [speed, setSpeed] = useState<number>(1.0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<"white" | "dark">("white"); // Default to clean white as in GymVisual/Hevy video
  const [viewAngle, setViewAngle] = useState<"iso_3d" | "lateral">("iso_3d"); // 3D Isometric like video
  const [showMotionTrail, setShowMotionTrail] = useState(false);
  const [showAnatomyLayers, setShowAnatomyLayers] = useState(true);
  const [currentRep, setCurrentRep] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const trailHistoryRef = useRef<{ x: number; y: number; opacity: number }[]>([]);
  const lastSpokenPhaseRef = useRef<string>("");

  // Determine movement archetype & active muscles based on exercise name and category
  const exName = (exercise.nameEs + " " + exercise.name + " " + exercise.id).toLowerCase();
  const category = exercise.category;

  const movementData = useMemo(() => {
    // 1. Bench Press / Chest Press
    if (
      exName.includes("banca") ||
      exName.includes("bench") ||
      exName.includes("flexion") ||
      exName.includes("pushup") ||
      exName.includes("pecho") ||
      exName.includes("chest press")
    ) {
      const isIncline = exName.includes("inclinad") || exName.includes("incline");
      const isDumbbell = exName.includes("mancuerna") || exName.includes("dumbbell");
      return {
        type: "bench_press",
        isIncline,
        isDumbbell,
        primaryMuscle: "Pectoral Mayor (Fibras Esternocostales)",
        secondaryMuscles: "Deltoides Anterior & Tríceps Braquial",
        equipmentLabel: isDumbbell ? "Mancuernas Pro" : "Banco & Barra Olímpica",
      };
    }

    // 2. Chest Flyes / Pec Deck
    if (
      exName.includes("apertura") ||
      exName.includes("fly") ||
      exName.includes("pec deck") ||
      exName.includes("cruce") ||
      exName.includes("crossover")
    ) {
      return {
        type: "chest_fly",
        primaryMuscle: "Pectoral Mayor (Aislamiento)",
        secondaryMuscles: "Deltoides Anterior & Bíceps (Cabeza Corta)",
        equipmentLabel: "Poleas / Mancuernas",
      };
    }

    // 3. Squat / Hack / Leg Press
    if (
      exName.includes("sentadilla") ||
      exName.includes("squat") ||
      exName.includes("prensa") ||
      exName.includes("leg press") ||
      exName.includes("hack") ||
      exName.includes("zancada") ||
      exName.includes("lunge")
    ) {
      return {
        type: "squat",
        primaryMuscle: "Cuádriceps (Vasto Lateral, Medial e Intermedio)",
        secondaryMuscles: "Glúteo Mayor & Aductores",
        equipmentLabel: "Rack & Barra Olímpica",
      };
    }

    // 4. Deadlift / RDL / Hip Thrust
    if (
      exName.includes("peso muerto") ||
      exName.includes("deadlift") ||
      exName.includes("rdl") ||
      exName.includes("rumano") ||
      exName.includes("hip thrust") ||
      exName.includes("puente")
    ) {
      const isHipThrust = exName.includes("hip thrust") || exName.includes("puente");
      return {
        type: isHipThrust ? "hip_thrust" : "deadlift",
        primaryMuscle: isHipThrust ? "Glúteo Mayor (Máxima Contracción)" : "Glúteo Mayor & Isquiosurales",
        secondaryMuscles: "Erectores Espinales & Core",
        equipmentLabel: isHipThrust ? "Banco & Barra Olímpica" : "Plataforma & Barra",
      };
    }

    // 5. Pullup / Lat Pulldown / Row
    if (
      exName.includes("dominada") ||
      exName.includes("pullup") ||
      exName.includes("chin") ||
      exName.includes("jalon") ||
      exName.includes("pulldown") ||
      exName.includes("remo") ||
      exName.includes("row")
    ) {
      const isRow = exName.includes("remo") || exName.includes("row");
      return {
        type: isRow ? "row" : "pullup",
        primaryMuscle: isRow ? "Espalda Alta, Romboides & Trapecio Medio" : "Dorsal Ancho (Fibras Iliocostales)",
        secondaryMuscles: "Bíceps Braquial & Braquiorradial",
        equipmentLabel: isRow ? "Barra / Mancuerna" : "Torre de Polea / Barra Fija",
      };
    }

    // 6. Overhead / Shoulder Press
    if (
      exName.includes("press militar") ||
      exName.includes("shoulder press") ||
      exName.includes("overhead") ||
      exName.includes("hombro") ||
      exName.includes("militar")
    ) {
      return {
        type: "shoulder_press",
        primaryMuscle: "Deltoides Anterior & Lateral",
        secondaryMuscles: "Tríceps Braquial & Trapecio Superior",
        equipmentLabel: "Barra Olímpica / Banco 75°",
      };
    }

    // 7. Lateral Raise / Rear Delts
    if (
      exName.includes("elevacion lateral") ||
      exName.includes("lateral raise") ||
      exName.includes("pajaros") ||
      exName.includes("rear delt")
    ) {
      return {
        type: "lateral_raise",
        primaryMuscle: "Deltoides Lateral",
        secondaryMuscles: "Trapecio & Supraespinoso",
        equipmentLabel: "Mancuernas / Polea",
      };
    }

    // 8. Bicep Curl
    if (
      exName.includes("curl") &&
      (exName.includes("biceps") || exName.includes("martillo") || exName.includes("brazo") || exName.includes("preacher") || !exName.includes("femoral"))
    ) {
      return {
        type: "bicep_curl",
        primaryMuscle: "Bíceps Braquial (Cabeza Larga y Corta)",
        secondaryMuscles: "Braquial Anterior & Braquiorradial",
        equipmentLabel: "Barra Z / Mancuernas",
      };
    }

    // 9. Tricep Extension / Pushdown
    if (
      exName.includes("triceps") ||
      exName.includes("pushdown") ||
      exName.includes("frances") ||
      exName.includes("fondos") ||
      exName.includes("dips") ||
      exName.includes("extension triceps")
    ) {
      return {
        type: "tricep_extension",
        primaryMuscle: "Tríceps Braquial (Cabeza Lateral, Larga y Medial)",
        secondaryMuscles: "Ancóneo & Pectoral",
        equipmentLabel: "Polea Alta con Cuerda / Barra",
      };
    }

    // 10. Leg Extension
    if (exName.includes("cuadriceps") || exName.includes("extension de pierna") || exName.includes("leg extension")) {
      return {
        type: "leg_extension",
        primaryMuscle: "Cuádriceps (Recto Femoral)",
        secondaryMuscles: "Vasto Lateral y Medial",
        equipmentLabel: "Máquina Extensiones",
      };
    }

    // 11. Leg Curl
    if (exName.includes("femoral") || exName.includes("curl femoral") || exName.includes("leg curl")) {
      return {
        type: "leg_curl",
        primaryMuscle: "Isquiosurales (Bíceps Femoral y Semitendinoso)",
        secondaryMuscles: "Gastrocnemio",
        equipmentLabel: "Máquina Femoral Tumbado/Sentado",
      };
    }

    // Default category fallback
    if (category === "legs") {
      return {
        type: "squat",
        primaryMuscle: "Cuádriceps & Glúteos",
        secondaryMuscles: "Isquiosurales & Core",
        equipmentLabel: "Barra Olímpica",
      };
    }
    if (category === "pull") {
      return {
        type: "pullup",
        primaryMuscle: "Dorsal Ancho & Espalda Alta",
        secondaryMuscles: "Bíceps Braquial",
        equipmentLabel: "Polea / Barra",
      };
    }
    return {
      type: "bench_press",
      isIncline: false,
      isDumbbell: false,
      primaryMuscle: "Pectoral Mayor",
      secondaryMuscles: "Tríceps & Deltoides Anterior",
      equipmentLabel: "Banco & Barra Olímpica",
    };
  }, [exName, category]);

  // Phase computation
  const currentPhase = useMemo(() => {
    if (progress < 0.15) {
      return {
        name: "Inicio / Bloqueo Superior",
        action: "Escápulas retraídas, barra alineada sobre hombros.",
        muscleTension: 65,
        type: "setup",
      };
    } else if (progress < 0.55) {
      const eccProgress = (progress - 0.15) / 0.40;
      return {
        name: "Fase Excéntrica (Bajada)",
        action: "Descenso controlado abriendo caja torácica (3s).",
        muscleTension: Math.round(75 + eccProgress * 25),
        type: "eccentric",
      };
    } else if (progress < 0.65) {
      return {
        name: "Pausa en Estiramiento Profundo",
        action: "Barra toca el esternón inferior; máxima longitud de sarcómeros.",
        muscleTension: 100,
        type: "stretch",
      };
    } else if (progress < 0.95) {
      const concProgress = (progress - 0.65) / 0.30;
      return {
        name: "Fase Concéntrica (Empuje)",
        action: "Empuje explosivo manteniendo escápulas adosadas al banco.",
        muscleTension: Math.round(98 - concProgress * 20),
        type: "concentric",
      };
    } else {
      return {
        name: "Bloqueo & Contracción Pico",
        action: "Codos extendidos sin proyectar hombros hacia adelante.",
        muscleTension: 80,
        type: "lockout",
      };
    }
  }, [progress]);

  // Voice Cues
  useEffect(() => {
    if (!isVoiceEnabled || !isPlaying || !("speechSynthesis" in window)) return;
    const phaseKey = currentPhase.type;
    if (lastSpokenPhaseRef.current !== phaseKey) {
      lastSpokenPhaseRef.current = phaseKey;
      let text = "";
      if (phaseKey === "setup") text = "Fija escápulas y respira hondo";
      else if (phaseKey === "eccentric") text = "Baja lento";
      else if (phaseKey === "stretch") text = "Pausa en el pecho";
      else if (phaseKey === "concentric") text = "Empuja fuerte";

      if (text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-ES";
        utterance.rate = 1.15;
        utterance.volume = 0.65;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [currentPhase, isVoiceEnabled, isPlaying]);

  // Main Loop
  useEffect(() => {
    if (!isPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Cycle duration: ~2.8s
      const cycleDuration = 2.8 / speed;
      setProgress((prev) => {
        const next = prev + delta / cycleDuration;
        if (next >= 1) {
          setCurrentRep((r) => (r % 12) + 1);
          return 0;
        }
        return next;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  // ----------------------------------------------------
  // HIGH-FIDELITY 3D ISOMETRIC RENDERER (GymVisual / Hevy Exact Style)
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Background Setup
    const isWhiteTheme = themeMode === "white";
    if (isWhiteTheme) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Subtle studio vignette
      const studioGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.5, width * 0.7);
      studioGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
      studioGrad.addColorStop(0.75, "rgba(248, 249, 250, 0.9)");
      studioGrad.addColorStop(1, "rgba(235, 238, 242, 0.8)");
      ctx.fillStyle = studioGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#121215";
      ctx.fillRect(0, 0, width, height);

      const studioGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.5, width * 0.7);
      studioGrad.addColorStop(0, "rgba(35, 37, 46, 0.8)");
      studioGrad.addColorStop(0.75, "rgba(22, 22, 28, 0.5)");
      studioGrad.addColorStop(1, "rgba(16, 16, 20, 0)");
      ctx.fillStyle = studioGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Kinematic Easing
    let phaseValue = 0;
    if (progress < 0.15) {
      phaseValue = 0;
    } else if (progress < 0.55) {
      phaseValue = (progress - 0.15) / 0.40;
    } else if (progress < 0.65) {
      phaseValue = 1;
    } else if (progress < 0.95) {
      phaseValue = 1 - (progress - 0.65) / 0.30;
    } else {
      phaseValue = 0;
    }
    // Smooth cosine interpolation
    const phase = 0.5 * (1 - Math.cos(phaseValue * Math.PI));

    // Dynamic coordinates scale
    const cx = width * 0.50;
    const cy = height * 0.52;
    const scale = Math.min(width / 500, height / 360);

    // Color Constants (GymVisual exact matches)
    const muscleHighlightColor = "rgba(235, 65, 65, 0.92)"; // Vibrant Red / Coral for target muscle
    const muscleHighlightSoft = "rgba(248, 113, 113, 0.75)";
    const muscleSecondaryColor = "rgba(249, 115, 22, 0.88)"; // Amber / Orange for synergists
    const bodyShadeBase = isWhiteTheme ? "#f1f3f5" : "#e2e8f0";
    const bodyShadeDark = isWhiteTheme ? "#caced4" : "#94a3b8";
    const bodyShadeDeep = isWhiteTheme ? "#9ba3af" : "#64748b";
    const muscleFiberLine = isWhiteTheme ? "#788290" : "#475569";
    const shortsColor = isWhiteTheme ? "#27272a" : "#18181b";
    const rackWhite = isWhiteTheme ? "#f8fafc" : "#e2e8f0";
    const rackDark = isWhiteTheme ? "#cbd5e1" : "#64748b";
    const barbellSteel = isWhiteTheme ? "#71717a" : "#cbd5e1";
    const plateBlack = isWhiteTheme ? "#27272a" : "#18181b";
    const plateRim = isWhiteTheme ? "#52525b" : "#3f3f46";

    // Track barbell for Bar Path
    let barTrackX = cx;
    let barTrackY = cy;

    // Helper: Draw 3D Isometric Olympic Bench & Rack (Exact GymVisual style as in uploaded video)
    const drawIsometricBenchPress = () => {
      // 1. Soft Floor Shadow beneath bench, rack and athlete
      ctx.save();
      ctx.fillStyle = isWhiteTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      // Large isometric shadow footprint
      ctx.ellipse(cx + 10 * scale, cy + 95 * scale, 170 * scale, 35 * scale, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Olympic Rack Uprights (White Heavy Duty Steel behind the bench)
      const rackBackLeftX = cx + 55 * scale;
      const rackBackLeftY = cy - 70 * scale;
      const rackBackRightX = cx + 130 * scale;
      const rackBackRightY = cy - 40 * scale;

      // Draw Rear Pegs & Stored Bumper Plates on Rack Upright
      const drawPlateStack = (x: number, y: number) => {
        ctx.fillStyle = rackDark;
        ctx.fillRect(x + 5 * scale, y + 10 * scale, 30 * scale, 4 * scale);
        ctx.fillRect(x + 5 * scale, y + 26 * scale, 30 * scale, 4 * scale);
        ctx.fillRect(x + 5 * scale, y + 42 * scale, 30 * scale, 4 * scale);
      };
      drawPlateStack(rackBackRightX, rackBackRightY);

      // Vertical Uprights
      const drawRackColumn = (baseX: number, baseY: number, heightPx: number) => {
        ctx.save();
        // Left shaded side
        ctx.fillStyle = rackDark;
        ctx.beginPath();
        ctx.moveTo(baseX - 7 * scale, baseY);
        ctx.lineTo(baseX - 7 * scale, baseY - heightPx);
        ctx.lineTo(baseX, baseY - heightPx - 5 * scale);
        ctx.lineTo(baseX, baseY - 5 * scale);
        ctx.closePath();
        ctx.fill();

        // Front bright side
        ctx.fillStyle = rackWhite;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY - 5 * scale);
        ctx.lineTo(baseX, baseY - heightPx - 5 * scale);
        ctx.lineTo(baseX + 10 * scale, baseY - heightPx);
        ctx.lineTo(baseX + 10 * scale, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isWhiteTheme ? "#94a3b8" : "#475569";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bar Catch / J-Hook
        ctx.fillStyle = "#18181b";
        ctx.fillRect(baseX - 10 * scale, baseY - heightPx + 15 * scale, 14 * scale, 8 * scale);
        ctx.restore();
      };

      // Draw rear rack uprights
      drawRackColumn(rackBackLeftX, rackBackLeftY + 120 * scale, 135 * scale);
      drawRackColumn(rackBackRightX, rackBackRightY + 120 * scale, 135 * scale);

      // Connecting Top & Base Beams
      ctx.strokeStyle = rackDark;
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(rackBackLeftX, rackBackLeftY + 115 * scale);
      ctx.lineTo(rackBackRightX, rackBackRightY + 115 * scale);
      ctx.stroke();

      // 3. Padded Bench (3D Isometric Angled Pad)
      // Head of bench near rack, foot of bench towards lower left
      const benchHeadX = cx + 80 * scale;
      const benchHeadY = cy - 20 * scale;
      const benchFootX = cx - 95 * scale;
      const benchFootY = cy + 50 * scale;

      // Bench Steel Legs & Base
      ctx.strokeStyle = isWhiteTheme ? "#64748b" : "#475569";
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      // Front leg
      ctx.moveTo(benchFootX + 15 * scale, benchFootY + 12 * scale);
      ctx.lineTo(benchFootX + 15 * scale, benchFootY + 45 * scale);
      // Rear leg
      ctx.moveTo(benchHeadX - 15 * scale, benchHeadY + 18 * scale);
      ctx.lineTo(benchHeadX - 15 * scale, benchHeadY + 52 * scale);
      // Long spine beam
      ctx.moveTo(benchFootX + 15 * scale, benchFootY + 28 * scale);
      ctx.lineTo(benchHeadX - 15 * scale, benchHeadY + 36 * scale);
      ctx.stroke();

      // Bench Pad (Black leather cushion with 3D edge)
      ctx.save();
      // Lower 3D thickness
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.moveTo(benchFootX - 10 * scale, benchFootY + 5 * scale);
      ctx.lineTo(benchHeadX - 10 * scale, benchHeadY - 5 * scale);
      ctx.lineTo(benchHeadX + 22 * scale, benchHeadY + 10 * scale);
      ctx.lineTo(benchFootX + 22 * scale, benchFootY + 20 * scale);
      ctx.closePath();
      ctx.fill();

      // Top surface of pad
      ctx.fillStyle = "#27272a";
      ctx.beginPath();
      ctx.moveTo(benchFootX - 10 * scale, benchFootY);
      ctx.lineTo(benchHeadX - 10 * scale, benchHeadY - 10 * scale);
      ctx.lineTo(benchHeadX + 20 * scale, benchHeadY + 5 * scale);
      ctx.lineTo(benchFootX + 20 * scale, benchFootY + 15 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#3f3f46";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 4. ATHLETE 3D ANATOMICAL MODEL (Lying on bench in 3/4 perspective)
      // Head & Neck
      const headX = benchHeadX - 5 * scale;
      const headY = benchHeadY - 20 * scale;

      // Draw Head (Grayscale shaded with jawline and neck)
      ctx.save();
      ctx.fillStyle = bodyShadeBase;
      ctx.beginPath();
      ctx.ellipse(headX, headY, 14 * scale, 12 * scale, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bodyShadeDeep;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Neck & Traps
      ctx.fillStyle = bodyShadeDark;
      ctx.beginPath();
      ctx.moveTo(headX - 6 * scale, headY + 8 * scale);
      ctx.lineTo(headX - 18 * scale, headY + 18 * scale);
      ctx.lineTo(headX + 6 * scale, headY + 16 * scale);
      ctx.closePath();
      ctx.fill();

      // Torso / Ribcage Arched on bench
      const chestCenterX = cx + 18 * scale;
      const chestCenterY = cy - 5 * scale;
      const pelvisX = cx - 45 * scale;
      const pelvisY = cy + 22 * scale;

      // Abdominals & Serratus (Defined grayscale muscle groups)
      ctx.fillStyle = bodyShadeDark;
      ctx.beginPath();
      ctx.moveTo(chestCenterX - 24 * scale, chestCenterY + 5 * scale);
      ctx.lineTo(pelvisX + 10 * scale, pelvisY + 5 * scale);
      ctx.lineTo(pelvisX + 28 * scale, pelvisY + 18 * scale);
      ctx.lineTo(chestCenterX + 12 * scale, chestCenterY + 15 * scale);
      ctx.closePath();
      ctx.fill();

      // Rectus Abdominis 6-pack striations
      ctx.strokeStyle = muscleFiberLine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chestCenterX - 10 * scale, chestCenterY + 10 * scale);
      ctx.lineTo(pelvisX + 18 * scale, pelvisY + 12 * scale);
      ctx.stroke();

      // Athletic Compression Shorts (Black)
      ctx.fillStyle = shortsColor;
      ctx.beginPath();
      ctx.moveTo(pelvisX - 5 * scale, pelvisY);
      ctx.lineTo(pelvisX + 25 * scale, pelvisY + 12 * scale);
      ctx.lineTo(pelvisX + 15 * scale, pelvisY + 32 * scale);
      ctx.lineTo(pelvisX - 20 * scale, pelvisY + 18 * scale);
      ctx.closePath();
      ctx.fill();

      // Legs / Thighs / Calves / Feet flat on floor (Leg Drive)
      // Left Leg (Closer to viewer)
      const leftHipX = pelvisX + 10 * scale;
      const leftHipY = pelvisY + 16 * scale;
      const leftKneeX = pelvisX + 22 * scale;
      const leftKneeY = pelvisY + 48 * scale;
      const leftFootX = pelvisX + 15 * scale;
      const leftFootY = cy + 90 * scale;

      // Quad & Knee
      ctx.fillStyle = bodyShadeBase;
      ctx.beginPath();
      ctx.moveTo(leftHipX - 10 * scale, leftHipY);
      ctx.lineTo(leftKneeX - 8 * scale, leftKneeY);
      ctx.lineTo(leftKneeX + 10 * scale, leftKneeY + 2 * scale);
      ctx.lineTo(leftHipX + 8 * scale, leftHipY + 5 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = bodyShadeDeep;
      ctx.stroke();

      // Calf & Foot on floor
      ctx.beginPath();
      ctx.moveTo(leftKneeX - 6 * scale, leftKneeY + 2 * scale);
      ctx.lineTo(leftFootX - 4 * scale, leftFootY);
      ctx.lineTo(leftFootX + 12 * scale, leftFootY);
      ctx.lineTo(leftKneeX + 8 * scale, leftKneeY + 2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Foot bare/sock
      ctx.fillStyle = bodyShadeDark;
      ctx.beginPath();
      ctx.roundRect(leftFootX - 8 * scale, leftFootY - 2 * scale, 24 * scale, 8 * scale, 2);
      ctx.fill();

      // Right Leg (Far side)
      const rightFootX = cx - 80 * scale;
      const rightFootY = cy + 78 * scale;
      ctx.fillStyle = bodyShadeDark;
      ctx.beginPath();
      ctx.moveTo(pelvisX - 15 * scale, pelvisY + 5 * scale);
      ctx.lineTo(cx - 70 * scale, cy + 50 * scale);
      ctx.lineTo(rightFootX, rightFootY);
      ctx.lineTo(rightFootX + 12 * scale, rightFootY);
      ctx.lineTo(cx - 55 * scale, cy + 48 * scale);
      ctx.closePath();
      ctx.fill();

      // 5. TARGET MUSCLE HIGHLIGHT (Exact GymVisual / MuscleWiki Vibrant Red Translucent Pectorals)
      if (showAnatomyLayers) {
        // Pectoralis Major - Clavicular, Sternal & Costal Heads
        const pecLeftX = chestCenterX - 6 * scale;
        const pecLeftY = chestCenterY - 4 * scale;
        const pecRightX = chestCenterX + 22 * scale;
        const pecRightY = chestCenterY + 8 * scale;

        // Dynamic muscle bulge & fiber tension with phase
        const pecBulge = 1.0 + (1 - phase) * 0.15;

        // Draw Left Pectoral Fan
        ctx.fillStyle = muscleHighlightColor;
        ctx.beginPath();
        ctx.ellipse(pecLeftX, pecLeftY, 18 * scale * pecBulge, 13 * scale, 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Draw Right Pectoral Fan
        ctx.beginPath();
        ctx.ellipse(pecRightX, pecRightY, 16 * scale * pecBulge, 12 * scale, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Anatomical Muscle Striation Lines on Pectorals
        ctx.strokeStyle = "rgba(185, 28, 28, 0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Sternal lines radiating to humerus insertion
        ctx.moveTo(pecLeftX - 10 * scale, pecLeftY + 2 * scale);
        ctx.lineTo(pecLeftX + 12 * scale, pecLeftY - 6 * scale);
        ctx.moveTo(pecLeftX - 6 * scale, pecLeftY + 7 * scale);
        ctx.lineTo(pecLeftX + 14 * scale, pecLeftY - 2 * scale);
        ctx.moveTo(pecRightX - 10 * scale, pecRightY + 4 * scale);
        ctx.lineTo(pecRightX + 12 * scale, pecRightY - 4 * scale);
        ctx.stroke();

        // Anterior Deltoid Highlight in Red/Coral
        ctx.fillStyle = muscleHighlightSoft;
        ctx.beginPath();
        ctx.ellipse(chestCenterX + 34 * scale, chestCenterY - 6 * scale, 9 * scale, 12 * scale, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. ARMS & BARBELL MOTION KINEMATICS
      // Lockout: Barbell high in air, Bottom Stretch: Barbell touches lower sternum
      // In 3/4 isometric perspective:
      // High Lockout: bar at (cx + 8 * scale, cy - 82 * scale)
      // Bottom Chest Touch: bar at (cx + 14 * scale, cy - 24 * scale)
      const barCenterX = cx + (8 + phase * 6) * scale;
      const barCenterY = cy + (-82 + phase * 58) * scale;

      barTrackX = barCenterX;
      barTrackY = barCenterY;

      // Left Arm (Closer to foot end)
      const leftShoulderX = chestCenterX - 18 * scale;
      const leftShoulderY = chestCenterY - 10 * scale;
      const leftHandX = barCenterX - 45 * scale;
      const leftHandY = barCenterY + 16 * scale;
      // Elbow tucks ~45-60 deg in isometric
      const leftElbowX = leftShoulderX - (8 + phase * 22) * scale;
      const leftElbowY = leftShoulderY + (12 + phase * 28) * scale;

      // Right Arm (Closer to head/rack end)
      const rightShoulderX = chestCenterX + 32 * scale;
      const rightShoulderY = chestCenterY - 4 * scale;
      const rightHandX = barCenterX + 45 * scale;
      const rightHandY = barCenterY - 16 * scale;
      const rightElbowX = rightShoulderX + (12 + phase * 18) * scale;
      const rightElbowY = rightShoulderY + (8 + phase * 22) * scale;

      // Draw Upper Arms & Triceps (Secondary muscle)
      ctx.fillStyle = showAnatomyLayers ? muscleSecondaryColor : bodyShadeBase;
      ctx.beginPath();
      // Left Bicep/Tricep
      ctx.moveTo(leftShoulderX, leftShoulderY);
      ctx.lineTo(leftElbowX - 6 * scale, leftElbowY);
      ctx.lineTo(leftElbowX + 6 * scale, leftElbowY + 4 * scale);
      ctx.lineTo(leftShoulderX + 8 * scale, leftShoulderY + 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = bodyShadeDeep;
      ctx.stroke();

      // Left Forearm to Barbell Grip
      ctx.fillStyle = bodyShadeBase;
      ctx.beginPath();
      ctx.moveTo(leftElbowX - 5 * scale, leftElbowY);
      ctx.lineTo(leftHandX - 4 * scale, leftHandY);
      ctx.lineTo(leftHandX + 5 * scale, leftHandY + 4 * scale);
      ctx.lineTo(leftElbowX + 5 * scale, leftElbowY + 4 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Upper Arm
      ctx.fillStyle = showAnatomyLayers ? muscleSecondaryColor : bodyShadeBase;
      ctx.beginPath();
      ctx.moveTo(rightShoulderX, rightShoulderY);
      ctx.lineTo(rightElbowX + 5 * scale, rightElbowY);
      ctx.lineTo(rightElbowX - 5 * scale, rightElbowY + 4 * scale);
      ctx.lineTo(rightShoulderX - 8 * scale, rightShoulderY + 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Forearm to Barbell Grip
      ctx.fillStyle = bodyShadeBase;
      ctx.beginPath();
      ctx.moveTo(rightElbowX, rightElbowY);
      ctx.lineTo(rightHandX, rightHandY);
      ctx.lineTo(rightHandX + 6 * scale, rightHandY + 4 * scale);
      ctx.lineTo(rightElbowX + 5 * scale, rightElbowY + 4 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 7. OLYMPIC BARBELL & 3D BUMPER PLATES (GymVisual Style)
      // Steel Bar shaft passing through hands
      const barLength = 220 * scale;
      const barAngle = -0.36; // Isometric diagonal angle
      const barStartX = barCenterX - Math.cos(barAngle) * (barLength * 0.5);
      const barStartY = barCenterY - Math.sin(barAngle) * (barLength * 0.5);
      const barEndX = barCenterX + Math.cos(barAngle) * (barLength * 0.5);
      const barEndY = barCenterY + Math.sin(barAngle) * (barLength * 0.5);

      ctx.strokeStyle = barbellSteel;
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(barStartX, barStartY);
      ctx.lineTo(barEndX, barEndY);
      ctx.stroke();

      // Olympic Sleeves & Knurling marks
      ctx.strokeStyle = isWhiteTheme ? "#94a3b8" : "#e2e8f0";
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      ctx.moveTo(barStartX, barStartY);
      ctx.lineTo(barStartX + 35 * scale, barStartY - 12 * scale);
      ctx.moveTo(barEndX - 35 * scale, barEndY + 12 * scale);
      ctx.lineTo(barEndX, barEndY);
      ctx.stroke();

      // Large 3D Olympic Bumper Plates (Black Rubber with bevels & weight markings)
      const draw3DPlate = (plateX: number, plateY: number, radius: number) => {
        ctx.save();
        // Plate outer dark bevel
        ctx.fillStyle = plateBlack;
        ctx.beginPath();
        ctx.ellipse(plateX, plateY, radius * 0.42, radius, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = plateRim;
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // Inner recessed ring
        ctx.beginPath();
        ctx.ellipse(plateX, plateY, radius * 0.28, radius * 0.68, 0.12, 0, Math.PI * 2);
        ctx.strokeStyle = "#52525b";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Chrome Center Hub Collar
        ctx.fillStyle = barbellSteel;
        ctx.beginPath();
        ctx.ellipse(plateX, plateY, radius * 0.10, radius * 0.24, 0.12, 0, Math.PI * 2);
        ctx.fill();

        // White "45" / "20kg" label on bumper plate
        ctx.fillStyle = isWhiteTheme ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.9)";
        ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("20", plateX, plateY - radius * 0.38);
        ctx.restore();
      };

      // Draw Plates on Both Sleeves
      draw3DPlate(barStartX + 22 * scale, barStartY - 8 * scale, 38 * scale);
      draw3DPlate(barEndX - 22 * scale, barEndY + 8 * scale, 38 * scale);

      // Hands Gripping Barbell
      ctx.fillStyle = bodyShadeDark;
      ctx.beginPath();
      ctx.arc(leftHandX, leftHandY, 6 * scale, 0, Math.PI * 2);
      ctx.arc(rightHandX, rightHandY, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = bodyShadeDeep;
      ctx.stroke();
    };

    // Helper: Draw 3D Isometric Squat / Deadlift / Pullup / Other Archetypes in GymVisual Style
    const drawIsometricGenericArchetype = () => {
      // Background ground shadow
      ctx.fillStyle = isWhiteTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 90 * scale, 120 * scale, 24 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      const type = movementData.type;

      if (type === "squat") {
        // SQUAT (Isometric 3D)
        const hipX = cx - (12 + phase * 22) * scale;
        const hipY = cy - (10 - phase * 65) * scale;
        const kneeX = cx + (24 + phase * 14) * scale;
        const kneeY = cy + (45 + phase * 22) * scale;
        const footX = cx + 18 * scale;
        const footY = cy + 85 * scale;
        const shoulderX = hipX + 16 * scale;
        const shoulderY = hipY - 60 * scale;

        barTrackX = shoulderX;
        barTrackY = shoulderY - 5 * scale;

        // Feet & Shoes
        ctx.fillStyle = shortsColor;
        ctx.beginPath();
        ctx.roundRect(footX - 15 * scale, footY - 4 * scale, 34 * scale, 8 * scale, 2);
        ctx.fill();

        // Calves & Tibia
        ctx.fillStyle = bodyShadeBase;
        ctx.beginPath();
        ctx.moveTo(footX - 6 * scale, footY);
        ctx.lineTo(kneeX - 10 * scale, kneeY);
        ctx.lineTo(kneeX + 10 * scale, kneeY);
        ctx.lineTo(footX + 14 * scale, footY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = bodyShadeDeep;
        ctx.stroke();

        // TARGET MUSCLE: QUADS & GLUTES IN RED HIGHLIGHT
        ctx.fillStyle = showAnatomyLayers ? muscleHighlightColor : bodyShadeBase;
        ctx.beginPath();
        ctx.moveTo(kneeX - 10 * scale, kneeY);
        ctx.lineTo(hipX - 14 * scale, hipY);
        ctx.lineTo(hipX + 16 * scale, hipY + 4 * scale);
        ctx.lineTo(kneeX + 10 * scale, kneeY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(185, 28, 28, 0.8)";
        ctx.stroke();

        // Torso / Spine & Abs
        ctx.fillStyle = bodyShadeBase;
        ctx.beginPath();
        ctx.moveTo(hipX - 12 * scale, hipY);
        ctx.lineTo(shoulderX - 14 * scale, shoulderY);
        ctx.lineTo(shoulderX + 14 * scale, shoulderY);
        ctx.lineTo(hipX + 14 * scale, hipY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = bodyShadeDeep;
        ctx.stroke();

        // Head
        ctx.fillStyle = bodyShadeBase;
        ctx.beginPath();
        ctx.ellipse(shoulderX + 6 * scale, shoulderY - 20 * scale, 13 * scale, 11 * scale, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Olympic Barbell on Upper Traps with Bumper Plates
        const barY = shoulderY - 2 * scale;
        ctx.strokeStyle = barbellSteel;
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(shoulderX - 90 * scale, barY);
        ctx.lineTo(shoulderX + 90 * scale, barY);
        ctx.stroke();

        // Bumper Plates
        ctx.fillStyle = plateBlack;
        ctx.beginPath();
        ctx.roundRect(shoulderX - 88 * scale, barY - 28 * scale, 12 * scale, 56 * scale, 3);
        ctx.roundRect(shoulderX + 76 * scale, barY - 28 * scale, 12 * scale, 56 * scale, 3);
        ctx.fill();
      } else if (type === "pullup" || type === "row") {
        // PULLUP / LAT PULLDOWN / ROW
        const barY = cy - 85 * scale;
        const bodyElevate = (1 - phase) * 60 * scale;
        const bodyY = cy + 20 * scale - bodyElevate;

        barTrackX = cx;
        barTrackY = bodyY - 30 * scale;

        // Top Rig Bar
        ctx.strokeStyle = barbellSteel;
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 100 * scale, barY);
        ctx.lineTo(cx + 100 * scale, barY);
        ctx.stroke();

        // TARGET MUSCLE: LATS & BACK IN VIBRANT RED
        ctx.fillStyle = showAnatomyLayers ? muscleHighlightColor : bodyShadeBase;
        ctx.beginPath();
        ctx.ellipse(cx - 16 * scale, bodyY - 10 * scale, 14 * scale, 24 * scale, 0.25, 0, Math.PI * 2);
        ctx.ellipse(cx + 16 * scale, bodyY - 10 * scale, 14 * scale, 24 * scale, -0.25, 0, Math.PI * 2);
        ctx.fill();

        // Arms pulling into bar
        ctx.fillStyle = showAnatomyLayers ? muscleSecondaryColor : bodyShadeBase;
        ctx.beginPath();
        ctx.moveTo(cx - 65 * scale, barY);
        ctx.lineTo(cx - 38 * scale, bodyY - 15 * scale);
        ctx.lineTo(cx - 16 * scale, bodyY - 10 * scale);
        ctx.lineTo(cx + 16 * scale, bodyY - 10 * scale);
        ctx.lineTo(cx + 38 * scale, bodyY - 15 * scale);
        ctx.lineTo(cx + 65 * scale, barY);
        ctx.stroke();

        // Head & Spine
        ctx.fillStyle = bodyShadeBase;
        ctx.beginPath();
        ctx.ellipse(cx, bodyY - 34 * scale, 13 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Shorts & Legs
        ctx.fillStyle = shortsColor;
        ctx.fillRect(cx - 16 * scale, bodyY + 22 * scale, 32 * scale, 26 * scale);
      } else {
        // STANDING PRESS / CURL / DEFAULT ISOMETRIC
        const shoulderY = cy - 35 * scale;
        const handY = cy - (35 + phase * 65) * scale;
        barTrackX = cx;
        barTrackY = handY;

        // Torso & Head
        ctx.fillStyle = bodyShadeBase;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 65 * scale, 13 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spine & Torso
        ctx.beginPath();
        ctx.roundRect(cx - 18 * scale, shoulderY - 10 * scale, 36 * scale, 70 * scale, 4);
        ctx.fill();
        ctx.stroke();

        // TARGET MUSCLES (Shoulders / Arms in RED)
        ctx.fillStyle = showAnatomyLayers ? muscleHighlightColor : bodyShadeBase;
        ctx.beginPath();
        ctx.ellipse(cx - 20 * scale, shoulderY, 12 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 20 * scale, shoulderY, 12 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Barbell Overhead
        ctx.strokeStyle = barbellSteel;
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 80 * scale, handY);
        ctx.lineTo(cx + 80 * scale, handY);
        ctx.stroke();

        ctx.fillStyle = plateBlack;
        ctx.beginPath();
        ctx.roundRect(cx - 78 * scale, handY - 24 * scale, 10 * scale, 48 * scale, 2);
        ctx.roundRect(cx + 68 * scale, handY - 24 * scale, 10 * scale, 48 * scale, 2);
        ctx.fill();
      }
    };

    // Render based on Movement Archetype
    if (movementData.type === "bench_press" && viewAngle === "iso_3d") {
      drawIsometricBenchPress();
    } else {
      drawIsometricGenericArchetype();
    }

    // Motion Trail / Bar Path
    if (showMotionTrail) {
      trailHistoryRef.current.push({ x: barTrackX, y: barTrackY, opacity: 1.0 });
      if (trailHistoryRef.current.length > 24) {
        trailHistoryRef.current.shift();
      }

      if (trailHistoryRef.current.length > 1) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(trailHistoryRef.current[0].x, trailHistoryRef.current[0].y);
        for (let i = 1; i < trailHistoryRef.current.length; i++) {
          ctx.lineTo(trailHistoryRef.current[i].x, trailHistoryRef.current[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Tracking glowing dot
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(barTrackX, barTrackY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [progress, speed, themeMode, viewAngle, showMotionTrail, showAnatomyLayers, movementData]);

  // YouTube Query
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${exercise.nameEs} ${exercise.name} tecnica correcta hipertrofia`
  )}`;

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-colors ${
      themeMode === "white" ? "bg-white border border-neutral-200" : "bg-[#121215] border border-neutral-800"
    }`}>
      {/* 1. Header Muscle & Equipment Legend */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
        themeMode === "white" ? "bg-neutral-50/90 border-neutral-200" : "bg-[#18181c] border-neutral-800/80"
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Target Muscle Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Músculo Objetivo: {movementData.primaryMuscle}</span>
          </div>

          {/* Synergist Muscle Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="hidden sm:inline">Sinergistas:</span>
            <span>{movementData.secondaryMuscles}</span>
          </div>
        </div>

        {/* View & Theme Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Theme (White Studio like video vs Dark Studio) */}
          <button
            onClick={() => setThemeMode(themeMode === "white" ? "dark" : "white")}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              themeMode === "white"
                ? "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 shadow-xs"
                : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800"
            }`}
            title="Alternar fondo estudio blanco/oscuro"
          >
            {themeMode === "white" ? <Moon className="w-3.5 h-3.5 text-neutral-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline text-[11px]">{themeMode === "white" ? "Fondo Blanco" : "Fondo Carbón"}</span>
          </button>

          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
            {movementData.equipmentLabel}
          </span>
        </div>
      </div>

      {/* 2. Visual Stage Canvas */}
      <div className={`relative w-full h-84 sm:h-96 flex items-center justify-center overflow-hidden select-none ${
        themeMode === "white" ? "bg-white" : "bg-[#121215]"
      }`}>
        {/* Canvas Animation */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={() => setIsPlaying(!isPlaying)}
        />

        {/* Top-Left Kinetic Phase Badge */}
        <div className={`absolute top-3 left-3 p-3 rounded-2xl border backdrop-blur-md space-y-1.5 pointer-events-none text-left max-w-xs shadow-xl transition-all ${
          themeMode === "white" ? "bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-200/50" : "bg-[#18181c]/90 border-neutral-800 text-white"
        }`}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-500">
              <Activity className="w-3.5 h-3.5" />
              Cinemática 3D Hevy
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-500/15 text-red-500 border border-red-500/20">
              Rep #{currentRep}
            </span>
          </div>

          <div className="text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            {currentPhase.name}
          </div>

          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
            {currentPhase.action}
          </p>

          {/* Muscle Tension Meter */}
          <div className="pt-1 space-y-1">
            <div className="flex justify-between text-[10px] text-neutral-600 dark:text-neutral-300">
              <span>Tensión Muscular:</span>
              <span className="font-mono font-bold text-red-500">{currentPhase.muscleTension}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-100 rounded-full"
                style={{ width: `${currentPhase.muscleTension}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Tools */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setShowAnatomyLayers(!showAnatomyLayers)}
            className={`p-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all ${
              showAnatomyLayers
                ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/40 shadow-xs"
                : themeMode === "white" ? "bg-white/80 text-neutral-500 border-neutral-300" : "bg-neutral-900/80 text-neutral-400 border-neutral-700"
            }`}
            title="Mostrar/Ocultar Resaltado de Músculos en Rojo"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowMotionTrail(!showMotionTrail)}
            className={`p-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all ${
              showMotionTrail
                ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/40 shadow-xs"
                : themeMode === "white" ? "bg-white/80 text-neutral-500 border-neutral-300" : "bg-neutral-900/80 text-neutral-400 border-neutral-700"
            }`}
            title="Trayectoria de Barra (Bar Path)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <a
            href={youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-bold backdrop-blur-md transition-all shadow-sm"
            title="Ver en YouTube"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HD YouTube</span>
          </a>
        </div>

        {/* Center Play Overlay when paused */}
        {!isPlaying && (
          <div
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-2xs cursor-pointer"
          >
            <div className="p-4 rounded-full bg-red-600 text-white shadow-2xl hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-white" />
            </div>
          </div>
        )}

        {/* Bottom Cue Subtitle */}
        <div className="absolute bottom-4 left-3 right-3 flex justify-center pointer-events-none">
          <div className={`px-4 py-1.5 rounded-full border text-[11px] backdrop-blur-md text-center max-w-lg shadow-md truncate ${
            themeMode === "white" ? "bg-white/95 border-neutral-300 text-neutral-700 shadow-neutral-200" : "bg-[#18181c]/90 border-neutral-800 text-neutral-200"
          }`}>
            <span className="text-red-500 font-bold mr-1.5">Cue Clave:</span>
            {exercise.executionCues[0] || "Mantén la trayectoria vertical y escápulas adosadas al banco."}
          </div>
        </div>
      </div>

      {/* 3. Scrubbing Timeline & Controls */}
      <div className={`p-3 border-t space-y-2 ${
        themeMode === "white" ? "bg-neutral-50 border-neutral-200" : "bg-[#18181c] border-neutral-800"
      }`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={progress}
            onChange={(e) => {
              setIsPlaying(false);
              setProgress(parseFloat(e.target.value));
            }}
            className="w-full accent-red-600 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md shadow-red-600/20"
              title={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Restart */}
            <button
              onClick={() => {
                setProgress(0);
                setIsPlaying(true);
              }}
              className={`p-2 rounded-xl border transition-colors ${
                themeMode === "white"
                  ? "bg-white hover:bg-neutral-100 text-neutral-600 border-neutral-300"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
              }`}
              title="Reiniciar repetición"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Frame Step */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setProgress((p) => Math.max(0, p - 0.05));
                }}
                className={`p-1.5 rounded-lg border ${
                  themeMode === "white"
                    ? "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                    : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white"
                }`}
                title="Fotograma Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setProgress((p) => Math.min(1, p + 0.05));
                }}
                className={`p-1.5 rounded-lg border ${
                  themeMode === "white"
                    ? "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                    : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white"
                }`}
                title="Siguiente Fotograma"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Audio Voice Cues */}
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                isVoiceEnabled
                  ? "bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/40"
                  : themeMode === "white"
                  ? "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                  : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white"
              }`}
              title="Voz de Cues Técnicos"
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-red-500" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline text-[10px]">Audio</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 text-[10px] mr-1">Velocidad:</span>
            {[0.5, 1.0, 1.25, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all text-[10px] ${
                  speed === spd
                    ? "bg-red-600 text-white shadow-xs"
                    : themeMode === "white"
                    ? "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-300"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-700"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Studio Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              themeMode === "white"
                ? "bg-white text-red-600 border-neutral-300 shadow-xs"
                : "bg-neutral-900 text-red-400 border-neutral-700"
            }`}>
              3D Isométrica Hevy 60 FPS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
