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
  Target,
  Salad,
  User,
  Ruler,
  Activity,
  Clock,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ActivityLevel, MealItem, NutritionGoal, NutritionProfile } from "../../types";
import { MealSchedulerPanel } from "./MealSchedulerPanel";
import { StepsPanel } from "./StepsPanel";
import { WaterTracker } from "./WaterTracker";
import { SupplementGuide } from "./SupplementGuide";
import {
  NUTRITION_GOALS,
  NUTRITION_GOAL_KEYS,
  QUICK_MEALS,
  QUICK_MEAL_CATEGORIES,
  computeFiberTarget,
  computeBMR,
  computeTDEE,
  computeGoalCalories,
  computePersonalTargets,
  ACTIVITY_FACTORS,
  QuickMealCategory,
} from "../../data/nutritionData";

export const NutritionVisionHub: React.FC = () => {
  const {
    nutritionLog,
    bodyMetrics,
    addMeal,
    removeMeal,
    updateMacroTargets,
    addBodyMetric,
    nutritionGoal,
    setNutritionGoal,
    nutritionProfile,
    setNutritionProfile,
  } = useWorkout();
  const { showToast } = useToast();

  const [profileOpen, setProfileOpen] = useState(false);
  const [pAge, setPAge] = useState(nutritionProfile.age);
  const [pHeight, setPHeight] = useState(nutritionProfile.heightCm);
  const [pSex, setPSex] = useState<NutritionProfile["sex"]>(nutritionProfile.sex);
  const [pActivity, setPActivity] = useState<ActivityLevel>(nutritionProfile.activityLevel);
  const [pWorkStart, setPWorkStart] = useState(nutritionProfile.workStart);
  const [pWorkEnd, setPWorkEnd] = useState(nutritionProfile.workEnd);
  const [pDeficit, setPDeficit] = useState(nutritionProfile.deficitPercent);

  const [editingTargets, setEditingTargets] = useState(false);
  const [editCalories, setEditCalories] = useState(nutritionLog.calorieTarget);
  const [editProtein, setEditProtein] = useState(nutritionLog.proteinTarget);
  const [editCarbs, setEditCarbs] = useState(nutritionLog.carbsTarget);
  const [editFats, setEditFats] = useState(nutritionLog.fatsTarget);

  const [weightEditorOpen, setWeightEditorOpen] = useState(false);
  const [newWeight, setNewWeight] = useState(() => bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? 80);

  const [quickCategory, setQuickCategory] = useState<QuickMealCategory | "todos">("todos");

  const saveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || newWeight <= 0) return;
    addBodyMetric({
      id: `bm-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      weightKg: newWeight,
    });
    // Recompute macro targets con el perfil personal (Mifflin-St Jeor + déficit)
    const t = computePersonalTargets(newWeight, nutritionGoal, nutritionProfile);
    updateMacroTargets({ calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats });
    setWeightEditorOpen(false);
    showToast(`Peso actualizado a ${newWeight} kg. Objetivos recalculados (${NUTRITION_GOALS[nutritionGoal].label}).`, "success");
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
  const currentFiber = nutritionLog.meals.reduce((acc, m) => acc + (m.fiber || 0), 0);
  const fiberTarget = computeFiberTarget(targetCalories);

  // Macro split (calorías aportadas por cada macronutriente)
  const proteinKcal = currentProtein * 4;
  const carbsKcal = currentCarbs * 4;
  const fatsKcal = currentFats * 9;
  const totalKcal = proteinKcal + carbsKcal + fatsKcal;
  const split = [
    { label: "Proteína", value: totalKcal > 0 ? Math.round((proteinKcal / totalKcal) * 100) : 0, color: "bg-cyan-400", text: "text-cyan-400" },
    { label: "Carbs", value: totalKcal > 0 ? Math.round((carbsKcal / totalKcal) * 100) : 0, color: "bg-purple-400", text: "text-purple-400" },
    { label: "Grasas", value: totalKcal > 0 ? Math.round((fatsKcal / totalKcal) * 100) : 0, color: "bg-emerald-400", text: "text-emerald-400" },
  ];

  const lastMetric = bodyMetrics[bodyMetrics.length - 1];
  const currentWeight = lastMetric?.weightKg ?? null;

  // Métricas metabólicas personalizadas (Mifflin-St Jeor + NEAT)
  const profileWeight = currentWeight ?? 78;
  const bmr = computeBMR(nutritionProfile, profileWeight);
  const tdee = computeTDEE(nutritionProfile, profileWeight);
  const goalCalories = Object.fromEntries(
    NUTRITION_GOAL_KEYS.map((g) => [g, computeGoalCalories(tdee, g, nutritionProfile.deficitPercent)])
  ) as Record<NutritionGoal, number>;

  const openProfile = () => {
    setPAge(nutritionProfile.age);
    setPHeight(nutritionProfile.heightCm);
    setPSex(nutritionProfile.sex);
    setPActivity(nutritionProfile.activityLevel);
    setPWorkStart(nutritionProfile.workStart);
    setPWorkEnd(nutritionProfile.workEnd);
    setPDeficit(nutritionProfile.deficitPercent);
    setProfileOpen(true);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setNutritionProfile({
      age: pAge,
      heightCm: pHeight,
      sex: pSex,
      activityLevel: pActivity,
      workStart: pWorkStart,
      workEnd: pWorkEnd,
      deficitPercent: pDeficit,
    });
    setProfileOpen(false);
    showToast("Perfil actualizado · Objetivos recalculados con tu metabolismo", "success");
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

  const filteredQuickMeals = quickCategory === "todos" ? QUICK_MEALS : QUICK_MEALS.filter((m) => m.category === quickCategory);

  const macroCards: {
    label: string;
    value: number;
    target: number;
    unit: string;
    color: string;
    bar: string;
    icon: React.ReactNode;
    limit?: boolean;
  }[] = [
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
      label: "Proteína",
      value: currentProtein,
      target: targetProtein,
      unit: "g",
      color: "text-cyan-400",
      bar: "bg-cyan-400",
      icon: <Dna className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: nutritionGoal === "keto" ? "Carbohidratos (bajo ~25g)" : "Carbohidratos",
      value: currentCarbs,
      target: targetCarbs,
      unit: "g",
      color: "text-purple-400",
      bar: "bg-purple-400",
      icon: <Zap className="w-4 h-4 text-purple-400" />,
      // En keto los carbos NO son una meta a llenar: son un TETO a no superar
      // para mantenerse en cetosis. Se muestran como presupuesto, no objetivo.
      limit: nutritionGoal === "keto",
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
    <div id="nutrition-vision-hub" className="space-y-6 animate-fadeIn pb-16 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white tracking-tight">Nutrición</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {lastMetric
              ? `Objetivos para ${currentWeight} kg · ${NUTRITION_GOALS[nutritionGoal].label} · Déficit ${nutritionProfile.deficitPercent}% · Turno ${nutritionProfile.workStart}–${nutritionProfile.workEnd}`
              : "Registrá tu peso en Analytics para calcular objetivos exactos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Mi Perfil: nutrición personalizada */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-cyan-950/20 border border-cyan-500/20 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Mi Perfil Nutricional</h3>
              <p className="text-[11px] text-neutral-400">Metabolismo calculado con Mifflin-St Jeor + tu trabajo sedentario</p>
            </div>
          </div>
          <button
            onClick={openProfile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/10 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:bg-cyan-600/20 transition-colors shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">BMR</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{bmr} kcal</div>
            <div className="text-[10px] text-neutral-500">basal / día</div>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Gasto (TDEE)</div>
            <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">{tdee} kcal</div>
            <div className="text-[10px] text-neutral-500">{ACTIVITY_FACTORS[nutritionProfile.activityLevel].short}</div>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Objetivo hoy</div>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">{targetCalories} kcal</div>
            <div className="text-[10px] text-amber-400">déficit −{nutritionProfile.deficitPercent}%</div>
          </div>
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Turno de trabajo</div>
            <div className="text-xl font-black text-white font-mono mt-0.5 whitespace-nowrap">{nutritionProfile.workStart}–{nutritionProfile.workEnd}</div>
            <div className="text-[10px] text-neutral-500">sentado en PC</div>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          <strong className="text-amber-300">Estás en déficit (−{nutritionProfile.deficitPercent}%)</strong> con un día laboral de{" "}
          <strong className="text-white">{nutritionProfile.workStart}</strong> a <strong className="text-white">{nutritionProfile.workEnd}</strong>,
          así que tus comidas e hidratación se organizan en ese rango y la hidratación va hasta antes de dormir. Mantené la{" "}
          <strong className="text-white">proteína {NUTRITION_GOALS[nutritionGoal].proteinPerKg} g/kg</strong> para no perder músculo con el déficit,
          y evitá cafeína en las horas previas a tu descanso para proteger el sueño.
        </p>
      </div>

      {/* Goal selector */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Objetivo Nutricional</h3>
            <p className="text-[11px] text-neutral-400">Recalcula proteína, carbos y calorías según tu meta</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {NUTRITION_GOAL_KEYS.map((g) => {
            const cfg = NUTRITION_GOALS[g];
            const isActive = nutritionGoal === g;
            return (
              <button
                key={g}
                onClick={() => { setNutritionGoal(g); showToast(`Objetivo: ${cfg.label}`, "success"); }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? cfg.chipActive
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"
                }`}
              >
                <div className="text-xs font-black uppercase tracking-wider">{cfg.short}</div>
                <div className={`text-[10px] mt-0.5 ${isActive ? cfg.accent : "text-neutral-500"}`}>
                  {goalCalories[g].toLocaleString("es-ES")} kcal
                </div>
              </button>
            );
          })}
        </div>

        <div className={`p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] leading-relaxed ${NUTRITION_GOALS[nutritionGoal].accent}`}>
          <strong>En {NUTRITION_GOALS[nutritionGoal].label}:</strong>{" "}
          <span className="text-neutral-300">{NUTRITION_GOALS[nutritionGoal].description}</span>
        </div>
      </div>

      {/* Guía KETO / Cetogénica */}
      <div className={`p-5 sm:p-7 rounded-3xl border shadow-2xl space-y-4 ${
        nutritionGoal === "keto"
          ? "bg-gradient-to-br from-neutral-900 via-neutral-900 to-rose-950/20 border-rose-500/25"
          : "bg-neutral-900 border-neutral-800"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
            nutritionGoal === "keto" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" : "bg-neutral-800 text-neutral-400 border-neutral-700"
          }`}>
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              Guía Keto Cetogénica {nutritionGoal === "keto" && <span className="text-rose-300">(activa)</span>}
            </h3>
            <p className="text-[11px] text-neutral-400">Alta grasa · carbos mínimos · cuerpos cetónicos como combustible · definición y control de apetito</p>
          </div>
        </div>

        <p className="text-[11px] text-neutral-300 leading-relaxed">
          En keto reducís los carbos a <strong className="text-white">&lt;30 g/día</strong> (la app los fija en ~{nutritionLog.carbsTarget} g) y subís
          la grasa (~65–70% de las calorías): el hígado produce <strong className="text-white">cuerpos cetónicos</strong> que el cuerpo y el cerebro usan
          en lugar de glucosa. Para definición es muy efectivo porque <strong className="text-rose-300">controla el apetito</strong> con grasa saciante y
          mantiene masa muscular con proteína moderada (1.8 g/kg, sin pasarte porque el exceso de proteína puede salir de cetosis).
        </p>

        <ol className="space-y-3">
          {[
            { t: "1 · Tus macros keto (el objetivo ya las calcula)", d: `Calorías de déficit (${nutritionLog.calorieTarget} kcal), carbos ≈ ${nutritionLog.carbsTarget} g, proteína ${nutritionLog.proteinTarget} g y grasa ${nutritionLog.fatsTarget} g. Quedás en cetosis al mantener los carbos muy bajos.` },
            { t: "2 · Qué comer (grasa + proteína + verdura baja en carbo)", d: "Carnes, pescado graso (salmón), huevos, palta, aceite de oliva, mantequilla, quesos, frutos secos y verduras de hoja. Evitá pan, arroz, papa, boniato, fruta dulce, azúcar y ultraprocesados." },
            { t: "3 · Adaptación (la 'gripe keto' es normal)", d: "Los primeros 3–7 días podés sentir fatiga, niebla mental o dolores de cabeza mientras el cuerpo cambia de combustible. Tomá mucha agua y sumá sal/electrolitos (sodio, potasio, magnesio)." },
            { t: "4 · Electrolitos CLAVE (más que en cualquier dieta)", d: `En keto el cuerpo elimina más sodio y agua: sin reponerlos caés en calambres y niebla. Agregá sal a las comidas, consomé de hueso, y magnesio. Mantené la hidratación (2.5–3 L de agua) y suficiente fibra.` },
            { t: "5 · Rendimiento en el gym", d: "Las primeras 1–2 semanas el rendimiento en series de alta intensidad puede bajar (el músculo aún se adapta a la grasa). Mantené los compuestos con buena técnica; la explosividad se recupera con la adaptación. Café/Cafeína sí entra (sin azúcar)." },
            { t: "6 · Cuánto tiempo", d: "Keto cíclica: mantenela 8–12 semanas para definición, luego considerá reintroducir carbos de calidad (targeted keto) para el entreno. Monitoreá cómo te sentís; si el rendimiento se desploma >10%, ajustá." },
          ].map((s) => (
            <li key={s.t} className="flex gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 bg-rose-500/15 text-rose-300 border border-rose-500/20">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">{s.t}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{s.d}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-[11px] text-neutral-300 leading-relaxed">
          <strong className="text-rose-300">Consejo para keto:</strong> usá el plan de comidas <strong className="text-white">Keto</strong> en el
          selector de horarios — comidas altas en grasa y sin carbos que respetan tu día, y aplicá tus macros con "Aplicar a objetivos".
          Tu perfil {currentWeight ? `(${currentWeight} kg, definición −${nutritionProfile.deficitPercent}%)` : ""} ya quedó calculado.
        </div>
      </div>

      {/* Macro overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {macroCards.map((card) => {
          const isLimit = !!card.limit;
          // Para una meta (calorías/proteína/grasa): % de lo que ya cubriste.
          // Para un límite (carbos en keto): % del presupuesto ya consumido (el 100% = tope).
          const pct = card.target > 0 ? Math.min(100, (card.value / card.target) * 100) : 0;
          const remaining = card.target - card.value; // puede ser negativo en un límite
          const over = isLimit && remaining < 0;
          return (
            <div key={card.label} className={`p-4 sm:p-5 rounded-3xl bg-neutral-900 border shadow-xl space-y-3 min-w-0 ${over ? "border-red-500/50" : "border-neutral-800"}`}>
              <div className="flex justify-between items-center text-[11px] font-bold text-neutral-400 uppercase tracking-wider gap-2">
                <span className="truncate">{card.label}</span>
                {card.icon}
              </div>
              <div className={`text-2xl sm:text-3xl font-black ${over ? "text-red-400" : card.color} whitespace-nowrap`}>
                {card.value} <span className="text-sm font-normal text-neutral-400">/ {card.target}{card.unit}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLimit ? (over ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-purple-400") : card.bar
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[11px] text-neutral-400 flex justify-between font-mono">
                {isLimit ? (
                  <span className="font-bold text-neutral-300">Solo te sobran:</span>
                ) : (
                  <span>Restantes:</span>
                )}
                <span className={`font-bold ${over ? "text-red-400" : "text-white"}`}>
                  {isLimit
                    ? over
                      ? `+${Math.abs(remaining)} ${card.unit} excedidos`
                      : `${remaining} ${card.unit}`
                    : `${remaining} ${card.unit}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day summary: fiber + macro split */}
      <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <Salad className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Resumen del día</h3>
        </div>

        <div>
          <div className="flex items-end justify-between text-xs font-mono mb-1.5">
            <span className="text-white font-bold">
              Fibra <span className="text-emerald-400">{currentFiber}g</span>
            </span>
            <span className="text-neutral-500">meta ~{fiberTarget}g</span>
          </div>
          <div className="h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentFiber / fiberTarget) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-neutral-500 mt-1.5 leading-relaxed">
            La fibra ralentiza la absorción, mejora la saciedad y alimenta el microbioma. Frutas, verduras, avena y legumbres son tus aliados.
          </p>
        </div>

        {totalKcal > 0 && (
          <div className="pt-3 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Distribución calórica</span>
              <span className="text-[11px] font-mono text-neutral-500">{totalKcal.toLocaleString("es-ES")} kcal registradas</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-neutral-950 border border-neutral-800">
              {split.map((s) => (
                <div key={s.label} className={s.color} style={{ width: `${s.value}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">
              {split.map((s) => (
                <span key={s.label} className={s.text}>
                  {s.label} {s.value}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <WaterTracker />

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

      {/* Profile editor modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={saveProfile} className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-4 max-h-[88dvh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Mi Perfil Nutricional</h4>
              <button type="button" onClick={() => setProfileOpen(false)} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Edad</span>
                <input
                  type="number"
                  min={15}
                  max={80}
                  value={pAge}
                  onChange={(e) => setPAge(Math.max(15, parseInt(e.target.value, 10) || 0))}
                  className="mt-1 w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1"><Ruler className="w-3 h-3" /> Altura (cm)</span>
                <input
                  type="number"
                  min={140}
                  max={220}
                  value={pHeight}
                  onChange={(e) => setPHeight(Math.max(140, parseInt(e.target.value, 10) || 0))}
                  className="mt-1 w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                />
              </label>
            </div>

            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Género</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(["masculino", "femenino"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPSex(s)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      pSex === s
                        ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/20"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {s === "masculino" ? "Masculino" : "Femenino"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1"><Activity className="w-3 h-3" /> Actividad diaria</span>
              <div className="grid gap-2 mt-1">
                {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPActivity(lvl)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      pActivity === lvl
                        ? "bg-cyan-600/15 border-cyan-500/50"
                        : "bg-neutral-950 border-neutral-800 hover:border-neutral-600"
                    }`}
                  >
                    <div className={`text-xs font-bold ${pActivity === lvl ? "text-cyan-200" : "text-white"}`}>
                      {ACTIVITY_FACTORS[lvl].label} <span className="text-neutral-500 font-mono">×{ACTIVITY_FACTORS[lvl].factor}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{ACTIVITY_FACTORS[lvl].hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Horario laboral (trabajás sentado)</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <label className="block">
                  <span className="text-[10px] text-neutral-500">Entrada</span>
                  <input
                    type="time"
                    value={pWorkStart}
                    onChange={(e) => setPWorkStart(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-neutral-500">Salida</span>
                  <input
                    type="time"
                    value={pWorkEnd}
                    onChange={(e) => setPWorkEnd(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-base text-white text-center focus:outline-none focus:border-cyan-500"
                  />
                </label>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Déficit calórico (para reducción de grasa)</span>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[10, 15, 20, 25].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPDeficit(d)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      pDeficit === d
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                        : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    −{d}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-1.5">
                Moderado (−15%) suele ser lo ideal en un trabajo sedentario: suficiente para perder grasa sin caerte de energía durante el día.
              </p>
            </div>

            <div className="pt-1 flex gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                Guardar perfil
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
              Tu peso se guarda en el historial de métricas y los objetivos de macros se recalculan automáticamente según tu objetivo
              ({NUTRITION_GOALS[nutritionGoal].label}: {NUTRITION_GOALS[nutritionGoal].proteinPerKg} g/kg de proteína, {NUTRITION_GOALS[nutritionGoal].caloriePerKg} kcal/kg).
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

      {/* Ajuste por pasos (Health Connect) */}
      <div>
        <StepsPanel compact />
      </div>

      {/* Quick meals */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-base font-black text-white tracking-tight">Platos Rápidos</h3>
          <span className="text-[11px] text-neutral-400 font-mono">{filteredQuickMeals.length} disponibles</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-[11px] font-bold">
          {QUICK_MEAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setQuickCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all shrink-0 ${
                quickCategory === cat.id
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredQuickMeals.map((meal) => (
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
                  fiber: meal.fiber,
                  mpsQuality: meal.mpsQuality,
                });
                showToast("Plato rápido agregado", "success");
              }}
              className="px-4 py-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left text-xs text-neutral-300 hover:text-white transition-all space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold min-w-0">
                  <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="line-clamp-2 leading-snug">{meal.name}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[11px] text-neutral-500">
                <span className="text-amber-400 font-bold">{meal.cal} kcal</span>
                <span className="text-cyan-400">{meal.pro}g P</span>
                <span className="text-purple-400">{meal.carb}g C</span>
                <span className="text-emerald-400">{meal.fat}g G</span>
                <span>{meal.fiber}g fibra</span>
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
            No registraste comidas hoy. Agregá una usando los platos rápidos o el Plan de Comidas.
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
                  <div className="flex items-start gap-4 min-w-0">
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

                    <div className="space-y-1 min-w-0">
                      <h4 className="text-base font-bold text-white break-words">{meal.dishName}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-extrabold text-amber-400">{meal.calories} kcal</span>
                        <span>•</span>
                        <span className="font-bold text-cyan-400">{meal.protein}g Proteína</span>
                        <span>•</span>
                        <span className="font-bold text-purple-400">{meal.carbs}g Carbs</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400">{meal.fats}g Grasas</span>
                        {meal.fiber !== undefined && meal.fiber > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-emerald-300">{meal.fiber}g Fibra</span>
                          </>
                        )}
                        {meal.mpsQuality && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-blue-400">{meal.mpsQuality}</span>
                          </>
                        )}
                      </div>
                      {meal.description && (
                        <p className="text-[11px] text-neutral-400 mt-1 italic break-words">"{meal.description}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    <span className="text-[11px] text-neutral-500 font-mono">{meal.time}</span>
                    <button
                      onClick={() => { removeMeal(meal.id); showToast("Comida eliminada", "info"); }}
                      className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors touch-target"
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

      {/* Manual add form - REMOVED (ya no se usa la entrada manual rápida) */}

      <SupplementGuide />
    </div>
  );
};