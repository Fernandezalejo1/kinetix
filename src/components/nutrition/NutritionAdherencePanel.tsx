import React, { useMemo } from "react";
import { CalendarDays, Flame, Droplets, TrendingUp, Wheat } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { localDateKey } from "../../utils/dateUtils";

/**
 * FIX (prioridad alta): ADHERENCIA NUTRICIONAL.
 * Antes el historial nutricional se reemplazaba cada día y no existía forma de
 * ver adherencia, promedios ni tendencias. Ahora WorkoutContext archiva cada
 * día cerrado y este panel muestra los últimos 7 días archivados + hoy:
 *   - días registrados / objetivo de calorías cumplido
 *   - promedio de calorías, proteína y agua
 *   - mini-barra de adherencia semanal
 */
export const NutritionAdherencePanel: React.FC = () => {
  const { nutritionHistory, nutritionLog } = useWorkout();

  const days = useMemo(() => {
    // Últimos 7 días: 6 archivados + hoy (el log activo cuenta como el día actual).
    const todayKey = localDateKey();
    const archived = nutritionHistory.filter((d) => d.date < todayKey).slice(0, 6);
    const week: { date: string; label: string; calories: number; protein: number; waterMl: number; isToday: boolean }[] =
      archived
        .map((d) => ({
          date: d.date,
          label: new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short" }),
          calories: d.meals.reduce((a, m) => a + m.calories, 0),
          protein: d.meals.reduce((a, m) => a + m.protein, 0),
          waterMl: d.waterMl,
          isToday: false,
        }))
        .reverse(); // cronológico: viejo -> nuevo

    const todayCalories = nutritionLog.meals.reduce((a, m) => a + m.calories, 0);
    const todayProtein = nutritionLog.meals.reduce((a, m) => a + m.protein, 0);
    week.push({
      date: todayKey,
      label: "hoy",
      calories: todayCalories,
      protein: todayProtein,
      waterMl: nutritionLog.waterMl,
      isToday: true,
    });
    return week;
  }, [nutritionHistory, nutritionLog]);

  const calorieTarget = nutritionLog.calorieTarget || 1;
  const proteinTarget = nutritionLog.proteinTarget || 1;

  const stats = useMemo(() => {
    const counted = days.filter((d) => d.calories > 0 || d.waterMl > 0);
    const loggedDays = counted.length;
    const avgCalories = loggedDays ? Math.round(counted.reduce((a, d) => a + d.calories, 0) / loggedDays) : 0;
    const avgProtein = loggedDays ? Math.round(counted.reduce((a, d) => a + d.protein, 0) / loggedDays) : 0;
    const avgWater = loggedDays ? Math.round(counted.reduce((a, d) => a + d.waterMl, 0) / loggedDays) : 0;
    const onTargetDays = counted.filter(
      (d) => d.calories >= calorieTarget * 0.8 && d.calories <= calorieTarget * 1.1
    ).length;
    const adherence = loggedDays ? Math.round((onTargetDays / loggedDays) * 100) : 0;
    return { loggedDays, avgCalories, avgProtein, avgWater, onTargetDays, adherence };
  }, [days, calorieTarget]);

  return (
    <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Adherencia Nutricional</h3>
            <p className="text-[11px] text-neutral-400">Últimos 7 días (se archiva automáticamente al cambiar el día)</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            stats.adherence >= 80
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : stats.adherence >= 50
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : "bg-neutral-800 text-neutral-400 border-neutral-700"
          }`}
        >
          {stats.adherence}% en objetivo
        </span>
      </div>

      {stats.loggedDays === 0 ? (
        <p className="text-xs text-neutral-500 leading-relaxed">
          Todavía no hay días registrados. Cuando registres comidas o agua, acá vas a ver tu adherencia semanal,
          promedios de calorías/proteína/agua y la tendencia.
        </p>
      ) : (
        <>
          {/* Barra día por día */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const pct = Math.min(100, Math.round((d.calories / calorieTarget) * 100));
              const onTarget = d.calories >= calorieTarget * 0.8 && d.calories <= calorieTarget * 1.1;
              const empty = d.calories === 0 && d.waterMl === 0;
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div className="w-full h-16 rounded-lg bg-neutral-950 border border-neutral-800 relative overflow-hidden">
                    <div
                      className={`absolute bottom-0 left-0 right-0 transition-all ${
                        empty ? "bg-neutral-800" : onTarget ? "bg-emerald-500/70" : "bg-amber-500/60"
                      }`}
                      style={{ height: `${Math.max(empty ? 4 : 12, pct)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${d.isToday ? "text-cyan-400" : "text-neutral-500"}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Promedios */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <Flame className="w-4 h-4 text-amber-400 mx-auto" />
              <div className="text-lg font-black text-white mt-1">{stats.avgCalories.toLocaleString("es-AR")}</div>
              <span className="text-[10px] text-neutral-500">kcal/día prom.</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <Wheat className="w-4 h-4 text-cyan-400 mx-auto" />
              <div className="text-lg font-black text-white mt-1">{stats.avgProtein}g</div>
              <span className="text-[10px] text-neutral-500">proteína prom.</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <Droplets className="w-4 h-4 text-emerald-400 mx-auto" />
              <div className="text-lg font-black text-white mt-1">
                {(stats.avgWater / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}L
              </div>
              <span className="text-[10px] text-neutral-500">agua prom.</span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 flex items-start gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            {stats.onTargetDays} de {stats.loggedDays} días dentro del rango objetivo (80–110% de{" "}
            {calorieTarget.toLocaleString("es-AR")} kcal · proteína objetivo {proteinTarget}g).
          </p>
        </>
      )}
    </div>
  );
};
