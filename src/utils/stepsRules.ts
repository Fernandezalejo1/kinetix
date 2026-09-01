// =============================================================
// KINETIX — Motor de reglas determinista para ajuste por pasos.
// 100% reglas. Sin IA. Predecible y comprobable.
// =============================================================

export interface BaseTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface StepRuleConfig {
  /** Meta diaria de pasos (default 10000). */
  stepGoal: number;
  /** ¿El usuario entrenó fuerza hoy? Protege las calorías. */
  trainedToday: boolean;
  /** ¿Ya pasó el turno de comida principal? (afecta a qué comidas ajustar). */
  lunchPassed: boolean;
  /** Valencia extra: cargar para quemar grasa o mejorar rendimiento. */
  extra?: "none" | "cardio";
}

export interface StepAdjustment {
  /** Delta total a aplicar sobre el target (negativo = reducir). */
  caloriesDelta: number;
  proteinDelta: number;
  carbsDelta: number;
  fatsDelta: number;
  /** Nombre de la banda de pasos en la que cayó el usuario. */
  bandLabel: string;
  /** Mensaje humano que explica QUÉ se ajustó y POR QUÉ (regla). */
  message: string;
  /** Targets finales ya aplicados (con el delta). */
  adjusted: BaseTargets;
  /** Map: cuántas kcal quitar/agregar por comida restante. */
  mealDeltas: Record<string, number>;
}

// -------------------------------------------------------------
// Reglas de banda (tolera el objetivo por defecto, perdonando ±20%).
// -------------------------------------------------------------
const BANDS = [
  { label: "Muy poco activo",      max: 5000,  kcal: -250, carbsOnly: false },
  { label: "Poco activo",          max: 8000,  kcal: -150, carbsOnly: false },
  { label: "Objetivo cumplido",    max: 12000, kcal: 0,    carbsOnly: false },
  { label: "Muy activo",           max: Infinity, kcal: 150, carbsOnly: true },
] as const;

const FLOOR_FACTOR = 0.8; // nunca bajar del 80% de las calorías del objetivo.

// -------------------------------------------------------------
// Distribución de una pérdida/ganancia entre las comidas del día.
// Los nombres de comida se normalizan a ventanas: desayuno,
// almuerzo, merienda, cena. El desayuno NUNCA se toca.
// -------------------------------------------------------------
const MEAL_WEIGHTS: Record<string, number> = {
  desayuno: 0,
  almuerzo: 0.25,
  merienda: 0.25,
  cena: 0.5,
};

/** Detecta la ventana de una comida por su nombre/descripción. */
function mealWindow(name: string): string {
  const n = String(name || "").toLowerCase();
  if (n.includes("desayuno") || n.includes("breakfast") || n.includes("huevos") || n.includes("avena") || n.includes("tostada")) return "desayuno";
  if (n.includes("almuerzo") || n.includes("comida") || n.includes("lunch") || n.includes("arroz") || n.includes("fideos") || n.includes("pasta") || n.includes("pollo") || n.includes("carne") || n.includes("pescado") || n.includes("atun") || n.includes("ensalada completa")) return "almuerzo";
  if (n.includes("merienda") || n.includes("snack") || n.includes("tarde") || n.includes("yogur") || n.includes("batido") || n.includes("frutas")) return "merienda";
  if (n.includes("cena") || n.includes("dinner")) return "cena";
  // Por defecto asumimos merienda (lo más flexible).
  return "merienda";
}

const MEAL_WINDOWS: { window: string; fromHour: number; toHour: number }[] = [
  { window: "desayuno", fromHour: 0, toHour: 11 },
  { window: "almuerzo", fromHour: 11, toHour: 15 },
  { window: "merienda", fromHour: 15, toHour: 18.5 },
  { window: "cena", fromHour: 18.5, toHour: 24 },
];

/** Ventana por hora (HH:MM) cuando el nombre no alcanza. */
function windowByHour(time?: string): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h)) return null;
  const hour = h + (isNaN(m) ? 0 : m / 60);
  const w = MEAL_WINDOWS.find((x) => hour >= x.fromHour && hour < x.toHour);
  return w ? w.window : null;
}

/** Ventana de una comida: prioriza nombre > hora. */
function mealWindowOf(meal: { time?: string; dishName?: string; description?: string }): string {
  const byName = mealWindow(`${meal.dishName || ""} ${meal.description || ""}`);
  if (byName !== "merienda") return byName;
  const byHour = windowByHour(meal.time);
  return byHour ?? "merienda";
}

/**
 * Calcula el ajuste de la dieta según los pasos del día.
 * Reglas (en orden):
 *  1. Banda de pasos define un delta base de kcal.
 *  2. Si entrenó fuerza, la reducción se suaviza (protege masa muscular).
 *  3. La proteína NUNCA baja de su objetivo.
 *  4. Las kcal se mueven solo vía carbos y grasas.
 *  5. Nunca se baja del 80% del objetivo calórico (piso de seguridad).
 *  6. El desayuno nunca se toca; la reducción se reparte por peso entre
 *     almuerzo/merienda/cena. Si el almuerzo ya pasó, solo merienda+cena.
 */
