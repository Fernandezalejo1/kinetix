import { useEffect, useRef } from "react";
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
  const { bodyMetrics, nutritionProfile, nutritionGoal, addBodyMetric, updateMacroTargets } = useWorkout();
  const { sleepLog, addSleep } = useGoal();
  const { showToast } = useToast();

  // FIX (prioridad alta): useRef REAL. Antes `ctxRef` era un objeto plano
  // recreado en cada render; el effect de montaje lo capturaba en la closure
  // y las sincronizaciones horarias operaban con datos del primer render
  // (riesgo de duplicar registros). Con useRef + asignación en cada render,
  // el callback siempre lee el contexto vigente.
  const ctxRef = useRef({ bodyMetrics, nutritionProfile, nutritionGoal, sleepLog, addBodyMetric, updateMacroTargets, addSleep, showToast });
  ctxRef.current = { bodyMetrics, nutritionProfile, nutritionGoal, sleepLog, addBodyMetric, updateMacroTargets, addSleep, showToast };

  // Guía de permisos parciales/revocados: se avisa UNA vez por sesión para no
  // spamear (autorizado, pero falto de permiso de Sueño o Peso).
  const guidanceShownRef = useRef(false);

  useEffect(() => {
    const sync = async () => {
      const {
        bodyMetrics,
        nutritionProfile,
        nutritionGoal,
        sleepLog,
        addBodyMetric,
        updateMacroTargets,
        addSleep,
        showToast,
      } = ctxRef.current;

      if (!isNativePlatform()) return;
      try {
        const st = await getHealthStatus();
        if (!st.authorized) return;

        const perms = await hasSleepWeightPermission();
        let addedSleep = 0;
        let addedWeight: number | null = null;

        // Permisos parciales/revocados: guía clara en vez de fallo silencioso.
        if (perms.sleep || perms.weight) {
          guidanceShownRef.current = false;
        } else if (!guidanceShownRef.current) {
          guidanceShownRef.current = true;
          showToast(
            "Health Connect conectado, pero sin permisos de Sueño ni Peso: concedelos en Ajustes del sistema para sincronizar.",
            "info"
          );
        }

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
              // FIX (prioridad alta): recalcula con el OBJETIVO ACTUAL del
              // usuario (cut/maintenance/lean_bulk/bulk/keto), no siempre keto.
              const t = computePersonalTargets(w.weightKg, nutritionGoal, nutritionProfile);
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
  }, []);

  return null;
};