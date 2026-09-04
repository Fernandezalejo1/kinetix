import {
  MuscleGroup,
  VolumeLandmarks,
  WorkoutExercise,
  WorkoutSet,
  Exercise,
  AutoProgressionRecommendation,
} from "../types";

// Science-based 1RM Calculators
// Las fórmulas Brzycki/Epley/Wathan están validadas para 1-10 reps (con error
// creciente desde ~5). Por encima de 12 reps la extrapolación distorsiona el
// 1RM (p. ej. 20×15 → ~30 kg cuando el real es ~26) y a 36 reps la de Brzycki
// diverge a 720 kg. Así que limitamos la predicción al rango válido y devolvemos
// `valid: false` para que los consumidores no registren PRs fabricados.
export const MAX_VALID_1RM_REPS = 12;

export function calculate1RM(
  weight: number,
  reps: number
): {
  brzycki: number;
  epley: number;
  wathan: number;
  average: number;
  valid: boolean;
} {
  if (reps <= 0 || weight <= 0) {
    return { brzycki: weight, epley: weight, wathan: weight, average: weight, valid: false };
  }
  if (reps === 1) {
    return { brzycki: weight, epley: weight, wathan: weight, average: weight, valid: true };
  }
  if (reps > MAX_VALID_1RM_REPS) {
    return { brzycki: NaN, epley: NaN, wathan: NaN, average: NaN, valid: false };
  }

  const brzycki = weight * (36 / (37 - reps));
  const epley = weight * (1 + reps / 30);
  const wathan = (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
  const average = Math.round(((brzycki + epley + wathan) / 3) * 10) / 10;

  return {
    brzycki: Math.round(brzycki * 10) / 10,
    epley: Math.round(epley * 10) / 10,
    wathan: Math.round(wathan * 10) / 10,
    average,
    valid: true,
  };
}

// Scientific Warm-up Pyramid Calculator (Dr. Mike Israetel / Eric Helms model)
export interface WarmupStep {
  stepName: string;
  percentage: number;
  weight: number;
  reps: number;
  purpose: string;
}

export function generateWarmupPyramid(workingWeight: number, barWeight = 20): WarmupStep[] {
  if (workingWeight <= barWeight) {
    return [
      {
        stepName: "Serie 1 (Barra)",
        percentage: 100,
        weight: barWeight,
        reps: 8,
        purpose: "Patrón motor y lubricación sinovial",
      },
    ];
  }

  const steps: WarmupStep[] = [
    {
      stepName: "Serie 1 (Calentamiento Articular)",
      percentage: Math.round((barWeight / workingWeight) * 100),
      weight: barWeight,
      reps: 10,
      purpose: "Patrón motor, temperatura articular y flujo sinovial",
    },
    {
      stepName: "Serie 2 (Activación Neuromuscular)",
      percentage: 50,
      weight: Math.round((workingWeight * 0.5) / 2.5) * 2.5,
      reps: 5,
      purpose: "Coordinación intermuscular y ritmo de tempo",
    },
    {
      stepName: "Serie 3 (Potenciación Post-Activación)",
      percentage: 70,
      weight: Math.round((workingWeight * 0.7) / 2.5) * 2.5,
      reps: 3,
      purpose: "Reclutamiento de unidades motoras de alto umbral",
    },
    {
      stepName: "Serie 4 (Aclimatación de Carga)",
      percentage: 85,
      weight: Math.round((workingWeight * 0.85) / 2.5) * 2.5,
      reps: 1,
      purpose: "Sensación propioceptiva del peso sin generar fatiga",
    },
  ];

  return steps;
}

// Barbell Plate Math Calculator (20kg Olympic Bar + metric plates)
export interface PlateCalculation {
  perSideKg: number;
  plates: { weight: number; count: number; colorHex: string }[];
  remainder: number;
}

export function calculatePlates(targetWeightKg: number, barWeightKg = 20): PlateCalculation {
  const standardPlates = [
    { weight: 25, colorHex: "#dc2626" }, // Red
    { weight: 20, colorHex: "#2563eb" }, // Blue
    { weight: 15, colorHex: "#eab308" }, // Yellow
    { weight: 10, colorHex: "#16a34a" }, // Green
    { weight: 5, colorHex: "#ffffff" },  // White
    { weight: 2.5, colorHex: "#64748b" },// Slate
    { weight: 1.25, colorHex: "#94a3b8" } // Light slate
  ];

  const targetPerSide = Math.max(0, (targetWeightKg - barWeightKg) / 2);
  let remaining = targetPerSide;
  const resultPlates: { weight: number; count: number; colorHex: string }[] = [];

  for (const plate of standardPlates) {
    if (remaining >= plate.weight) {
      const count = Math.floor(remaining / plate.weight);
      resultPlates.push({ weight: plate.weight, count, colorHex: plate.colorHex });
      remaining = Math.round((remaining - count * plate.weight) * 100) / 100;
    }
  }

  return {
    perSideKg: targetPerSide,
    plates: resultPlates,
    remainder: remaining,
  };
}

// Science Volume Landmarks Benchmarks (Dr. Mike Israetel / Renaissance Periodization)
export const MUSCLE_LANDMARKS_CONFIG: Record<
  MuscleGroup,
  { nameEs: string; mev: number; mav: number; mrv: number }
> = {
  chest: { nameEs: "Pectoral", mev: 8, mav: 14, mrv: 22 },
  lats: { nameEs: "Dorsal Ancho", mev: 8, mav: 16, mrv: 22 },
  upper_back: { nameEs: "Espalda Alta / Trapecios", mev: 8, mav: 16, mrv: 24 },
  traps: { nameEs: "Trapecio Superior", mev: 4, mav: 12, mrv: 20 },
  front_delts: { nameEs: "Deltoides Anterior", mev: 0, mav: 6, mrv: 12 }, // Indirectly trained in presses
  side_delts: { nameEs: "Deltoides Lateral", mev: 8, mav: 18, mrv: 26 },
  rear_delts: { nameEs: "Deltoides Posterior", mev: 6, mav: 14, mrv: 22 },
  biceps: { nameEs: "Bíceps", mev: 6, mav: 14, mrv: 20 },
  triceps: { nameEs: "Tríceps", mev: 6, mav: 14, mrv: 18 },
  forearms: { nameEs: "Antebrazos", mev: 4, mav: 10, mrv: 18 },
  quads: { nameEs: "Cuádriceps", mev: 8, mav: 16, mrv: 22 },
  hamstrings: { nameEs: "Isquiosurales", mev: 6, mav: 14, mrv: 20 },
  glutes: { nameEs: "Glúteos", mev: 4, mav: 12, mrv: 18 },
  calves: { nameEs: "Gemelos / Sóleo", mev: 8, mav: 16, mrv: 24 },
  abs: { nameEs: "Abdomen / Core", mev: 0, mav: 10, mrv: 18 },
  lower_back: { nameEs: "Erectores Espinales", mev: 0, mav: 6, mrv: 14 }
};

export function computeWeeklyVolumeStatus(
  recentExercises: WorkoutExercise[]
): VolumeLandmarks[] {
  const muscleSetCounts: Record<MuscleGroup, number> = {
    chest: 0,
    lats: 0,
    upper_back: 0,
    traps: 0,
    front_delts: 0,
    side_delts: 0,
    rear_delts: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    abs: 0,
    lower_back: 0,
  };

  recentExercises.forEach((wEx) => {
    // Count completed effective sets (RIR <= 3, excluye warmup y cardio — el
    // cardio NO es volumen de fuerza y no debe empujar a un grupo muscular
    // por encima del MAV/MRV.
    const effectiveSets = wEx.sets.filter(
      (s) => s.completed && s.type !== "warmup" && s.type !== "cardio" && (s.rir === undefined || s.rir <= 3)
    ).length;

    wEx.exercise.primaryMuscles.forEach((muscle) => {
      muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + effectiveSets;
    });

    // Secondary muscles receive fractional volume (0.5 series equivalente)
    wEx.exercise.secondaryMuscles.forEach((muscle) => {
      muscleSetCounts[muscle] = (muscleSetCounts[muscle] || 0) + effectiveSets * 0.5;
    });
  });

  const results: VolumeLandmarks[] = (
    Object.keys(MUSCLE_LANDMARKS_CONFIG) as MuscleGroup[]
  ).map((muscle) => {
    const config = MUSCLE_LANDMARKS_CONFIG[muscle];
    const current = Math.round((muscleSetCounts[muscle] || 0) * 10) / 10;
    let status: VolumeLandmarks["status"] = "optimal";

    if (current < config.mev) {
      status = "under";
    } else if (current >= config.mev && current <= config.mav) {
      status = "optimal";
    } else if (current > config.mav && current <= config.mrv) {
      status = "approaching_mrv";
    } else {
      status = "overreaching";
    }

    return {
      muscle,
      nameEs: config.nameEs,
      mev: config.mev,
      mav: config.mav,
      mrv: config.mrv,
      currentSets: current,
      status,
    };
  });

  return results;
}

// Web Audio API Pleasant Timer Chime Synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * MUST be called from a user gesture (button tap/click) so iOS/Android allow
 * audio to play (autoplay policies suspend the AudioContext otherwise).
 * Returns true if audio is ready to play after the call.
 */
export function unlockAudio(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === "closed") return false;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx.state === "running" || ctx.state === "suspended";
  } catch (_) {
    return false;
  }
}

