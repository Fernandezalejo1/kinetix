import { Program } from "../types";

export const PREBUILT_PROGRAMS: Program[] = [
  {
    id: "nightwing-7d",
    title: "NIGHTWING (7 Días)",
    subtitle: "Push/Pull/Piernas + Calistenia, Core de Acróbata y Cardio LISS/HIIT",
    scienceBasis: "Split de 7 días con frecuencia 2x nominal para pecho, hombros, espalda y gemelos. Prioriza estiramiento bajo tensión (posición alargada), RIR bajo en ejercicios de acortamiento y gestión del SNC evitando peso muerto en el día 6 para enfocar la espalda en V. El día 4 entrena estabilidad de hombros y core con calistenia avanzada.",
    level: "Avanzado",
    daysPerWeek: 7,
    durationWeeks: 8,
    focus: "Espalda en V, Hombros Sólidos, Core Funcional y Potencia",
    routines: [
      {
        id: "nightwing-d1-push",
        name: "Día 1 · Push (Pecho/Hombros) + Serrato",
        description: "Pecho superior e inclinado, estiramiento del dorsal con pullover (estrella del día) y proyección del serrato.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "smith-incline-bench-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "low-to-high-cable-flye", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-0-1-2", restSeconds: 90 },
          { exerciseId: "cable-pullover", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "lever-military-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "chest-dip", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "serratus-punches", targetSets: 3, targetReps: "15", targetRir: 2, targetTempo: "2-1-0-1", restSeconds: 45 }
        ]
      },
      {
        id: "nightwing-d2-pull",
        name: "Día 2 · Pull (Espalda en V y Bíceps)",
        description: "Jalones para ensanchar la espalda, remos medios y aisladores del bíceps con postura estricta.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "cable-bar-lateral-pulldown", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "single-arm-cable-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "seated-cable-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "lat-pushdown", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "rear-delt-fly-machine", targetSets: 3, targetReps: "15-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "dumbbell-biceps-curl", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "barbell-curl", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-0-1", restSeconds: 60 }
        ]
      },
      {
        id: "nightwing-d3-legs",
        name: "Día 3 · Piernas (Fuerza y Explosividad)",
        description: "Sentadilla profunda, búlgaras y RDL para la cadena posterior, gemelos con pausa y potencia con box jumps.",
        targetSplit: "Pierna",
        estimatedDurationMin: 65,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 4, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "bulgarian-split-squat", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "15-20", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 45 },
          { exerciseId: "box-jump", targetSets: 3, targetReps: "6-12", targetRir: 2, targetTempo: "Explosivo", restSeconds: 90 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 60 }
        ]
      },
      {
        id: "nightwing-d4-core",
        name: "Día 4 · Movilidad & Core (El día del Acróbata)",
        description: "Estabilidad de hombros, abdomen avanzado y trabajo funcional del serrato. Rango total de movimiento.",
        targetSplit: "Core & Movilidad",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "handstand-hold", targetSets: 4, targetReps: "30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 },
          { exerciseId: "l-sit-hold", targetSets: 4, targetReps: "20-30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 },
          { exerciseId: "windshield-wipers", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 60 },
          { exerciseId: "dragon-flag", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-0-2-0", restSeconds: 60 },
          { exerciseId: "serratus-punches", targetSets: 3, targetReps: "15", targetRir: 2, targetTempo: "2-1-0-1", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 60 }
        ]
      },
      {
        id: "nightwing-d5-push-light",
        name: "Día 5 · Push (Hombros) + Piernas Ligeras y Gemelos",
        description: "Segunda frecuencia semanal de hombros y gemelos con steps explosivos, más pike push-ups y tríceps.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "explosive-step-up", targetSets: 3, targetReps: "10", targetRir: 2, targetTempo: "Explosivo", restSeconds: 60 },
          { exerciseId: "smith-incline-bench-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "lever-military-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "bench-dip", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 60 },
          { exerciseId: "pike-push-up", targetSets: 3, targetReps: "AMRAP", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 60 },
          { exerciseId: "seated-calf-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-2-1-0", restSeconds: 45 }
        ]
      },
      {
        id: "nightwing-d6-pull-calisthenics",
        name: "Día 6 · Pull (Calistenia y Fuerza Brutal)",
        description: "Dominadas lastradas (ejercicio rey), remo invertido y aisladores. Sin peso muerto para proteger el SNC y enfocar la V.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "weighted-chin-up", targetSets: 4, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "inverted-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "dumbbell-rear-delt-fly", targetSets: 3, targetReps: "15-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "dumbbell-hammer-curl", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "superman-hold", targetSets: 3, targetReps: "20s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 }
        ]
      },
      {
        id: "nightwing-d7-cardio",
        name: "Día 7 · Cardio & Recuperación (El día de la definición)",
        description: "Cardio LISS de 25-30 min, HIIT de 15-20 min (30s sprint/45s descanso) y recuperación activa con yoga o caminata.",
        targetSplit: "Cardio & Recuperación",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "elliptical-machine-walk", targetSets: 1, targetReps: "20 min", targetRir: 3, targetTempo: "2-0-1-0", restSeconds: 60 },
          { exerciseId: "handstand-hold", targetSets: 2, targetReps: "30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 60 }
        ]
      }
    ]
  },
  {
    id: "science-hypertrophy-ppl",
    title: "Hipertrofia PPL Científica (6 Días)",
    subtitle: "Máxima Frecuencia 2x & Estimulación Óptima de MAV",
    scienceBasis: "Diseñado según los principios de volumen de Israetel y Schoenfeld. Distribuye de 12 a 18 series semanales por grupo muscular divididas en 2 sesiones para optimizar la síntesis proteica muscular (MPS) continua.",
    level: "Avanzado",
    daysPerWeek: 6,
    durationWeeks: 8,
    focus: "Hipertrofia Total, Énfasis en Estiramiento y Tensión Mecánica",
    routines: [
      {
        id: "ppl-push-a",
        name: "Push A (Enfoque Pectoral Clavicular & Tríceps)",
        description: "Sobrecarga en estiramiento para pectoral superior y porción larga de tríceps.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "6-8", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "cable-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-pull-a",
        name: "Pull A (Enfoque Dorsal Ilíaco & Bíceps)",
        description: "Tracciones verticales y unilaterales alineadas con el ángulo de penación del dorsal.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "single-arm-cable-row", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "chest-supported-t-bar-row", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 120 },
          { exerciseId: "incline-dumbbell-curl", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-legs-a",
        name: "Legs A (Enfoque Cuádriceps & Gemelos)",
        description: "Máxima flexión de rodilla bajo carga axial y estabilidad de soporte.",
        targetSplit: "Legs (Pierna)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "6-8", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "hack-squat-machine", targetSets: 3, targetReps: "8-10", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "10-12", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-push-b",
        name: "Push B (Enfoque Pectoral Esferoidal & Deltoides)",
        description: "Aperturas en polea y presses con tempo controlado.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 150 },
          { exerciseId: "cable-chest-flye", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-pull-b",
        name: "Pull B (Enfoque Espalda Alta & Trapecio Medio)",
        description: "Remos abiertos con retracción escapular y curls con pausa.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "chest-supported-t-bar-row", targetSets: 4, targetReps: "8-10", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 120 },
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "incline-dumbbell-curl", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "cable-crunch", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-0-1-2", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-legs-b",
        name: "Legs B (Enfoque Isquiotibiales & Cadena Posterior)",
        description: "Bisagras de cadera profundas y contracción en acortamiento de glúteos.",
        targetSplit: "Legs (Pierna)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 180 },
          { exerciseId: "barbell-hip-thrust", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "2-0-1-2", restSeconds: 150 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 90 }
        ]
      }
    ]
  },
  {
    id: "science-upper-lower-4d",
    title: "Torso / Pierna Científico (4 Días)",
    subtitle: "Equilibrio Perfecto entre Recuperación y Estímulo Hipertrófico",
    scienceBasis: "Ideal para atletas intermedios y avanzados con tiempo ajustado. Maximiza el ratio estímulo-fatiga (SFR) permitiendo 72 horas completas de supercompensación entre sesiones similares.",
    level: "Intermedio",
    daysPerWeek: 4,
    durationWeeks: 8,
    focus: "Masa Muscular Magra, Eficiencia de Tiempo, Ratio Estímulo/Fatiga",
    routines: [
      {
        id: "ul-torso-1",
        name: "Torso A (Enfoque Fuerza & Pectoral/Dorsal)",
        description: "Compuestos pesados para tren superior con sobrecarga progresiva.",
        targetSplit: "Torso",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "barbell-bench-press", targetSets: 4, targetReps: "6-8", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 4, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "cable-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "incline-dumbbell-curl", targetSets: 3, targetReps: "10-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "ul-pierna-1",
        name: "Pierna A (Enfoque Cuádriceps & Pantorrillas)",
        description: "Sentadilla pesada con dorsiflexión profunda y flexión de rodilla.",
        targetSplit: "Pierna",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 4, targetReps: "6-8", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "seated-leg-curl", targetSets: 4, targetReps: "10-12", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 120 },
          { exerciseId: "hack-squat-machine", targetSets: 3, targetReps: "8-10", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "10-12", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 90 }
        ]
      },
      {
        id: "ul-torso-2",
        name: "Torso B (Enfoque Hipertrofia & Espalda Alta)",
        description: "Press inclinado y remo con soporte de pecho.",
        targetSplit: "Torso",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "incline-dumbbell-press", targetSets: 4, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "chest-supported-t-bar-row", targetSets: 4, targetReps: "8-10", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 150 },
          { exerciseId: "cable-chest-flye", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "cable-crunch", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-0-1-2", restSeconds: 90 }
        ]
      },
      {
        id: "ul-pierna-2",
        name: "Pierna B (Enfoque Isquiosurales & Glúteos)",
        description: "Bisagras de cadera intensas y sobrecarga de glúteo.",
        targetSplit: "Pierna",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "romanian-deadlift", targetSets: 4, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 180 },
          { exerciseId: "barbell-hip-thrust", targetSets: 4, targetReps: "10-12", targetRir: 1, targetTempo: "2-0-1-2", restSeconds: 150 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "12-15", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 90 }
        ]
      }
    ]
  }
];
