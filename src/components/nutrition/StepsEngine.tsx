import { useEffect, useRef } from "react";
import { localDateKey } from "../../utils/dateUtils";
import { computeStepAdjustment, isLunchPassed, lunchAlreadyLogged, BaseTargets } from "../../utils/stepsRules";
import {
  isNativePlatform,
  readTodaySteps,
  readStepsConfig,
  readStoredDay,
  saveStoredDay,
  subscribeStepsChanged,
} from "../../utils/healthConnect";
import { computePersonalTargets } from "../../data/nutritionData";
import { useWorkout } from "../../context/WorkoutContext";

/**
 * Motor de pasos que corre siempre que la app está abierta.
 * Único lugar que aplica el ajuste automático al target de nutrición:
 *   - Al abrir la app: lee pasos de Health Connect (si nativo + autorizado)
 *     o re-aplica los pasos ya guardados del día.
 *   - Escucha el evento "kinetix-steps-changed" (refresco manual/config) y
 *     re-aplica el ajuste de forma idempotente sobre la base congelada.
 * La UI (StepsPanel) solo escribe datos crudos + configuración.
 */
export const StepsEngine: React.FC = () => {
  const { nutritionLog, nutritionProfile, nutritionGoal, bodyMetrics, updateMacroTargets } = useWorkout();
  const appliedRef = useRef<string>("");

  // Ref con el contexto más reciente para que el callback de suscripción
  // (que se registra UNA vez) no quede con valores viejos.
  const ctxRef = useRef({ nutritionLog, nutritionProfile, nutritionGoal, bodyMetrics, updateMacroTargets });
  ctxRef.current = { nutritionLog, nutritionProfile, nutritionGoal, bodyMetrics, updateMacroTargets };

  useEffect(() => {
    const todayKey = localDateKey();

    const apply = (steps: number, source: "healthconnect" | "manual" | null) => {
      const cfg = readStepsConfig();
      if (!cfg.enabled || !cfg.autoApply) return;

      const { nutritionLog, nutritionProfile, nutritionGoal, bodyMetrics, updateMacroTargets } = ctxRef.current;

      const stored = readStoredDay();
      let base: BaseTargets | null = (stored && stored.date === todayKey && stored.base) || null;

      if (!base) {
        // Base del día. Si el log todavía no pertenece a hoy (puede tener targets
        // ya ajustados de ayer), la congelamos desde el perfil para NO sumar ajustes.
        const logIsToday = nutritionLog.date === todayKey;
        if (logIsToday) {
          base = {
            calories: nutritionLog.calorieTarget,
            protein: nutritionLog.proteinTarget,
            carbs: nutritionLog.carbsTarget,
            fats: nutritionLog.fatsTarget,
          };
        } else {
          const weightKg = bodyMetrics && bodyMetrics.length
            ? bodyMetrics[bodyMetrics.length - 1].weightKg
            : 78;
          const t = computePersonalTargets(weightKg, nutritionGoal, nutritionProfile);
          base = { calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats };
        }
      }

      const lunchPassed = lunchAlreadyLogged(nutritionLog.meals) || isLunchPassed(new Date(), nutritionProfile.workStart);
      const adj = computeStepAdjustment(steps, base, {
        stepGoal: cfg.stepGoal,
        trainedToday: cfg.trainedToday,
        lunchPassed,
      });

      updateMacroTargets(adj.adjusted);

      const prevStored = readStoredDay();
      saveStoredDay({
        date: todayKey,
        steps,
        source,
        asOf: new Date().toISOString(),
        sources: prevStored?.sources,
        base,
        adjustment: { caloriesDelta: adj.caloriesDelta, bandLabel: adj.bandLabel, message: adj.message },
      });
      appliedRef.current = `${todayKey}:${steps}:${source}`;
    };

    // 1) Re-aplica lo ya guardado de hoy (después de reload / cambios de config).
    const stored = readStoredDay();
    if (stored && stored.date === todayKey) {
      const signature = `${todayKey}:${stored.steps}:${stored.source}`;
      if (appliedRef.current !== signature) {
        apply(stored.steps, stored.source);
      }
    }
    // 2) En nativo + autorizado, refresca pasos desde Health Connect al abrir.
    if (isNativePlatform()) {
      (async () => {
        const cfg = readStepsConfig();
        if (!cfg.enabled || !cfg.autoApply) return;
        const d = await readTodaySteps();
        if (d.source === "healthconnect") {
          const signature = `${todayKey}:${d.steps}:healthconnect`;
          if (appliedRef.current !== signature) {
            apply(d.steps, "healthconnect");
          }
        }
      })();
    }
    // 3) Escucha eventos de la UI (entrada manual, refresco, reset).
    const unsub = subscribeStepsChanged(() => {
      const current = readStoredDay();
      if (current && current.date === todayKey) {
        const signature = `${todayKey}:${current.steps}:${current.source}`;
        if (appliedRef.current !== signature) {
          apply(current.steps, current.source);
        }
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};