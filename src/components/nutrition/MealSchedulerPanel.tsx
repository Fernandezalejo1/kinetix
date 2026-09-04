import React, { useState } from "react";
import {
  Moon,
  Sun,
  Flame,
  Plus,
  Zap,
  Utensils,
  CheckCircle2,
  Droplets,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { MealItem } from "../../types";

/** La app es 100% KETO: los dos horarios (nocturno/diurno) usan comidas
 *  cetogénicas. Solo cambia el timing, nunca los macros base. */
type ScheduleType = "nocturno" | "normal";

interface ScheduledMeal {
  time: string;
  name: string;
  foods: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  preWorkout?: boolean;
}

// Horario NOCTURNO KETO (despierta 10:00, trabaja/entrena de noche):
//   10:30 Pre-Entreno · 13:00 Almuerzo (post-gym) · 17:00 Merienda (pre-trabajo)
//   21:00 Cena (trabajando) · 00:00 Síntesis (comida nocturna)
const NIGHT_SCHEDULE: ScheduledMeal[] = [
  {
    time: "10:30",
    name: "Pre-Entreno · Despertar",
    foods: "Café con crema + whey + mantequilla de maní (grasa primero, nada de azúcar)",
    calories: 400,
    protein: 30,
    carbs: 8,
    fats: 28,
    preWorkout: true,
  },
  {
    time: "13:00",
    name: "Almuerzo · Post-Gym",
    foods: "Carne picada/cerdo + palta + espinaca + aceite de oliva",
    calories: 700,
    protein: 50,
    carbs: 10,
    fats: 52,
  },
  {
    time: "17:00",
    name: "Merienda · Pre-Trabajo",
    foods: "Queso + almendras + aceitunas (grasa de calidad, llenadora)",
    calories: 450,
    protein: 22,
    carbs: 8,
    fats: 38,
  },
  {
    time: "21:00",
    name: "Cena · En el Trabajo",
    foods: "Salmón/carne + brócoli + mantequilla (Omega-3 + saciedad)",
    calories: 600,
    protein: 44,
    carbs: 8,
    fats: 44,
  },
  {
    time: "00:00",
    name: "Última comida · Síntesis",
    foods: "Cottage + nueces + aceite de oliva (caseína nocturna)",
    calories: 350,
    protein: 30,
    carbs: 5,
    fats: 24,
  },
];

// Horario DIURNO KETO (despierta ~07:00, ritmo de día normal).
const NORMAL_SCHEDULE: ScheduledMeal[] = [
  {
    time: "08:00",
    name: "Desayuno",
    foods: "Omelette + palta + espinaca",
    calories: 520,
    protein: 34,
    carbs: 8,
    fats: 40,
  },
  {
    time: "11:00",
    name: "Media mañana",
    foods: "Yogur griego natural + nueces + cacao",
    calories: 300,
    protein: 20,
    carbs: 7,
    fats: 22,
  },
  {
    time: "14:00",
    name: "Almuerzo",
    foods: "Bife + huevo + queso + ensalada",
    calories: 690,
    protein: 52,
    carbs: 6,
    fats: 50,
  },
  {
    time: "17:00",
    name: "Pre-Entreno · Combustible",
    foods: "Whey + crema + café (grasa rápida, nada de azúcar)",
    calories: 340,
    protein: 30,
    carbs: 8,
    fats: 22,
    preWorkout: true,
  },
  {
    time: "19:00",
    name: "Post-Entreno · Recuperación",
    foods: "Pollo + brócoli + queso + crema",
    calories: 500,
    protein: 44,
    carbs: 8,
    fats: 32,
  },
  {
    time: "22:00",
    name: "Cena",
    foods: "Pescado + palta + oliva + ensalada",
    calories: 450,
    protein: 40,
    carbs: 6,
    fats: 30,
  },
];

const SCHEDULES: Record<ScheduleType, { label: string; short: string; icon: React.ReactNode; meals: ScheduledMeal[] }> = {
  nocturno: {
    label: "Keto Nocturno (despierto 10:00 → trabajo de noche)",
    short: "Keto Noche",
    icon: <Moon className="w-4 h-4" />,
    meals: NIGHT_SCHEDULE,
  },
  normal: {
    label: "Keto Día (horario normal)",
    short: "Keto Día",
    icon: <Sun className="w-4 h-4" />,
    meals: NORMAL_SCHEDULE,
  },
};

export const MealSchedulerPanel: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleType>("normal");
  const { addMeal, updateMacroTargets, nutritionLog, nutritionProfile } = useWorkout();
  const { showToast } = useToast();

  const config = SCHEDULES[schedule];

  // Auto-escala el plan al objetivo personal de déficit (perfil Mifflin-St Jeor)
  const planTotal = config.meals.reduce((a, m) => a + m.calories, 0);
  const scale = nutritionLog.calorieTarget > 0 && planTotal > 0 ? nutritionLog.calorieTarget / planTotal : 1;
  const scaledMeals: ScheduledMeal[] = config.meals.map((m) => ({
    ...m,
    calories: Math.round(m.calories * scale),
    protein: Math.round(m.protein * scale),
    carbs: Math.round(m.carbs * scale),
    fats: Math.round(m.fats * scale),
  }));
  const totalCalories = scaledMeals.reduce((a, m) => a + m.calories, 0);
  const totalProtein = scaledMeals.reduce((a, m) => a + m.protein, 0);
  const totalCarbs = scaledMeals.reduce((a, m) => a + m.carbs, 0);
  const totalFats = scaledMeals.reduce((a, m) => a + m.fats, 0);

  const addScheduledMeal = (meal: ScheduledMeal) => {
    const item: MealItem = {
      id: `meal-sched-${Date.now()}-${meal.name.replace(/\s+/g, "-")}`,
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      dishName: `${meal.name} (${meal.time})`,
      description: `${meal.foods} · Plan ${config.short} · Escalado a tu déficit`,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      fiber: 5,
      mpsQuality: meal.preWorkout ? "Alta" : "Suficiente",
    };
    addMeal(item);
    showToast(`"${meal.name}" agregado al día`, "success");
  };

  const applyTargets = () => {
    updateMacroTargets({
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
    });
    showToast(`Plan ${config.short} aplicado a tu objetivo: ${totalCalories} kcal (déficit −${nutritionProfile.deficitPercent}%)`, "success");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <Utensils className="w-4 h-4 text-cyan-400" />
            Plan de Comidas Diario
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {totalCalories} kcal · P {totalProtein}g · C {totalCarbs}g · G {totalFats}g · Plan escalado a tu déficit (−{nutritionProfile.deficitPercent}%)
          </p>
        </div>
        <button
          onClick={applyTargets}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          Aplicar a objetivos
        </button>
      </div>

      {/* Schedule selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
        {(Object.keys(SCHEDULES) as ScheduleType[]).map((key) => {
          const s = SCHEDULES[key];
          const isActive = schedule === key;
          return (
            <button
              key={key}
              onClick={() => setSchedule(key)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {s.icon}
              {s.short}
            </button>
          );
        })}
      </div>

      {/* Schedule label + timing */}
      <div className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold ${schedule === "nocturno" ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300" : "bg-amber-950/30 border-amber-500/20 text-amber-300"}`}>
        {schedule === "nocturno" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        {config.label} · Entrenar con buen combustible antes de cada sesión
      </div>

      {/* Meal list */}
      <div className="space-y-2.5">
        {scaledMeals.map((meal) => {
          const pct = Math.round((meal.calories / totalCalories) * 100);
          return (
            <div
              key={`${schedule}-${meal.time}`}
              className={`p-4 rounded-2xl border transition-all ${
                meal.preWorkout
                  ? "bg-gradient-to-r from-amber-950/30 to-neutral-900 border-amber-500/30"
                  : "bg-neutral-900 border-neutral-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${meal.preWorkout ? "bg-amber-500/20 text-amber-300" : "bg-neutral-800 text-neutral-300"}`}>
                      {meal.time}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{meal.name}</h4>
                      {meal.preWorkout && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Zap className="w-3 h-3" />
                          Pre-entreno keto
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">{meal.foods}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] font-mono">
                      <span className="text-amber-400 font-bold">{meal.calories} kcal</span>
                      <span className="text-cyan-400">{meal.protein}g P</span>
                      <span className="text-purple-400">{meal.carbs}g C</span>
                      <span className="text-emerald-400">{meal.fats}g G</span>
                      <span className="text-neutral-600">({pct}% del día)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => addScheduledMeal(meal)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-cyan-600 text-neutral-300 hover:text-white text-[10px] font-bold border border-neutral-700 hover:border-cyan-500 transition-all shrink-0"
                  title="Agregar a comidas de hoy"
                >
                  <Plus className="w-3 h-3" />
                  Agregar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reference info */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 space-y-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-400" />
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Referencia del plan</h4>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Este plan ya está <strong className="text-white">escalado a tu objetivo de hoy ({nutritionLog.calorieTarget} kcal, déficit −{nutritionProfile.deficitPercent}%)</strong>{" "}
          para que entrenes con intensidad y a la vez reduzcas grasa. En tu turno {nutritionProfile.workStart}–{nutritionProfile.workEnd} comés dentro del rango laboral
          y mantenés la <strong className="text-cyan-300">proteína alta</strong> para preservar masa muscular. No dejes pasar más de 4–5h sin comer estando despierto,
          y la última comida hacela al menos 1h antes de dormir.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          Hidratación: repartí 2.5–3 L durante tus horas despiertas (incluida la madrugada) y moderá el agua 30 min antes de ir a dormir.
        </div>
      </div>
    </div>
  );
};