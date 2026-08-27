import {
  Exercise,
  ExercisePrimaryMuscleDetail,
  ExerciseSecondaryMuscleDetail,
  ExerciseTechniquePhase,
  ExerciseMistakeDetail,
  ExerciseVariationDetail,
  ExerciseRegressionDetail,
  ExerciseProgressionDetail,
  ExercisePreMobilityDetail,
  ExercisePostStretchingDetail,
  ExerciseAnalyticsData,
  Exercise3DConfig,
  MuscleGroup
} from "../types";
import { MUSCLE_LANDMARKS_CONFIG } from "./scienceCalculators";

// Generates rich anatomy, biomechanics, media and analytics for any exercise
export function getEnrichedExercise(exercise: Exercise): Exercise {
  const primaryDetails: ExercisePrimaryMuscleDetail[] =
    exercise.primaryMusclesDetail && exercise.primaryMusclesDetail.length > 0
      ? exercise.primaryMusclesDetail
      : exercise.primaryMuscles.map((m, idx) => {
          const config = MUSCLE_LANDMARKS_CONFIG[m];
          const anatomyInfo = getMuscleAnatomyInfo(m);
          return {
            muscle: m,
            name: config?.nameEs || m,
            origin: anatomyInfo.origin,
            insertion: anatomyInfo.insertion,
            action: anatomyInfo.action,
            fiberOrientation: anatomyInfo.fiberOrientation,
            contributionPct: idx === 0 ? 70 : 30,
          };
        });

  const secondaryDetails: ExerciseSecondaryMuscleDetail[] =
    exercise.secondaryMusclesDetail && exercise.secondaryMusclesDetail.length > 0
      ? exercise.secondaryMusclesDetail
      : exercise.secondaryMuscles.map((m) => {
          const config = MUSCLE_LANDMARKS_CONFIG[m];
          return {
            muscle: m,
            name: config?.nameEs || m,
            role: "sinergista",
            contributionPct: 15,
          };
        });

  const anatomyDetails = exercise.anatomyDetails || {
    jointMoments: getJointMoments(exercise),
    momentArmPeak: getMomentArmPeak(exercise),
    activeInsufficiency: getActiveInsufficiencyInfo(exercise),
    stretchMediatedHypertrophyScore: exercise.resistanceProfile === "lengthened" ? 9.6 : 8.2,
    lengthTensionPhase:
      exercise.resistanceProfile === "lengthened"
        ? "Sobrecarga en posición elongada (máximo sarcómero)"
        : exercise.resistanceProfile === "shortened"
        ? "Pico de torque en máxima aproximación de puentes cruzados"
        : "Curva simétrica balanceada en rango medio",
  };

  const techniquePhases: ExerciseTechniquePhase[] =
    exercise.techniquePhases && exercise.techniquePhases.length > 0
      ? exercise.techniquePhases
      : [
          {
            phase: "Setup & Posición Inicial",
            cues: exercise.setupCues.length > 0 ? exercise.setupCues : ["Alineación postural estable", "Activación del core y retracción"],
            tempoCode: "0s",
            breathing: "Inhalación diafragmática profunda y fijación intraabdominal (Valsalva).",
          },
          {
            phase: "Fase Excéntrica (Bajada)",
            cues: [
              "Descenso controlado en 3 segundos resistiendo activamente la gravedad.",
              "Mantén las articulaciones alineadas con la dirección de las fibras musculares.",
            ],
            tempoCode: exercise.defaultTempo.split("-")[0] || "3s",
            breathing: "Mantén el aire comprimido en el core para estabilidad torácica.",
          },
          {
            phase: "Punto de Máximo Estiramiento",
            cues: [
              "Pausa deliberada de 1 segundo eliminando todo rebote elástico miotático.",
              "Siente la tensión pasiva acumulada en los elementos elásticos en serie (titina).",
            ],
            tempoCode: exercise.defaultTempo.split("-")[1] || "1s",
            breathing: "Presión abdominal firme.",
          },
          {
            phase: "Fase Concéntrica (Empuje/Tracción)",
            cues: exercise.executionCues.length > 0 ? exercise.executionCues : ["Impulso explosivo con máxima intención de aceleración"],
            tempoCode: exercise.defaultTempo.split("-")[2] || "0s",
            breathing: "Exhala de forma controlada superando el 'sticking point'.",
          },
          {
            phase: "Contracción Máxima / Bloqueo",
            cues: [
              "Sostén la tensión muscular en el punto de acortamiento sin hiperextender articulaciones pasivas.",
            ],
            tempoCode: exercise.defaultTempo.split("-")[3] || "1s",
            breathing: "Recupera la respiración antes de la siguiente repetición.",
          },
        ];

  const commonMistakesDetail: ExerciseMistakeDetail[] =
    exercise.commonMistakesDetail && exercise.commonMistakesDetail.length > 0
      ? exercise.commonMistakesDetail
      : exercise.commonMistakes.map((cm, idx) => ({
          mistake: cm.mistake,
          consequence: "Disminuye el reclutamiento de unidades motoras de alto umbral y eleva el torque en ligamentos.",
          riskLevel: idx === 0 ? "Alto" : "Moderado",
          correction: cm.correction,
        }));

  const proTips: string[] =
    exercise.proTips && exercise.proTips.length > 0
      ? exercise.proTips
      : [
          "Mantén el tempo excéntrico estricto de 3s: el 60% del estímulo hipertrófico ocurre en la fase negativa.",
          "Visualiza empujar el suelo o alejar la carga desde la inserción muscular, no solo mover las manos.",
          "Usa magnesio o correas (straps) si el agarre empieza a limitar la cercanía real al fallo.",
          "Finaliza cada serie a 1-2 RIR; el estímulo es idéntico al fallo con la mitad de fatiga central.",
        ];

  const variationsDetail: ExerciseVariationDetail[] =
    exercise.variationsDetail && exercise.variationsDetail.length > 0
      ? exercise.variationsDetail
      : getVariationsForExercise(exercise);

  const regressionsDetail: ExerciseRegressionDetail[] =
    exercise.regressionsDetail && exercise.regressionsDetail.length > 0
      ? exercise.regressionsDetail
      : exercise.regressions.map((r) => ({
          name: r,
          reason: "Permite aprender la trayectoria motora con menor demanda de estabilidad y menor fatiga axial.",
          targetLoadReduction: "-20% a -30%",
        }));

  const progressionsDetail: ExerciseProgressionDetail[] =
    exercise.progressionsDetail && exercise.progressionsDetail.length > 0
      ? exercise.progressionsDetail
      : exercise.progressions.map((p) => ({
          name: p,
          mechanism: "Aumenta el tiempo bajo tensión mecánica en el rango de mayor elongación sarcomérica.",
          recommendedWhen: "Cuando alcances 10+ repeticiones con RIR 2 y técnica impecable.",
        }));

  const preMobilityDetail: ExercisePreMobilityDetail[] =
    exercise.preMobilityDetail && exercise.preMobilityDetail.length > 0
      ? exercise.preMobilityDetail
      : exercise.preMobility.map((m) => ({
          drill: m,
          targetJoint: getJointTarget(exercise),
          setsReps: "2 series x 10 repeticiones controladas",
          objective: "Aumentar temperatura articular, lubricación sinovial y rango de movimiento dinámico.",
        }));

  const postStretchingDetail: ExercisePostStretchingDetail[] =
    exercise.postStretchingDetail && exercise.postStretchingDetail.length > 0
      ? exercise.postStretchingDetail
      : exercise.postStretching.map((s) => ({
          stretch: s,
          targetMuscle: MUSCLE_LANDMARKS_CONFIG[exercise.primaryMuscles[0]]?.nameEs || "Músculo Principal",
          duration: "2 x 30-45 segundos sostenidos",
          type: "Activo / Cargado",
        }));

  const analytics: ExerciseAnalyticsData = exercise.analytics || {
    sfrScore: exercise.category === "push" ? 9.2 : exercise.category === "pull" ? 9.5 : 8.8,
    hypertrophyTier: "S-Tier",
    axialFatigue: exercise.equipment === "barbell" && exercise.category === "legs" ? "Alta" : exercise.equipment === "cable" ? "Nula" : "Baja",
    jointStress: exercise.equipment === "cable" || exercise.equipment === "machine" ? "Muy Bajo" : "Moderado",
    hypertrophyMechanism:
      exercise.resistanceProfile === "lengthened"
        ? "Hipertrofia Mediada por Estiramiento"
        : "Tensión Mecánica Pura",
    optimalRepRange: exercise.equipment === "barbell" ? "6 - 10 reps" : "8 - 12 reps",
    optimalWeeklySets: "6 - 12 series efectivas",
    targetRir: "1 - 2 RIR",
    e1rmCurve: [
      { weight: 60, reps: 12, e1rm: 84 },
      { weight: 70, reps: 10, e1rm: 93 },
      { weight: 80, reps: 8, e1rm: 100 },
      { weight: 85, reps: 6, e1rm: 102 },
      { weight: 90, reps: 4, e1rm: 101 },
    ],
  };

  const model3DConfig: Exercise3DConfig = exercise.model3DConfig || {
    type: exercise.category === "legs" ? "humanoid_lower" : "humanoid_upper",
    jointAngles: getJointAngles(exercise),
    highlightNodes: exercise.primaryMuscles,
    barbellOrDumbbellPath:
      exercise.category === "legs"
        ? "linear_vertical"
        : exercise.category === "pull"
        ? "horizontal_pull"
        : "curved_arc",
    tensionPeakDeg: 90,
  };

  return {
    ...exercise,
    videoUrl: exercise.videoUrl || `/assets/exercises/${exercise.id}.mp4`,
    gifUrl: exercise.gifUrl || `/assets/exercises/${exercise.id}.gif`,
    primaryMusclesDetail: primaryDetails,
    secondaryMusclesDetail: secondaryDetails,
    anatomyDetails,
    techniquePhases,
    commonMistakesDetail,
    proTips,
    variationsDetail,
    regressionsDetail,
    progressionsDetail,
    preMobilityDetail,
    postStretchingDetail,
    analytics,
    model3DConfig,
  };
}

