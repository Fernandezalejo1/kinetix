import { ActivityLevel, NutritionGoal, NutritionProfile } from "../types";

// Science-based macro multipliers per goal (relative to body weight in kg).
// - Protein: higher during cuts to retain muscle mass.
// - Calories: surplus for growth, deficit for fat loss, neutral for maintenance.
export const NUTRITION_GOALS: Record<
  NutritionGoal,
  {
    label: string;
    short: string;
    description: string;
    caloriePerKg: number;
    proteinPerKg: number;
    fatPerKg: number;
    accent: string;
    chipActive: string;
  }
> = {
  cut: {
    label: "Definición",
    short: "Déficit",
    description:
      "Déficit moderado (−10/15%): máxima retención de masa magra con proteína alta (2.4 g/kg) y volumen ajustado para seguir entrenando duro.",
    caloriePerKg: 26,
    proteinPerKg: 2.4,
    fatPerKg: 0.8,
    accent: "text-amber-300",
    chipActive: "bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-md shadow-amber-500/10",
  },
  maintenance: {
    label: "Mantenimiento",
    short: "Neutral",
    description:
      "Calorías de equilibrio: mantener masa y rendimiento sin ganar ni perder grasa. Ideal para periodos de entreno de alta intensidad.",
    caloriePerKg: 31,
    proteinPerKg: 2.0,
    fatPerKg: 0.9,
    accent: "text-emerald-300",
    chipActive: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-md shadow-emerald-500/10",
  },
  lean_bulk: {
    label: "Volumen Magro",
    short: "Lean Bulk",
    description:
      "Superávit suave (+5/8%): ganar músculo con grasa mínima. Optimiza la tasa de síntesis proteica sin acumular grasa corporal.",
    caloriePerKg: 34,
    proteinPerKg: 2.2,
    fatPerKg: 0.9,
    accent: "text-cyan-300",
    chipActive: "bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-md shadow-cyan-500/10",
  },
  bulk: {
    label: "Volumen Amplio",
    short: "Bulk",
    description:
      "Superávit agresivo (+10/15%): maximiza el crecimiento muscular y las ganancias de fuerza, aceptando algo de grasa extra.",
    caloriePerKg: 38,
    proteinPerKg: 2.0,
    fatPerKg: 1.0,
    accent: "text-purple-300",
    chipActive: "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-md shadow-purple-500/10",
  },
  keto: {
    label: "Keto / Cetogénica",
    short: "Keto",
    description:
      "Alta grasa, carbos muy bajos (<30 g) y proteína moderada: el cuerpo usa cuerpos cetónicos como combustible. Controla el apetito y es ideal para definición.",
    caloriePerKg: 26,
    proteinPerKg: 1.8,
    fatPerKg: 1.2,
    accent: "text-rose-300",
    chipActive: "bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-md shadow-rose-500/10",
  },
};

export const NUTRITION_GOAL_KEYS = ["keto"] as NutritionGoal[];

// ---------------------------------------------------------------------------
// Perfil personal → metabolismo exacto (Mifflin-St Jeor) + factor de actividad
// ---------------------------------------------------------------------------
// Valores por defecto GENÉRICOS (ejemplo neutral, editable en "Mi Perfil",
// pestaña Nutrición). Cada usuario ajusta los suyos: edad, altura, peso,
// género, nivel de actividad, horario laboral y % de déficit.
export const DEFAULT_NUTRITION_PROFILE: NutritionProfile = {
  age: 30,
  heightCm: 175,
  sex: "masculino",
  activityLevel: "moderado",
  workStart: "09:00",
  workEnd: "17:00",
  deficitPercent: 15,
};

export const ACTIVITY_FACTORS: Record<
  ActivityLevel,
  { label: string; short: string; factor: number; hint: string }
> = {
  sedentario: {
    label: "Sedentario — sentado en PC / escritorio",
    short: "Sedentario",
    factor: 1.2,
    hint: "Trabajo de escritorio + poca actividad diaria. Tu caso si estás 9h sentado en la PC.",
  },
  ligero: {
    label: "Ligero — 1–3 entrenos/semana",
    short: "Ligero",
    factor: 1.375,
    hint: "Entrenás 1–3 días por semana pero el resto del día es mayormente sentado.",
  },
  moderado: {
    label: "Moderado — 3–5 entrenos/semana",
    short: "Moderado",
    factor: 1.55,
    hint: "Entrenás 3–5 días por semana y tenés algo de actividad en el día.",
  },
};

