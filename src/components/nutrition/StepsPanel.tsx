import React, { useCallback, useEffect, useState } from "react";
import {
  Footprints,
  RefreshCw,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { localDateKey } from "../../utils/dateUtils";
import { computeStepAdjustment, isLunchPassed, lunchAlreadyLogged, stepBadge, BaseTargets } from "../../utils/stepsRules";
import {
  getHealthStatus,
  isNativePlatform,
  openHealthSettings,
  readTodaySteps,
  requestHealthAuthorization,
  clearStoredDay,
  readStepsConfig,
  readStoredDay,
  saveStepsConfig,
  saveStoredDay,
  subscribeStepsChanged,
  type StepsOfDay,
  type StepsSourceTotal,
} from "../../utils/healthConnect";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export interface StepsPanelProps {
  /** Modo compacto para la vista de nutrición (sin conectar, solo resumen). */
  compact?: boolean;
}

export const StepsPanel: React.FC<StepsPanelProps> = ({ compact }) => {
  const { nutritionLog, nutritionProfile, updateMacroTargets } = useWorkout();
  const { showToast } = useToast();

  const [config, setConfig] = useState(readStepsConfig);
  const [status, setStatus] = useState<{ native: boolean; available: boolean; authorized: boolean }>({
    native: isNativePlatform(),
    available: false,
    authorized: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [manualSteps, setManualSteps] = useState("");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [today, setToday] = useState<{
    date: string;
    steps: number;
    source: "healthconnect" | "manual" | null;
    asOf?: string;
    sources?: StepsSourceTotal[];
    countedSource?: string | null;
  } | null>(
    () => {
      const d = readStoredDay();
      return d
        ? { date: d.date, steps: d.steps, source: d.source, asOf: d.asOf, sources: d.sources, countedSource: d.countedSource }
        : null;
    }
  );
  const [baseToday, setBaseToday] = useState<BaseTargets | null>(() => readStoredDay()?.base ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const todayKey = localDateKey();
  const dayIsToday = today?.date === todayKey;

  // Base targets del día: usamos el base CONGELADO (del primer ajuste) si existe;
  // si no, las metas actuales del log (que aún no tienen ajuste aplicado).
  const liveBase: BaseTargets = {
    calories: nutritionLog.calorieTarget,
    protein: nutritionLog.proteinTarget,
    carbs: nutritionLog.carbsTarget,
    fats: nutritionLog.fatsTarget,
  };
  const baseTargets: BaseTargets = (dayIsToday && baseToday) || liveBase;

  const trainedToday = config.trainedToday;
  const lunchPassed = lunchAlreadyLogged(nutritionLog.meals) || isLunchPassed(new Date(), nutritionProfile.workStart);
  const adjustment = dayIsToday
    ? computeStepAdjustment(
        today?.steps ?? 0,
        baseTargets,
        { stepGoal: config.stepGoal, trainedToday, lunchPassed }
      )
    : null;

  // ---- Refresco reactivo: la UI se actualiza cuando el motor/otra vista
  //      cambian los pasos o la configuración (entrada manual, refresco HC).
  useEffect(() => {
    const refresh = () => {
      const d = readStoredDay();
      setToday(
        d
          ? { date: d.date, steps: d.steps, source: d.source, asOf: d.asOf, sources: d.sources, countedSource: d.countedSource }
          : null
      );
      setBaseToday(d?.base ?? null);
    };
    refresh();
    return subscribeStepsChanged(refresh);
  }, []);

  /** Guarda en el día lo leído de Health Connect (con desglose por fuente). */
  const storeHcDay = useCallback((d: StepsOfDay) => {
    const date = localDateKey();
    setToday({ date, steps: d.steps, source: "healthconnect", asOf: d.asOf, sources: d.sources, countedSource: d.countedSource });
    const stored = readStoredDay();
    saveStoredDay({
      date,
      steps: d.steps,
      source: "healthconnect",
      asOf: d.asOf,
      sources: d.sources,
      countedSource: d.countedSource,
      base: stored?.base,
      adjustment: stored?.adjustment ?? null,
    });
  }, []);

  // Al volver a la app (foreground) re-lee Health Connect en silencio:
  // las apps de origen (Samsung Health, Zepp) vuelcan con demora.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const st = await getHealthStatus();
          if (!st.authorized) return;
          const cfg = readStepsConfig();
          if (!cfg.enabled) return;
          const d = await readTodaySteps();
          if (d.source === "healthconnect") storeHcDay(d);
        } catch {
          /* silencioso */
        }
      }, 1500);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
    };
  }, [storeHcDay]);

  const refreshStatus = useCallback(async () => {
    const st = await getHealthStatus();
    setStatus(st);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleConnect = async () => {
    if (!isNativePlatform()) {
      showToast("Health Connect solo está disponible en la app instalada en tu celular (Android).", "info");
      return;
    }
    setConnecting(true);
    try {
      const ok = await requestHealthAuthorization();
      if (ok) {
        const nextCfg = { ...config, enabled: true };
        setConfig(nextCfg);
        saveStepsConfig(nextCfg);
        const d = await readTodaySteps();
        if (d.source === "healthconnect") {
          storeHcDay(d);
        }
        showToast("Health Connect conectado. Pasos leídos.", "success");
      } else {
        showToast("No se otorgaron los permisos de Health Connect.", "error");
      }
      refreshStatus();
    } catch (e) {
      showToast("Error al conectar Health Connect.", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-verifica permisos antes de leer (evita refrescar con un estado viejo).
      await refreshStatus();
      const d = await readTodaySteps();
      if (d.source === "healthconnect") {
        storeHcDay(d);
        showToast(
          d.steps > 0
            ? `Pasos actualizados: ${d.steps.toLocaleString("es-AR")}.`
            : "Health Connect conectado pero hoy todavía no registró pasos.",
          d.steps > 0 ? "success" : "info"
        );
      } else if (!isNativePlatform()) {
        showToast("No hay datos de pasos en la versión web. Usá la app Android o la entrada manual.", "info");
      } else if (!status.authorized) {
        showToast("Health Connect no autorizado. Conectalo primero para leer pasos.", "error");
      } else {
        showToast("No se pudieron leer los pasos de Health Connect. Revisá permisos.", "error");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualSave = () => {
    const n = parseInt(manualSteps, 10);
    if (isNaN(n) || n < 0) {
      showToast("Ingresá un número válido de pasos.", "error");
      return;
    }
    const date = localDateKey();
    setToday({ date, steps: n, source: "manual", asOf: new Date().toISOString(), sources: undefined, countedSource: undefined });
    const stored = readStoredDay();
    saveStoredDay({
      date,
      steps: n,
      source: "manual",
      asOf: new Date().toISOString(),
      sources: undefined,
      base: stored?.base,
      adjustment: stored?.adjustment ?? null,
    });
    setManualEntryOpen(false);
    setManualSteps("");
    showToast("Pasos cargados manualmente.", "success");
  };

  const handleReset = () => {
    const stored = readStoredDay();
    if (stored?.base) updateMacroTargets(stored.base);
    setToday(null);
    setBaseToday(null);
    clearStoredDay();
    const nextCfg = { ...config, enabled: false, autoApply: false };
    setConfig(nextCfg);
    saveStepsConfig(nextCfg);
    showToast("Ajuste por pasos desactivado para hoy.", "info");
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`p-2 rounded-xl ${status.authorized ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-800 text-neutral-400"}`}>
            <Footprints className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Ajuste por pasos</p>
            <p className="text-[11px] text-neutral-400">
              {config.enabled ? "Activo" : status.available ? "Conectado, sin activar" : "Requiere Health Connect"}
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded((e) => !e)} className="p-2 min-w-[40px] min-h-[40px] rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Steps + adjustment summary (always visible when there's data) */}
      {dayIsToday && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="flex items-end justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Pasos de hoy</p>
              <p className="text-2xl font-black text-white">
                {(today?.steps ?? 0).toLocaleString("es-AR")}
                <span className="text-xs text-neutral-500 font-bold ml-1">/ {config.stepGoal.toLocaleString("es-AR")}</span>
              </p>
              <p className="text-[10px] text-neutral-500 break-words">
                {today?.source === "healthconnect"
                  ? `vía Health Connect${today.asOf ? ` · actualizado ${timeAgo(today.asOf)}` : ""}`
                  : today?.source === "manual"
                    ? "ingresado manualmente (vale hasta el próximo refresco)"
                    : ""}
              </p>
              {today?.source === "healthconnect" && today.sources && today.sources.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {today.sources.map((s) => {
                    const counted = today.countedSource === s.name;
                    return (
                      <p key={s.name} className="text-[10px] text-neutral-500 font-mono truncate">
                        {counted ? "✓ " : ""}{s.name}:{" "}
                        <span className={counted ? "text-emerald-300 font-bold" : "text-neutral-300"}>
                          {s.steps.toLocaleString("es-AR")}
                        </span>
                      </p>
                    );
                  })}
                  {today.sources.length > 1 && (
                    <p className="text-[9px] text-neutral-600">Se cuenta la fuente más alta (sin duplicar).</p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              {adjustment ? (
                <>
                  <p className={`text-lg font-black ${adjustment.caloriesDelta < 0 ? "text-orange-400" : adjustment.caloriesDelta > 0 ? "text-emerald-400" : "text-neutral-400"}`}>
                    {adjustment.caloriesDelta > 0 ? "+" : ""}{adjustment.caloriesDelta} kcal
                  </p>
                  <p className="text-[10px] text-neutral-500">{stepBadge(adjustment)}</p>
                </>
              ) : (
                <p className="text-xs text-neutral-500">Sin ajuste</p>
              )}
            </div>
          </div>
          {config.enabled && adjustment && (
            <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl px-3 py-2.5 flex gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-neutral-300 leading-relaxed">{adjustment.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Config / controls */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-neutral-800/70 pt-4">
          {/* Meta de pasos */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Meta de pasos</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1000}
                  max={40000}
                  step={500}
                  value={config.stepGoal}
                  onChange={(e) => {
                    const v = Math.max(1000, Math.min(40000, parseInt(e.target.value, 10) || 10000));
                    setConfig((c) => ({ ...c, stepGoal: v }));
                    saveStepsConfig({ ...config, stepGoal: v });
                  }}
                  className="w-28 px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-neutral-500">pasos/día</span>
              </div>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, trainedToday: !c.trainedToday }))}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-colors border ${
                config.trainedToday ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" : "bg-neutral-900 text-neutral-400 border-neutral-800"
              }`}
            >
              {config.trainedToday ? "Entrenó hoy ✓" : "Entrenó hoy"}
            </button>
          </div>

          {/* Native connect / manual entry */}
          {status.native ? (
            <div className="space-y-3">
              {!status.available && (
                <p className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  No se detectó Health Connect en este dispositivo. Podés usar la entrada manual o instalarlo desde Google Play.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={status.authorized ? openHealthSettings : handleConnect}
                  disabled={connecting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : status.authorized ? <Link2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {status.authorized ? "Administrar permisos" : "Conectar Health Connect"}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || !status.authorized}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                  aria-label="Actualizar pasos"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-amber-400/90 flex items-start gap-1.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Estás en la versión web/PWA. Health Connect funciona en la app instalada (APK de Capacitor). Acá podés ingresar tus pasos manualmente para probar el motor de reglas.
              </p>
              {!manualEntryOpen ? (
                <button
                  onClick={() => setManualEntryOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors"
                >
                  Ingresar pasos manualmente
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Ej: 6420"
                    value={manualSteps}
                    onChange={(e) => setManualSteps(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleManualSave}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Por qué puede diferir del reloj / Samsung */}
          <details className="bg-neutral-900/60 border border-neutral-800/70 rounded-xl p-3">
            <summary className="text-[11px] font-bold text-neutral-300 cursor-pointer">
              ¿No coincide con tu reloj o Samsung Health?
            </summary>
            <ul className="text-[11px] text-neutral-400 space-y-1 mt-2 leading-relaxed">
              <li>• Este número es lo que <strong className="text-neutral-200">Health Connect</strong> tiene ahora. Samsung Health y Zepp muestran sus propios conteos: solo llegan acá si esas apps vuelcan a Health Connect (con demora de minutos).</li>
              <li>• Samsung Health: Ajustes → Health Connect → permitir Pasos.</li>
              <li>• Zepp: abrí la app para forzar la sincronización del reloj, y activá el enlace con Health Connect / Google Fit.</li>
              <li>• El reloj suele contar más porque registra sin el teléfono encima; al sincronizar se iguala.</li>
              <li>• Con varias fuentes activas (reloj + Samsung + teléfono) se cuenta la más alta para no duplicar los mismos pasos.</li>
              <li>• Si necesitás el valor exacto del reloj ya: ingresalo manualmente abajo (vale hasta el próximo refresco).</li>
            </ul>
          </details>

          {/* Reglas explicadas */}
          <div className="bg-neutral-900/60 border border-neutral-800/70 rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Reglas aplicadas (sin IA, 100% deterministas)</p>
            <ul className="text-[11px] text-neutral-300 space-y-1">
              <li>• 0–5.000 pasos: –250 kcal</li>
              <li>• 5.001–8.000 pasos: –150 kcal</li>
              <li>• 8.001–12.000 pasos: mantener</li>
              <li>• +12.000 pasos: +150 kcal (grasa, keto)</li>
              <li>• Entrenaste hoy → reducción suavizada</li>
              <li>• La proteína nunca baja de su meta</li>
              <li>• Nunca bajo del 80% de tus calorías base</li>
            </ul>
          </div>

          {/* Reset */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] text-neutral-400">
              <input
                type="checkbox"
                checked={config.autoApply}
                onChange={(e) => {
                  const v = e.target.checked;
                  setConfig((c) => ({ ...c, autoApply: v }));
                  saveStepsConfig({ ...config, autoApply: v });
                }}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              Aplicar ajuste automáticamente
            </label>
            <button onClick={() => setConfirmReset(true)} className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-orange-400 transition-colors">
              <Unlink className="w-3.5 h-3.5" />
              Resetear día
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Resetear ajuste por pasos"
        message="¿Revertir el ajuste de macros de hoy? Se volverán a tus objetivos base y el ajuste automático por pasos quedará desactivado."
        confirmLabel="Resetear"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => {
          setConfirmReset(false);
          handleReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};