function getMuscleAnatomyInfo(muscle: MuscleGroup) {
  switch (muscle) {
    case "chest":
      return {
        origin: "Clavícula (haz clavicular), Esternón y cartílagos costales 1-6 (haz esternocostal)",
        insertion: "Cresta del tubérculo mayor del húmero (labio lateral de la corredera bicipital)",
        action: "Aducción horizontal, flexión y rotación interna del brazo",
        fiberOrientation: "Orientación transversal convergente en abanico",
      };
    case "lats":
      return {
        origin: "Apófisis espinosas T7-L5, fascia toracolumbar, cresta ilíaca y costillas 9-12",
        insertion: "Suelo de la corredera bicipital del húmero",
        action: "Extensión, aducción y rotación interna del hombro; depresión escapular",
        fiberOrientation: "Fibras oblicuas ascendentes e iliocostales casi verticales",
      };
    case "upper_back":
    case "traps":
      return {
        origin: "Línea nucal superior, protuberancia occipital externa y ligamento nucal (C1-T12)",
        insertion: "Tercio lateral de clavícula, acromion y espina de la escápula",
        action: "Retracción, elevación y rotación superior de la escápula",
        fiberOrientation: "Triangular multipeniforme con haces descendentes, transversales y ascendentes",
      };
    case "side_delts":
      return {
        origin: "Borde lateral y cara superior del acromion",
        insertion: "Tuberosidad deltoidea del húmero",
        action: "Abducción del brazo en el plano frontal y escapular (15° a 90°)",
        fiberOrientation: "Multipeniforme con alta capacidad de generación de fuerza",
      };
    case "front_delts":
      return {
        origin: "Tercio lateral y borde anterior de la clavícula",
        insertion: "Tuberosidad deltoidea del húmero",
        action: "Flexión anterior y aducción horizontal del hombro",
        fiberOrientation: "Paralelopeniforme",
      };
    case "rear_delts":
      return {
        origin: "Labio inferior del borde posterior de la espina escapular",
        insertion: "Tuberosidad deltoidea del húmero",
        action: "Abducción horizontal, extensión y rotación externa del hombro",
        fiberOrientation: "Fibras posterolaterales oblicuas",
      };
    case "biceps":
      return {
        origin: "Tubérculo supraglenoideo (cabeza larga) y apófisis coracoides (cabeza corta)",
        insertion: "Tuberosidad del radio y aponeurosis bicipital",
        action: "Flexión de codo, supinación del antebrazo y flexión accesoria de hombro",
        fiberOrientation: "Fusiforme biarticular",
      };
    case "triceps":
      return {
        origin: "Tubérculo infraglenoideo (cabeza larga), cara posterior del húmero (cabezas lateral y medial)",
        insertion: "Olécranon del cúbito",
        action: "Extensión del codo y aducción/extensión del hombro (cabeza larga)",
        fiberOrientation: "Penniforme con inserción tendinosa común amplia",
      };
    case "quads":
      return {
        origin: "Espina ilíaca anteroinferior (recto femoral) y cuerpo del fémur (vastos lateral, medial e intermedio)",
        insertion: "Base de la rótula y tuberosidad anterior de la tibia mediante el tendón rotuliano",
        action: "Extensión potente de rodilla y flexión de cadera (recto femoral)",
        fiberOrientation: "Multipeniforme de alta fuerza y capacidad de carga volumétrica",
      };
    case "hamstrings":
      return {
        origin: "Tuberosidad isquiática y línea áspera del fémur",
        insertion: "Cóndilo medial de la tibia (semimembranoso/tendinoso) y cabeza del peroné (bíceps femoral)",
        action: "Flexión de rodilla, extensión de cadera y rotación tibial",
        fiberOrientation: "Fibras largas con gran susceptibilidad a daño inducido por estiramiento",
      };
    case "glutes":
      return {
        origin: "Cara posterolateral del ilion, sacro y cóccix, ligamento sacrotuberoso",
        insertion: "Tuberosidad glútea del fémur y tracto iliotibial",
        action: "Extensión, rotación externa y abducción potente de la cadera",
        fiberOrientation: "Fibras gruesas y oblicuas, el músculo más voluminoso del cuerpo",
      };
    case "calves":
      return {
        origin: "Cóndilos femoral medial y lateral (gastrocnemio) y línea del sóleo en tibia (sóleo)",
        insertion: "Cara posterior del calcáneo mediante el tendón de Aquiles",
        action: "Flexión plantar del tobillo y flexión de rodilla (gastrocnemio)",
        fiberOrientation: "Bipenniforme denso con brazo de momento constante",
      };
    case "abs":
      return {
        origin: "Cresta del pubis y sínfisis púbica",
        insertion: "Cartílagos costales de costillas 5-7 y apófisis xifoides",
        action: "Flexión de la columna vertebral toracolumbar y compresión intraabdominal",
        fiberOrientation: "Paralela poligástrica separada por intersecciones tendinosas",
      };
    default:
      return {
        origin: "Estructuras óseas axiales o proximales",
        insertion: "Estructuras óseas distales",
        action: "Movimiento y estabilización articular biomecánica",
        fiberOrientation: "Peniforme adaptativa",
      };
  }
}