export function computeStepAdjustment(
  steps: number,
  base: BaseTargets,
  cfg: StepRuleConfig
): StepAdjustment {
  const stepGoal = cfg.stepGoal > 0 ? cfg.stepGoal : 10000;

  // 1. Banda de pasos.
  const band = BANDS.find((b) => steps <= b.max) ?? BANDS[BANDS.length - 1];
  let caloriesDelta: number = band.kcal;

  // 2. Entrenó hoy → suaviza la reducción (protege el entrenamiento).
  if (cfg.trainedToday && caloriesDelta < 0) {
    caloriesDelta = Math.round(caloriesDelta * 0.5);
  }

  // 5. Piso de seguridad calórico.
  const floor = Math.round(base.calories * FLOOR_FACTOR);
  const reducedTotal = base.calories + caloriesDelta;
  if (reducedTotal < floor) {
    caloriesDelta = floor - base.calories;
  }

  // 4. Convertir kcal en macros. Solo carbos y grasas (proteína sagrada).
  // Distribuimos 70% carbos / 30% grasas del delta (peso de regulación).
  const carbsDelta = Math.round((caloriesDelta * 0.7) / 4);
  const fatsDelta = Math.round((caloriesDelta * 0.3) / 9);
  const checkCalories = carbsDelta * 4 + fatsDelta * 9;
  // Corrección fina para que la suma coincida con caloriesDelta.
  const remaining = caloriesDelta - checkCalories;
  const carbsAdjusted = carbsDelta + (remaining >= 0 ? Math.ceil(remaining / 4) : Math.floor(remaining / 4));

  // 6. Distribución por comidas.
  //    Si el almuerzo ya pasó, no se toca ni almuerzo ni desayuno.
  const skipLunch = cfg.lunchPassed;
  const availableWindowNames = skipLunch ? ["merienda", "cena"] : ["almuerzo", "merienda", "cena"];
  const weights = availableWindowNames
    .map((w) => ({ name: w, weight: MEAL_WEIGHTS[w] }))
    .filter((m) => m.weight > 0);
  const totalWeight = weights.reduce((s, m) => s + m.weight, 0) || 1;

  const mealDeltas: Record<string, number> = {};
  weights.forEach((m) => {
    mealDeltas[m.name] = Math.round((caloriesDelta * m.weight) / totalWeight);
  });

  // Reconciliación exacta con el total (por diferencias de redondeo).
  const allocated = Object.values(mealDeltas).reduce((s, v) => s + v, 0);
  const diff = caloriesDelta - allocated;
  if (diff !== 0 && weights.length > 0) {
    const biggest = weights.reduce((a, b) => (mealDeltas[b.name] > mealDeltas[a.name] ? b : a));
    mealDeltas[biggest.name] += diff;
  }

  // Mensaje humano explicando la regla aplicada.
  let message: string;
  if (caloriesDelta === 0) {
    message = `Estás dentro de tu rango de pasos (${steps.toLocaleString("es-AR")} de ${stepGoal.toLocaleString("es-AR")}). Se mantiene la dieta de definición.`;
  } else if (caloriesDelta < 0) {
    const reason = cfg.trainedToday
      ? "Entrenaste hoy, así que la reducción se suavizó para proteger tu masa muscular. "
      : "";
    message = `${reason}Caminaste ${steps.toLocaleString("es-AR")} pasos (${band.label.toLowerCase()}). Se reducen ${Math.abs(caloriesDelta)} kcal de las comidas restantes (solo carbos y grasas, la proteína se mantiene).`;
  } else {
    reason: {
      const extra = caloriesDelta > 0 ? " para reponer energía" : "";
      message = `Estás muy activo (${steps.toLocaleString("es-AR")} pasos). Se agregan ${caloriesDelta} kcal extra en carbos${extra} para rendir el resto del día.`;
    }
  }

  const adjusted: BaseTargets = {
    calories: base.calories + caloriesDelta,
    protein: base.protein + 0,
    carbs: Math.max(0, base.carbs + carbsAdjusted),
    fats: Math.max(0, base.fats + fatsDelta),
  };

  return {
    caloriesDelta,
    proteinDelta: 0,
    carbsDelta: carbsAdjusted,
    fatsDelta,
    bandLabel: band.label,
    message,
    adjusted,
    mealDeltas,
  };
}

/** Verifica si el almuerzo del día ya "pasó" según la hora actual y el horario. */
export function isLunchPassed(now: Date, workStart: string): boolean {
  const workHour = parseInt(workStart?.slice(0, 2) || "9", 10);
  const offset = workHour >= 15 ? 4 : 0; // turno nocturno → comer más tarde
  const lunchLimit = 14 + offset;
  return now.getHours() >= lunchLimit;
}

/** Verifica si el usuario YA registró su almuerzo/comida principal en el log de hoy. */
export function lunchAlreadyLogged(meals: { time?: string; dishName?: string; description?: string; calories: number }[]): boolean {
  return meals.some((m) => {
    const w = mealWindowOf(m);
    return (w === "almuerzo" || w === "cena") && m.calories > 0;
  });
}

/** Genera un mensaje corto para UI (badge) con el ajuste aplicado. */
export function stepBadge(adj: StepAdjustment): string {
  if (adj.caloriesDelta === 0) return "Dieta según objetivo";
  if (adj.caloriesDelta < 0) return `${adj.caloriesDelta} kcal de ajuste por pasos`;
  return `+${adj.caloriesDelta} kcal de ajuste por pasos`;
}