// Ecuación Mifflin-St Jeor (kcal/día, metabolismo basal).
export const computeBMR = (profile: NutritionProfile, weightKg: number): number => {
  const sexConst = profile.sex === "femenino" ? -161 : 5;
  return Math.round(10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexConst);
};

// Gasto energético total: basal × factor de actividad.
export const computeTDEE = (profile: NutritionProfile, weightKg: number): number =>
  Math.round(computeBMR(profile, weightKg) * ACTIVITY_FACTORS[profile.activityLevel].factor);

// Calorías según objetivo sobre el TDEE (déficit usa el % del perfil).
export const computeGoalCalories = (
  tdee: number,
  goal: NutritionGoal,
  deficitPercent: number
): number => {
  switch (goal) {
    case "cut":
      return Math.round(tdee * (1 - deficitPercent / 100));
    case "keto":
      // Keto para definición: mismo déficit que "cut", pero con split alto en grasa.
      return Math.round(tdee * (1 - deficitPercent / 100));
    case "maintenance":
      return tdee;
    case "lean_bulk":
      return Math.round(tdee * 1.08);
    case "bulk":
      return Math.round(tdee * 1.12);
  }
};

// Objetivos de macros basados en el perfil (proteína conserva masa muscular en déficit).
export const computePersonalTargets = (
  weightKg: number,
  goal: NutritionGoal,
  profile: NutritionProfile
): { calories: number; protein: number; carbs: number; fats: number } => {
  const tdee = computeTDEE(profile, weightKg);
  const calories = computeGoalCalories(tdee, goal, profile.deficitPercent);

  // Keto: carbos mínimos fijos, proteína moderada y la GRASA llena el resto de calorías.
  if (goal === "keto") {
    const carbs = 25;
    const protein = Math.round(weightKg * NUTRITION_GOALS.keto.proteinPerKg);
    const fats = Math.max(40, Math.round((calories - protein * 4 - carbs * 4) / 9));
    return { calories, protein, carbs, fats };
  }

  const protein = Math.round(weightKg * NUTRITION_GOALS[goal].proteinPerKg);
  const fats = Math.round(weightKg * NUTRITION_GOALS[goal].fatPerKg);
  const carbs = Math.max(50, Math.round((calories - fats * 9 - protein * 4) / 4));
  return { calories, protein, carbs, fats };
};

// Quick meal presets grouped by meal window.
export type QuickMealCategory = "desayuno" | "comida" | "cena" | "snack" | "pre_post";

export interface QuickMealPreset {
  name: string;
  category: QuickMealCategory;
  cal: number;
  pro: number;
  carb: number;
  fat: number;
  fiber: number;
  mpsQuality: "Alta" | "Suficiente";
}

export const QUICK_MEAL_CATEGORIES: { id: QuickMealCategory | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "desayuno", label: "Desayuno" },
  { id: "comida", label: "Comida" },
  { id: "cena", label: "Cena" },
  { id: "snack", label: "Snack" },
  { id: "pre_post", label: "Pre / Post" },
];