function getJointMoments(exercise: Exercise): string {
  if (exercise.category === "push") {
    return "Torque de flexión/aducción horizontal en articulación glenohumeral (65 Nm) y extensión de codo (40 Nm).";
  }
  if (exercise.category === "pull") {
    return "Torque de extensión/aducción glenohumeral (75 Nm) y flexión de codo con retracción escapular.";
  }
  if (exercise.category === "legs") {
    return "Gran momento extensor en rodilla (140-180 Nm) y cadera (160-220 Nm) en la posición inferior.";
  }
  return "Torque de flexión anterior del raquis lumbar contra resistencia perpendicular.";
}

function getMomentArmPeak(exercise: Exercise): string {
  if (exercise.resistanceProfile === "lengthened") {
    return "Pico de brazo de palanca cuando el músculo objetivo se encuentra elongado (>90° de flexión articular).";
  }
  if (exercise.resistanceProfile === "shortened") {
    return "Brazo de palanca máximo al final del rango, coincidiendo con la máxima aproximación de origen e inserción.";
  }
  return "Brazo de palanca óptimo a mitad de recorrido (ángulo articular de 90° respecto al vector de resistencia).";
}

function getActiveInsufficiencyInfo(exercise: Exercise): string {
  if (exercise.category === "legs" && exercise.primaryMuscles.includes("hamstrings")) {
    return "En posición sentada (cadera a 90°), los isquiotibiales evitan la insuficiencia activa y generan hasta un 30% más de hipertrofia que tumbado.";
  }
  if (exercise.category === "push" && exercise.primaryMuscles.includes("triceps")) {
    return "La flexión de hombro pre-estira la porción larga del tríceps, evitando la insuficiencia activa en la extensión del codo.";
  }
  return "Riesgo de insuficiencia activa mínimo gracias al soporte postural y alineación del vector articular.";
}

