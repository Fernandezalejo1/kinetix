import { Exercise } from "../types";

export const EXERCISES_DATABASE: Exercise[] = [
  // CHEST
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    nameEs: "Press de Banca con Barra",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Tensión mecánica máxima en posición media y de estiramiento. Curva de resistencia ascendente.",
    setupCues: [
      "Retracción y depresión escapular clavando las escápulas en el banco.",
      "Arco lumbar fisiológico natural y 'leg drive' con los pies firmes en el suelo.",
      "Agarre a 1.5 veces el ancho biacromial con muñecas neutras."
    ],
    executionCues: [
      "Desciende la barra controladamente en 3s hacia la parte inferior del esternón.",
      "Mantén los codos en un ángulo de 45-60° respecto al torso (en el plano escapular).",
      "Pausa 0.5s en contacto con el pecho antes de empujar concéntricamente de forma explosiva."
    ],
    commonMistakes: [
      { mistake: "Rebotar la barra en el esternón", correction: "Disminuye la tensión mecánica real y eleva el riesgo articular. Mantén control total." },
      { mistake: "Codos a 90° en T", correction: "Provoca pinzamiento subacromial y estrés excesivo en el manguito rotador. Cierra a 45°." },
      { mistake: "Perder la retracción escapular al bloquear", correction: "Mantén el 'pecho orgulloso' durante todo el recorrido." }
    ],
    preMobility: ["Dislocaciones con banda elástica", "Aperturas torácicas con foam roller", "Rotación externa de hombro con banda"],
    postStretching: ["Estiramiento de pectoral en marco de puerta (30s)", "Extensión torácica en fitball"],
    progressions: ["Pausa isométrica de 2s en punto de máximo estiramiento", "Añadir cadenas o bandas"],
    regressions: ["Press en multipower (Smith)", "Press con mancuernas en suelo (Floor Press)"],
    defaultTempo: "3-1-0-1",
    defaultRir: 1,
    thumbnailSvgType: "bench-press",
    videoUrl: "/assets/exercises/barbell-bench-press.mp4",
    gifUrl: "/assets/exercises/barbell-bench-press.gif",
    videoPosterUrl: "/assets/exercises/barbell-bench-press-poster.jpg"
  },
  {
    id: "incline-dumbbell-press",
    name: "Incline Dumbbell Press (30°)",
    nameEs: "Press Inclinado con Mancuernas (30°)",
    category: "push",
    primaryMuscles: ["chest", "front_delts"],
    secondaryMuscles: ["triceps"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Sobrecarga específica de la porción clavicular del pectoral mayor en posición de máximo estiramiento.",
    setupCues: [
      "Inclinación del banco a 30° (máxima activación clavicular sin dominar el deltoides anterior).",
      "Retracción escapular completa y pies firmes para soporte pélvico.",
      "Mancuernas orientadas a 45° (agarre semi-pronado)."
    ],
    executionCues: [
      "Baja las mancuernas sintiendo el estiramiento profundo del pectoral superior.",
      "Trayectoria convergente natural hacia arriba sin chocar las mancuernas.",
      "Mantén el antebrazo perpendicular al suelo durante todo el descenso."
    ],
    commonMistakes: [
      { mistake: "Inclinación excesiva (>45°)", correction: "Transfiere la carga al deltoides anterior en lugar del haz clavicular." },
      { mistake: "Juntar las mancuernas arriba chocándolas", correction: "En el bloqueo superior la tensión es mínima con mancuernas por gravedad vertical; no golpees." }
    ],
    preMobility: ["Movilidad de cápsula posterior", "Y-Raises con poco peso"],
    postStretching: ["Estiramiento de pectoral clavicular con brazo a 120°"],
    progressions: ["Press inclinado con mancuernas con pausa profunda", "Press inclinado en máquina convergente pesada"],
    regressions: ["Press inclinado en Smith machine", "Flexiones inclinadas con pies elevados"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    thumbnailSvgType: "incline-press",
    videoUrl: "/assets/exercises/incline-dumbbell-press.mp4",
    gifUrl: "/assets/exercises/incline-dumbbell-press.gif",
    videoPosterUrl: "/assets/exercises/incline-dumbbell-press-poster.jpg"
  },
  {
    id: "cable-chest-flye",
    name: "Seated Cable Chest Flye",
    nameEs: "Aperturas en Polea Sentado",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Tensión constante continua en todo el ROM, con pico de resistencia en la máxima aducción/contracción.",
    setupCues: [
      "Ajusta las poleas a la altura de la línea media pectoral.",
      "Usa banco con respaldo para eliminar la inestabilidad del core.",
      "Ligera flexión fija en los codos (15-20°)."
    ],
    executionCues: [
      "Abre los brazos permitiendo que las fibras pectorales se elonguen al máximo.",
      "Junta los bíceps hacia el esternón ('abraza un árbol grande').",
      "Aprieta 1 segundo en el pico de aducción cruzando ligeramente los cables si la polea lo permite."
    ],
    commonMistakes: [
      { mistake: "Flexionar y extender los codos como en un press", correction: "Mantén el ángulo del codo fijo para mantener el torque en la articulación glenohumeral." },
      { mistake: "Hombros encogidos hacia las orejas", correction: "Deprime las escápulas activando el serrato anterior." }
    ],
    preMobility: ["Movilidad glenohumeral con pica", "Activación escapular"],
    postStretching: ["Apertura pasiva en TRX"],
    progressions: ["Repeticiones parciales en estiramiento al llegar al fallo", "Drop sets mecánicos"],
    regressions: ["Pec Deck machine"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    thumbnailSvgType: "cable-flye",
    videoUrl: "/assets/exercises/cable-chest-flye.mp4",
    gifUrl: "/assets/exercises/cable-chest-flye.gif",
    videoPosterUrl: "/assets/exercises/cable-chest-flye-poster.jpg"
  },

  // BACK / LATS / UPPER BACK
  {
    id: "neutral-grip-lat-pulldown",
    name: "Neutral Grip Lat Pulldown",
    nameEs: "Jalón al Pecho Agarre Neutro",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "rear_delts", "upper_back"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Alineación óptima con el ángulo de penación del dorsal ancho ilíaco y torácico.",
    setupCues: [
      "Fija las almohadillas en los muslos de modo que no haya holgura.",
      "Inclinación del torso de 10-15° hacia atrás para respetar la línea de tracción.",
      "Agarre neutro a la anchura de los hombros."
    ],
    executionCues: [
      "Inicia el movimiento deprimiendo las escápulas.",
      "Conduce los codos hacia abajo y hacia las crestas ilíacas (hacia los bolsillos).",
      "Controla el retorno permitiendo la elevación escapular completa en el estiramiento."
    ],
    commonMistakes: [
      { mistake: "Balanceo excesivo del torso usando inercia lumbar", correction: "Mantén el ángulo del tronco rígido mediante activación del core." },
      { mistake: "Llevar los codos demasiado atrás rotando internamente el hombro", correction: "Detén la tracción cuando los codos alcancen la línea del torso." }
    ],
    preMobility: ["Estiramiento de dorsal en rack con rotación externa", "Cat-Cow torácico"],
    postStretching: ["Tracción colgado de barra fija con agarre supino"],
    progressions: ["Jalón unilateral en polea alta con banco inclinado", "Dominadas lastradas neutras"],
    regressions: ["Jalón con bandas elásticas", "Remo invertido con peso corporal"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    thumbnailSvgType: "lat-pulldown",
    videoUrl: "/assets/exercises/neutral-grip-lat-pulldown.mp4",
    gifUrl: "/assets/exercises/neutral-grip-lat-pulldown.gif",
    videoPosterUrl: "/assets/exercises/neutral-grip-lat-pulldown-poster.jpg"
  },
  {
    id: "chest-supported-t-bar-row",
    name: "Chest Supported T-Bar Row",
    nameEs: "Remo en T con Soporte en Pecho",
    category: "pull",
    primaryMuscles: ["upper_back", "traps", "rear_delts"],
    secondaryMuscles: ["lats", "biceps"],
    equipment: "machine",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Sobrecarga de romboides y trapecio medio/superior sin fatiga en erectores espinales.",
    setupCues: [
      "Ajusta la almohadilla a la altura del esternón superior.",
      "Agarre prono abierto (codos a 60-70° del torso para enfocar espalda alta).",
      "Pies anclados y columna neutra."
    ],
    executionCues: [
      "Permite la protracción escapular completa en la fase excéntrica (máximo estiramiento de espalda alta).",
      "Tracciona retrayendo activamente las escápulas y llevando los codos hacia atrás y afuera.",
      "Sostén 1s en contracción máxima."
    ],
    commonMistakes: [
      { mistake: "Hiperextender el cuello buscando la contracción", correction: "Mantén la mirada neutra en el suelo o base de la máquina." },
      { mistake: "Separar el pecho del soporte", correction: "El soporte elimina la inercia; si te separas, reduce la carga." }
    ],
    preMobility: ["Rotaciones torácicas cuadrúpedas", "Protracción-Retracción escapular en suspensión"],
    postStretching: ["Abrazo escapular en poste o máquina"],
    progressions: ["Pausa de 2s en contracción máxima", "Remo con mancuernas en banco inclinado con carga pesada"],
    regressions: ["Remo sentado en polea baja con soporte de pecho"],
    defaultTempo: "2-1-1-1",
    defaultRir: 1,
    thumbnailSvgType: "tbar-row",
    videoUrl: "/assets/exercises/chest-supported-t-bar-row.mp4",
    gifUrl: "/assets/exercises/chest-supported-t-bar-row.gif",
    videoPosterUrl: "/assets/exercises/chest-supported-t-bar-row-poster.jpg"
  },
  {
    id: "single-arm-cable-row",
    name: "Single Arm Lat Cable Row",
    nameEs: "Remo Unilateral de Dorsal en Polea",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "rear_delts"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Alineación biomecánica perfecta con las fibras iliocostales del dorsal ancho.",
    setupCues: [
      "Coloca el banco a 45° frente a la polea baja o media.",
      "Agarre neutro con muñequera o mango libre.",
      "Ligera flexión lateral del tronco para maximizar el pre-estiramiento del dorsal."
    ],
    executionCues: [
      "Inicia llevando el codo hacia la cadera en trayectoria pegada al cuerpo.",
      "No gires excesivamente el torso; mantén la tensión en el dorsal.",
      "Excéntrica de 3s sintiendo cómo la polea elonga el dorsal hasta el anclaje ilíaco."
    ],
    commonMistakes: [
      { mistake: "Traccionar con el bíceps doblando excesivamente el codo", correction: "Imagina que tu mano es un gancho y tira desde el codo." }
    ],
    preMobility: ["Side-bend stretch en banco"],
    postStretching: ["Lat hang unilateral"],
    progressions: ["Añadir repeticiones parciales en el último tercio de rango"],
    regressions: ["Remo con mancuerna apoyado en banco"],
    defaultTempo: "3-1-1-0",
    defaultRir: 0,
    thumbnailSvgType: "single-arm-row",
    videoUrl: "/assets/exercises/single-arm-cable-row.mp4",
    gifUrl: "/assets/exercises/single-arm-cable-row.gif",
    videoPosterUrl: "/assets/exercises/single-arm-cable-row-poster.jpg"
  },

  // LEGS: QUADS / HAMSTRINGS / GLUTES / CALVES
  {
    id: "barbell-hack-or-squat",
    name: "Barbell Back Squat (High Bar)",
    nameEs: "Sentadilla Trasera Barra Alta",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["lower_back", "calves"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Tensión mecánica extrema en flexión profunda de rodilla y cadera. Gran estímulo de hipertrofia mediada por estiramiento.",
    setupCues: [
      "Barra apoyada sobre los trapecios superiores (High Bar).",
      "Pies a la anchura de hombros con puntas rotadas 15-30° hacia afuera.",
      "Maniobra de Valsalva profunda creando presión intraabdominal antes de descender."
    ],
    executionCues: [
      "Desciende rompiendo rodillas y caderas simultáneamente.",
      "Permite que las rodillas viajen hacia adelante sobre los dedos de los pies (rodillas sanas).",
      "Alcanza profundidad válida (al menos paralelo o AGF) sin perder el neutro lumbar ('butt wink').",
      "Empuja a través del trípode del pie de forma uniforme."
    ],
    commonMistakes: [
      { mistake: "Valgo de rodilla (rodillas colapsando hacia adentro)", correction: "Empuja las rodillas hacia afuera alineadas con el 2º dedo del pie." },
      { mistake: "Elevación prematura de la cadera tipo 'buenos días'", correction: "Mantén el ángulo del torso y empuja el pecho contra la barra." }
    ],
    preMobility: ["Dorsiflexión de tobillo contra pared", "Cossack Squats", "90/90 de cadera"],
    postStretching: ["Estiramiento de flexores de cadera en zancada", "Estiramiento de cuádriceps"],
    progressions: ["Pausa de 2s en el fondo (Pause Squat)", "Tempo excéntrico de 4s"],
    regressions: ["Sentadilla Goblet con talones elevados", "Hack Squat en máquina"],
    defaultTempo: "3-1-0-1",
    defaultRir: 2,
    thumbnailSvgType: "squat",
    videoUrl: "/assets/exercises/barbell-hack-or-squat.mp4",
    gifUrl: "/assets/exercises/barbell-hack-or-squat.gif",
    videoPosterUrl: "/assets/exercises/barbell-hack-or-squat-poster.jpg"
  },
  {
    id: "hack-squat-machine",
    name: "Pendulum / Hack Squat",
    nameEs: "Sentadilla Hack / Péndulo",
    category: "legs",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Estabilidad externa total que permite aislar los cuádriceps hasta el fallo muscular absoluto con seguridad.",
    setupCues: [
      "Espalda y sacro firmemente apoyados en el respaldo.",
      "Pies en la parte baja de la plataforma a la anchura de hombros.",
      "Sujeta firmemente las manetas para anclar la pelvis."
    ],
    executionCues: [
      "Desciende maximizando la flexión de rodilla hasta que los isquiotibiales toquen las pantorrillas.",
      "Pausa 1s en la máxima profundidad para disipar energía elástica.",
      "Empuja manteniendo la espalda pegada sin despegar la pelvis."
    ],
    commonMistakes: [
      { mistake: "Rango de movimiento corto (cuarto de sentadilla)", correction: "La mayor hipertrofia se produce en los últimos grados de flexión de rodilla. Baja completo." }
    ],
    preMobility: ["Movilidad de tobillo con kettlebell", "Estiramiento de psoas"],
    postStretching: ["Couch stretch profundo"],
    progressions: ["Drop set mecánico al fallo", "Myo-reps"],
    regressions: ["Prensa inclinada a 45°"],
    defaultTempo: "3-1-1-0",
    defaultRir: 0,
    thumbnailSvgType: "hack-squat",
    videoUrl: "/assets/exercises/hack-squat-machine.mp4",
    gifUrl: "/assets/exercises/hack-squat-machine.gif",
    videoPosterUrl: "/assets/exercises/hack-squat-machine-poster.jpg"
  },
  {
    id: "romanian-deadlift",
    name: "Barbell Romanian Deadlift (RDL)",
    nameEs: "Peso Muerto Rumano con Barra",
    category: "legs",
    primaryMuscles: ["hamstrings", "glutes"],
    secondaryMuscles: ["lower_back", "upper_back", "forearms"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Rey del estímulo de estiramiento para la porción larga del bíceps femoral, semitendinoso y semimembranoso.",
    setupCues: [
      "Pies al ancho de caderas con puntas al frente.",
      "Usa correas (straps) para que el agarre no limite el estímulo neuromuscular.",
      "Ligera flexión de rodillas (15°) fija durante todo el ejercicio."
    ],
    executionCues: [
      "Bisagra de cadera pura: empuja los glúteos hacia la pared detrás de ti.",
      "Barra rozando los muslos en todo momento.",
      "Detén el descenso cuando la cadera no pueda retroceder más (alrededor de media espinilla) para evitar flexión lumbar.",
      "Empuja el suelo y contrae glúteos para volver arriba."
    ],
    commonMistakes: [
      { mistake: "Convertirlo en una sentadilla doblando las rodillas en exceso", correction: "Las rodillas se mantienen con flexión fija; el movimiento es solo de cadera." },
      { mistake: "Redondear la espalda baja al final del recorrido", correction: "Corta el rango cuando sientas el máximo estiramiento isquiosural." }
    ],
    preMobility: ["Paso de la valla dinámico", "Extensión activa de isquiotibiales con goma"],
    postStretching: ["Estiramiento de isquiotibiales en banco con espalda recta"],
    progressions: ["RDL con mancuernas con pausa profunda de 2s", "RDL unilateral (Single Leg RDL)"],
    regressions: ["Buenos días con barra sentado", "Hip Hinge con pica en 3 puntos"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    thumbnailSvgType: "rdl",
    videoUrl: "/assets/exercises/romanian-deadlift.mp4",
    gifUrl: "/assets/exercises/romanian-deadlift.gif",
    videoPosterUrl: "/assets/exercises/romanian-deadlift-poster.jpg"
  },
  {
    id: "seated-leg-curl",
    name: "Seated Leg Curl",
    nameEs: "Curl Femoral Sentado",
    category: "legs",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["calves"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Superior al curl tumbado por la flexión de cadera (90°), que pre-estira los isquiotibiales en su origen isquiático.",
    setupCues: [
      "Alinea el eje de rotación de la máquina con el cóndilo lateral de la rodilla.",
      "Almohadilla sobre los muslos bien apretada para evitar que la pelvis se eleve.",
      "Almohadilla de apoyo justo encima del tendón de Aquiles."
    ],
    executionCues: [
      "Inclina el torso ligeramente hacia adelante para aumentar aún más el estiramiento isquial.",
      "Flexiona con fuerza hasta tocar el tope de la máquina.",
      "Excéntrica de 3s controlando cada milímetro hasta la extensión casi total."
    ],
    commonMistakes: [
      { mistake: "Dejar que el peso caiga en la fase excéntrica", correction: "La fase negativa es crucial para la hipertrofia del bíceps femoral." }
    ],
    preMobility: ["Activación de isquios con puente de glúteos a una pierna"],
    postStretching: ["Estiramiento pasivo de isquiotibiales"],
    progressions: ["Repeticiones parciales en estiramiento al llegar al fallo", "Rest-Pause sets"],
    regressions: ["Curl femoral tumbado"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    thumbnailSvgType: "leg-curl",
    gifUrl: "/assets/exercises/seated-leg-curl.gif"
  },
  {
    id: "barbell-hip-thrust",
    name: "Barbell Hip Thrust",
    nameEs: "Hip Thrust con Barra",
    category: "legs",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["hamstrings", "quads"],
    equipment: "barbell",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Pico máximo de tensión en acortamiento completo del glúteo mayor (extensión total de cadera con retroversión pélvica).",
    setupCues: [
      "Banco a la altura del ángulo inferior de las escápulas (unos 40cm).",
      "Pad protector grueso sobre las crestas ilíacas.",
      "Pies colocados de modo que en el punto alto las tibias queden perfectamente verticales (90°)."
    ],
    executionCues: [
      "Barbilla pegada al esternón (mirada al frente, no al techo).",
      "Extiende la cadera bloqueando con retroversión pélvica posterior.",
      "Sostén la contracción máxima arriba durante 1-2 segundos."
    ],
    commonMistakes: [
      { mistake: "Hiperextender la zona lumbar en la parte superior", correction: "Bloquea con la pelvis, no arqueando la columna baja." }
    ],
    preMobility: ["Monster walk con miniband", "Clamshells"],
    postStretching: ["Estiramiento en figura 4 de glúteo piramidal"],
    progressions: ["Hip Thrust unilateral", "Hip Thrust en máquina con pausa de 3s"],
    regressions: ["Puente de glúteos en suelo con mancuerna"],
    defaultTempo: "2-0-1-2",
    defaultRir: 1,
    thumbnailSvgType: "hip-thrust",
    gifUrl: "/assets/exercises/barbell-hip-thrust.gif"
  },
  {
    id: "standing-calf-raise",
    name: "Standing Calf Raise",
    nameEs: "Elevación de Talones de Pie",
    category: "legs",
    primaryMuscles: ["calves"],
    secondaryMuscles: [],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Rodilla extendida para reclutar activamente el gastrocnemio (gemelo medial y lateral) en estiramiento profundo.",
    setupCues: [
      "Metatarsos bien apoyados en el borde de la plataforma.",
      "Rodillas completamente bloqueadas o micro-flexionadas estables.",
      "Almohadillas en los hombros con postura erguida."
    ],
    executionCues: [
      "Desciende los talones todo lo que permita tu dorsiflexión.",
      "Pausa OBLIGATORIA de 2 segundos en el fondo para neutralizar el rebote del tendón de Aquiles.",
      "Sube empujando sobre el primer metatarso (dedo gordo) hasta máxima flexión plantar."
    ],
    commonMistakes: [
      { mistake: "Rebotar rítmicamente sin pausa", correction: "El tendón de Aquiles almacena hasta el 80% de energía elástica; para hipertrofia debes pausar 2s abajo." }
    ],
    preMobility: ["Liberación miofascial de fascia plantar con pelota"],
    postStretching: ["Estiramiento de gemelo en escalón"],
    progressions: ["Elevación a 1 pierna con mancuerna", "Drop sets al fallo"],
    regressions: ["Elevación de talones en prensa de piernas"],
    defaultTempo: "3-2-1-1",
    defaultRir: 0,
    thumbnailSvgType: "calf-raise",
    videoUrl: "/assets/exercises/standing-calf-raise.mp4",
    gifUrl: "/assets/exercises/standing-calf-raise.gif",
    videoPosterUrl: "/assets/exercises/standing-calf-raise-poster.jpg"
  },

  // SHOULDERS / ARMS
  {
    id: "cable-lateral-raise",
    name: "Cross-Body Cable Lateral Raise",
    nameEs: "Elevaciones Laterales en Polea Cruzada",
    category: "push",
    primaryMuscles: ["side_delts"],
    secondaryMuscles: ["traps"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Curva de resistencia superior a las mancuernas: ofrece carga máxima en los primeros 30-60° de abducción.",
    setupCues: [
      "Polea ajustada a la altura de la rodilla o muñeca.",
      "Pasa el cable por detrás o por delante del cuerpo.",
      "Usa una tobillera o agarre de puño para quitar tensión del antebrazo."
    ],
    executionCues: [
      "Eleva el brazo en el plano escapular (30° adelantado al plano frontal).",
      "Conduce con el codo y el nudillo del meñique nivelado.",
      "Desciende en 3 segundos sintiendo la tensión continua en la porción lateral del deltoides."
    ],
    commonMistakes: [
      { mistake: "Encoger el trapecio superior elevando los hombros", correction: "Imagina empujar las manos 'hacia afuera hacia las paredes', no hacia arriba." }
    ],
    preMobility: ["Rotaciones de hombro con goma", "Circunducciones activas"],
    postStretching: ["Estiramiento de deltoides lateral cruzando el brazo"],
    progressions: ["Myo-reps (15 reps + 5 mini-sets de 4 reps con 15s de descanso)"],
    regressions: ["Elevaciones laterales con mancuernas sentado"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    thumbnailSvgType: "lateral-raise",
    videoUrl: "/assets/exercises/cable-lateral-raise.mp4",
    gifUrl: "/assets/exercises/cable-lateral-raise.gif",
    videoPosterUrl: "/assets/exercises/cable-lateral-raise-poster.jpg"
  },
  {
    id: "incline-dumbbell-curl",
    name: "Incline Dumbbell Biceps Curl",
    nameEs: "Curl de Bíceps en Banco Inclinado (60°)",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Extensión de hombro que sitúa la porción larga del bíceps braquial en máximo estiramiento anatómico.",
    setupCues: [
      "Banco inclinado a 60°.",
      "Brazos colgando verticalmente detrás del torso.",
      "Hombros anclados atrás contra el respaldo."
    ],
    executionCues: [
      "Inicia el curl desde la supinación completa.",
      "Mantén los codos estables apuntando hacia el suelo sin adelantarlos.",
      "Contrae arriba y baja en 3 segundos completos hasta la extensión total del codo."
    ],
    commonMistakes: [
      { mistake: "Adelantar los codos en la contracción", correction: "Involucra el deltoides anterior y acorta el brazo de palanca del bíceps." }
    ],
    preMobility: ["Estiramiento de bíceps con brazo apoyado en pared"],
    postStretching: ["Extensión completa de codo con supinación pasiva"],
    progressions: ["Curl inclinado con cables cruzados", "Curl con barra EZ de pie con agarre estricto"],
    regressions: ["Curl con mancuernas de pie alterno"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    thumbnailSvgType: "biceps-curl",
    videoUrl: "/assets/exercises/incline-dumbbell-curl.mp4",
    gifUrl: "/assets/exercises/incline-dumbbell-curl.gif",
    videoPosterUrl: "/assets/exercises/incline-dumbbell-curl-poster.jpg"
  },
  {
    id: "overhead-cable-triceps-extension",
    name: "Overhead Cable Triceps Extension",
    nameEs: "Extensión de Tríceps Sobre la Cabeza en Polea",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Flexión de hombro que pre-estira la porción larga del tríceps, provocando mayor hipertrofia que los jalones estándar.",
    setupCues: [
      "Polea colocada a la altura de la cintura o cabeza.",
      "Usa una cuerda larga o dos cuerdas unidas para permitir libre abducción al final.",
      "Da un paso al frente y reclina el torso 30° con una pierna adelantada para base estable."
    ],
    executionCues: [
      "Permite que los codos se doblen completamente detrás de la nuca (máximo estiramiento del tríceps).",
      "Extiende los codos separando la cuerda hacia afuera al final.",
      "Controla el retorno excéntrico de 3 segundos sin mover los hombros."
    ],
    commonMistakes: [
      { mistake: "Mover los brazos hacia arriba y abajo desde el hombro", correction: "Fija la posición del húmero; la articulación móvil es exclusivamente el codo." }
    ],
    preMobility: ["Estiramiento de tríceps y dorsal ancho"],
    postStretching: ["Estiramiento de tríceps por detrás de la cabeza"],
    progressions: ["Katana Extensions unilaterales en polea", "Press Francés declinado con mancuernas"],
    regressions: ["Jalón de tríceps en polea alta con barra recta"],
    defaultTempo: "3-1-1-0",
    defaultRir: 0,
    thumbnailSvgType: "triceps-overhead",
    videoUrl: "/assets/exercises/overhead-cable-triceps-extension.mp4",
    gifUrl: "/assets/exercises/overhead-cable-triceps-extension.gif",
    videoPosterUrl: "/assets/exercises/overhead-cable-triceps-extension-poster.jpg"
  },

  // CORE / ABS
  {
    id: "cable-crunch",
    name: "Kneeling Cable Abdominal Crunch",
    nameEs: "Crunch Abdominal en Polea Alta",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "cable",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Sobrecarga progresiva real y cuantificable para el recto abdominal y oblicuos.",
    setupCues: [
      "De rodillas frente a la polea alta con cuerda fijada a ambos lados de la cabeza.",
      "Caderas fijas hacia atrás en ángulo de 90°.",
      "Manos fijas en las sienes durante todo el movimiento."
    ],
    executionCues: [
      "No hagas una bisagra de cadera; flexiona la columna vertebral enrollando el esternón hacia el pubis.",
      "Exhala todo el aire en el punto de máxima contracción abdominal.",
      "Regresa controladamente desenrollando la columna hasta la extensión neutra."
    ],
    commonMistakes: [
      { mistake: "Mover las caderas hacia los talones", correction: "El movimiento debe nacer de la flexión de columna torácica y lumbar, no de los flexores de cadera." }
    ],
    preMobility: ["Cat-Camel espinal"],
    postStretching: ["Cobra pose suave"],
    progressions: ["Elevaciones de piernas colgado en barra con pausa arriba"],
    regressions: ["Crunch en suelo con piernas a 90°"],
    defaultTempo: "3-0-1-2",
    defaultRir: 1,
    thumbnailSvgType: "ab-crunch",
    videoUrl: "/assets/exercises/cable-crunch.mp4",
    gifUrl: "/assets/exercises/cable-crunch.gif",
    videoPosterUrl: "/assets/exercises/cable-crunch-poster.jpg"
  },

  // ==================== CATÁLOGO EXPANDIDO (videos locales) ====================

  // CHEST
  {
    id: "barbell-incline-bench-press",
    name: "Barbell Incline Bench Press",
    nameEs: "Press Inclinado con Barra",
    category: "push",
    primaryMuscles: ["chest", "front_delts"],
    secondaryMuscles: ["triceps"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Máxima tensión del haz clavicular del pectoral en la posición de estiramiento sobre banco a 30°.",
    setupCues: [
      "Banco a 30° con retracción escapular completa.",
      "Barra sobre la línea superior del pectoral, no sobre el cuello."
    ],
    executionCues: [
      "Desciende hacia la clavícula con codos a 45-60° del torso.",
      "Empuja explosivo sin bloquear con rebote arriba."
    ],
    commonMistakes: [
      { mistake: "Inclinación mayor a 45°", correction: "Convierte el ejercicio en un press de hombro; mantén 30°." }
    ],
    preMobility: ["Dislocaciones con banda"],
    postStretching: ["Estiramiento de pectoral superior en marco de puerta"],
    progressions: ["Pausa de 2s en el pecho"],
    regressions: ["Press inclinado en Smith machine"],
    defaultTempo: "3-1-1-0",
    defaultRir: 2,
    videoUrl: "/assets/exercises/barbell-incline-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/barbell-incline-bench-press-poster.jpg"
  },
  {
    id: "barbell-wide-bench-press",
    name: "Wide Grip Bench Press",
    nameEs: "Press de Banca Agarre Ancho",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "El agarre amplio reduce el brazo de palanca del tríceps y aumenta la demanda pectoral en estiramiento externo.",
    setupCues: [
      "Agarre ~1.5-2 veces el ancho biacromial.",
      "Escápulas retraídas y deprimidas contra el banco."
    ],
    executionCues: [
      "Baja la barra a la línea del pezón controlando el arco.",
      "Codos abiertos a ~60-70° sin llegar al dolor articular."
    ],
    commonMistakes: [
      { mistake: "Agarre excesivamente ancho", correction: "Aumenta estrés de hombro y acorta el recorrido; máximo 2x ancho de hombros." }
    ],
    preMobility: ["Rotación externa con banda"],
    postStretching: ["Apertura pectoral en marco de puerta"],
    progressions: ["Tempo excéntrico de 4s"],
    regressions: ["Press de banca agarre estándar"],
    defaultTempo: "3-1-0-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/barbell-wide-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/barbell-wide-bench-press-poster.jpg"
  },
  {
    id: "barbell-close-grip-bench-press",
    name: "Close Grip Bench Press",
    nameEs: "Press de Banca Agarre Cerrado",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Estira la cabeza larga del tríceps bajo carga axial pesada: hipertrofia máxima del tríceps en estiramiento.",
    setupCues: [
      "Agarre a la anchura de hombros (no más cerrado).",
      "Muñecas alineadas sobre los codos en todo momento."
    ],
    executionCues: [
      "Baja la barra a la parte baja del esternón con codos pegados al torso.",
      "Empuja en línea vertical manteniendo los codos cerca del cuerpo."
    ],
    commonMistakes: [
      { mistake: "Agarre excesivamente estrecho", correction: "Colapsa la muñeca y estresa el codo; usa anchura de hombros." }
    ],
    preMobility: ["Extensión de codo con banda"],
    postStretching: ["Estiramiento de tríceps por detrás de la cabeza"],
    progressions: ["Pausa de 2s justo sobre el pecho"],
    regressions: ["Press cerrado en Smith machine"],
    defaultTempo: "3-1-0-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/barbell-close-grip-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/barbell-close-grip-bench-press-poster.jpg"
  },
  {
    id: "smith-bench-press",
    name: "Smith Machine Bench Press",
    nameEs: "Press de Banca en Multipower",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "smith",
    resistanceProfile: "linear",
    lengthTensionDescription: "Trayectoria fija vertical que elimina la estabilización y permite sobrecargar el pectoral hasta el fallo con seguridad.",
    setupCues: [
      "Posiciona el banco de modo que la barra baje al centro pectoral.",
      "Escápulas retraídas y pies firmes para leg drive."
    ],
    executionCues: [
      "Desciende controlado hasta rozar el pecho.",
      "Gira la barra para bloquear solo al completar la extensión."
    ],
    commonMistakes: [
      { mistake: "Rebotar la barra en el pecho", correction: "La guía vertical invita al rebote; mantén control excéntrico total." }
    ],
    preMobility: ["Dislocaciones con banda"],
    postStretching: ["Estiramiento pectoral estándar"],
    progressions: ["Series al fallo absoluto sin spotter"],
    regressions: ["Press con mancuernas en banco plano"],
    defaultTempo: "3-1-0-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/smith-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/smith-bench-press-poster.jpg"
  },
  {
    id: "cable-bench-press",
    name: "Cable Chest Press",
    nameEs: "Press de Pecho en Polea",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "cable",
    resistanceProfile: "linear",
    lengthTensionDescription: "Resistencia constante en todo el ROM gracias a la polea: tensión máxima incluso donde las mancuernas la pierden.",
    setupCues: [
      "Poleas a la altura del pecho con banco plano en el centro.",
      "Agarre neutro o prono según comodidad articular."
    ],
    executionCues: [
      "Empuja convergiendo ligeramente las manos al frente.",
      "Retorno excéntrico de 3s sin dejar que el peso junte las placas."
    ],
    commonMistakes: [
      { mistake: "Encoger los hombros al empujar", correction: "Deprime las escápulas y mantiene el pecho orgulloso." }
    ],
    preMobility: ["Aperturas dinámicas"],
    postStretching: ["Estiramiento pectoral en marco de puerta"],
    progressions: ["Press unilateral alternando brazos"],
    regressions: ["Press de pecho en máquina convergente"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/cable-bench-press-poster.jpg"
  },
  {
    id: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    nameEs: "Press de Banca con Mancuernas",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Mayor rango de profundidad que la barra: estiramiento completo del pectoral bajo máxima tensión mecánica.",
    setupCues: [
      "Sube las mancuernas con impulso de rodilla ('kick up').",
      "Muñecas verticales sobre los codos durante todo el patrón."
    ],
    executionCues: [
      "Baja hasta sentir el estiramiento profundo del pectoral.",
      "Empuja convergiendo sin chocar las mancuernas arriba."
    ],
    commonMistakes: [
      { mistake: "Acortar el recorrido por miedo al estiramiento", correction: "El estiramiento cargado es el driver principal; baja completo." }
    ],
    preMobility: ["Rotaciones de hombro"],
    postStretching: ["Estiramiento pectoral con brazo a 90°"],
    progressions: ["Press alterno con pausa abajo"],
    regressions: ["Floor press con mancuernas"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-bench-press.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-bench-press-poster.jpg"
  },
  {
    id: "dumbbell-fly",
    name: "Dumbbell Fly",
    nameEs: "Aperturas con Mancuernas",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Pico de tensión en máxima aducción horizontal: el mejor estímulo de estiramiento cargado para el pectoral con peso libre.",
    setupCues: [
      "Flexión de codo fija de 15-20° durante todo el movimiento.",
      "Hombros retraídos pegados al banco."
    ],
    executionCues: [
      "Abre en arco amplio sintiendo el estiramiento, no busques tocar el suelo.",
      "Junta las mancuernas 'abrazando un árbol' sin extender los codos."
    ],
    commonMistakes: [
      { mistake: "Convertirlo en un press doblando los codos", correction: "El ángulo del codo debe permanecer fijo; si se abre, baja el peso." }
    ],
    preMobility: ["Movilidad torácica en foam roller"],
    postStretching: ["Apertura pasiva en banco"],
    progressions: ["Pausa de 2s en el fondo (estiramiento cargado)"],
    regressions: ["Pec Deck machine"],
    defaultTempo: "3-1-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-fly.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-fly-poster.jpg"
  },
  {
    id: "lever-seated-fly",
    name: "Lever Seated Fly (Pec Deck)",
    nameEs: "Aperturas en Máquina (Pec Deck)",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts"],
    equipment: "machine",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Curva de resistencia que alcanza su pico en máxima contracción: ideal para el trabajo en acortamiento del pectoral.",
    setupCues: [
      "Ajusta el asiento de modo que los codos queden a la altura del hombro.",
      "Espalda y sacro apoyados, escápulas retraídas."
    ],
    executionCues: [
      "Junta los brazos apretando el pectoral 1s en el punto de encuentro.",
      "Abre controlado sin dejar que el peso choque las placas."
    ],
    commonMistakes: [
      { mistake: "Levantar los hombros al cerrar", correction: "Mantén las escápulas deprimidas durante todo el recorrido." }
    ],
    preMobility: ["Circunducciones de hombro"],
    postStretching: ["Apertura pectoral pasiva"],
    progressions: ["Repeticiones parciales al fallo en contracción"],
    regressions: ["Aperturas con mancuernas en banco"],
    defaultTempo: "2-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/lever-seated-fly.mp4",
    videoPosterUrl: "/assets/exercises/lever-seated-fly-poster.jpg"
  },
  {
    id: "cable-standing-crossover",
    name: "Standing Cable Crossover",
    nameEs: "Cruce de Poleas de Pie",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Tensión continua con pico en la máxima aducción cruzada: excelente finalizador en acortamiento pectoral.",
    setupCues: [
      "Poleas altas con un pie adelantado y torso inclinado 15°.",
      "Ligera flexión de codo mantenida."
    ],
    executionCues: [
      "Cruza las manos cruzando una sobre otra para rango extra.",
      "Aprieta 1s en el cruce y abre controlado hasta el estiramiento."
    ],
    commonMistakes: [
      { mistake: "Usar el peso corporal como impulso", correction: "Ancla el torso; el movimiento nace solo del hombro." }
    ],
    preMobility: ["Movilidad escapular"],
    postStretching: ["Apertura pectoral en marco de puerta"],
    progressions: ["Cruce unilateral para más rango"],
    regressions: ["Pec Deck machine"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/cable-standing-crossover.mp4",
    videoPosterUrl: "/assets/exercises/cable-standing-crossover-poster.jpg"
  },
  {
    id: "lever-incline-chest-press",
    name: "Lever Incline Chest Press",
    nameEs: "Press Inclinado en Máquina",
    category: "push",
    primaryMuscles: ["chest", "front_delts"],
    secondaryMuscles: ["triceps"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Enfoque en el pectoral clavicular con estabilidad total: permite fallo absoluto sin riesgo técnico.",
    setupCues: [
      "Asiento ajustado con manijas a la altura del pectoral superior.",
      "Escápulas retraídas contra el respaldo."
    ],
    executionCues: [
      "Empuja sin bloquear violentamente los codos.",
      "Excéntrica de 3s evitando que las placas choquen."
    ],
    commonMistakes: [
      { mistake: "Despegar la espalda del respaldo", correction: "Reduce la carga; el soporte debe eliminar la inercia." }
    ],
    preMobility: ["Rotaciones de hombro con banda"],
    postStretching: ["Estiramiento pectoral superior"],
    progressions: ["Unilateral para corregir asimetrías"],
    regressions: ["Press inclinado con mancuernas"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/lever-incline-chest-press.mp4",
    videoPosterUrl: "/assets/exercises/lever-incline-chest-press-poster.jpg"
  },
  {
    id: "lever-decline-chest-press",
    name: "Lever Decline Chest Press",
    nameEs: "Press Declinado en Máquina",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front_delts"],
    equipment: "machine",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Trayectoria descendente que enfatiza el haz esternocostal inferior con mínima participación del deltoides.",
    setupCues: [
      "Manijas a la altura de la línea inferior del pectoral.",
      "Agarre firme con muñecas neutras."
    ],
    executionCues: [
      "Empuja siguiendo la trayectoria natural de la máquina.",
      "Baja controlado hasta el estiramiento sin rebotar."
    ],
    commonMistakes: [
      { mistake: "Recorrido parcial", correction: "Completa el rango; la máquina permite seguridad total." }
    ],
    preMobility: ["Dislocaciones con banda"],
    postStretching: ["Estiramiento pectoral inferior"],
    progressions: ["Drop set mecánico final"],
    regressions: ["Press plano en máquina"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/lever-decline-chest-press.mp4",
    videoPosterUrl: "/assets/exercises/lever-decline-chest-press-poster.jpg"
  },
  {
    id: "push-up",
    name: "Push-Up",
    nameEs: "Flexiones de Brazos",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front_delts", "abs"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Sobrecarga progresivable mediante lastre, tempo y déficit: el patrón horizontal fundamental con peso corporal.",
    setupCues: [
      "Cuerpo en tabla rígida: glúteos y abdomen contraídos.",
      "Manos ligeramente más anchas que los hombros."
    ],
    executionCues: [
      "Desciende hasta que el pecho roce el suelo con codos a 45°.",
      "Empuja separando el suelo sin perder la línea corporal."
    ],
    commonMistakes: [
      { mistake: "Cadera caída o elevada", correction: "Activa glúteos y core; el cuerpo debe bajar como una sola unidad." }
    ],
    preMobility: ["Movilidad de muñeca"],
    postStretching: ["Estiramiento pectoral en marco de puerta"],
    progressions: ["Flexiones lastradas o con déficit en mancuernas"],
    regressions: ["Flexiones con rodillas apoyadas"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/push-up.mp4",
    videoPosterUrl: "/assets/exercises/push-up-poster.jpg"
  },
  {
    id: "chest-dip",
    name: "Chest Dip",
    nameEs: "Fondos en Paralelas (Pecho)",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front_delts"],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Profunda flexión de hombro en el fondo: uno de los mejores ejercicios de estiramiento cargado pectoral.",
    setupCues: [
      "Torso inclinado adelante ~30° con codos ligeramente abiertos.",
      "Piernas flexionadas detrás para desplazar el centro de gravedad."
    ],
    executionCues: [
      "Baja hasta que los hombros bajen de los codos (profundidad segura).",
      "Empuja manteniendo la inclinación del torso para seguir sintiendo el pecho."
    ],
    commonMistakes: [
      { mistake: "Bajar más allá de la movilidad articular", correction: "Genera estrés anterior de hombro; corta cuando pierdas la posición escapular." }
    ],
    preMobility: ["Aperturas de hombro en rack"],
    postStretching: ["Estiramiento pectoral profundo en paralelas"],
    progressions: ["Fondos lastrados con cinturón"],
    regressions: ["Fondos en máquina asistida"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/chest-dip.mp4",
    videoPosterUrl: "/assets/exercises/chest-dip-poster.jpg"
  },

  // BACK / LATS
  {
    id: "barbell-bent-over-row",
    name: "Barbell Bent Over Row",
    nameEs: "Remo Curvado con Barra",
    category: "pull",
    primaryMuscles: ["lats", "upper_back"],
    secondaryMuscles: ["biceps", "rear_delts", "lower_back"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Remo pesado bilateral que sobrecarga dorsal y espalda alta con demanda isométrica de erectores.",
    setupCues: [
      "Bisagra de cadera a ~45° con columna neutra.",
      "Barra colgando bajo los hombros con escápulas activas."
    ],
    executionCues: [
      "Trae la barra hacia el ombligo llevando los codos atrás.",
      "Aprieta 1s y baja controlado sin redondear la lumbar."
    ],
    commonMistakes: [
      { mistake: "Erguir el torso convirtiéndolo en remo vertical", correction: "Mantén la bisagra fija; si no puedes, reduce la carga." }
    ],
    preMobility: ["Cat-Cow torácico"],
    postStretching: ["Child pose con alcance lateral"],
    progressions: ["Remo Pendlay con pausa en el suelo"],
    regressions: ["Remo con apoyo de pecho"],
    defaultTempo: "2-1-1-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/barbell-bent-over-row.mp4",
    videoPosterUrl: "/assets/exercises/barbell-bent-over-row-poster.jpg"
  },
  {
    id: "dumbbell-bent-over-row",
    name: "Dumbbell Bent Over Row",
    nameEs: "Remo Curvado con Mancuernas",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["upper_back", "biceps"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Recorrido libre que permite un estiramiento más profundo del dorsal que la barra al final de la excéntrica.",
    setupCues: [
      "Bisagra con mancuernas colgando bajo los hombros.",
      "Columna neutra y core activado."
    ],
    executionCues: [
      "Rema llevando los codos hacia la cadera.",
      "Baja permitiendo el estiramiento completo del dorsal."
    ],
    commonMistakes: [
      { mistake: "Juntar las escápulas prematuramente", correction: "Inicia con el dorsal; la retracción es el final del recorrido." }
    ],
    preMobility: ["Movilidad torácica"],
    postStretching: ["Estiramiento de dorsal en rodillas"],
    progressions: ["Remo alterno con pausa arriba"],
    regressions: ["Remo unilateral con apoyo en banco"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-bent-over-row.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-bent-over-row-poster.jpg"
  },
  {
    id: "dumbbell-bent-over-row-v2",
    name: "Dumbbell Bent-Over Row (Variante)",
    nameEs: "Remo Curvado con Mancuernas (Variante)",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["upper_back", "biceps"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Variante de agarre distinto que rota el énfasis entre dorsal y espalda alta dentro del mismo patrón horizontal.",
    setupCues: [
      "Bisagra estable con ambas mancuernas colgando.",
      "Muñecas neutras sin tensionar el antebrazo."
    ],
    executionCues: [
      "Rema simultáneo o alterno con codos pegados al cuerpo.",
      "Controla la excéntrica de 3s en cada repetición."
    ],
    commonMistakes: [
      { mistake: "Balancear el torso para generar impulso", correction: "Ancla la bisagra; la inercia roba tensión al dorsal." }
    ],
    preMobility: ["Cat-Cow torácico"],
    postStretching: ["Child pose"],
    progressions: ["Tempo excéntrico de 4s"],
    regressions: ["Remo en banco inclinado con apoyo"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-bent-over-row-v2.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-bent-over-row-v2-poster.jpg"
  },
  {
    id: "cable-bar-lateral-pulldown",
    name: "Wide Grip Lat Pulldown",
    nameEs: "Jalón al Pecho Agarre Ancho",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["upper_back", "biceps", "rear_delts"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "El agarre amplio maximiza el estiramiento del dorsal ancho en la fase inicial del jalón.",
    setupCues: [
      "Agarre prono más ancho que hombros.",
      "Muslos anclados con torso a 10-20° de inclinación."
    ],
    executionCues: [
      "Depresiona las escápulas antes de flexionar los codos.",
      "Lleva la barra a la clavícula con codos hacia abajo."
    ],
    commonMistakes: [
      { mistake: "Jalar por detrás de la nuca", correction: "Compromete el manguito rotador; siempre jalón al frente." }
    ],
    preMobility: ["Lat stretch en rack"],
    postStretching: ["Suspensión en barra fija"],
    progressions: ["Jalón unilateral o con pausa en contracción"],
    regressions: ["Jalón agarre neutro"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-bar-lateral-pulldown.mp4",
    videoPosterUrl: "/assets/exercises/cable-bar-lateral-pulldown-poster.jpg"
  },
  {
    id: "rowing-machine-row",
    name: "Rowing Machine Row",
    nameEs: "Remo en Máquina de Remo",
    category: "pull",
    primaryMuscles: ["upper_back", "lats"],
    secondaryMuscles: ["biceps", "rear_delts", "quads"],
    equipment: "machine",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Patrón de tracción integral con componente cardiovascular: espalda alta y dorsal bajo fatiga sistémica controlada.",
    setupCues: [
      "Pies anclados con correa sobre el metatarso.",
      "Inicio con piernas flexionadas y espalda neutra."
    ],
    executionCues: [
      "Secuencia: piernas, tronco, brazos; retorno inverso.",
      "Termina cada remada retrayendo las escápulas."
    ],
    commonMistakes: [
      { mistake: "Abrir los brazos antes de extender las piernas", correction: "Rompe la secuencia y sobrecarga la lumbar; orden estricto." }
    ],
    preMobility: ["Movilidad torácica cuadrúpeda"],
    postStretching: ["Child pose prolongada"],
    progressions: ["Intervalos HIIT 30/30s"],
    regressions: ["Remo sentado en polea baja"],
    defaultTempo: "1-0-1-1",
    defaultRir: 3,
    videoUrl: "/assets/exercises/rowing-machine-row.mp4",
    videoPosterUrl: "/assets/exercises/rowing-machine-row-poster.jpg"
  },
  {
    id: "weighted-neck-flexion",
    name: "Weighted Lying Neck Flexion",
    nameEs: "Flexión Cervical Lastrada Tumbado",
    category: "pull",
    primaryMuscles: ["traps"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Fortalecimiento directo de los flexores cervicales en estiramiento: base del entrenamiento preventivo del cuello.",
    setupCues: [
      "Túmbate boca arriba en un banco con la cabeza fuera del borde.",
      "Coloca un disco ligero sujetado sobre la frente con las manos."
    ],
    executionCues: [
      "Flexiona el cuello llevando el mentón al pecho de forma controlada.",
      "Desciende lentamente permitiendo la extensión completa segura."
    ],
    commonMistakes: [
      { mistake: "Usar demasiado peso de inicio", correction: "La cervical es frágil: empieza sin lastre y progresa despacio." }
    ],
    preMobility: ["Rotaciones cervicales suaves"],
    postStretching: ["Estiramiento cervical posterior suave"],
    progressions: ["Aumentar disco en incrementos de 1-2kg"],
    regressions: ["Flexión cervical sin lastre"],
    defaultTempo: "3-1-2-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/weighted-neck-flexion.mp4",
    videoPosterUrl: "/assets/exercises/weighted-neck-flexion-poster.jpg"
  },
  {
    id: "band-pull-apart",
    name: "Resistance Band Pull Apart",
    nameEs: "Pull Apart con Banda Elástica",
    category: "pull",
    primaryMuscles: ["rear_delts"],
    secondaryMuscles: ["upper_back", "traps"],
    equipment: "cable",
    resistanceProfile: "accommodating",
    lengthTensionDescription: "Tensión creciente proporcional al estiramiento de la banda: activación pura del deltoides posterior y romboides.",
    setupCues: [
      "Banda sostenida frente al pecho con brazos extendidos.",
      "Hombros deprimidos lejos de las orejas."
    ],
    executionCues: [
      "Separa las manos abriendo hasta la línea del pecho.",
      "Retorna controlado resistiendo la tensión de la banda."
    ],
    commonMistakes: [
      { mistake: "Encogerse de hombros", correction: "Mantén el trapecio superior relajado; el trabajo es del manguito posterior." }
    ],
    preMobility: ["Circunducciones de hombro"],
    postStretching: ["Abrazo cruzado de hombro"],
    progressions: ["Pausa de 2s en apertura máxima"],
    regressions: ["Banda de menor resistencia"],
    defaultTempo: "2-1-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/band-pull-apart.mp4",
    videoPosterUrl: "/assets/exercises/band-pull-apart-poster.jpg"
  },
  {
    id: "cable-face-pull-supinated",
    name: "Supinated Cable Face Pull",
    nameEs: "Face Pull Supino en Polea",
    category: "pull",
    primaryMuscles: ["rear_delts"],
    secondaryMuscles: ["upper_back", "biceps", "traps"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Rotación externa + abducción horizontal bajo tensión continua: salud del manguito y deltoides posterior.",
    setupCues: [
      "Polea alta con cuerda y agarre supino (palmas hacia ti).",
      "Da un paso atrás para crear tensión inicial."
    ],
    executionCues: [
      "Tira de la cuerda hacia la cara separándola junto a las orejas.",
      "Los codos quedan altos; termina en rotación externa tipo 'double biceps'."
    ],
    commonMistakes: [
      { mistake: "Codos por debajo de los hombros", correction: "Convierte el face pull en remo; mantén la trayectoria alta." }
    ],
    preMobility: ["Rotación externa con banda"],
    postStretching: ["Abrazo cruzado de hombro"],
    progressions: ["Pausa isométrica de 2s en contracción"],
    regressions: ["Face pull con menos carga"],
    defaultTempo: "2-1-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-face-pull-supinated.mp4",
    videoPosterUrl: "/assets/exercises/cable-face-pull-supinated-poster.jpg"
  },

  // LEGS
  {
    id: "barbell-good-morning",
    name: "Barbell Good Morning",
    nameEs: "Buenos Días con Barra",
    category: "legs",
    primaryMuscles: ["hamstrings"],
    secondaryMuscles: ["glutes", "lower_back"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Bisagra pura de cadera bajo barra: estiramiento extremo y controlado de la cadena posterior.",
    setupCues: [
      "Barra en trapecios como en sentadilla alta.",
      "Rodillas con micro-flexión fija de 15°."
    ],
    executionCues: [
      "Empuja la cadera atrás bisagrando hasta media espinilla.",
      "Vuelve contrayendo glúteos e isquios sin redondear la espalda."
    ],
    commonMistakes: [
      { mistake: "Redondear la zona lumbar al fondo", correction: "Corta el descenso donde el neutro pélvico se pierda; progresa el rango con el tiempo." }
    ],
    preMobility: ["Hip hinge con pica"],
    postStretching: ["Estiramiento de isquios en banco"],
    progressions: ["Good morning sentado para más demanda de erectores"],
    regressions: ["RDL con mancuernas"],
    defaultTempo: "3-1-1-0",
    defaultRir: 2,
    videoUrl: "/assets/exercises/barbell-good-morning.mp4",
    videoPosterUrl: "/assets/exercises/barbell-good-morning-poster.jpg"
  },
  {
    id: "trap-bar-deadlift",
    name: "Trap Bar Deadlift",
    nameEs: "Peso Muerto con Barra Trampa",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "lower_back", "traps", "upper_back"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Híbrido sentadilla-peso muerto con centro de masa alineado: máxima fuerza total con menor estrés lumbar.",
    setupCues: [
      "Colócate dentro de la trampa con tibias verticales.",
      "Agarre firme, pecho alto y dorsales activados."
    ],
    executionCues: [
      "Empuja el suelo separándolo con las piernas, cadera y hombros suben juntos.",
      "Bloquea de pie con glúteos contraídos, sin hiperextender."
    ],
    commonMistakes: [
      { mistake: "Levantar la cadera primero (tipo stiff leg)", correction: "Mantén el ángulo del torso; la trampa permite pierna dominante, úsalo." }
    ],
    preMobility: ["Dorsiflexión de tobillo", "90/90 de cadera"],
    postStretching: ["Figura 4 de glúteo"],
    progressions: ["Deficit trap bar deadlift sobre plataforma"],
    regressions: ["Prensa de piernas 45°"],
    defaultTempo: "2-1-1-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/trap-bar-deadlift.mp4",
    videoPosterUrl: "/assets/exercises/trap-bar-deadlift-poster.jpg"
  },
  {
    id: "dumbbell-deadlift",
    name: "Dumbbell Deadlift",
    nameEs: "Peso Muerto con Mancuernas",
    category: "legs",
    primaryMuscles: ["glutes", "hamstrings"],
    secondaryMuscles: ["lower_back", "quads"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Patrón de bisagra con libertad de trayectoria: estira glúteo e isquios en el descenso con menor carga axial.",
    setupCues: [
      "Mancuernas a los lados de las caderas.",
      "Columna neutra con dorsales apretados."
    ],
    executionCues: [
      "Baja las mancuernas rozando las piernas en bisagra pura.",
      "Impulsa el suelo y bloquea contrayendo glúteos."
    ],
    commonMistakes: [
      { mistake: "Convertirlo en sentadilla flexionando mucho las rodillas", correction: "La rodilla queda casi fija; el movimiento sale de la cadera." }
    ],
    preMobility: ["Hip hinge con palo"],
    postStretching: ["Estiramiento isquiosural"],
    progressions: ["Stiff leg deadlift para más énfasis isquial"],
    regressions: ["Hip thrust en suelo"],
    defaultTempo: "3-1-1-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/dumbbell-deadlift.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-deadlift-poster.jpg"
  },
  {
    id: "sled-leg-press",
    name: "45° Leg Press",
    nameEs: "Prensa de Piernas 45°",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "calves"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Cuádriceps bajo estiramiento profundo con estabilidad total: volumen de calidad sin límite de espalda.",
    setupCues: [
      "Pies a anchura de hombros en plataforma media-alta.",
      "Lumbar pegada al respaldo en todo el recorrido."
    ],
    executionCues: [
      "Baja hasta 90° de rodilla o más si conservas el contacto lumbar.",
      "Empuja a través del mediopié sin bloquear de golpe."
    ],
    commonMistakes: [
      { mistake: "Despegar la pelvis del asiento al fondo", correction: "Acorta el rango: la retroversión pélvica bajo carga daña la lumbar." }
    ],
    preMobility: ["Movilidad de tobillo"],
    postStretching: ["Estiramiento de cuádriceps de pie"],
    progressions: ["Repeticiones parciales profundas al fallo"],
    regressions: ["Prensa horizontal ligera"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/sled-leg-press.mp4",
    videoPosterUrl: "/assets/exercises/sled-leg-press-poster.jpg"
  },
  {
    id: "lever-seated-hip-abduction",
    name: "Seated Hip Abduction Machine",
    nameEs: "Abductores en Máquina Sentado",
    category: "legs",
    primaryMuscles: ["glutes"],
    secondaryMuscles: ["quads"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Aislamiento del glúteo medio en abducción cargada: clave para la forma del glúteo superior y la salud de rodilla.",
    setupCues: [
      "Rodillas alineadas con el eje de la máquina.",
      "Torso erguido o ligeramente inclinado adelante para más rango."
    ],
    executionCues: [
      "Abre las piernas empujando con glúteos, no con impulso lumbar.",
      "Pausa 1s abierto y retorna controlado sin chocar el peso."
    ],
    commonMistakes: [
      { mistake: "Rango corto con rebotes", correction: "Amplitud completa con pausa: el glúteo medio responde a rango y control." }
    ],
    preMobility: ["Clamshells sin banda"],
    postStretching: ["Figura 4 de glúteo"],
    progressions: ["Inclinar torso adelante para más estiramiento"],
    regressions: ["Monster walk con miniband"],
    defaultTempo: "2-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/lever-seated-hip-abduction.mp4",
    videoPosterUrl: "/assets/exercises/lever-seated-hip-abduction-poster.jpg"
  },
  {
    id: "lever-seated-hip-adduction",
    name: "Seated Hip Adduction Machine",
    nameEs: "Adutores en Máquina Sentado",
    category: "legs",
    primaryMuscles: ["quads"],
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Entrena el grupo aductor en estiramiento: músculos clave para estabilidad pélvica y patrones de pierna completos.",
    setupCues: [
      "Ajusta el rango inicial a tu movilidad real.",
      "Postura erguida con core activo."
    ],
    executionCues: [
      "Cierra las piernas contrayendo la cara interna del muslo.",
      "Abre controlado hasta el estiramiento aductor seguro."
    ],
    commonMistakes: [
      { mistake: "Forzar el rango inicial de apertura", correction: "Las distensiones aductoras vienen del exceso de rango rápido; progresa gradualmente." }
    ],
    preMobility: ["Mariposa de cadera sentado"],
    postStretching: ["Estiramiento de aductores mariposa"],
    progressions: ["Excéntricas de 4s en apertura"],
    regressions: ["Adductor squeeze ball isométrico"],
    defaultTempo: "2-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/lever-seated-hip-adduction.mp4",
    videoPosterUrl: "/assets/exercises/lever-seated-hip-adduction-poster.jpg"
  },
  {
    id: "hyperextension",
    name: "Hyperextension (Back Extension)",
    nameEs: "Hiperextensiones Lumbares",
    category: "legs",
    primaryMuscles: ["glutes", "hamstrings"],
    secondaryMuscles: ["lower_back"],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Extensión de cadera en estiramiento: convierte la 45° bench en una máquina de glúteo e isquio con progreso fácil.",
    setupCues: [
      "Almohadilla bajo los pliegues de la cadera para pivotar libre.",
      "Brazos cruzados al pecho o disco abrazado."
    ],
    executionCues: [
      "Baja redondeando suavemente la espalda alta para más rango.",
      "Sube extendiendo la cadera hasta línea neutral (sin hiperextender lumbar)."
    ],
    commonMistakes: [
      { mistake: "Buscar la hiperextensión lumbar arriba", correction: "El bloqueo es de glúteo; arquear la lumbar la sobrecarga innecesariamente." }
    ],
    preMobility: ["Cat-Camel espinal"],
    postStretching: ["Child pose"],
    progressions: ["Lastrar con disco abrazado"],
    regressions: ["Extensión de cadera en suelo"],
    defaultTempo: "3-1-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/hyperextension.mp4",
    videoPosterUrl: "/assets/exercises/hyperextension-poster.jpg"
  },
  {
    id: "elliptical-machine-walk",
    name: "Treadmill Walk",
    nameEs: "Caminadora",
    category: "legs",
    primaryMuscles: ["quads", "calves"],
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "machine",
    resistanceProfile: "linear",
    lengthTensionDescription: "Cardio de bajo impacto con patrón de zancada asistida: flujo sanguíneo y gasto calórico sin estrés articular.",
    setupCues: [
      "Postura erguida sin colgarte del manillar.",
      "Resistencia moderada con cadencia estable."
    ],
    executionCues: [
      "Empuja la zancada completa usando todo el pedaleo.",
      "Mantén frecuencia cardíaca en zona objetivo durante la sesión."
    ],
    commonMistakes: [
      { mistake: "Apoarse del manilar con hombros elevados", correction: "Relaja hombros y usa el tronco; el manillar es solo equilibrio." }
    ],
    preMobility: ["Movilidad de tobillo leve"],
    postStretching: ["Estiramiento de gemelo en escalón"],
    progressions: ["Intervalos de resistencia alta 1min/1min"],
    regressions: ["Caminata en cinta plana"],
    defaultTempo: "1-0-1-0",
    defaultRir: 4,
    videoUrl: "/assets/exercises/elliptical-machine-walk.mp4",
    videoPosterUrl: "/assets/exercises/elliptical-machine-walk-poster.jpg"
  },

  // SHOULDERS
  {
    id: "standing-military-press",
    name: "Standing Military Press",
    nameEs: "Press Militar de Pie",
    category: "push",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["side_delts", "triceps", "abs"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Press vertical estricto de pie: fuerza global de hombro con demanda anti-extensión del core.",
    setupCues: [
      "Barra sobre clavícula con codos ligeramente al frente.",
      "Glúteos y abdomen apretados para sellar la lumbar."
    ],
    executionCues: [
      "Empuja la barra en vertical llevando la cabeza 'a través' al pasar.",
      "Bloquea arriba con bíceps junto a orejas y sin arquear la lumbar."
    ],
    commonMistakes: [
      { mistake: "Impulso de cadera excesivo (turn into push press)", correction: "Si necesitas impulso, baja el peso; el militar es estricto." }
    ],
    preMobility: ["Movilidad torácica en pared"],
    postStretching: ["Estiramiento de hombro en pared"],
    progressions: ["Pausa de 2s con barra a la altura de la frente"],
    regressions: ["Press sentado con respaldo"],
    defaultTempo: "2-1-1-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/standing-military-press.mp4",
    videoPosterUrl: "/assets/exercises/standing-military-press-poster.jpg"
  },
  {
    id: "dumbbell-seated-front-press",
    name: "Seated Dumbbell Front Press",
    nameEs: "Press Frontal con Mancuernas Sentado",
    category: "push",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["side_delts", "triceps"],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Patrón de press con trayectoria libre que permite el descenso más profundo y natural del hombro.",
    setupCues: [
      "Sentado con respaldo a 90° y pies firmes.",
      "Mancuernas a la altura de las orejas con codos al frente."
    ],
    executionCues: [
      "Empuja convergiendo levemente sin chocar arriba.",
      "Baja hasta el estiramiento completo del deltoides."
    ],
    commonMistakes: [
      { mistake: "Arquear la lumbar al fatigarte", correction: "Aprieta abdomen; si persiste, reduce el peso." }
    ],
    preMobility: ["Circunducciones de hombro"],
    postStretching: ["Estiramiento cruzado de hombro"],
    progressions: ["Press alterno con pausa abajo"],
    regressions: ["Arnold press con menos peso"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-seated-front-press.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-seated-front-press-poster.jpg"
  },
  {
    id: "dumbbell-seated-shoulder-press",
    name: "Seated Dumbbell Shoulder Press",
    nameEs: "Press de Hombro con Mancuernas Sentado",
    category: "push",
    primaryMuscles: ["front_delts", "side_delts"],
    secondaryMuscles: ["triceps"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "El press de hombro de referencia: rango completo con estiramiento cargado del deltoides en cada repetición.",
    setupCues: [
      "Respaldo a 90° con escápulas retraídas.",
      "Codos ligeramente al frente del torso al inicio."
    ],
    executionCues: [
      "Presiona en diagonal natural (no vertical estricta).",
      "Excéntrica controlada hasta la altura de las orejas."
    ],
    commonMistakes: [
      { mistake: "Recorrido parcial arriba", correction: "Extiende casi por completo sin golpear el bloqueo articular." }
    ],
    preMobility: ["Rotaciones con banda"],
    postStretching: ["Estiramiento de deltoides en pared"],
    progressions: ["Última serie en drop set"],
    regressions: ["Press en máquina sentado"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-seated-shoulder-press.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-seated-shoulder-press-poster.jpg"
  },
  {
    id: "dumbbell-standing-overhead-press",
    name: "Standing Dumbbell Overhead Press",
    nameEs: "Press Vertical con Mancuernas de Pie",
    category: "push",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["side_delts", "triceps", "abs"],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Versión de pie con mancuernas: exige estabilización anti-lateral además de la fuerza vertical del hombro.",
    setupCues: [
      "De pie, pies a la anchura de caderas, core sellado.",
      "Mancuernas a la altura de los hombros con palmas al frente."
    ],
    executionCues: [
      "Empuja ambas mancuernas sin inclinar el torso a ningún lado.",
      "Baja controlado resistiendo el tirón lateral."
    ],
    commonMistakes: [
      { mistake: "Inclinarse hacia el lado que trabaja", correction: "Activa oblicuos del lado contrario; simetría estricta." }
    ],
    preMobility: ["Dead bug activador de core"],
    postStretching: ["Estiramiento de hombro cruzado"],
    progressions: ["Press unilateral de pie"],
    regressions: ["Press sentado con respaldo"],
    defaultTempo: "2-1-1-1",
    defaultRir: 2,
    videoUrl: "/assets/exercises/dumbbell-standing-overhead-press.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-standing-overhead-press-poster.jpg"
  },
  {
    id: "lever-military-press",
    name: "Lever Military Press (Plate Loaded)",
    nameEs: "Press Militar en Máquina",
    category: "push",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["side_delts", "triceps"],
    equipment: "machine",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Press vertical guiado con curva de palanca favorable: sobrecarga segura del deltoides hasta el fallo.",
    setupCues: [
      "Asiento ajustado con manijas a la altura de las orejas.",
      "Espalda y nuca apoyadas al respaldo."
    ],
    executionCues: [
      "Empuja hasta casi bloquear manteniendo tensión.",
      "Excéntrica de 3s sin dejar caer el peso."
    ],
    commonMistakes: [
      { mistake: "Despegar la cabeza del respaldo", correction: "Proyecta la cervical adelante; mantén nuca apoyada." }
    ],
    preMobility: ["Circunducciones de hombro"],
    postStretching: ["Estiramiento de deltoides"],
    progressions: ["Myo-reps finales"],
    regressions: ["Press con mancuernas sentado"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/lever-military-press.mp4",
    videoPosterUrl: "/assets/exercises/lever-military-press-poster.jpg"
  },
  {
    id: "dumbbell-lateral-raise",
    name: "Dumbbell Lateral Raise",
    nameEs: "Elevaciones Laterales con Mancuernas",
    category: "push",
    primaryMuscles: ["side_delts"],
    secondaryMuscles: ["traps"],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "El ejercicio clave para el ancho de hombros: abducción pura del deltoides lateral con carga directa.",
    setupCues: [
      "Ligera inclinación adelante del torso con codos semiflexionados.",
      "Muñecas neutras, meñiques ligeramente arriba."
    ],
    executionCues: [
      "Eleva conduciendo con los codos hasta la línea del hombro.",
      "Baja en 3s resistiendo la gravedad sin balanceo."
    ],
    commonMistakes: [
      { mistake: "Superar la línea del hombro con encogimiento", correction: "Por encima de 90° domina el trapecio; detente a la altura del hombro." }
    ],
    preMobility: ["Circunducciones activas"],
    postStretching: ["Estiramiento cruzado de hombro"],
    progressions: ["Parciales quemado tras el fallo"],
    regressions: ["Elevaciones en máquina o polea baja"],
    defaultTempo: "2-0-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/dumbbell-lateral-raise.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-lateral-raise-poster.jpg"
  },
  {
    id: "dumbbell-front-raise",
    name: "Dumbbell Front Raise",
    nameEs: "Elevaciones Frontales con Mancuernas",
    category: "push",
    primaryMuscles: ["front_delts"],
    secondaryMuscles: ["upper_back"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Flexión de hombro pura: aísla el haz anterior en un patrón que los presses ya saturados no cubren igual.",
    setupCues: [
      "De pie, mancuernas delante de los muslos con agarre prono.",
      "Core firme para evitar balanceo."
    ],
    executionCues: [
      "Eleva a la altura del hombro con codos casi rectos.",
      "Baja controlado sin dejar caer los brazos."
    ],
    commonMistakes: [
      { mistake: "Impulsar con la cadera", correction: "El peso honesto es pequeño; el deltoides anterior es un músculo modesto." }
    ],
    preMobility: ["Circunducciones de hombro"],
    postStretching: ["Estiramiento de deltoides anterior"],
    progressions: ["Alterno con pausa arriba"],
    regressions: ["Front raise sentado"],
    defaultTempo: "2-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-front-raise.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-front-raise-poster.jpg"
  },

  // BICEPS / FOREARMS
  {
    id: "barbell-curl",
    name: "Barbell Curl",
    nameEs: "Curl de Bíceps con Barra",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "El curl pesado clásico: máxima carga total posible para el bíceps braquial con ambos brazos compartiendo barra.",
    setupCues: [
      "Agarre supino a la anchura de hombros.",
      "Codos pegados al torso sin adelantarse."
    ],
    executionCues: [
      "Curl estricto sin balanceo de cadera.",
      "Baja en 3s hasta extensión completa del codo."
    ],
    commonMistakes: [
      { mistake: "Balanceo lumbar para iniciar la subida", correction: "La espalda contra pared expone el fraude; usa peso honesto." }
    ],
    preMobility: ["Extensión de codo con supinación"],
    postStretching: ["Estiramiento de bíceps en pared"],
    progressions: ["Curl con pausa a 90°"],
    regressions: ["EZ bar curl"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/barbell-curl.mp4",
    videoPosterUrl: "/assets/exercises/barbell-curl-poster.jpg"
  },
  {
    id: "ez-bar-curl",
    name: "EZ Bar Curl",
    nameEs: "Curl con Barra EZ",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "El ángulo semipronado de la EZ alivia las muñecas manteniendo la carga pesada sobre el bíceps.",
    setupCues: [
      "Agarra la barra por las curvas interiores (semisupino).",
      "Codos fijos a los costados."
    ],
    executionCues: [
      "Curl completo apretando arriba 1s.",
      "Excéntrica de 3s hasta extensión total."
    ],
    commonMistakes: [
      { mistake: "Acortar el recorrido abajo", correction: "El estiramiento cargado es mitad del estímulo; extiende del todo." }
    ],
    preMobility: ["Movilidad de muñeca"],
    postStretching: ["Estiramiento de bíceps con brazo extendido"],
    progressions: ["Curl EZ inclinado contra pared"],
    regressions: ["Curl con mancuernas"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/ez-bar-curl.mp4",
    videoPosterUrl: "/assets/exercises/ez-bar-curl-poster.jpg"
  },
  {
    id: "barbell-preacher-curl",
    name: "Barbell Preacher Curl",
    nameEs: "Curl en Banco Scott con Barra",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: [],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Elimina el fraude del hombro y carga el bíceps en máxima elongación: el curl de estiramiento por excelencia.",
    setupCues: [
      "Axilas sobre el pad con brazos apoyados completos.",
      "Agarre supino algo más estrecho que hombros."
    ],
    executionCues: [
      "Baja hasta extensión casi total SIN despegar los brazos del pad.",
      "Curl apretando fuerte arriba sin levantar los codos."
    ],
    commonMistakes: [
      { mistake: "Despegar codos y hombros del banco", correction: "Convierte el Scott en curl normal; el pad es ley." }
    ],
    preMobility: ["Extensión pasiva de codo"],
    postStretching: ["Estiramiento de bíceps en banco Scott"],
    progressions: ["Negativas de 5s"],
    regressions: ["Preacher en máquina"],
    defaultTempo: "3-1-1-0",
    defaultRir: 0,
    videoUrl: "/assets/exercises/barbell-preacher-curl.mp4",
    videoPosterUrl: "/assets/exercises/barbell-preacher-curl-poster.jpg"
  },
  {
    id: "barbell-reverse-curl",
    name: "Barbell Reverse Curl",
    nameEs: "Curl Inverso con Barra",
    category: "pull",
    primaryMuscles: ["forearms"],
    secondaryMuscles: ["biceps"],
    equipment: "barbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Agarre prono que desplaza el trabajo al braquiorradial y supinador largo: antebrazos gruesos y agarre fuerte.",
    setupCues: [
      "Agarre prono a la anchura de hombros.",
      "Muñecas firmes en línea con el antebrazo."
    ],
    executionCues: [
      "Curl manteniendo el pronation estricto de la muñeca.",
      "Controla la bajada; el prono hace que sea dura."
    ],
    commonMistakes: [
      { mistake: "Flexionar la muñeca hacia atrás", correction: "Estresa la muñeca; peso menor y muñeca recta." }
    ],
    preMobility: ["Movilidad de muñeca circular"],
    postStretching: ["Estiramiento de extensores de antebrazo"],
    progressions: ["Reverse curl en banco Scott"],
    regressions: ["Reverse curl con barra EZ"],
    defaultTempo: "2-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/barbell-reverse-curl.mp4",
    videoPosterUrl: "/assets/exercises/barbell-reverse-curl-poster.jpg"
  },
  {
    id: "dumbbell-biceps-curl",
    name: "Dumbbell Biceps Curl",
    nameEs: "Curl Alterno con Mancuernas",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Curl libre con supinación activa: rotación externa extra al subir recluta el bíceps en su función completa.",
    setupCues: [
      "De pie con mancuernas a los lados en agarre neutro.",
      "Supina activamente mientras subes."
    ],
    executionCues: [
      "Curl alterno con codos fijos.",
      "Baja retornando a neutro en 3s controlados."
    ],
    commonMistakes: [
      { mistake: "Adelantar el codo al subir", correction: "Roba tensión al bíceps; el codo permanece clavado al costado." }
    ],
    preMobility: ["Circunducciones de muñeca"],
    postStretching: ["Estiramiento de bíceps en pared"],
    progressions: ["Pausa de 2s arriba por brazo"],
    regressions: ["Curl sentado con respaldo"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-biceps-curl.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-biceps-curl-poster.jpg"
  },
  {
    id: "dumbbell-concentration-curl",
    name: "Dumbbell Concentration Curl",
    nameEs: "Curl de Concentración",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: [],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Brazo anclado tras la pierna elimina toda ayuda: pico de contracción y estiramiento puro del bíceps.",
    setupCues: [
      "Sentado, codo apoyado en la cara interna del muslo.",
      "Torso inclinado adelante con espalda neutra."
    ],
    executionCues: [
      "Curl concentrado supinando al final.",
      "Baja lento hasta extensión completa sin desanclar el codo."
    ],
    commonMistakes: [
      { mistake: "Usar el torso para ayudar", correction: "El apoyo en el muslo ya elimina el impulso; si necesitas ayuda, baja el peso." }
    ],
    preMobility: ["Movilidad de codo suave"],
    postStretching: ["Estiramiento de bíceps con supinación"],
    progressions: ["Pausa isométrica a mitad de recorrido"],
    regressions: ["Curl con mancuerna sentado"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/dumbbell-concentration-curl.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-concentration-curl-poster.jpg"
  },
  {
    id: "dumbbell-hammer-curl",
    name: "Dumbbell Hammer Curl",
    nameEs: "Curl Martillo con Mancuernas",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Agarre neutro que prioriza braquial y braquiorradial: grosor del brazo visto de lado.",
    setupCues: [
      "Mancuernas en vertical a los lados (pulgar arriba).",
      "Codos pegados al torso."
    ],
    executionCues: [
      "Curl manteniendo el agarre neutro sin rotar.",
      "Excéntrica controlada hasta extensión total."
    ],
    commonMistakes: [
      { mistake: "Rotar la muñeca a supino a mitad", correction: "Se convierte en curl normal; mantén el pulgar arriba." }
    ],
    preMobility: ["Movilidad de muñeca"],
    postStretching: ["Estiramiento de braquiorradial"],
    progressions: ["Hammer curl en cruz al pecho"],
    regressions: ["Hammer curl sentado"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/dumbbell-hammer-curl.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-hammer-curl-poster.jpg"
  },
  {
    id: "dumbbell-cross-body-hammer-curl",
    name: "Cross Body Hammer Curl",
    nameEs: "Curl Martillo Cruzado",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    resistanceProfile: "shortened",
    lengthTensionDescription: "El cruce hacia el hombro opuesto añade aducción de hombro: pico de contracción en la cabeza corta del bíceps.",
    setupCues: [
      "De pie con agarre neutro y codos fijos.",
      "Torso erguido con core activo."
    ],
    executionCues: [
      "Curl llevando la mancuerna al hombro contrario.",
      "Baja en línea controlada hasta el muslo."
    ],
    commonMistakes: [
      { mistake: "Encoger el hombro al cruzar", correction: "Mantén el trapecio relajado; solo el codo flexiona." }
    ],
    preMobility: ["Movilidad de hombro suave"],
    postStretching: ["Estiramiento cruzado de brazo"],
    progressions: ["Pausa 2s en el cruce"],
    regressions: ["Hammer curl estándar"],
    defaultTempo: "2-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/dumbbell-cross-body-hammer-curl.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-cross-body-hammer-curl-poster.jpg"
  },
  {
    id: "dumbbell-seated-preacher-curl",
    name: "Seated Preacher Dumbbell Curl",
    nameEs: "Curl Scott Sentado con Mancuerna",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: [],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Banco Scott con mancuerna unilateral: estiramiento máximo con foco absoluto y corrección de asimetrías.",
    setupCues: [
      "Axila y brazo completamente apoyados en el pad.",
      "Agarre supino relajado."
    ],
    executionCues: [
      "Extiende el codo casi del todo en el fondo.",
      "Curl apretado sin despegar el brazo del pad."
    ],
    commonMistakes: [
      { mistake: "Levantar el codo para ganar rango arriba", correction: "Pierde tensión; el rango útil es el que ocurre con el brazo fijo." }
    ],
    preMobility: ["Extensión de codo pasiva"],
    postStretching: ["Estiramiento de bíceps en pad"],
    progressions: ["Negativas de 5s unilaterales"],
    regressions: ["Curl con mancuerna en banco inclinado"],
    defaultTempo: "3-1-1-0",
    defaultRir: 0,
    videoUrl: "/assets/exercises/dumbbell-seated-preacher-curl.mp4",
    videoPosterUrl: "/assets/exercises/dumbbell-seated-preacher-curl-poster.jpg"
  },
  {
    id: "cable-hammer-curl",
    name: "Cable Hammer Curl",
    nameEs: "Curl Martillo en Polea",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    resistanceProfile: "linear",
    lengthTensionDescription: "Tensión de polea constante incluso en el estiramiento, donde las mancuernas pierden resistencia.",
    setupCues: [
      "Polea baja con mango recto o V en agarre neutro.",
      "Un paso atrás para mantener tensión al fondo."
    ],
    executionCues: [
      "Curl con pulgares arriba y codos fijos.",
      "No dejes que el carrete junte las placas abajo."
    ],
    commonMistakes: [
      { mistake: "Dar un paso adelante y perder tensión abajo", correction: "La distancia al poste define el estiramiento cargado; mantente atrás." }
    ],
    preMobility: ["Movilidad de muñeca"],
    postStretching: ["Estiramiento de antebrazo"],
    progressions: ["Pausa a 90° en cada rep"],
    regressions: ["Hammer curl con mancuernas"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-hammer-curl.mp4",
    videoPosterUrl: "/assets/exercises/cable-hammer-curl-poster.jpg"
  },
  {
    id: "cable-hammer-curl-rope",
    name: "Cable Hammer Curl with Rope",
    nameEs: "Curl Martillo en Polea con Cuerda",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    resistanceProfile: "linear",
    lengthTensionDescription: "La cuerda permite separación natural de manos: trayectoria cómoda con tensión lineal sobre braquial y bíceps.",
    setupCues: [
      "Cuerda en polea baja con agarre neutro por los extremos.",
      "Codos pegados al torso desde el inicio."
    ],
    executionCues: [
      "Curl neutro apretando los extremos de la cuerda.",
      "Baja controlado sin bloquear brusco el codo."
    ],
    commonMistakes: [
      { mistake: "Balancear el torso al iniciar", correction: "Ancla los codos; el peso de la polea no perdona el fraude." }
    ],
    preMobility: ["Circunducciones de muñeca"],
    postStretching: ["Estiramiento de bíceps y antebrazo"],
    progressions: ["Unilateral para más rango"],
    regressions: ["Cuerda más ligera"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-hammer-curl-rope.mp4",
    videoPosterUrl: "/assets/exercises/cable-hammer-curl-rope-poster.jpg"
  },
  {
    id: "cable-overhead-curl",
    name: "Overhead Cable Curl",
    nameEs: "Curl Sobre la Cabeza en Polea",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Hombro en flexión estira la cabeza larga del bíceps mientras la polea mantiene tensión: doble estímulo de estiramiento.",
    setupCues: [
      "Polea alta detrás de ti con agarre supino.",
      "Un pie adelantado y brazos apuntando atrás-arriba."
    ],
    executionCues: [
      "Curl desde esa posición estirada sin mover los hombros.",
      "Baja hasta sentir el estiramiento profundo del bíceps."
    ],
    commonMistakes: [
      { mistake: "Adelantar los codos al subir", correction: "El húmero queda fijo; solo el codo articula." }
    ],
    preMobility: ["Estiramiento de bíceps en pared"],
    postStretching: ["Extensión pasiva de codo"],
    progressions: ["Unilateral con pausa en estiramiento"],
    regressions: ["Curl inclinado con mancuernas"],
    defaultTempo: "3-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/cable-overhead-curl.mp4",
    videoPosterUrl: "/assets/exercises/cable-overhead-curl-poster.jpg"
  },
  {
    id: "cable-unilateral-bicep-curl",
    name: "Unilateral Cable Bicep Curl",
    nameEs: "Curl Unilateral de Bíceps en Polea",
    category: "pull",
    primaryMuscles: ["biceps"],
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    resistanceProfile: "linear",
    lengthTensionDescription: "Trabajo unilateral con tensión constante: ideal para igualar brazos y exprimir el rango completo con foco mental.",
    setupCues: [
      "Polea baja con mango único y agarre supino.",
      "Codo anclado al costado del torso."
    ],
    executionCues: [
      "Curl estricto supinando al final del recorrido.",
      "Retorno de 3s sin dejar arrastrar el brazo."
    ],
    commonMistakes: [
      { mistake: "Rotar el torso hacia el cable", correction: "Cuadrado frente al poste; el torso no participa." }
    ],
    preMobility: ["Circunducciones de muñeca"],
    postStretching: ["Estiramiento de bíceps"],
    progressions: ["Pausa de 2s en contracción máxima"],
    regressions: ["Curl con mancuernas alterno"],
    defaultTempo: "3-0-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/cable-unilateral-bicep-curl.mp4",
    videoPosterUrl: "/assets/exercises/cable-unilateral-bicep-curl-poster.jpg"
  },

  // TRICEPS
  {
    id: "cable-pushdown",
    name: "Cable Pushdown",
    nameEs: "Jalón de Tríceps en Polea",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Extensión de codo con pico de tensión en contracción completa: el básico insustituible del tríceps.",
    setupCues: [
      "Codos pegados a los costados en todo el recorrido.",
      "Torso ligeramente inclinado con core firme."
    ],
    executionCues: [
      "Extiende hasta el final separando la barra de los muslos.",
      "Retorna controlado hasta 90° sin despegar los codos."
    ],
    commonMistakes: [
      { mistake: "Abrir los codos hacia adelante", correction: "Se vuelve press francés; el codo es una bisagra fija." }
    ],
    preMobility: ["Movilidad de codo suave"],
    postStretching: ["Estiramiento de tríceps sobre la cabeza"],
    progressions: ["Unilateral para corregir dominancias"],
    regressions: ["Pushdown con cuerda ligera"],
    defaultTempo: "2-0-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/cable-pushdown.mp4",
    videoPosterUrl: "/assets/exercises/cable-pushdown-poster.jpg"
  },
  {
    id: "cable-pushdown-rope",
    name: "Rope Cable Pushdown",
    nameEs: "Jalón de Tríceps con Cuerda",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Separar la cuerda al final logra extensión + rotación externa: contracción suplementaria de la cabeza lateral.",
    setupCues: [
      "Cuerda en polea alta con codos anclados.",
      "Manos agarrando los extremos con pulgares afuera."
    ],
    executionCues: [
      "Extiende y separa los extremos al final del recorrido.",
      "Excéntrica controlada sin mover los codos del sitio."
    ],
    commonMistakes: [
      { mistake: "Jalar con el peso corporal", correction: "Inclínate apenas y fija los codos; el torso es espectador." }
    ],
    preMobility: ["Circunducciones de hombro suaves"],
    postStretching: ["Estiramiento de tríceps"],
    progressions: ["Pausa de 2s en máxima separación"],
    regressions: ["Pushdown con barra recta ligera"],
    defaultTempo: "2-1-1-1",
    defaultRir: 0,
    videoUrl: "/assets/exercises/cable-pushdown-rope.mp4",
    videoPosterUrl: "/assets/exercises/cable-pushdown-rope-poster.jpg"
  },
  {
    id: "cable-pushdown-sz-bar",
    name: "SZ-Bar Cable Pushdown",
    nameEs: "Jalón de Tríceps con Barra SZ",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "El perfil angular de la barra SZ posiciona las muñecas en semiprono: presión articular mínima con tensión máxima.",
    setupCues: [
      "Barra SZ en polea alta con agarre por las curvas.",
      "Codos fijos a los lados."
    ],
    executionCues: [
      "Extiende por completo apretando el tríceps 1s abajo.",
      "Sube controlado hasta 90° de codo."
    ],
    commonMistakes: [
      { mistake: "Recorrido parcial por exceso de peso", correction: "El bloqueo completo es donde vive la contracción; baja la carga." }
    ],
    preMobility: ["Movilidad de muñeca"],
    postStretching: ["Estiramiento de tríceps sobre cabeza"],
    progressions: ["Rest-pause en última serie"],
    regressions: ["Pushdown con cuerda"],
    defaultTempo: "2-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/cable-pushdown-sz-bar.mp4",
    videoPosterUrl: "/assets/exercises/cable-pushdown-sz-bar-poster.jpg"
  },
  {
    id: "barbell-jm-press",
    name: "JM Press",
    nameEs: "JM Press con Barra",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Híbrido skull crusher-close grip: el constructor de tríceps pesado favorito del powerlifting.",
    setupCues: [
      "Agarre a la anchura de hombros sobre el pecho.",
      "Codos apuntando a los pies, no a los lados."
    ],
    executionCues: [
      "Baja la barra hacia la garganta flexionando solo el codo.",
      "Desde abajo, presiona como un close grip bench."
    ],
    commonMistakes: [
      { mistake: "Abrir los codos lateralmente", correction: "Convierte el JM en press; los codos viajan hacia los pies." }
    ],
    preMobility: ["Movilidad de codo y muñeca"],
    postStretching: ["Estiramiento de tríceps"],
    progressions: ["Pausa de 2s cerca de la barbilla"],
    regressions: ["Skull crusher con barra EZ"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/barbell-jm-press.mp4",
    videoPosterUrl: "/assets/exercises/barbell-jm-press-poster.jpg"
  },
  {
    id: "barbell-skull-crusher",
    name: "Skull Crusher",
    nameEs: "Press Francés Tumbado",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: [],
    equipment: "barbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Flexión de hombro + extensión de codo: estira la cabeza larga del tríceps bajo carga directa.",
    setupCues: [
      "Tumbado con brazos verticales sobre los hombros.",
      "Barra EZ recomendada para cuidar muñecas y codos."
    ],
    executionCues: [
      "Baja la barra hacia la frente o detrás de la cabeza.",
      "Extiende sin mover los hombros del sitio."
    ],
    commonMistakes: [
      { mistake: "Abrir los codos convirtiéndolo en press", correction: "Los húmeros permanecen verticales; solo dobla el codo." }
    ],
    preMobility: ["Calentamiento de codo sin peso"],
    postStretching: ["Estiramiento de tríceps sobre la cabeza"],
    progressions: ["Bajada detrás de la cabeza para más estiramiento"],
    regressions: ["Extensión con mancuerna a dos manos"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/barbell-skull-crusher.mp4",
    videoPosterUrl: "/assets/exercises/barbell-skull-crusher-poster.jpg"
  },
  {
    id: "bench-dip",
    name: "Bench Dip on Floor",
    nameEs: "Fondos de Tríceps en Banco/Suelo",
    category: "push",
    primaryMuscles: ["triceps"],
    secondaryMuscles: ["front_delts", "chest"],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Extensión de codo con peso corporal y hombro en extensión: accesible y escalable para cualquier nivel.",
    setupCues: [
      "Manos al borde de un banco estable con dedos al frente.",
      "Caderas cerca del banco, piernas extendidas o flexionadas."
    ],
    executionCues: [
      "Baja flexionando solo los codos hasta ~90°.",
      "Empuja hasta bloquear contrayendo el tríceps."
    ],
    commonMistakes: [
      { mistake: "Alejar la cadera del banco al bajar", correction: "El descenso es vertical pegado al banco; alejarse resta palanca al tríceps." }
    ],
    preMobility: ["Movilidad de hombro suave"],
    postStretching: ["Estiramiento de tríceps cruzado"],
    progressions: ["Elevar los pies en otro banco o añadir disco en el regazo"],
    regressions: ["Fondos con rodillas flexionadas"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/bench-dip.mp4",
    videoPosterUrl: "/assets/exercises/bench-dip-poster.jpg"
  },

  // CORE / ABS
  {
    id: "sit-up",
    name: "Sit-Up",
    nameEs: "Abdominales Completos (Sit-Up)",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Flexión completa de columna desde decúbito: rango total del recto abdominal con progreso por lastre.",
    setupCues: [
      "Decúbito supino con rodillas flexionadas 90°.",
      "Manos cruzadas al pecho o junto a las sienes."
    ],
    executionCues: [
      "Enrolla la columna vértebra a vértebra hasta sentarte.",
      "Baja controlado desenrollando sin dejarte caer."
    ],
    commonMistakes: [
      { mistake: "Tirar del cuello con las manos", correction: "Riesgo cervical directo; las manos nunca tiran de la cabeza." }
    ],
    preMobility: ["Cat-Camel espinal"],
    postStretching: ["Cobra pose suave"],
    progressions: ["Sit-up lastrado con disco al pecho"],
    regressions: ["Crunch parcial en suelo"],
    defaultTempo: "2-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/sit-up.mp4",
    videoPosterUrl: "/assets/exercises/sit-up-poster.jpg"
  },
  {
    id: "air-bike",
    name: "Air Bike (Crunch Bicicleta)",
    nameEs: "Bicicleta de Aire (Crunch Bicicleta)",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Combinación de flexión + rotación de columna: activa recto abdominal y oblicuos simultáneamente.",
    setupCues: [
      "Supino con manos junto a las sienes y piernas elevadas.",
      "Lumbar pegada al suelo."
    ],
    executionCues: [
      "Lleva codo contrario a rodilla rotando desde el tronco.",
      "Alterna sin descanso manteniendo la lumbar anclada."
    ],
    commonMistakes: [
      { mistake: "Mover solo los codos sin rotar el tronco", correction: "La rotación viene del torso, no del cuello ni del brazo." }
    ],
    preMobility: ["Cat-Camel suave"],
    postStretching: ["Twist tumbado de espalda"],
    progressions: ["Pausa de 1s en cada cruce"],
    regressions: ["Crunch estático con rodillas apoyadas"],
    defaultTempo: "1-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/air-bike.mp4",
    videoPosterUrl: "/assets/exercises/air-bike-poster.jpg"
  },
  {
    id: "alternate-heel-touchers",
    name: "Alternate Heel Touchers",
    nameEs: "Toques de Talón Alternos",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Mini-crunch con rotación lateral: quema metabólica localizada en oblicuos con tensión constante en acortamiento.",
    setupCues: [
      "Supino con rodillas flexionadas y talones cerca de los glúteos.",
      "Hombros ligeramente despegados del suelo todo el tiempo."
    ],
    executionCues: [
      "Toca cada talón alternando lateralizando el tronco.",
      "Mantén la contracción abdominal permanente entre toques."
    ],
    commonMistakes: [
      { mistake: "Despegar demasiado y convertirlo en crunch completo", correction: "El movimiento es corto y lateral; el rango grande lo diluye." }
    ],
    preMobility: ["Rotaciones de tronco suaves"],
    postStretching: ["Twist tumbado"],
    progressions: ["Sujetar discos pequeños en las manos"],
    regressions: ["Reducir tiempo bajo tensión"],
    defaultTempo: "1-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/alternate-heel-touchers.mp4",
    videoPosterUrl: "/assets/exercises/alternate-heel-touchers-poster.jpg"
  },
  {
    id: "floor-crunch",
    name: "Floor Crunch",
    nameEs: "Crunch en Suelo",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Flexión spinal corta y controlada: tensión pico del recto abdominal en el rango de acortamiento.",
    setupCues: [
      "Supino con rodillas flexionadas y pies en el suelo.",
      "Manos junto a sienes sin tirar del cuello."
    ],
    executionCues: [
      "Enrolla el esternón hacia la pelvis exhlando el aire.",
      "Baja solo hasta perder tensión, no hasta relajarte."
    ],
    commonMistakes: [
      { mistake: "Subir todo el torso como sit-up", correction: "El crunch es corto; si despegas la lumbar cambias de ejercicio." }
    ],
    preMobility: ["Cat-Camel"],
    postStretching: ["Cobra pose"],
    progressions: ["Crunch lastrado al pecho"],
    regressions: ["Crunch con piernas elevadas sobre un banco"],
    defaultTempo: "2-1-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/floor-crunch.mp4",
    videoPosterUrl: "/assets/exercises/floor-crunch-poster.jpg"
  },
  {
    id: "decline-crunch",
    name: "Decline Crunch",
    nameEs: "Crunch en Banco Declinado",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "La pendiente negativa alarga el rango: el abdominal trabaja desde mayor estiramiento y con progreso por lastre.",
    setupCues: [
      "Ancla los pies en el banco declinado.",
      "Manos junto a sienes o cruzadas al pecho."
    ],
    executionCues: [
      "Enrolla el torso sin tirar del cuello.",
      "Excéntrica lenta hasta casi acostarte por completo."
    ],
    commonMistakes: [
      { mistake: "Subir recto flexionando la cadera", correction: "El psoas se roba el trabajo; el movimiento es enrollar la columna." }
    ],
    preMobility: ["Cat-Camel espinal"],
    postStretching: ["Cobra pose"],
    progressions: ["Decline crunch lastrado con disco"],
    regressions: ["Crunch en suelo"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1,
    videoUrl: "/assets/exercises/decline-crunch.mp4",
    videoPosterUrl: "/assets/exercises/decline-crunch-poster.jpg"
  },
  {
    id: "front-plank",
    name: "Front Plank",
    nameEs: "Plancha Frontal",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["glutes", "lower_back"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Anti-extensión isométrica: la función real del core bajo carga, transferible a sentadilla y peso muerto.",
    setupCues: [
      "Antebrazos en el suelo con codos bajo los hombros.",
      "Glúteos apretados y pelvis en retroversión leve."
    ],
    executionCues: [
      "Sostén una línea recta cabeza-talón respirando normal.",
      "Empuja el suelo con los antebrazos sin hundir la lumbar."
    ],
    commonMistakes: [
      { mistake: "Aguantar minutos con técnica floja", correction: "Mejor series de 20-40s perfectas con intensidad real (aprieta abs y glúteos)." }
    ],
    preMobility: ["Cat-Camel activador"],
    postStretching: ["Child pose"],
    progressions: ["Plancha lastrada o con brazos extendidos"],
    regressions: ["Plancha con rodillas apoyadas"],
    defaultTempo: "Isométrico",
    defaultRir: 2,
    executionMode: "time",
    videoUrl: "/assets/exercises/front-plank.mp4",
    videoPosterUrl: "/assets/exercises/front-plank-poster.jpg"
  },
  {
    id: "weighted-russian-twist",
    name: "Weighted Russian Twist",
    nameEs: "Russian Twist con Peso",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: [],
    equipment: "dumbbell",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Rotación lastrada del tronco: oblicuos bajo carga real con demandas anti-flexión del core profundo.",
    setupCues: [
      "Sentado con talones apoyados y torso inclinado 45°.",
      "Disco o balón sujetado con ambas manos frente al pecho."
    ],
    executionCues: [
      "Rota llevando el peso a cada lado girando desde el tronco.",
      "Mantén la espalda larga, no redondees para alcanzar."
    ],
    commonMistakes: [
      { mistake: "Mover solo los brazos sin rotar el tronco", correction: "El peso viaja con el pecho; los brazos son pasajeros." }
    ],
    preMobility: ["Rotaciones torácicas sentado"],
    postStretching: ["Twist tumbado suave"],
    progressions: ["Elevar los pies del suelo durante las repeticiones"],
    regressions: ["Sin peso, solo rotación controlada"],
    defaultTempo: "2-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/weighted-russian-twist.mp4",
    videoPosterUrl: "/assets/exercises/weighted-russian-twist-poster.jpg"
  },
  {
    id: "lying-scissors-cross",
    name: "Lying Scissors Cross",
    nameEs: "Tijeras Cruzadas Tumbado",
    category: "core",
    primaryMuscles: ["abs", "glutes"],
    secondaryMuscles: ["quads"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Cruce alternado de piernas en decúbito: tensión continua del core inferior y aductores con control pélvico.",
    setupCues: [
      "Supino con manos bajo los glúteos para proteger la lumbar.",
      "Piernas extendidas y ligeramente elevadas."
    ],
    executionCues: [
      "Cruza una pierna sobre la otra alternando rítmicamente.",
      "Mantén la zona lumbar pegada al suelo en todo momento."
    ],
    commonMistakes: [
      { mistake: "Arquear la lumbar al cansancio", correction: "Sube ligeramente las piernas o acorta la serie; la espalda manda." }
    ],
    preMobility: ["Retroversión pélvica consciente"],
    postStretching: ["Estiramiento de flexores de cadera"],
    progressions: ["Tijeras verticales (subir/bajar) más lentas"],
    regressions: ["Marcha de cadera con rodillas flexionadas"],
    defaultTempo: "1-0-1-0",
    defaultRir: 1,
    videoUrl: "/assets/exercises/lying-scissors-cross.mp4",
    videoPosterUrl: "/assets/exercises/lying-scissors-cross-poster.jpg"
  },
  {
    id: "medicine-ball-slam",
    name: "Medicine Ball Slam",
    nameEs: "Slam con Balón Medicinal",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["front_delts", "lats"],
    equipment: "dumbbell",
    resistanceProfile: "linear",
    lengthTensionDescription: "Potencia concéntrica total del tronco: flexión explosiva de columna con descarga completa, ideal como finalizador metabólico.",
    setupCues: [
      "De pie, pies a anchura de hombros, balón sobre la cabeza.",
      "Core preparado para desacelerar y descargar."
    ],
    executionCues: [
      "Azota el balón al suelo contrayendo el abdomen explosivamente.",
      "Recoge en cuclillas con espalda neutra y repite al ritmo."
    ],
    commonMistakes: [
      { mistake: "Soltar el balón y perseguirlo con la espalda redondeada", correction: "Acompaña el slam y recoge con bisagra; la lumbar no se redondea bajo fatiga." }
    ],
    preMobility: ["Cat-Camel dinámico"],
    postStretching: ["Child pose respiratoria"],
    progressions: ["Balón más pesado o slams en intervalos 20/10"],
    regressions: ["Slam de rodillas con balón ligero"],
    defaultTempo: "Explosivo",
    defaultRir: 2,
    executionMode: "explosive",
    videoUrl: "/assets/exercises/medicine-ball-slam.mp4",
    videoPosterUrl: "/assets/exercises/medicine-ball-slam-poster.jpg"
  },
  // ================= NIGHTWING SPECIFIC EXERCISES =================
  {
    id: "smith-incline-bench-press",
    name: "Smith Machine Incline Bench Press",
    nameEs: "Press Inclinado en Smith",
    category: "push",
    primaryMuscles: ["chest", "front_delts"],
    secondaryMuscles: ["triceps"],
    equipment: "smith",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Sobrecarga del pectoral superior en la posición inclinada con trayectoria guiada, enfatizando negativas controladas.",
    setupCues: [
      "Banco a 30-45°, espalda clavada y pies estables.",
      "Agarre apenas fuera de los hombros en la barra guiada."
    ],
    executionCues: [
      "Desciende controlado hasta un estiramiento profundo en la parte alta del pecho.",
      "Empuja hacia arriba sin perder el contacto escapular."
    ],
    commonMistakes: [
      { mistake: "Rebotar en la parte baja", correction: "Controla la negativa en 3s: aquí nace la estimulación de estiramiento." }
    ],
    preMobility: ["Rotación externa de hombro con banda", "Aperturas con foam roller"],
    postStretching: ["Estiramiento de pectoral en marco de puerta"],
    progressions: ["Pausa 2s en el estiramiento", "Más carga progresiva semanal"],
    regressions: ["Press inclinado en máquina", "Press con mancuernas ligeras"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "low-to-high-cable-flye",
    name: "Low to High Single-Arm Cable Flye",
    nameEs: "Apertura Baja a Alta (Cable)",
    category: "push",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Apertura unilateral de baja a alta que maximiza la contracción del pectoral superior con estiramiento y apretón final.",
    setupCues: [
      "Polea en la posición más baja, de pie en el marco."
    ],
    executionCues: [
      "Lleva la palanca hacia arriba y cruzada mientras contraes el pecho.",
      "Aprieta el pectoral en cada repetición y regresa controlando."
    ],
    commonMistakes: [
      { mistake: "Convertir el movimiento en un press", correction: "Mantén el codo levemente flexionado: la tensión va al pectoral, no al tríceps." }
    ],
    preMobility: ["Aperturas torácicas con banda"],
    postStretching: ["Estiramiento de pectoral contra marco"],
    progressions: ["Más carga o pausa en contracción"],
    regressions: ["Apertura baja con mancuerna muy ligera"],
    defaultTempo: "3-0-1-2",
    defaultRir: 0
  },
  {
    id: "cable-pullover",
    name: "Cable Pullover",
    nameEs: "Pullover en Polea",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["triceps", "chest", "front_delts"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Perfecto estiramiento del dorsal y activación del serrato anterior en la posición alargada: reduce la fatiga del core.",
    setupCues: [
      "Polea alta, de pie y brazo (o ambos) extendidos.",
      "Bajo peso para sentir el dorsal."
    ],
    executionCues: [
      "Estira el dorsal mientras desciende el brazo.",
      "Contrae el serrato proyectando el hombro hacia adelante al final."
    ],
    commonMistakes: [
      { mistake: "Usar demasiado peso y convertirla en press", correction: "Rango completo controlado: la estrella del día es el estiramiento y la activación del serrato." }
    ],
    preMobility: ["Dislocaciones con banda"],
    postStretching: ["Estiramiento del dorsal en polea"],
    progressions: ["Pausa en estiramiento completo"],
    regressions: ["Pullover con mancuerna en banco"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "serratus-punches",
    name: "Serratus Punches",
    nameEs: "Serratus Punches (Proyección de Hombro)",
    category: "core",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["front_delts", "abs"],
    equipment: "cable",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Proyección del hombro hacia adelante contra resistencia ligera: aísla el serrato anterior y mejora la salud escapular.",
    setupCues: [
      "Polea alta o con mancuerna muy ligera, brazo extendido.",
      "Hombro pegado al torso sin invadir en tackle."
    ],
    executionCues: [
      "Proyecta el puño hacia adelante llevando el omóplato en protracción.",
      "Sensación de quemazón en el costado de la parrilla costal."
    ],
    commonMistakes: [
      { mistake: "Empujar con la trampa o encogiendo hombros", correction: "Aisla la protracción escapular; el brazo se mantiene extendido." }
    ],
    preMobility: ["Movilidad escapular activa"],
    postStretching: ["Estiramiento lateral de serrato"],
    progressions: ["Más repeticiones o sostén isométrico"],
    regressions: ["Proyección escapular en pared"],
    defaultTempo: "2-1-0-1",
    defaultRir: 2
  },
  {
    id: "seated-cable-row",
    name: "Seated Cable Row (Neutral Grip)",
    nameEs: "Remo en Polea Baja (Agarre Neutro)",
    category: "pull",
    primaryMuscles: ["lats", "upper_back"],
    secondaryMuscles: ["biceps", "rear_delts"],
    equipment: "cable",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Remo sentado con agarre neutro enfocado en la espalda media y el grosor del dorsal.",
    setupCues: [
      "Sentado, pies firmes y torso estable.",
      "Empuñadura neutra hacia el core."
    ],
    executionCues: [
      "Tira hacia la parte media del abdomen contrayendo la espalda.",
      "Regresa con estiramiento controlado sin perder la postura."
    ],
    commonMistakes: [
      { mistake: "Balancear el torso usando inercia", correction: "Peso que permita rango completo sin rebote." }
    ],
    preMobility: ["Retracción escapular con banda"],
    postStretching: ["Estiramiento de dorsal"],
    progressions: ["Más carga controlada"],
    regressions: ["Remo en polea con menos peso"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "lat-pushdown",
    name: "Lat Pushdown",
    nameEs: "Lat Pushdown (Brazo Estirado)",
    category: "pull",
    primaryMuscles: ["lats"],
    secondaryMuscles: ["triceps", "rear_delts"],
    equipment: "cable",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Empuje con el brazo estirado en polea alta: estiramiento del dorsal al subir y depresión escapular al bajar.",
    setupCues: [
      "Polea alta, brazo extendido agarrando la barra.",
      "Torso ligeramente inclinado."
    ],
    executionCues: [
      "Descendé el brazo hacia el muslo llevando el dorsal abajo.",
      "Soltá de arriba con estiramiento controlado."
    ],
    commonMistakes: [
      { mistake: "Flexionar el codo convirtiéndolo en tríceps", correction: "Mantén el codo fijo: mueve el hombro, no la articulación del codo." }
    ],
    preMobility: ["Dislocaciones con banda"],
    postStretching: ["Estiramiento del dorsal"],
    progressions: ["Pausa en contracción"],
    regressions: ["Lat pushdown con banda"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "rear-delt-fly-machine",
    name: "Rear Delt Fly (Pec Deck Reverse)",
    nameEs: "Apertura Posterior (Pec Deck Reverso)",
    category: "pull",
    primaryMuscles: ["rear_delts"],
    secondaryMuscles: ["traps", "upper_back"],
    equipment: "machine",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Aislamiento del deltoides posterior con contracción de la espalda alta y buena postura escapular.",
    setupCues: [
      "Sentado de frente a la máquina de pec deck.",
      "Asas a la altura del pecho con codos ligeramente flexionados."
    ],
    executionCues: [
      "Abre los brazos contrayendo el deltoides posterior.",
      "Retorno controlado sin descargar todo el peso."
    ],
    commonMistakes: [
      { mistake: "Encoger hombros al contraer", correction: "Mantén escápulas estabilizadas: la tensión vive en el deltoides posterior." }
    ],
    preMobility: ["Rotaciones externas con banda"],
    postStretching: ["Estiramiento cruzado del hombro"],
    progressions: ["Más repeticiones o pausa en contracción"],
    regressions: ["Rear delt fly con banda ligera"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    nameEs: "Sentadilla Búlgara",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "calves"],
    equipment: "dumbbell",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Sentadilla búlgara unilateral con énfasis en profundidad y equilibrio: glúteos y cuádriceps en estiramiento.",
    setupCues: [
      "Pie trasero elevado en banco, pie delantero adelante.",
      "Torso erguido para cargar el cuádriceps y glúteo."
    ],
    executionCues: [
      "Desciende por debajo de la paralela controlando.",
      "Empuja con el pie delantero."
    ],
    commonMistakes: [
      { mistake: "Perder el equilibrio o acortar el rango", correction: "Reducé peso y usá un punto de apoyo: el rango profundo importa más que la carga." }
    ],
    preMobility: ["Movilidad de cadera"],
    postStretching: ["Estiramiento del flexor de cadera"],
    progressions: ["Mancuernas más pesadas"],
    regressions: ["Split squat estático sin elevación"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "box-jump",
    name: "Box Jumps",
    nameEs: "Saltos al Cajón (Box Jumps)",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["calves", "hamstrings"],
    equipment: "bodyweight",
    resistanceProfile: "linear",
    lengthTensionDescription: "Potencia explosiva de la cadena posterior y de la cadera: desarrolla la velocidad de producción de fuerza.",
    setupCues: [
      "De pie frente al cajón, salto con extensión triple.",
      "Aterrizaje suave en cuclillas controlada."
    ],
    executionCues: [
      "Explosión máxima en cada repetición.",
      "Baja del cajón sin dejarse caer."
    ],
    commonMistakes: [
      { mistake: "Saltar a un cajón demasiado alto con técnica perdida", correction: "Elevación que permita aterrizaje silencioso y controlado." }
    ],
    preMobility: ["Movilidad de tobillos y cadera"],
    postStretching: ["Estiramiento de isquiotibiales"],
    progressions: ["Cajón más alto o saltos laterales"],
    regressions: ["Step-ups explosivos"],
    defaultTempo: "Explosivo",
    defaultRir: 2,
    executionMode: "explosive"
  },
  {
    id: "handstand-hold",
    name: "Handstand Hold (Against Wall)",
    nameEs: "Parada de Manos (Contra Pared)",
    category: "core",
    primaryMuscles: ["front_delts", "traps"],
    secondaryMuscles: ["abs", "forearms", "upper_back"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Isometría de estabilidad de hombros en posición invertida: gran activador del core y del manguito.",
    setupCues: [
      "Colócate de espaldas o de frente a la pared apoyando los pies.",
      "Manos bajo los hombros, brazos extendidos y cuerpo alineado."
    ],
    executionCues: [
      "Empuja el suelo hacia abajo y sostén 30-60s.",
      "Aprieta glúteos y abdomen manteniendo la línea dura."
    ],
    commonMistakes: [
      { mistake: "Arquear demasiado la lumbar", correction: "Aprieta glúteos y estira el cuerpo desde los omóplatos." }
    ],
    preMobility: ["Muñecas fuera de carga y rol de hombro"],
    postStretching: ["Decompresión de hombros en hang"],
    progressions: ["Segundos extra o parada libre"],
    regressions: ["Pike hold (pica estática)"],
    defaultTempo: "Sostén isométrico",
    defaultRir: 2,
    executionMode: "time"
  },
  {
    id: "l-sit-hold",
    name: "L-Sit Hold (Parallels)",
    nameEs: "L-Sit Hold (Sostén en L)",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["quads", "front_delts", "lats"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Sostén en suspensión con piernas paralelas: compresión abdominal e isometría de tríceps y hombros.",
    setupCues: [
      "Apoya manos en las paralelas o entre dos sillas.",
      "Empuja hacia abajo y eleva el peso del cuerpo."
    ],
    executionCues: [
      "Extiende las piernas en paralelo al suelo.",
      "Mantén el abdomen contraído sin dejar caer la pelvis."
    ],
    commonMistakes: [
      { mistake: "Redondear los hombros por fatiga", correction: "Menos duración pero con hombros activados y pelvis alta." }
    ],
    preMobility: ["Calentamiento de muñecas"],
    postStretching: ["Hanging decompresión"],
    progressions: ["Más segundos o piernas extendidas"],
    regressions: ["Tuck L-sit (rodillas juntas)"],
    defaultTempo: "Sostén isométrico",
    defaultRir: 2,
    executionMode: "time"
  },
  {
    id: "windshield-wipers",
    name: "Hanging Windshield Wipers",
    nameEs: "Limpiabrisas Colgado (Windshield Wipers)",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["lats", "lower_back"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Torsión controlada desde la suspensión: movilidad y fuerza oblicua con control total de la columna.",
    setupCues: [
      "Colgado de la barra, piernas elevadas en la vertical.",
      "Controla la pelvis para proteger la lumbar."
    ],
    executionCues: [
      "Desciende las piernas de lado a lado con control.",
      "Mantén el torso estable mientras rotan las caderas."
    ],
    commonMistakes: [
      { mistake: "Balanceo descontrolado", correction: "Movimiento lento y corto: la tensión vive en el abdomen, no en el impulso." }
    ],
    preMobility: ["Movilidad de cadera y columna"],
    postStretching: ["Child pose"],
    progressions: ["Rango mayor o peso en tobillos"],
    regressions: ["Windshield wipers de rodillas"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1
  },
  {
    id: "dragon-flag",
    name: "Dragon Flags",
    nameEs: "Dragon Flags",
    category: "core",
    primaryMuscles: ["abs"],
    secondaryMuscles: ["lats", "lower_back", "rear_delts"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Control total del core en extensión: la máxima prueba de estabilidad del tronco y la cadena anterior.",
    setupCues: [
      "Agarrándote a un banco o poste detrás de la cabeza.",
      "Cuerpo rígido en línea recta al elevar."
    ],
    executionCues: [
      "Eleva el cuerpo recto controlando la bajada.",
      "Descenso lento sin arquear la lumbar."
    ],
    commonMistakes: [
      { mistake: "Arquear la zona lumbar por falta de rigidez", correction: "Aprieta glúteos y abdomen; reduce el rango si pierde la línea." }
    ],
    preMobility: ["Activación de core y cadera"],
    postStretching: ["Estiramiento de flexores"],
    progressions: ["Más rango o peso en tobillos"],
    regressions: ["Dragon flag de rodillas (negative only)"],
    defaultTempo: "3-0-2-0",
    defaultRir: 1
  },
  {
    id: "explosive-step-up",
    name: "Explosive Step-Ups",
    nameEs: "Steps Explosivos / Sentadilla con Salto",
    category: "legs",
    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["calves", "hamstrings"],
    equipment: "bodyweight",
    resistanceProfile: "linear",
    lengthTensionDescription: "Saltos en escalón o sentadilla con salto explosivo: potencia de piernas con poco estrés axial.",
    setupCues: [
      "De pie ante el escalón con los pies a la anchura del hombro.",
      "Caderas bajas en posición de salto."
    ],
    executionCues: [
      "Explota hacia arriba extendiendo cadera, rodilla y tobillo.",
      "Aterriza suave y continúa el movimiento."
    ],
    commonMistakes: [
      { mistake: "Aterrizar con la pelvis hundida", correction: "Controla el aterrizaje con las rodillas estables y el pecho alto." }
    ],
    preMobility: ["Movilidad de tobillos"],
    postStretching: ["Estiramiento de cuádriceps"],
    progressions: ["Salto más alto o con carga ligera"],
    regressions: ["Step-up controlado (sin salto)"],
    defaultTempo: "Explosivo",
    defaultRir: 2,
    executionMode: "explosive"
  },
  {
    id: "pike-push-up",
    name: "Pike Push-Ups",
    nameEs: "Pike Push-Ups (Flexión en Pica)",
    category: "push",
    primaryMuscles: ["front_delts", "traps"],
    secondaryMuscles: ["triceps", "chest"],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Flexión en pica: sobrecarga del deltoides anterior en posición erguida, puente hacia las flexiones de pino.",
    setupCues: [
      "Caderas altas en forma de V invertida (pica).",
      "Cabeza baja hacia el suelo entre las manos."
    ],
    executionCues: [
      "Flexiona los codos descendiendo la cabeza.",
      "Empuja hacia arriba recuperando la pica."
    ],
    commonMistakes: [
      { mistake: "Abrir demasiado los codos", correction: "Codos cerca del torso para centrar el deltoides anterior." }
    ],
    preMobility: ["Movilidad de hombros"],
    postStretching: ["Estiramiento de hombros"],
    progressions: ["Pies elevados y mayor profundidad"],
    regressions: ["Pike push-up con rodillas flexionadas"],
    defaultTempo: "3-0-1-0",
    defaultRir: 1
  },
  {
    id: "seated-calf-raise",
    name: "Seated Calf Raise",
    nameEs: "Elevación de Gemelos Sentado",
    category: "legs",
    primaryMuscles: ["calves"],
    secondaryMuscles: [],
    equipment: "machine",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Gemelo sóleo en posición sentado: asegura el segundo estímulo semanal de pantorrilla con énfasis en el estiramiento profundo.",
    setupCues: [
      "Sentado en la máquina con las puntas en la plataforma.",
      "Rodillas flexionadas a 90°."
    ],
    executionCues: [
      "Desciende hasta el estiramiento máximo.",
      "Empuja hasta el bloqueo de puntas con pausa de 2s."
    ],
    commonMistakes: [
      { mistake: "Movimiento corto sin estiramiento", correction: "Pausa 2s abajo en el estiramiento para maximizar la tensión." }
    ],
    preMobility: ["Movilidad de tobillo"],
    postStretching: ["Estiramiento de gemelo contra pared"],
    progressions: ["Más carga o pausa más larga"],
    regressions: ["Gemelo sentado con barras o cuerpo libre"],
    defaultTempo: "3-2-1-0",
    defaultRir: 1
  },
  {
    id: "weighted-chin-up",
    name: "Weighted Chin-Ups",
    nameEs: "Dominadas Lastradas",
    category: "pull",
    primaryMuscles: ["lats", "biceps"],
    secondaryMuscles: ["upper_back", "forearms"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Dominada con agarre supino y extra de carga lastrada: el ejercicio rey para ensanchar la espalda en V.",
    setupCues: [
      "Agarre supino (palmas hacia ti) a anchura de hombros.",
      "Cuelga completamente abajo con estiramiento del dorsal."
    ],
    executionCues: [
      "Tira llevando el pecho a la barra.",
      "Baja con control hasta colgar totalmente cada repetición."
    ],
    commonMistakes: [
      { mistake: "Medio rango sin colgar abajo", correction: "Cuelga a fondo en cada repetición: de ahí la tensión del dorsal." }
    ],
    preMobility: ["Movilidad escapular"],
    postStretching: ["Hanging stretch del dorsal"],
    progressions: ["Más peso o pausa abajo"],
    regressions: ["Dominadas asistidas o negativas"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "inverted-row",
    name: "Inverted Rows",
    nameEs: "Remo Invertido",
    category: "pull",
    primaryMuscles: ["upper_back", "lats"],
    secondaryMuscles: ["biceps", "rear_delts"],
    equipment: "bodyweight",
    resistanceProfile: "lengthened",
    lengthTensionDescription: "Remo con el cuerpo horizontal bajo una barra: compromiso de core y espalda con gran estiramiento en tensión.",
    setupCues: [
      "Bajo una barra fija, cuerpo rígido en línea recta.",
      "Agarre neutro/supino con talones en el suelo."
    ],
    executionCues: [
      "Tira del pecho hacia la barra retrayendo escápulas.",
      "Baja controlado sin dejar caer la cadera."
    ],
    commonMistakes: [
      { mistake: "Hundir la cadera o balancearse", correction: "Mantén el cuerpo rígido: trabaja espalda y core a la vez." }
    ],
    preMobility: ["Retracción escapular"],
    postStretching: ["Estiramiento de dorsal"],
    progressions: ["Pies elevados o peso extra"],
    regressions: ["Remo invertido con rodillas flexionadas"],
    defaultTempo: "3-1-1-0",
    defaultRir: 1
  },
  {
    id: "dumbbell-rear-delt-fly",
    name: "Rear Delt Fly (Dumbbells)",
    nameEs: "Apertura Posterior con Mancuernas",
    category: "pull",
    primaryMuscles: ["rear_delts"],
    secondaryMuscles: ["traps", "upper_back"],
    equipment: "dumbbell",
    resistanceProfile: "shortened",
    lengthTensionDescription: "Apertura posterior con mancuernas en bisagra: contracción del deltoides posterior con movimiento controlado.",
    setupCues: [
      "Inclinado con torso paralelo o ligeramente por encima.",
      "Codos levemente flexionados todo el recorrido."
    ],
    executionCues: [
      "Abre los brazos hacia los lados contrayendo el deltoides posterior.",
      "Regresa controlado sin descargar el peso."
    ],
    commonMistakes: [
      { mistake: "Recargar en la trampa trapecio", correction: "Estabiliza escápulas y pivota desde el hombro." }
    ],
    preMobility: ["Rotaciones externas con banda"],
    postStretching: ["Estiramiento cruzado del hombro"],
    progressions: ["Pausa en contracción"],
    regressions: ["Rear delt fly con banda"],
    defaultTempo: "3-0-1-1",
    defaultRir: 1
  },
  {
    id: "superman-hold",
    name: "Superman Holds",
    nameEs: "Superman Hold (Fuerza Lumbar)",
    category: "core",
    primaryMuscles: ["lower_back", "glutes"],
    secondaryMuscles: ["upper_back", "hamstrings"],
    equipment: "bodyweight",
    resistanceProfile: "mid_range",
    lengthTensionDescription: "Harness isométrico de la zona lumbar: fortalece la cadena posterior media para proteger la columna.",
    setupCues: [
      "Tumbado boca abajo con brazos extendidos.",
      "Eleva piernas y torso a la vez."
    ],
    executionCues: [
      "Sostén la posición superior apretando glúteos y lumbar.",
      "Baja controlado."
    ],
    commonMistakes: [
      { mistake: "Cervical en hiperextensión", correction: "Mantén la mirada al suelo con el cuello neutro." }
    ],
    preMobility: ["Activación de glúteo y core"],
    postStretching: ["Child pose"],
    progressions: ["Más duración o peso en manos"],
    regressions: ["Superman de piernas o torso por separado"],
    defaultTempo: "Sostén isométrico",
    defaultRir: 2,
    executionMode: "time"
  }
];
