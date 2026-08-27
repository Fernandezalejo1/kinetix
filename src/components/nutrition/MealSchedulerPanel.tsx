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

const NIGHT_SCHEDULE: ScheduledMeal[] = [
  {
    time: "17:00",
    name: "Comida 1 · Apertura",
    foods: "Arroz + pollo + verduras",
    calories: 650,
    protein: 45,
    carbs: 85,
    fats: 12,
  },
  {
    time: "19:00",
    name: "Pre-Entreno · Combustible",
    foods: "Banana + pan con miel + whey (carbos rápidos)",
    calories: 400,
    protein: 25,
    carbs: 70,
    fats: 3,
    preWorkout: true,
  },
  {
    time: "21:00",
    name: "Post-Entreno · Recuperación",
    foods: "Boniato + pechuga + verduras",
    calories: 550,
    protein: 40,
    carbs: 80,
    fats: 8,
  },
  {
    time: "23:30",
    name: "Comida 4 · Cena principal",
    foods: "Carne magra + arroz integral + aguacate",
    calories: 650,
    protein: 45,
    carbs: 75,
    fats: 18,
  },
  {
    time: "01:30",
    name: "Última comida · Síntesis",
    foods: "Pescado blanco + ensalada + aceite de oliva",
    calories: 550,
    protein: 42,
    carbs: 20,
    fats: 30,
  },
];

const NORMAL_SCHEDULE: ScheduledMeal[] = [
  {
    time: "08:00",
    name: "Desayuno",
    foods: "Avena + huevos + fruta",
    calories: 500,
    protein: 32,
    carbs: 60,
    fats: 14,
  },
  {
    time: "11:00",
    name: "Media mañana",
    foods: "Yogur griego + frutos secos",
    calories: 300,
    protein: 22,
    carbs: 18,
    fats: 16,
  },
  {
    time: "14:00",
    name: "Almuerzo",
    foods: "Arroz + carne magra + verduras",
    calories: 700,
    protein: 48,
    carbs: 90,
    fats: 14,
  },
  {
    time: "17:00",
    name: "Pre-Entreno · Combustible",
    foods: "Banana + tostadas con miel + café (carbos rápidos)",
    calories: 400,
    protein: 20,
    carbs: 75,
    fats: 3,
    preWorkout: true,
  },
  {
    time: "19:00",
    name: "Post-Entreno · Recuperación",
    foods: "Papa + pollo + verduras",
    calories: 500,
    protein: 38,
    carbs: 75,
    fats: 7,
  },
  {
    time: "22:00",
    name: "Cena",
    foods: "Pechuga + ensalada + aceite de oliva",
    calories: 400,
    protein: 38,
    carbs: 15,
    fats: 20,
  },
];

const SCHEDULES: Record<ScheduleType, { label: string; short: string; icon: React.ReactNode; meals: ScheduledMeal[] }> = {
  nocturno: {
    label: "Horario Nocturno (17:00 – 02:00)",
    short: "Nocturno",
    icon: <Moon className="w-4 h-4" />,
    meals: NIGHT_SCHEDULE,
  },
  normal: {
    label: "Horario Normal (día)",
    short: "Normal",
    icon: <Sun className="w-4 h-4" />,
    meals: NORMAL_SCHEDULE,
  },
};

export const MealSchedulerPanel: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleType>("nocturno");
  const { addMeal, updateMacroTargets } = useWorkout();
  const { showToast } = useToast();

  const config = SCHEDULES[schedule];
  const totalCalories = config.meals.reduce((a, m) => a + m.calories, 0);
  const totalProtein = config.meals.reduce((a, m) => a + m.protein, 0);
  const totalCarbs = config.meals.reduce((a, m) => a + m.carbs, 0);
  const totalFats = config.meals.reduce((a, m) => a + m.fats, 0);

  const addScheduledMeal = (meal: ScheduledMeal) => {
    const item: MealItem = {
      id: `meal-sched-${Date.now()}-${meal.name.replace(/\s+/g, "-")}`,
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      dishName: `${meal.name} (${meal.time})`,
      description: `${meal.foods} · Plan ${config.short}`,
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
    showToast(`Objetivos del plan ${config.short} aplicados (${totalCalories} kcal)`, "success");
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
            {totalCalories} kcal · P {totalProtein}g · C {totalCarbs}g · G {totalFats}g · Déficit moderado para perder grasa entrenando fuerte
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
        {config.meals.map((meal) => {
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
                          Carbos pre-entreno
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
          Entre <strong className="text-white">2500–2800 kcal</strong> para entrenar con intensidad y a la vez generar un
          déficit suave que reduzca grasa. La proteína (~1.8–2 g/kg) preserva masa muscular, y los{" "}
          <strong className="text-amber-300">carbos concentrados antes de entrenar</strong> garantizan rendimiento en el gimnasio.
          Ajusta las porciones según tu peso y progreso semanal.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
          Hidratación: 2.5–3 L de agua al día te ayuda con el déficit y el rendimiento.
        </div>
      </div>
    </div>
  );
};