function getJointTarget(exercise: Exercise): string {
  if (exercise.category === "push") return "Complejo articular del hombro (Glenohumeral & Escapulotorácica)";
  if (exercise.category === "pull") return "Columna torácica y articulación glenohumeral";
  if (exercise.category === "legs") return "Tobillo (Dorsiflexión) y Cadera (Cápsula coxofemoral)";
  return "Columna lumbar y torácica";
}

function getJointAngles(exercise: Exercise) {
  if (exercise.category === "push") {
    return [
      { joint: "Hombro (Flexión/Aducción)", startAngle: 30, peakAngle: 95, plane: "Sagital / Escapular" },
      { joint: "Codo (Extensión)", startAngle: 85, peakAngle: 175, plane: "Sagital" },
      { joint: "Escápula (Retracción)", startAngle: 15, peakAngle: 0, plane: "Frontal" },
    ];
  }
  if (exercise.category === "pull") {
    return [
      { joint: "Hombro (Extensión)", startAngle: 160, peakAngle: 45, plane: "Sagital" },
      { joint: "Codo (Flexión)", startAngle: 180, peakAngle: 80, plane: "Sagital" },
      { joint: "Escápula (Depresión)", startAngle: 25, peakAngle: 0, plane: "Frontal" },
    ];
  }
  if (exercise.category === "legs") {
    return [
      { joint: "Rodilla (Flexión)", startAngle: 180, peakAngle: 65, plane: "Sagital" },
      { joint: "Cadera (Flexión)", startAngle: 180, peakAngle: 75, plane: "Sagital" },
      { joint: "Tobillo (Dorsiflexión)", startAngle: 90, peakAngle: 65, plane: "Sagital" },
    ];
  }
  return [
    { joint: "Columna Lumbar", startAngle: 0, peakAngle: 45, plane: "Sagital" },
    { joint: "Cadera", startAngle: 90, peakAngle: 90, plane: "Sagital" },
  ];
}