export function playRestTimerCompletedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic double bell (Apple-like clean UI chime: C6 & E6 gentle tone)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, now); // C6
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1567.98, now); // G6
    osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.2); // C7

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);

    // Subtle vibration if supported on mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
  } catch (e) {
    console.warn("Audio chime playback not allowed or failed", e);
  }
}

export function playTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === "closed") return;
    // Ensure the context is running (autoplay policies may have suspended it).
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      // resume() is async; do not attempt to schedule on a still-suspended ctx.
      if (ctx.state === "suspended") return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (_) {}
}

// -------------------------------------------------------------
// Auto-Progression Engine (RIR / RPE Adaptive Scientific Algorithm)
// -------------------------------------------------------------

export function isCompoundExercise(exercise: { id: string; category?: string; equipment?: string }): boolean {
  // Smith machines and main bars are always compounds regardless of specific id list.
  if (exercise.equipment === "smith" || exercise.equipment === "barbell") return true;
  const compoundIds = [
    "incline-barbell-press",
    "incline-dumbbell-press",
    "converging-chest-press",
    "weighted-dips",
    "seated-cable-row",
    "chest-supported-tbar-row",
    "lat-pulldown-neutral",
    "barbell-hack-or-squat",
    "hack-squat-machine",
    "romanian-deadlift",
    "seated-leg-curl",
    "standing-overhead-press",
  ];
  return compoundIds.includes(exercise.id);
}

