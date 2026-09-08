import { useEffect } from "react";
import { useWorkout } from "../../context/WorkoutContext";
import { useGoal } from "../../context/GoalContext";
import { useToast } from "../../context/ToastContext";
import { computePersonalTargets } from "../../data/nutritionData";
import { latestBodyMetric } from "../../utils/absEstimator";
import {
  isNativePlatform,
  getHealthStatus,
  hasSleepWeightPermission,
  readRecentSleep,
  readLatestWeight,
  subscribeHealthSyncRequested,
} from "../../utils/healthConnect";

/** Cada cuánto se re-sincroniza sueño/peso mientras la app está abierta. */
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Motor de sincronización Health Connect (sueño + peso).
 * Corre en segundo plano como StepsEngine:
 *   - Al abrir la app (montar).
 *   - Cada 60 min.
 *   - Al volver al primer plano (visibilitychange).
 *   - Bajo demanda (evento "kinetix-health-sync-requested", ej. tras conectar).
 *
 * Reglas (100% idempotentes, nunca pisan datos del usuario):
 *   - SUEÑO: agrega al sleep log las noches que Health Connect registró y que
 *     NO existan ya (por fecha). Las entradas manuales del usuario ganan.
 *   - PESO: agrega a body metrics la pesada de la balanza SOLO si no existe
 *     otra medición para esa fecha Y la pesada es más nueva que la última
 *     medición registrada. Si es una pesada nueva, recalcula los objetivos
 *     keto desde ese peso (igual que el alta manual en Analytics/Nutrición).
 */
export const HealthSyncEngine: React.FC = () => {
  const { bodyMetrics, nutritionProfile, addBodyMetric, updateMacroTargets } = useWorkout();
  const { sleepLog, addSleep } = useGoal();
  const { showToast } = useToast();

  // Ref con el contexto más reciente para que los callbacks registrados UNA vez
  // no queden con valores viejos.
  const ctxRef = { bodyMetrics, nutritionProfile, sleepLog, addBodyMetric, updateMacroTargets, addSleep, showToast };

  useEffect(() => {
    const sync = async () => {
      const {
        bodyMetrics,
        nutritionProfile,
        sleepLog,
        addBodyMetric,
        updateMacroTargets,
        addSleep,
        showToast,
      } = ctxRef;

      if (!isNativePlatform()) return;
      try {
        const st = await getHealthStatus();
        if (!st.authorized) return;

        const perms = await hasSleepWeightPermission();
        let addedSleep = 0;
        let addedWeight: number | null = null;

        // ---- Sueño: noches de Health Connect que no estén ya registradas ----
        if (perms.sleep) {
          const sessions = await readRecentSleep(14);
          for (const s of sessions) {
            if (sleepLog.some((e) => e.date === s.date)) continue;
            addSleep({ date: s.date, bed: s.bed, wake: s.wake, quality: 3, source: "healthconnect" });
            addedSleep++;
          }
        }

        // ---- Peso: pesada de balanza, sin pisar mediciones manuales ----
        if (perms.weight) {
          const w = await readLatestWeight(30);
          if (w) {
            const hasSameDate = bodyMetrics.some((m) => m.date === w.date);
            const latest = latestBodyMetric(bodyMetrics);
            const isNewerThanLatest = !latest || w.date >= latest.date;
            if (!hasSameDate && isNewerThanLatest) {
              addBodyMetric({ id: `bm-hc-${Date.now()}`, date: w.date, weightKg: w.weightKg });
              addedWeight = w.weightKg;
              // La pesada cambió el peso actual → recalcula objetivos keto.
              const t = computePersonalTargets(w.weightKg, "keto", nutritionProfile);
              updateMacroTargets({ calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats });
            }
          }
        }

        if (addedSleep > 0 || addedWeight != null) {
          const parts: string[] = [];
          if (addedSleep > 0) parts.push(`${addedSleep} noche${addedSleep > 1 ? "s" : ""} de sueño sincronizada${addedSleep > 1 ? "s" : ""}`);
          if (addedWeight != null) parts.push(`peso ${addedWeight.toLocaleString("es-AR")} kg desde la balanza`);
          showToast(`Health Connect: ${parts.join(" · ")}`, "success");
        }
      } catch {
        /* silencioso: la próxima pasada reintenta */
      }
    };

    sync();

    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const unsub = subscribeHealthSyncRequested(sync);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};