function getVariationsForExercise(exercise: Exercise): ExerciseVariationDetail[] {
  if (exercise.category === "push") {
    return [
      { name: "Variante con Mancuernas", equipment: "Mancuernas", difference: "Mayor rango de aducción y libertad de rotación en muñeca", bestFor: "Optimizar alineación articular y corregir asimetrías" },
      { name: "Variante en Polea", equipment: "Polea Doble", difference: "Tensión uniforme continua durante todo el recorrido", bestFor: "Máximo estrés metabólico y aislamiento continuo" },
      { name: "Variante en Smith Machine", equipment: "Multipower", difference: "Estabilidad externa total eliminando la necesidad de balanceo", bestFor: "Llegar al fallo concéntrico con seguridad sin spotter" },
    ];
  }
  if (exercise.category === "pull") {
    return [
      { name: "Agarre Supino Estrecho", equipment: "Barra / Polea", difference: "Mayor implicación del bíceps y flexión de hombro", bestFor: "Enfocar porción inferior del dorsal y brazos" },
      { name: "Agarre Neutro Abierto", equipment: "Agarre Mag / D-Handles", difference: "Enfoca trapecio medio, romboides y deltoides posterior", bestFor: "Densidad de espalda alta" },
      { name: "Versión Unilateral con Banco", equipment: "Polea Baja", difference: "Permite ligera inclinación lateral para máximo estiramiento", bestFor: "Aislamiento estricto de dorsales ilíacos" },
    ];
  }
  if (exercise.category === "legs") {
    return [
      { name: "Variante con Talones Elevados", equipment: "Cuñas / Slant Board", difference: "Aumenta la dorsiflexión y el brazo de palanca sobre los cuádriceps", bestFor: "Máxima hipertrofia de vasto medial y lateral" },
      { name: "Variante en Prensa de Piernas", equipment: "Prensa 45°", difference: "Cero carga axial en la columna vertebral", bestFor: "Volumen de piernas con fatiga sistémica reducida" },
      { name: "Variante Unilateral (Búlgara)", equipment: "Mancuernas", difference: "Sobrecarga de glúteo medio y estabilizadores de cadera", bestFor: "Potencia unilateral y equilibrio de miembros inferiores" },
    ];
  }
  return [
    { name: "Variante Colgado en Barra", equipment: "Barra de Dominadas", difference: "Mayor demanda en cadena anterior completa y agarre", bestFor: "Fuerza funcional de core y descompresión espinal" },
    { name: "Variante en Banco Declinado", equipment: "Banco Inclinado", difference: "Ajuste de la curva de resistencia mediante ángulo de gravedad", bestFor: "Sobrecarga del recto abdominal inferior" },
  ];
}