export function calculateAutoProgression(
  exercise: Exercise | { id: string; nameEs: string; category: "push" | "pull" | "legs" | "core"; equipment: string; resistanceProfile?: string },
  sets: WorkoutSet[],
  weightUnit: "kg" | "lbs" = "kg"
): AutoProgressionRecommendation {
  const isCompound = isCompoundExercise(exercise);
  const workingSets = sets.filter((s) => s.completed && s.type !== "warmup" && s.type !== "cardio");

  if (workingSets.length === 0) {
    // Sin series reales no se inventa ningún peso: se pide entrenar primero.
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.nameEs,
      category: exercise.category,
      equipment: exercise.equipment,
      currentWeight: 0,
      lastReps: 0,
      averageRir: 0,
      averageRpe: 0,
      recommendedWeight: 0,
      deltaWeight: 0,
      deltaPercent: 0,
      action: "maintain",
      actionLabel: "Sin datos todavía",
      targetRepsNext: "—",
      targetRirNext: 2,
      scientificRationale:
        "Todavía no hay series registradas de este ejercicio: completá una sesión real (o cargá un 1RM manual) para habilitar la recomendación.",
      confidenceScore: 0,
      progressionType: "Dato insuficiente",
      fatigueStatus: "optima",
      nextSessionTip: "Registrá peso, reps y RIR serie por serie.",
      isCompound,
    };
  }

  // Calculate averages across completed working sets
  const totalWeight = workingSets.reduce((sum, s) => sum + s.weight, 0);
  const currentWeight = Math.round((totalWeight / workingSets.length) * 10) / 10;
  const avgReps = Math.round((workingSets.reduce((sum, s) => sum + s.reps, 0) / workingSets.length) * 10) / 10;

  // Compute average RIR (convert RPE to RIR if RIR is missing).
  // Si ninguna serie trae RIR/RPE real, NO inventamos RIR=2: se marca
  // rirMissing para que la recomendación pida el dato en vez de progresar a ciegas.
  // Un `rir: null` explícito NO se promedia como 0 (evita "RIR 0 = fallo" falso).
  let rirMissing = true;
  const rirValues = workingSets.map((s) => {
    const rir = s.rir != null ? Number(s.rir) : null;
    if (rir !== null && Number.isFinite(rir) && rir >= 0 && rir <= 10) {
      rirMissing = false;
      return rir;
    }
    if (s.rpe != null) {
      const pe = Number(s.rpe);
      if (Number.isFinite(pe) && pe >= 1 && pe <= 10) {
        rirMissing = false;
        return Math.max(0, 10 - pe);
      }
    }
    return 2; // fallback: luego el guard rirMissing lo neutraliza
  });
  const avgRir = Math.round((rirValues.reduce((sum, r) => sum + r, 0) / rirValues.length) * 10) / 10;
  const avgRpe = Math.max(1, Math.round((10 - avgRir) * 10) / 10);

  let deltaWeight = 0;
  let action: AutoProgressionRecommendation["action"] = "maintain";
  let actionLabel = "Mantener Carga";
  let targetRepsNext = `${Math.round(avgReps)} reps`;
  let targetRirNext = 2;
  let scientificRationale = "";
  let confidenceScore = 95;
  let progressionType = "Consolidación Técnica";
  let fatigueStatus: AutoProgressionRecommendation["fatigueStatus"] = "optima";
  let nextSessionTip = "";

  const isLbs = weightUnit === "lbs";

  // Decision matrix based on RIR and Compound vs Isolation
  if (avgRir >= 3) {
    // Very easy (RPE <= 7) -> Aggressive jump
    fatigueStatus = "baja";
    if (isCompound) {
      deltaWeight = isLbs ? 10 : 5.0;
      action = "increase";
      actionLabel = `Sobrecarga Alta (+${deltaWeight} ${weightUnit})`;
      progressionType = "Salto de Sobrecarga Mecánica";
      scientificRationale = `El RIR promedio de ${avgRir} (RPE ${avgRpe}) indica velocidad de barra rápida y reserva neuromuscular elevada. Se recomienda un salto de +${deltaWeight} ${weightUnit} para situar la serie en la zona de reclutamiento de fibras de alto umbral (MAV).`;
      nextSessionTip = `Próxima sesión: aprieta el ritmo de calentamiento y busca ${Math.max(6, Math.round(avgReps - 1))} reps con ${currentWeight + deltaWeight} ${weightUnit}.`;
    } else {
      deltaWeight = isLbs ? 5 : 2.0;
      action = "increase";
      actionLabel = `Aumento de Carga (+${deltaWeight} ${weightUnit})`;
      progressionType = "Sobrecarga Directa";
      scientificRationale = `RIR ${avgRir} en ejercicio analítico indica capacidad sobrada. Incrementa +${deltaWeight} ${weightUnit} manteniendo el aislamiento estricto y la pausa en el punto de estiramiento.`;
      nextSessionTip = `Controla la fase excéntrica en 3 segundos para maximizar el estímulo del sarcómero.`;
    }
    targetRepsNext = `${Math.max(6, Math.round(avgReps))} reps`;
    targetRirNext = 2;
    confidenceScore = 98;
  } else if (avgRir >= 2) {
    // Optimal Sweet Spot (RPE 8) -> Standard 2.5kg / 5lbs jump
    fatigueStatus = "optima";
    if (isCompound) {
      deltaWeight = isLbs ? 5 : 2.5;
      action = "increase";
      actionLabel = `Sobrecarga Óptima (+${deltaWeight} ${weightUnit})`;
      progressionType = "Sobrecarga Progresiva Lineal";
      scientificRationale = `RIR ${avgRir} representa el estándar de oro en hipertrofia (máxima tensión mecánica con mínima fatiga sistémica perjudicial). Incremento regular de +${deltaWeight} ${weightUnit} para continuar el estímulo adaptativo.`;
      nextSessionTip = `Mantén el RIR en 1-2 en las series efectivas.`;
    } else {
      deltaWeight = isLbs ? 2.5 : 1.0;
      action = "micro_increase";
      actionLabel = `Micro-carga (+${deltaWeight} ${weightUnit})`;
      progressionType = "Micro-Sobrecarga Analítica";
      scientificRationale = `RIR ${avgRir} en ejercicio accesorio. Se sugiere una micro-carga (+${deltaWeight} ${weightUnit}) o sumar 1 repetición antes de cambiar de peso.`;
      nextSessionTip = `Busca completar al menos ${Math.round(avgReps)} reps con la nueva carga.`;
    }
    targetRepsNext = `${Math.round(avgReps)} reps`;
    targetRirNext = 2;
    confidenceScore = 95;
  } else if (avgRir >= 1) {
    // Near failure (RPE 9) -> Rep progression or micro-load
    fatigueStatus = "moderada";
    if (avgReps < 8) {
      deltaWeight = 0;
      action = "rep_progression";
      actionLabel = "Progresar en Repeticiones (+1-2 reps)";
      progressionType = "Sobrecarga por Volumen de Repeticiones";
      scientificRationale = `RIR ${avgRir} indica fatiga neuromuscular acumulada. Es más eficiente consolidar la carga actual sumando +1 repetición por serie antes de subir el kilaje.`;
      nextSessionTip = `Objetivo: pasar de ${Math.round(avgReps)} a ${Math.round(avgReps + 1)} repeticiones con técnica limpia.`;
      targetRepsNext = `${Math.round(avgReps + 1)} reps`;
    } else {
      deltaWeight = isLbs ? 2.5 : 1.25;
      action = "micro_increase";
      actionLabel = `Micro-Sobrecarga (+${deltaWeight} ${weightUnit})`;
      progressionType = "Micro-carga Conservadora";
      scientificRationale = `Reps completadas (${avgReps}) con RIR 1. Se autoriza una micro-carga prudente de +${deltaWeight} ${weightUnit} para evitar estancamiento.`;
      nextSessionTip = `Prioriza la estabilidad escapular/articular durante la primera serie.`;
      targetRepsNext = `${Math.max(6, Math.round(avgReps - 1))}-${Math.round(avgReps)} reps`;
    }
    targetRirNext = 1;
    confidenceScore = 91;
  } else if (avgRir === 0) {
    // True Muscular Failure (RPE 10)
    fatigueStatus = "elevada";
    deltaWeight = 0;
    action = "maintain";
    actionLabel = `Mantener ${currentWeight} ${weightUnit}`;
    progressionType = "Consolidación de Tempo y Técnica";
    scientificRationale = `Alcanzaste el fallo concéntrico (RIR 0). Aumentar el peso en la siguiente sesión aumentaría exponencialmente el daño muscular y la fatiga del SNC sin beneficio hipertrófico adicional.`;
    nextSessionTip = `Mantén el peso de ${currentWeight} ${weightUnit} y enfatiza la pausa isométrica de 1 segundo en el estiramiento.`;
    targetRepsNext = `${Math.round(avgReps)} reps (con RIR 1)`;
    targetRirNext = 1;
    confidenceScore = 94;
  } else {
    // Negative RIR / Overreaching / Failed reps
    fatigueStatus = "elevada";
    deltaWeight = isLbs ? -5 : -2.5;
    action = "deload";
    actionLabel = `Descarga Estratégica (${deltaWeight} ${weightUnit})`;
    progressionType = "Regulación de Fatiga";
    scientificRationale = `Detección de fallo técnico prematuro. Se sugiere un reajuste leve de carga para disipar fatiga periférica y restablecer la velocidad concéntrica normal.`;
    nextSessionTip = `Reduce ${Math.abs(deltaWeight)} ${weightUnit} y enfócate en el tempo excéntrico controlado.`;
    targetRepsNext = `${Math.round(avgReps + 2)} reps`;
    targetRirNext = 2;
    confidenceScore = 88;
  }

  // Sin RIR/RPE real en ninguna serie: no se progresa a ciegas.
  if (rirMissing) {
    action = "maintain";
    actionLabel = "Registrar RIR primero";
    deltaWeight = 0;
    targetRirNext = 2;
    scientificRationale =
      "Sin RIR registrado en las series no se puede estimar la reserva real: se mantiene la carga y se pide cargar el RIR (0-4) serie por serie para habilitar la progresión.";
    confidenceScore = 60;
    progressionType = "Dato insuficiente";
    fatigueStatus = "optima";
    nextSessionTip = "Cargá el RIR de cada serie al completar para habilitar la sobrecarga automática.";
  }

  const recommendedWeight = Math.max(0, Math.round((currentWeight + deltaWeight) * 10) / 10);
  const deltaPercent = currentWeight > 0 ? Math.round(((recommendedWeight - currentWeight) / currentWeight) * 1000) / 10 : 0;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.nameEs,
    category: exercise.category,
    equipment: exercise.equipment,
    currentWeight,
    lastReps: Math.round(avgReps),
    averageRir: avgRir,
    averageRpe: avgRpe,
    recommendedWeight,
    deltaWeight,
    deltaPercent,
    action,
    actionLabel,
    targetRepsNext,
    targetRirNext,
    scientificRationale,
    confidenceScore,
    progressionType,
    fatigueStatus,
    nextSessionTip,
    isCompound,
  };
}