// 100% KETO: todos los presets son bajos en carbos (≤12 g) y altos en grasa.
// La app es cetogénica; no se ofrecen platos con arroz/papa/avena/pan/fruta/miel.
export const QUICK_MEALS: QuickMealPreset[] = [
  { name: "Omelette + Palta + Espinaca", category: "desayuno", cal: 520, pro: 34, carb: 8, fat: 40, fiber: 6, mpsQuality: "Suficiente" },
  { name: "Huevos Revueltos + Panceta + Palta", category: "desayuno", cal: 560, pro: 32, carb: 6, fat: 44, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Yogur Griego Natural + Nueces + Cacao", category: "desayuno", cal: 420, pro: 28, carb: 9, fat: 30, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Tortilla de Espinaca + Queso + Jamón", category: "desayuno", cal: 480, pro: 34, carb: 7, fat: 34, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Costillas de Cerdo + Brócoli en Mantequilla", category: "comida", cal: 720, pro: 52, carb: 10, fat: 52, fiber: 7, mpsQuality: "Suficiente" },
  { name: "Carne Picada + Palta + Huevo", category: "comida", cal: 680, pro: 48, carb: 9, fat: 50, fiber: 6, mpsQuality: "Suficiente" },
  { name: "Pollo + Mayonesa + Apio + Nueces", category: "comida", cal: 620, pro: 48, carb: 7, fat: 44, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Bife + Huevo Frito + Queso", category: "comida", cal: 690, pro: 52, carb: 4, fat: 52, fiber: 2, mpsQuality: "Suficiente" },
  { name: "Bondiola + Chucrut + Mostaza", category: "comida", cal: 590, pro: 46, carb: 6, fat: 42, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Salmón + Espárragos + Mantequilla", category: "cena", cal: 640, pro: 46, carb: 8, fat: 46, fiber: 6, mpsQuality: "Suficiente" },
  { name: "Pollo al Horno + Brócoli + Queso + Crema", category: "cena", cal: 640, pro: 50, carb: 9, fat: 44, fiber: 5, mpsQuality: "Alta" },
  { name: "Atún + Huevo + Aceite de Oliva + Lechuga", category: "cena", cal: 480, pro: 42, carb: 5, fat: 32, fiber: 3, mpsQuality: "Suficiente" },
  { name: "Camarones al Ajillo + Palta", category: "cena", cal: 460, pro: 38, carb: 6, fat: 30, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Matambre + Ensalada + Oliva", category: "cena", cal: 580, pro: 48, carb: 5, fat: 40, fiber: 3, mpsQuality: "Suficiente" },
  { name: "Almendras + Queso + Aceitunas", category: "snack", cal: 380, pro: 18, carb: 6, fat: 34, fiber: 5, mpsQuality: "Suficiente" },
  { name: "Fiambre + Queso + Aceitunas", category: "snack", cal: 400, pro: 24, carb: 4, fat: 32, fiber: 2, mpsQuality: "Suficiente" },
  { name: "Whey + Mantequilla de Maní + Leche de Almendras", category: "pre_post", cal: 340, pro: 32, carb: 8, fat: 22, fiber: 3, mpsQuality: "Alta" },
  { name: "Whey + Crema + Frutillas", category: "pre_post", cal: 320, pro: 30, carb: 9, fat: 18, fiber: 3, mpsQuality: "Alta" },
];

// Evidence-based supplement guide (educational reference, 100% offline).
export interface SupplementInfo {
  name: string;
  dose: string;
  timing: string;
  evidence: string;
  level: string;
}

export const SUPPLEMENTS: SupplementInfo[] = [
  {
    name: "Creatina Monohidrato",
    dose: "3–5 g/día",
    timing: "Cualquier momento, todos los días",
    evidence: "Aumenta fosfocreatina muscular, fuerza y masa magra (+1–2% rendimiento) en meta-análisis. El mejor suplemento con evidencia sólida.",
    level: "Muy sólida",
  },
  {
    name: "Proteína Whey",
    dose: "0.4–0.8 g/kg post-entreno",
    timing: "Dentro de 1–2h de la sesión (o distribuida todo el día)",
    evidence: "Conveniencia para alcanzar los 2 g/kg diarios sin exceder calorías. La ventana post-entreno es útil pero lo que importa es el total diario.",
    level: "Sólida",
  },
  {
    name: "Cafeína",
    dose: "3–6 mg/kg",
    timing: "30–60 min antes de entrenar",
    evidence: "Reduce la percepción de esfuerzo, aumenta repeticiones con cargas altas y el rendimiento anaeróbico.",
    level: "Sólida",
  },
  {
    name: "Omega-3 (EPA/DHA)",
    dose: "2–3 g/día de EPA+DHA",
    timing: "Con comidas que contengan grasa",
    evidence: "Salud articular, cardiovascular e inflamación sistémica. No construye músculo por sí solo.",
    level: "Moderada",
  },
  {
    name: "Vitamina D3",
    dose: "800–2000 UI/día (si déficit)",
    timing: "Con una comida con grasa",
    evidence: "Salud ósea e inmunidad. Clave si entrenás indoors o tenés poca exposición solar.",
    level: "Moderada",
  },
  {
    name: "Beta-Alanina",
    dose: "3–5 g/día",
    timing: "20–30 min pre-entreno o repartida",
    evidence: "Amortigua la acidosis en rangos de 8–15 reps (soporte a series altas). Posible hormigueo (parestesia), es normal e inofensivo.",
    level: "Moderada",
  },
];

// Water goal (35 ml/kg of bodyweight, minimum 2.5 L) and fiber guideline (14 g per 1000 kcal).
export const computeWaterTarget = (weightKg: number | null, fallback = 79): number =>
  Math.max(2500, Math.round((weightKg ?? fallback) * 35 / 1000) * 1000);

export const computeFiberTarget = (calories: number): number =>
  Math.max(25, Math.round((calories / 1000) * 14));