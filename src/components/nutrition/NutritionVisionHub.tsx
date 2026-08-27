import React, { useState } from "react";
import {
  Plus,
  Flame,
  Trash2,
  Dna,
  Zap,
  Sparkles,
  Edit3,
  Scale,
  X,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { MealItem } from "../../types";
import { MealSchedulerPanel } from "./MealSchedulerPanel";

export const NutritionVisionHub: React.FC = () => {
  const {
    nutritionLog,
    bodyMetrics,
    addMeal,
    removeMeal,
    updateMacroTargets,
    addBodyMetric,
  } = useWorkout();
  const { showToast } = useToast();

  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState(400);
  const [manualProtein, setManualProtein] = useState(35);
  const [manualCarbs, setManualCarbs] = useState(45);
  const [manualFats, setManualFats] = useState(10);

  const [editingTargets, setEditingTargets] = useState(false);
  const [editCalories, setEditCalories] = useState(nutritionLog.calorieTarget);
  const [editProtein, setEditProtein] = useState(nutritionLog.proteinTarget);
  const [editCarbs, setEditCarbs] = useState(nutritionLog.carbsTarget);
  const [editFats, setEditFats] = useState(nutritionLog.fatsTarget);

  const [weightEditorOpen, setWeightEditorOpen] = useState(false);
  const [newWeight, setNewWeight] = useState(() => bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? 80);

  const saveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || newWeight <= 0) return;
    addBodyMetric({
      id: `bm-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      weightKg: newWeight,
    });
    // Recompute macro targets from the new body weight (lean-bulk formula)
    const protein = Math.round(newWeight * 2.2);
    const fats = Math.round(newWeight * 0.9);
    const calories = Math.round(newWeight * 34);
    const carbs = Math.max(50, Math.round((calories - fats * 9 - protein * 4) / 4));
    updateMacroTargets({ calories, protein, carbs, fats });
    setWeightEditorOpen(false);
    showToast(`Peso actualizado a ${newWeight} kg. Objetivos recalculados.`, "success");
  };

  // Targets
  const targetCalories = nutritionLog.calorieTarget;
  const targetProtein = nutritionLog.proteinTarget;
  const targetCarbs = nutritionLog.carbsTarget;
  const targetFats = nutritionLog.fatsTarget;

  // Actuals
  const currentCalories = nutritionLog.meals.reduce((acc, m) => acc + m.calories, 0);
  const currentProtein = nutritionLog.meals.reduce((acc, m) => acc + m.protein, 0);
  const currentCarbs = nutritionLog.meals.reduce((acc, m) => acc + m.carbs, 0);
  const currentFats = nutritionLog.meals.reduce((acc, m) => acc + m.fats, 0);

  const lastMetric = bodyMetrics[bodyMetrics.length - 1];
  const currentWeight = lastMetric?.weightKg ?? null;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName) return;
    const meal: MealItem = {
      id: `meal-${Date.now()}`,
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      dishName: manualName,
      description: "Entrada manual de macronutrientes",
      calories: manualCalories,
      protein: manualProtein,
      carbs: manualCarbs,
      fats: manualFats,
      fiber: 4,
      mpsQuality: "Suficiente",
    };
    addMeal(meal);
    setManualName("");
    showToast("Comida añadida al registro", "success");
  };

  const saveTargets = (e: React.FormEvent) => {
    e.preventDefault();
    updateMacroTargets({
      calories: editCalories,
      protein: editProtein,
      carbs: editCarbs,
      fats: editFats,
    });
    setEditingTargets(false);
    showToast("Objetivos diarios actualizados", "success");
  };

  const QuickMeals: { name: string; cal: number; pro: number; carb: number; fat: number }[] = [
    { name: "Batido Whey + Plátano + Cacahuete", cal: 480, pro: 42, carb: 50, fat: 12 },
    { name: "Pollo + Boniato + Espárragos", cal: 620, pro: 54, carb: 68, fat: 8 },
    { name: "Salmón + Arroz + Aguacate", cal: 740, pro: 48, carb: 62, fat: 26 },
  ];

  const macroCards = [
    {
      label: "Calorías",
      value: currentCalories,
      target: targetCalories,
      unit: "kcal",
      color: "text-amber-400",
      bar: "bg-amber-400",
      icon: <Flame className="w-4 h-4 text-amber-400" />,
    },
    {
      label: "Proteína (2.2g/kg)",
      value: currentProtein,
      target: targetProtein,
      unit: "g",
      color: "text-cyan-400",
      bar: "bg-cyan-400",
      icon: <Dna className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: "Carbohidratos",
      value: currentCarbs,
      target: targetCarbs,
      unit: "g",
      color: "text-purple-400",
      bar: "bg-purple-400",
      icon: <Zap className="w-4 h-4 text-purple-400" />,
    },
    {
      label: "Grasas Saludables",
      value: currentFats,
      target: targetFats,
      unit: "g",
      color: "text-emerald-400",
      bar: "bg-emerald-400",
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
    },
  ];

  return (
    <div id="nutrition-vision-hub" className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Nutrición</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {lastMetric
              ? `Objetivos calculados para ${currentWeight} kg de peso corporal`
              : "Registrá tu peso en Analytics para calcular objetivos exactos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setNewWeight(currentWeight ?? 80); setWeightEditorOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/10 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-600/20 transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            Registrar peso
          </button>
          <button
            onClick={() => {
              setEditCalories(targetCalories);
              setEditProtein(targetProtein);
              setEditCarbs(targetCarbs);
              setEditFats(targetFats);
              setEditingTargets(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800/60 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Ajustar objetivos
          </button>
        </div>
      </div>

      {/* Macro overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {macroCards.map((card) => {
          const pct = card.target > 0 ? Math.min(100, (card.value / card.target) * 100) : 0;
          const remaining = Math.max(0, card.target - card.value);
          return (
            <div key={card.label} className="p-4 sm:p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
              <div className="flex justify-between items-center text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <span>{card.label}</span>
                {card.icon}
              </div>
              <div className={`text-2xl sm:text-3xl font-black ${card.color}`}>
                {card.value} <span className="text-sm font-normal text-neutral-400">/ {card.target}{card.unit}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full ${card.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
                <span>Restantes:</span>
                <span className="font-bold text-white">{remaining} {card.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit targets modal */}
      {editingTargets && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={saveTargets} className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Objetivos diarios</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Calorías (kcal)", value: editCalories, set: setEditCalories, accent: "text-amber-400" },
                { label: "Proteína (g)", value: editProtein, set: setEditProtein, accent: "text-cyan-400" },
                { label: "Carbs (g)", value: editCarbs, set: setEditCarbs, accent: "text-purple-400" },
                { label: "Grasas (g)", value: editFats, set: setEditFats, accent: "text-emerald-400" },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className={`text-[11px] font-bold ${f.accent} uppercase tracking-wider`}>{f.label}</span>
                  <input
                    type="number"
                    value={f.value}
                    onChange={(e) => f.set(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingTargets(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Weight editor modal */}
      {weightEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={saveWeight} className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Registrar peso corporal</h4>
              <button type="button" onClick={() => setWeightEditorOpen(false)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Tu peso se guarda en el historial de métricas y los objetivos de macros se recalculan automáticamente
              (proteína 2.2g/kg, grasas 0.9g/kg, ~34 kcal/kg).
            </p>
            <label className="block">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Peso (kg)</span>
              <input
                type="number"
                step="0.1"
                min={20}
                max={300}
                value={newWeight}
                onChange={(e) => setNewWeight(parseFloat(e.target.value))}
                className="mt-1 w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWeightEditorOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                Guardar peso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daily Meal Scheduler Plan */}
      <div className="p-5 rounded-3xl bg-neutral-900/50 border border-neutral-800">
        <MealSchedulerPanel />
      </div>

      {/* Quick meals */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl space-y-4">
        <h3 className="text-base font-black text-white tracking-tight">Platos Rápidos</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          {QuickMeals.map((meal) => (
            <button
              key={meal.name}
              onClick={() => {
                addMeal({
                  id: `meal-${Date.now()}-${meal.name}`,
                  time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
                  dishName: meal.name,
                  description: "Sugerencia rápida",
                  calories: meal.cal,
                  protein: meal.pro,
                  carbs: meal.carb,
                  fats: meal.fat,
                  fiber: 6,
                  mpsQuality: "Suficiente",
                });
                showToast("Plato rápido agregado", "success");
              }}
              className="px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs text-neutral-300 hover:text-white transition-all space-y-1"
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="line-clamp-2">{meal.name}</span>
              </div>
              <div className="flex gap-2 font-mono text-[11px] text-neutral-500">
                <span className="text-amber-400">{meal.cal} kcal</span>
                <span className="text-cyan-400">{meal.pro}g P</span>
                <span className="text-purple-400">{meal.carb}g C</span>
                <span className="text-emerald-400">{meal.fat}g G</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Meals log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white tracking-tight">Comidas de hoy</h3>
          <span className="text-xs text-neutral-400 font-mono">{nutritionLog.meals.length} registradas</span>
        </div>

        {nutritionLog.meals.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
            No registraste comidas hoy. Agregá una usando la entrada manual o los platos rápidos.
          </div>
        ) : (
          <div className="space-y-3">
            {nutritionLog.meals
              .slice()
              .sort((a, b) => (b.time || "").localeCompare(a.time || ""))
              .map((meal) => (
                <div
                  key={meal.id}
                  className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {meal.imageUrl ? (
                      <img
                        src={meal.imageUrl}
                        alt={meal.dishName}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-cyan-400 shrink-0 font-black text-sm">
                        {meal.calories}k
                      </div>
                    )}

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">{meal.dishName}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="font-extrabold text-amber-400">{meal.calories} kcal</span>
                        <span>•</span>
                        <span className="font-bold text-cyan-400">{meal.protein}g Proteína</span>
                        <span>•</span>
                        <span className="font-bold text-purple-400">{meal.carbs}g Carbs</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400">{meal.fats}g Grasas</span>
                        {meal.mpsQuality && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-blue-400">{meal.mpsQuality}</span>
                          </>
                        )}
                      </div>
                      {meal.description && (
                        <p className="text-[11px] text-neutral-400 mt-1 italic">"{meal.description}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    <span className="text-[11px] text-neutral-500 font-mono">{meal.time}</span>
                    <button
                      onClick={() => { removeMeal(meal.id); showToast("Comida eliminada", "info"); }}
                      className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                      title="Eliminar comida"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Manual add form */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
          Entrada Manual Rápida
        </h4>
        <form onSubmit={handleManualAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Nombre de la comida"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="col-span-2 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Kcal"
            value={manualCalories}
            onChange={(e) => setManualCalories(parseInt(e.target.value, 10) || 0)}
            className="px-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white text-center focus:outline-none focus:border-amber-500"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Proteína (g)"
            value={manualProtein}
            onChange={(e) => setManualProtein(parseInt(e.target.value, 10) || 0)}
            className="px-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white text-center focus:outline-none focus:border-cyan-500"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Carbs (g)"
            value={manualCarbs}
            onChange={(e) => setManualCarbs(parseInt(e.target.value, 10) || 0)}
            className="px-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white text-center focus:outline-none focus:border-purple-500"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Grasas (g)"
            value={manualFats}
            onChange={(e) => setManualFats(parseInt(e.target.value, 10) || 0)}
            className="px-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white text-center focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="col-span-2 sm:col-span-4 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            Añadir comida
          </button>
        </form>
      </div>
    </div>
  );
};
