import { Program } from "../types";

export const PREBUILT_PROGRAMS: Program[] = [
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
