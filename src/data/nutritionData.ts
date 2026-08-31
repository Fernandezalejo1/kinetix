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
};

export const NUTRITION_GOAL_KEYS = Object.keys(NUTRITION_GOALS) as NutritionGoal[];

// ---------------------------------------------------------------------------
// Perfil personal → metabolismo exacto (Mifflin-St Jeor) + factor de actividad
// ---------------------------------------------------------------------------
// Default adaptado al usuario: trabajo SEDENTARIO en PC de 17:00 a 02:00 con
// objetivo de déficit (-15%). El perfil es editable en "Mi Perfil" (Nutrición).
export const DEFAULT_NUTRITION_PROFILE: NutritionProfile = {
  age: 28,
  heightCm: 175,
  sex: "masculino",
  activityLevel: "sedentario",
  workStart: "17:00",
  workEnd: "02:00",
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

export const QUICK_MEALS: QuickMealPreset[] = [
  { name: "Batido Whey + Plátano + Cacahuete", category: "pre_post", cal: 480, pro: 42, carb: 50, fat: 12, fiber: 6, mpsQuality: "Alta" },
  { name: "Pollo + Boniato + Espárragos", category: "comida", cal: 620, pro: 54, carb: 68, fat: 8, fiber: 8, mpsQuality: "Suficiente" },
  { name: "Salmón + Arroz + Aguacate", category: "cena", cal: 740, pro: 48, carb: 62, fat: 26, fiber: 6, mpsQuality: "Suficiente" },
  { name: "Avena + Huevos + Fruta", category: "desayuno", cal: 520, pro: 34, carb: 62, fat: 15, fiber: 8, mpsQuality: "Suficiente" },
  { name: "Yogur Griego + Granola + Frutos Rojos", category: "desayuno", cal: 420, pro: 32, carb: 48, fat: 10, fiber: 5, mpsQuality: "Alta" },
  { name: "Bife Magro + Papa + Ensalada", category: "comida", cal: 680, pro: 52, carb: 70, fat: 18, fiber: 7, mpsQuality: "Suficiente" },
  { name: "Tostada Integral + Atún + Palta", category: "snack", cal: 460, pro: 36, carb: 40, fat: 18, fiber: 6, mpsQuality: "Suficiente" },
  { name: "Pechuga + Quinoa + Verduras al Wok", category: "comida", cal: 580, pro: 50, carb: 65, fat: 12, fiber: 9, mpsQuality: "Suficiente" },
  { name: "Cottage + Frutos Secos + Miel", category: "snack", cal: 450, pro: 30, carb: 35, fat: 22, fiber: 4, mpsQuality: "Suficiente" },
  { name: "Banana + Pan con Miel + Whey", category: "pre_post", cal: 420, pro: 28, carb: 72, fat: 4, fiber: 3, mpsQuality: "Alta" },
  { name: "Pescado Blanco + Ensalada + Aceite de Oliva", category: "cena", cal: 460, pro: 44, carb: 18, fat: 26, fiber: 5, mpsQuality: "Suficiente" },
  { name: "Requesón + Arroz Integral + Huevo", category: "snack", cal: 560, pro: 42, carb: 60, fat: 16, fiber: 6, mpsQuality: "Alta" },
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