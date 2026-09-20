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
          { exerciseId: "low-to-high-cable-flye", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-0-1-2", restSeconds: 90 },
          { exerciseId: "cable-pullover", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "lever-military-press", targetSets: 2, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
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
          { exerciseId: "handstand-hold", targetSets: 2, targetReps: "30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 },
          { exerciseId: "l-sit-hold", targetSets: 3, targetReps: "20-30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 60 },
          { exerciseId: "windshield-wipers", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 60 },
          { exerciseId: "dragon-flag", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-0-2-0", restSeconds: 60 },
          { exerciseId: "serratus-punches", targetSets: 3, targetReps: "15", targetRir: 2, targetTempo: "2-1-0-1", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 60 }
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
          { exerciseId: "smith-incline-bench-press", targetSets: 2, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "lever-military-press", targetSets: 2, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "bench-dip", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 60 },
          { exerciseId: "pike-push-up", targetSets: 2, targetReps: "AMRAP", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 60 },
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
    subtitle: "Frecuencia 2x con Volumen Productivo y RIR Controlado para Déficit",
    scienceBasis: "Diseñado según los principios de volumen de Israetel y Schoenfeld (12-15 series productivas semanales por grupo en 2 sesiones). Adaptado a corte calórico con mucho NEAT (p. ej. 15.000 pasos/día + keto): sin perseguir el máximo volumen recuperable, RIR 2-3 en compuestos, 1-2 en accesorios y 0-1 solo en aisladores seguros. Mantener la fuerza es el objetivo; la fuerza es el sensor de que el déficit no es excesivo. Progresa con doble progresión: sube peso solo si completas el tope del rango en TODAS las series con el RIR objetivo y buena técnica.",
    level: "Avanzado",
    daysPerWeek: 6,
    durationWeeks: 8,
    focus: "Mantener Músculo y Fuerza en Déficit, Prioridad en Zonas Limitantes",
    routines: [
      {
        id: "ppl-push-a",
        name: "Push A (Enfoque Pecho & Hombro Ligero)",
        description: "Pecho pesado con 3 series de banca a 2-3 RIR, aisladores con 1 RIR. Volumen de pecho real ~12-15 series semanales.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "standing-military-press", targetSets: 2, targetReps: "6-10", targetRir: 2, targetTempo: "2-1-1-1", restSeconds: 120 },
          { exerciseId: "lever-seated-fly", targetSets: 2, targetReps: "12-20", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "12-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 60 },
          { exerciseId: "cable-pushdown", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 }
        ]
      },
      {
        id: "ppl-pull-a",
        name: "Pull A (Enfoque Dorsal & Bíceps)",
        description: "Dominadas pesadas a 2 RIR, remo en polea y jalón neutro; cierra con face pull y curls. Bíceps ~5 series directas más tirones.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "weighted-chin-up", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "seated-cable-row", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 2, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "cable-face-pull-supinated", targetSets: 3, targetReps: "15-20", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 },
          { exerciseId: "barbell-curl", targetSets: 3, targetReps: "8-12", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 90 },
          { exerciseId: "dumbbell-hammer-curl", targetSets: 2, targetReps: "10-15", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 60 }
        ]
      },
      {
        id: "ppl-legs-a",
        name: "Legs A (Enfoque Cuádriceps & Gemelos)",
        description: "Sentadilla y RDL a 2 RIR, prensa y aislamientos de cuádriceps/isquios a 1 RIR. Observa la respuesta de piernas a los pasos diarios.",
        targetSplit: "Legs (Pierna)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "sled-leg-press", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "leg-extension", targetSets: 2, targetReps: "12-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 60 },
          { exerciseId: "seated-leg-curl", targetSets: 2, targetReps: "10-15", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 60 },
          { exerciseId: "standing-calf-raise", targetSets: 3, targetReps: "8-15", targetRir: 1, targetTempo: "3-2-1-1", restSeconds: 60 }
        ]
      },
      {
        id: "ppl-push-b",
        name: "Push B (Enfoque Hombro & Pecho Ligero)",
        description: "Hombro pesado a 2 RIR con fondos lastrados; pecho pasa a un rol secundario para repartir mejor la recuperación semanal.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "standing-military-press", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "2-1-1-1", restSeconds: 150 },
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "chest-dip", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "12-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 60 },
          { exerciseId: "cable-standing-crossover", targetSets: 2, targetReps: "12-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "ppl-pull-b",
        name: "Pull B (Enfoque Espalda Alta & Trapecio)",
        description: "Remo apoyado a 2 RIR para proteger la lumbar, jalón, remo unilateral, encogimientos y curls de cierre. Sin remo con barra para no castigar la zona lumbar.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "chest-supported-t-bar-row", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "2-1-1-1", restSeconds: 150 },
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "single-arm-cable-row", targetSets: 2, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "dumbbell-shrug", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 },
          { exerciseId: "barbell-preacher-curl", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "barbell-reverse-curl", targetSets: 2, targetReps: "12-20", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 }
        ]
      },
      {
        id: "ppl-legs-b",
        name: "Legs B (Enfoque Isquios & Cadena Posterior)",
        description: "RDL pesado a 2 RIR, hack/front squat, hip thrust y aislamientos de isquios/cuádriceps. Gemelos sentado para cubrir el sóleo.",
        targetSplit: "Legs (Pierna)",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "6-10", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 180 },
          { exerciseId: "hack-squat-machine", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "barbell-hip-thrust", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "2-0-1-2", restSeconds: 120 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "leg-extension", targetSets: 2, targetReps: "12-20", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 60 },
          { exerciseId: "seated-calf-raise", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-2-1-0", restSeconds: 60 }
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
  },
  {
    id: "definition-abs-4d",
    title: "DEFINICIÓN + ABDOMINALES (4 Días)",
    subtitle: "Fase de Definición con Bloque de Construcción Abdominal Progresiva en cada día + Cardio + Guía de Déficit",
    scienceBasis: "Programa de fase de definición: déficit calórico moderado (−15%) con volumen de hipertrofia reducido (~60−70% del de volumen) para RETENER masa magra mientras el cuerpo usa grasa como energía. La CLAVE de los abdominales: se construyen igual que cualquier músculo (progresión de carga, tensión mecánica y estiramiento − cf. Schoenfeld) pero SOLO se VEN cuando baja el % de grasa corporal (≈12% hombres / ≈20% mujeres para un six-pack visible). Cada día incluye un BLOQUE DE ABDOMINALES PROGRESIVO (fases: activación → hipertrofia con peso → resistencia isométrica) más cardio para acelerar el déficit. Complementar con la guía de Definición en la pestaña Nutrición.",
    level: "Intermedio",
    daysPerWeek: 4,
    durationWeeks: 6,
    focus: "Definición (pérdida de grasa) + Construcción Progresiva de Abdominales",
    routines: [
      {
        id: "def-push-abs",
        name: "Día 1 · Push (Pecho) + Bloque Abdominal Superior",
        description: "PASO 1 del abdominal: activación y flexión de recto abdominal con carga progresiva. Press compuestos a déficit moderado para retener masa.",
        targetSplit: "Push (Empuje)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "smith-incline-bench-press", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-chest-flye", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-0-1-2", restSeconds: 90 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "cable-crunch", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-1-1-1", restSeconds: 45 },
          { exerciseId: "decline-crunch", targetSets: 2, targetReps: "12-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "45-60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 }
        ]
      },
      {
        id: "def-pull-abs",
        name: "Día 2 · Pull (Espalda) + Oblicuos",
        description: "PASO 2 del abdominal: trabajo de flexión lateral y rotación (oblicuos) con peso progresivo. Mantiene la espalda densa en déficit.",
        targetSplit: "Pull (Tracción)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "chest-supported-t-bar-row", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 120 },
          { exerciseId: "incline-dumbbell-curl", targetSets: 3, targetReps: "12-15", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "weighted-russian-twist", targetSets: 3, targetReps: "12-15/side", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "45-60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 }
        ]
      },
      {
        id: "def-legs-abs",
        name: "Día 3 · Piernas + Core Integrado",
        description: "PASO 3 del abdominal: integración de core con estímulo metabólico (bisagras + marcha con lastre). Quema calórica alta para el déficit.",
        targetSplit: "Legs (Pierna)",
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 150 },
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "15-20", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 60 },
          { exerciseId: "medicine-ball-slam", targetSets: 3, targetReps: "12", targetRir: 1, targetTempo: "Explosivo", restSeconds: 45 },
          { exerciseId: "lying-scissors-cross", targetSets: 3, targetReps: "15/side", targetRir: 1, targetTempo: "2-1-1-0", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 }
        ]
      },
      {
        id: "def-cardio-abs",
        name: "Día 4 · Cardio Definición + Core Final",
        description: "PASO FINAL: bloque de core de cierre (recto + lumbar) moderado y cardio para maximizar el déficit y revelar el six-pack. Se evita el volumen abdominal innecesario en déficit.",
        targetSplit: "Cardio + Core",
        estimatedDurationMin: 45,
        exercises: [
          { exerciseId: "elliptical-machine-walk", targetSets: 1, targetReps: "25 min", targetRir: 3, targetTempo: "Cardio LISS 65-70% FC", restSeconds: 60 },
          { exerciseId: "floor-crunch", targetSets: 2, targetReps: "20", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 30 },
          { exerciseId: "weighted-russian-twist", targetSets: 2, targetReps: "15/side", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 30 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 30 },
          { exerciseId: "superman-hold", targetSets: 2, targetReps: "20-30s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 30 }
        ]
      }
    ]
  },
  {
    id: "fbeod-full-body",
    title: "FBEOD · Full Body (3-4 Días)",
    subtitle: "Cuerpo completo alternado A/B con frecuencia 3x por grupo en 4 días",
    scienceBasis: "Sesiones de cuerpo completo alternadas (A: empuje + pierna dominante · B: tracción + pierna posterior) entrenadas cada 48h (3-4 días/semana). Frecuencia real 3x por grupo muscular por semana, ideal para maximizar la MPS y el estímulo en déficit calórico sin exceder el MEV del primer día. RIR controlado (1-2) y tempo excéntrico en alargamiento para hipertrofia basada en evidencia.",
    level: "Intermedio",
    daysPerWeek: 4,
    durationWeeks: 8,
    focus: "Full Body, Frecuencia 3x, Adaptación a Déficit Keto",
    routines: [
      {
        id: "fbeod-d1-a",
        name: "Día 1 · Full Body A (Empuje + Pierna Anterior)",
        description: "Bloque de empuje (pecho, hombros, tríceps) con sentadilla y gemelos. RIR 1 en básicos, RIR 0 en aisladores.",
        targetSplit: "Full Body A",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 120 },
          { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "standing-military-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "cable-lateral-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "standing-calf-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-2-1-1", restSeconds: 45 }
        ]
      },
      {
        id: "fbeod-d2-b",
        name: "Día 2 · Full Body B (Tracción + Pierna Posterior)",
        description: "Jalones, remos y bíceps con RDL y core. Estiramiento en alargamiento para espalda y bíceps.",
        targetSplit: "Full Body B",
        estimatedDurationMin: 60,
        exercises: [
          { exerciseId: "romanian-deadlift", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "chest-supported-t-bar-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "single-arm-cable-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "dumbbell-biceps-curl", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "cable-crunch", targetSets: 3, targetReps: "15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 45 }
        ]
      },
      {
        id: "fbeod-d3-a",
        name: "Día 3 · Full Body A (Variante Pecho/hombros)",
        description: "Variante del bloque A: press inclinado con mancuernas, moscas y fondos para cambiar el ángulo de tensión.",
        targetSplit: "Full Body A",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-chest-flye", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-1-1-1", restSeconds: 90 },
          { exerciseId: "chest-dip", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 90 },
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "8-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 120 },
          { exerciseId: "dumbbell-lateral-raise", targetSets: 3, targetReps: "15-20", targetRir: 0, targetTempo: "3-0-1-1", restSeconds: 45 },
          { exerciseId: "bench-dip", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-0-1", restSeconds: 60 }
        ]
      },
      {
        id: "fbeod-d4-b",
        name: "Día 4 · Full Body B (Variante Espalda)",
        description: "Variante del bloque B: pull — dominadas, remo inclinado y lifting posterior.",
        targetSplit: "Full Body B",
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: "barbell-bent-over-row", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-bar-lateral-pulldown", targetSets: 3, targetReps: "6-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 90 },
          { exerciseId: "hyperextension", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-0-2-0", restSeconds: 60 },
          { exerciseId: "cable-hammer-curl", targetSets: 3, targetReps: "6-12", targetRir: 0, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 },
          { exerciseId: "superman-hold", targetSets: 2, targetReps: "20-30s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 }
        ]
      }
    ]
  },
  {
    id: "consenso-keto-ppl-6x",
    title: "MI PLAN · Keto PPL x2 (Consenso Final)",
    subtitle: "Tu plan personal 18/09/2026 · 2.700 kcal · 220 g P · 15k pasos · trap bar en vez de peso muerto",
    scienceBasis: "PPL x2 (6 días) + domingo activo. Compuestos RIR 2-3 nunca al fallo, aislamientos RIR 0-1, doble progresión, deload cada 5-6 semanas (mitad de volumen, RIR 4-5). Sin peso muerto convencional por dolor lumbar: trap bar moderada + hip thrust + remo pecho-apoyado. Abs 3x/sem pesado al final. Descanso 3-4 min en banca/militar/sentadilla.",
    level: "Avanzado",
    daysPerWeek: 6,
    durationWeeks: 12,
    focus: "Keto 2.700 kcal · Fuerza + Abs 6-10 meses · Cintura manda",
    routines: [
      {
        id: "consenso-lunes-push-a",
        name: "Lunes · Push A (Fuerza)",
        description: "Press plano 4×5-6 RIR2 (última RIR1) · descanso 3-4 min en básicos. Abs: plancha al final.",
        targetSplit: "Push A",
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: "barbell-bench-press", targetSets: 4, targetReps: "5-6", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 210 },
          { exerciseId: "incline-dumbbell-press", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "dumbbell-seated-shoulder-press", targetSets: 3, targetReps: "6-8", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "dumbbell-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 },
          { exerciseId: "cable-pushdown", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "30-40s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 60 }
        ]
      },
      {
        id: "consenso-martes-pull-a",
        name: "Martes · Pull A (Trap bar)",
        description: "Trap bar 4×6-8 RIR2 en vez de peso muerto (lumbar). Progresión S1-2: 3×8@60 · S3-4: 4×8@70 · S5-6: 4×6@80 · S7-8: 4×6@90.",
        targetSplit: "Pull A",
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: "trap-bar-deadlift", targetSets: 4, targetReps: "6-8", targetRir: 2, targetTempo: "2-0-1-0", restSeconds: 180 },
          { exerciseId: "cable-bar-lateral-pulldown", targetSets: 4, targetReps: "8", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "chest-supported-t-bar-row", targetSets: 4, targetReps: "8-10", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-face-pull-supinated", targetSets: 3, targetReps: "15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 },
          { exerciseId: "ez-bar-curl", targetSets: 3, targetReps: "8-10", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 90 },
          { exerciseId: "dumbbell-hammer-curl", targetSets: 2, targetReps: "10-12", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 60 }
        ]
      },
      {
        id: "consenso-miercoles-legs-a",
        name: "Miércoles · Legs A + Abs",
        description: "ÚNICO día de sentadilla libre del bloque (3×5-6 RIR2-3). Abs pesado al final: cable crunch + colgado.",
        targetSplit: "Legs A",
        estimatedDurationMin: 80,
        exercises: [
          { exerciseId: "barbell-hack-or-squat", targetSets: 3, targetReps: "5-6", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 210 },
          { exerciseId: "sled-leg-press", targetSets: 3, targetReps: "10-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "leg-extension", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 },
          { exerciseId: "standing-calf-raise", targetSets: 4, targetReps: "12-15", targetRir: 1, targetTempo: "3-2-1-1", restSeconds: 60 },
          { exerciseId: "cable-crunch", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 },
          { exerciseId: "windshield-wipers", targetSets: 2, targetReps: "max-1", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 90 }
        ]
      },
      {
        id: "consenso-jueves-push-b",
        name: "Jueves · Push B (Volumen)",
        description: "Inclinado máquina como base 4×8-10. Rueda abdominal: usa Dragon Flag como proxy hasta tener rueda.",
        targetSplit: "Push B",
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: "lever-incline-chest-press", targetSets: 4, targetReps: "8-10", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 150 },
          { exerciseId: "barbell-bench-press", targetSets: 3, targetReps: "8", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "lever-military-press", targetSets: 3, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 120 },
          { exerciseId: "cable-lateral-raise", targetSets: 4, targetReps: "12-15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 },
          { exerciseId: "overhead-cable-triceps-extension", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 },
          { exerciseId: "dragon-flag", targetSets: 3, targetReps: "8-12", targetRir: 1, targetTempo: "3-0-1-0", restSeconds: 90 },
          { exerciseId: "cable-crunch", targetSets: 2, targetReps: "12", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 60 }
        ]
      },
      {
        id: "consenso-viernes-pull-b",
        name: "Viernes · Pull B (Ancho)",
        description: "Énfasis ancho: jalón neutro + pullover + posterior. Plancha lateral: usa plancha frontal como proxy por lado.",
        targetSplit: "Pull B",
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: "neutral-grip-lat-pulldown", targetSets: 4, targetReps: "10", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "seated-cable-row", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "cable-pullover", targetSets: 3, targetReps: "12-15", targetRir: 1, targetTempo: "3-1-1-0", restSeconds: 60 },
          { exerciseId: "rear-delt-fly-machine", targetSets: 3, targetReps: "12-20", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 },
          { exerciseId: "incline-dumbbell-curl", targetSets: 3, targetReps: "10-12", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 60 },
          { exerciseId: "barbell-preacher-curl", targetSets: 2, targetReps: "12-15", targetRir: 1, targetTempo: "2-0-1-0", restSeconds: 60 },
          { exerciseId: "front-plank", targetSets: 3, targetReps: "30-60s lado", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 }
        ]
      },
      {
        id: "consenso-sabado-legs-b",
        name: "Sábado · Legs B (Posterior, sin sentadilla)",
        description: "SIN sentadilla libre: hack/prensa pies altos + búlgara + hip thrust (glúteo sin carga axial). Silla romana: sit-up como proxy.",
        targetSplit: "Legs B",
        estimatedDurationMin: 80,
        exercises: [
          { exerciseId: "hack-squat-machine", targetSets: 4, targetReps: "6-8", targetRir: 2, targetTempo: "3-1-0-1", restSeconds: 180 },
          { exerciseId: "bulgarian-split-squat", targetSets: 2, targetReps: "8-12", targetRir: 2, targetTempo: "3-1-1-0", restSeconds: 120 },
          { exerciseId: "barbell-hip-thrust", targetSets: 3, targetReps: "8-12", targetRir: 1, targetTempo: "2-1-1-1", restSeconds: 120 },
          { exerciseId: "seated-leg-curl", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "3-0-1-1", restSeconds: 90 },
          { exerciseId: "seated-calf-raise", targetSets: 3, targetReps: "15", targetRir: 1, targetTempo: "3-2-1-1", restSeconds: 60 },
          { exerciseId: "sit-up", targetSets: 3, targetReps: "10-15", targetRir: 1, targetTempo: "2-0-1-1", restSeconds: 60 }
        ]
      },
      {
        id: "consenso-domingo-activo",
        name: "Domingo · Activo (McGill + Movilidad)",
        description: "Caminata larga + McGill Big 3 (bird-dog=superman, plancha, curl-up) + batch cooking. Sin carga axial.",
        targetSplit: "Activo",
        estimatedDurationMin: 25,
        exercises: [
          { exerciseId: "superman-hold", targetSets: 2, targetReps: "30s", targetRir: 2, targetTempo: "Sostén isométrico", restSeconds: 45 },
          { exerciseId: "front-plank", targetSets: 2, targetReps: "60s", targetRir: 1, targetTempo: "Sostén isométrico", restSeconds: 45 },
          { exerciseId: "hyperextension", targetSets: 2, targetReps: "12", targetRir: 2, targetTempo: "3-0-2-0", restSeconds: 60 }
        ]
      }
    ]
  }
];