export function computeAllAutoProgressions(
  recentExercises: WorkoutExercise[],
  allCatalogExercises: Exercise[],
  weightUnit: "kg" | "lbs" = "kg"
): AutoProgressionRecommendation[] {
  const exerciseMap = new Map<string, WorkoutSet[]>();

  // `recentExercises` viene de `workoutHistory.flatMap(w => w.exercises)` con el
  // historial ordenado del más nuevo al más viejo. Por eso la PRIMERA aparición
  // de cada ejercicio es su sesión más reciente: usarla evita que la progresión
  // promedie semanas viejas y arrastre recomendaciones desactualizadas (ej. 3
  // semanas a 100 kg ignorando el salto real a 105 kg de la última sesión).
  recentExercises.forEach((wex) => {
    if (!exerciseMap.has(wex.exerciseId)) {
      exerciseMap.set(wex.exerciseId, wex.sets);
    }
  });

  const recommendations: AutoProgressionRecommendation[] = [];

  exerciseMap.forEach((sets, exId) => {
    const foundEx = allCatalogExercises.find((e) => e.id === exId);
    if (foundEx) {
      recommendations.push(calculateAutoProgression(foundEx, sets, weightUnit));
    }
  });

  // Sin sesiones no se inventa nada: solo ejercicios con series reales.
  return recommendations;
}
