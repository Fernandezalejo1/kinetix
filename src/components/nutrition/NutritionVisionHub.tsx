import React, { useState } from "react";
import {
  Plus,
  Flame,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Clock,
  Dna,
  Zap,
  Sparkles
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { MealItem } from "../../types";

export const NutritionVisionHub: React.FC = () => {
  const {
    nutritionLog,
    addMeal,
    removeMeal,
  } = useWorkout();


  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState(400);
  const [manualProtein, setManualProtein] = useState(35);
  const [manualCarbs, setManualCarbs] = useState(45);
  const [manualFats, setManualFats] = useState(10);



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

  const handleSampleMeal = (dishName: string, cal: number, pro: number, carb: number, fat: number, mpsQuality: string, timing: string) => {
    const meal: MealItem = {
      id: `meal-${Date.now()}`,
      time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      dishName,
      description: "Comida formulada con ratios balanceados",
      calories: cal,
      protein: pro,
      carbs: carb,
      fats: fat,
      fiber: 6,
      mpsQuality,
      timingRecommendation: timing,
    };
    addMeal(meal);
  };

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
  };

  return (
    <div id="nutrition-vision-hub" className="space-y-8 animate-fadeIn pb-16">
      {/* Top Macronutrient Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Calories Card */}
        <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Calorías Totales</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {currentCalories} <span className="text-sm font-normal text-neutral-400">/ {targetCalories} kcal</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentCalories / targetCalories) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
            <span>Restantes:</span>
            <span className="font-bold text-white">{Math.max(0, targetCalories - currentCalories)} kcal</span>
          </div>
        </div>

        {/* Protein Card */}
        <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Proteína (2.2g/kg)</span>
            <Dna className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">
            {currentProtein} <span className="text-sm font-normal text-neutral-400">/ {targetProtein}g</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentProtein / targetProtein) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
            <span>Para umbral MPS:</span>
            <span className="font-bold text-emerald-400">
              {currentProtein >= targetProtein ? "Completado" : `${targetProtein - currentProtein}g restantes`}
            </span>
          </div>
        </div>

        {/* Carbs Card */}
        <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Carbohidratos</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400">
            {currentCarbs} <span className="text-sm font-normal text-neutral-400">/ {targetCarbs}g</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentCarbs / targetCarbs) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
            <span>Glucógeno muscular:</span>
            <span className="font-bold text-white">{Math.round((currentCarbs / targetCarbs) * 100)}%</span>
          </div>
        </div>

        {/* Fats Card */}
        <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Grasas Saludables</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {currentFats} <span className="text-sm font-normal text-neutral-400">/ {targetFats}g</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentFats / targetFats) * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
            <span>Soporte hormonal:</span>
            <span className="font-bold text-white">{Math.max(0, targetFats - currentFats)}g restantes</span>
          </div>
        </div>
      </div>

      {/* Quick Demo Scientific Meals */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl space-y-4">
        <h3 className="text-lg font-black text-white tracking-tight">Platos Rápidos</h3>
        <div className="flex flex-wrap gap-2">
            {[
              {
                dishName: "Batido Whey Isolate + Plátano + Crema de Cacahuete",
                cal: 480,
                pro: 42,
                carb: 50,
                fat: 12,
                mpsQuality: "Leucina: 4.2g (Óptimo mTORC1)",
                timing: "Post-Entrenamiento inmediato",
              },
              {
                dishName: "Pechuga de Pollo a la Plancha + Boniato Asado + Espárragos",
                cal: 620,
                pro: 54,
                carb: 68,
                fat: 8,
                mpsQuality: "Leucina: 4.8g (Máxima biodisponibilidad)",
                timing: "Comida de recarga de glucógeno",
              },
              {
                dishName: "Salmón Salvaje al Horno + Arroz Jazmín + Aguacate",
                cal: 740,
                pro: 48,
                carb: 62,
                fat: 26,
                mpsQuality: "Leucina: 3.9g (Antiinflamatorio EPA/DHA)",
                timing: "Cena de recuperación y sueño",
              },
            ].map((meal, idx) => (
              <button
                key={idx}
                onClick={() =>
                  handleSampleMeal(meal.dishName, meal.cal, meal.pro, meal.carb, meal.fat, meal.mpsQuality, meal.timing)
                }
                className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                {meal.dishName.split("+")[0]}
              </button>
            ))}
          </div>
      </div>

      {/* Meals Logged Today List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-white tracking-tight">Registro de Comidas de Hoy</h3>
          <span className="text-xs text-neutral-400 font-mono">{nutritionLog.meals.length} comidas registradas</span>
        </div>

        {nutritionLog.meals.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
            No has registrado ninguna comida hoy. Utiliza el escáner con IA o el formulario rápido.
          </div>
        ) : (
          <div className="space-y-3">
            {nutritionLog.meals.map((meal) => (
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
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {meal.time}
                  </span>
                  <button
                    onClick={() => removeMeal(meal.id)}
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

      {/* Manual Quick Add Form */}
      <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
          Entrada Manual Rápida de Alimentos
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
            Añadir
          </button>
        </form>
      </div>
    </div>
  );
};
