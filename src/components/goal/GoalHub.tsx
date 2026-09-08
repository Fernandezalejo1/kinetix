import React, { useMemo, useState } from "react";
import {
  Target,
  Moon,
  Sun,
  HeartPulse,
  Timer,
  Flame,
  TrendingDown,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Activity,
  BedDouble,
  RefreshCw,
} from "lucide-react";
import { useGoal } from "../../context/GoalContext";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { GoalPhase } from "../../types";
import { localDateKey } from "../../utils/dateUtils";
import {
  PHASE_CONFIG,
  PHASE_ORDER,
  suggestPhase,
  phaseProgress,
  recommendedSleepWindow,
  sleepHoursOf,
  currentBodyFat,
  computeReadiness,
  weeklyCardioMinutes,
  READINESS_VERDICTS,
} from "../../utils/goalEngine";
import { computeAbsEstimate } from "../../utils/absEstimator";
import { computePersonalTargets, DEFAULT_WEIGHT_KG } from "../../data/nutritionData";
import { latestBodyMetric } from "../../utils/absEstimator";
import { isNativePlatform, requestHealthSyncNow } from "../../utils/healthConnect";

interface GoalHubProps {
  onGoToPrograms?: () => void;
}

const QUALITY_LABELS = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"];
const QUALITY_COLORS = ["", "text-rose-400", "text-orange-400", "text-amber-300", "text-emerald-300", "text-emerald-400"];

export const GoalHub: React.FC<GoalHubProps> = ({ onGoToPrograms }) => {
  const {
    phase,
    setPhase,
    sleepLog,
    addSleep,
    removeSleep,
    readinessLog,
    addReadiness,
    cardioLog,
    addCardio,
    removeCardio,
  } = useGoal();
  const { bodyMetrics, nutritionProfile, nutritionLog, updateMacroTargets } = useWorkout();
  const { showToast } = useToast();

  const today = localDateKey();

  // ---- Fase / composición ----
  const bf = useMemo(() => currentBodyFat(bodyMetrics, nutritionProfile), [bodyMetrics, nutritionProfile]);
  const abs = useMemo(() => computeAbsEstimate(bodyMetrics, nutritionProfile), [bodyMetrics, nutritionProfile]);
  const targetBf = nutritionProfile.sex === "masculino" ? 12 : 20;
  const suggested = suggestPhase(bf.pct, nutritionProfile.sex);
  const progress = phaseProgress(bf.pct, nutritionProfile.sex);
  const cfg = PHASE_CONFIG[phase.id];
  const suggestedCfg = PHASE_CONFIG[suggested];

  const applyPhase = (id: GoalPhase) => {
    setPhase(id);
    // Recalcula los objetivos keto según la fase (déficit / mantenimiento / +8%).
    const weightKg = latestBodyMetric(bodyMetrics)?.weightKg ?? DEFAULT_WEIGHT_KG;
    const deficit = id === "cut" ? nutritionProfile.deficitPercent : id === "maintenance" ? 0 : -8;
    const t = computePersonalTargets(weightKg, "keto", { ...nutritionProfile, deficitPercent: deficit });
    updateMacroTargets({ calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats });
    showToast(`Fase: ${PHASE_CONFIG[id].label} · Objetivos recalculados`, "success");
  };

  // ---- Sueño ----
  const [sBed, setSBed] = useState("02:30");
  const [sWake, setSWake] = useState("10:00");
  const [sQuality, setSQuality] = useState(3);
  const sleepWindow = recommendedSleepWindow(nutritionProfile.workEnd);
  const weeklySleepAvg = useMemo(() => {
    const recent = sleepLog.slice(0, 7);
    if (recent.length === 0) return null;
    const total = recent.reduce((s, e) => s + sleepHoursOf(e.bed, e.wake), 0);
    return Math.round((total / recent.length) * 10) / 10;
  }, [sleepLog]);
  const lastSleep = sleepLog[0];

  const saveSleep = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = sleepHoursOf(sBed, sWake);
    if (hours < 2 || hours > 14) {
      showToast("Horario de sueño no válido (2–14 h)", "error");
      return;
    }
    addSleep({ date: today, bed: sBed, wake: sWake, quality: sQuality });
    showToast(`Sueño registrado: ${hours} h`, "success");
  };

  // ---- Readiness ----
  const [rFatigue, setRFatigue] = useState(3);
  const [rSoreness, setRSoreness] = useState(2);
  const [rSleepHours, setRSleepHours] = useState<string>(
    lastSleep ? String(sleepHoursOf(lastSleep.bed, lastSleep.wake)) : "7"
  );
  const todayReadiness = readinessLog.find((r) => r.date === today);
  const readinessPreview = computeReadiness({
    sleepHours: parseFloat(rSleepHours) || 0,
    sleepQuality: lastSleep?.quality ?? 3,
    fatigue: rFatigue,
    soreness: rSoreness,
  });

  const saveReadiness = (e: React.FormEvent) => {
    e.preventDefault();
    addReadiness({
      date: today,
      fatigue: rFatigue,
      soreness: rSoreness,
      sleepHours: parseFloat(rSleepHours) || 0,
    });
    showToast("Readiness registrado", "success");
  };

  // ---- Cardio ----
  const weeklyCardio = weeklyCardioMinutes(cardioLog);
  const cardioTarget = cfg.cardioMinPerWeek;
  const cardioPct = Math.min(100, Math.round((weeklyCardio / Math.max(1, cardioTarget)) * 100));

  const quickCardio = (type: "liss" | "hiit", minutes: number, label: string) => {
    addCardio({ date: today, type, minutes });
    showToast(`${label} +${minutes} min registrados`, "success");
  };

  return (
    <div id="goal-hub" className="space-y-6 animate-fadeIn pb-16 min-w-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Objetivo</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {bf.pct != null
              ? `Grasa corporal ${bf.pct}% (${bf.source === "medido" ? "medida" : "estimada por IMC"}) · objetivo ≈${targetBf}% · ${PHASE_CONFIG[phase.id].short} activo`
              : "Registrá tu peso y % de grasa en Analytics para activar el plan de fases"}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${phase.id === "cut" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : phase.id === "maintenance" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"}`}>
          Fase: {cfg.short}
        </span>
      </div>

      {/* ================= PLAN DE FASES ================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border border-amber-500/25 shadow-2xl space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Plan de Fases · Cut → Mantenimiento → Lean Bulk</h3>
            <p className="text-[11px] text-neutral-400">Una sola app que dirige toda tu trayectoria hacia el six-pack y después</p>
          </div>
        </div>

        {/* Roadmap stepper */}
        <div className="flex items-stretch gap-1.5 sm:gap-2">
          {PHASE_ORDER.map((pid, idx) => {
            const pcfg = PHASE_CONFIG[pid];
            const isActive = phase.id === pid;
            const isDone = PHASE_ORDER.indexOf(phase.id) > idx;
            return (
              <button
                key={pid}
                onClick={() => applyPhase(pid)}
                className={`flex-1 p-3 rounded-2xl border text-left transition-all ${
                  isActive
                    ? "bg-neutral-950 border-amber-500/60 shadow-lg shadow-amber-500/10"
                    : "bg-neutral-950/50 border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isDone ? (
                    <CheckCircle2 className={`w-4 h-4 ${pcfg.accent}`} />
                  ) : (
                    <span className={`w-4 h-4 rounded-full border-2 ${isActive ? "border-amber-400 bg-amber-400/20" : "border-neutral-600"}`} />
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-white" : "text-neutral-500"}`}>
                    {pcfg.short}
                  </span>
                </div>
                <div className={`text-[11px] font-bold mt-1 ${isActive ? "text-amber-300" : "text-neutral-400"}`}>{pcfg.label}</div>
                <div className="text-[9px] text-neutral-500 mt-0.5 leading-snug">{pcfg.calorieLabel} · {pcfg.cardioMinPerWeek} min cardio/sem</div>
              </button>
            );
          })}
        </div>

        {/* Progress toward target BF */}
        {bf.pct != null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-neutral-300">Progreso hacia ≈{targetBf}% de grasa</span>
              <span className="text-amber-300">{progress}%</span>
            </div>
            <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>{bf.pct}% actual</span>
              {abs.timeline && <span>{abs.timeline.kgToLose.toFixed(1)} kg de grasa por perder</span>}
              <span className="text-emerald-400">≈{targetBf}%</span>
            </div>
          </div>
        )}

        {/* Suggestion when BF suggests another phase */}
        {bf.pct != null && suggested !== phase.id && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-[11px] text-neutral-200 leading-relaxed flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
            <span>
              <strong className="text-cyan-300">Sugerencia:</strong> con {bf.pct}% de grasa tu siguiente fase natural es{" "}
              <strong className="text-white">{suggestedCfg.label}</strong>. Tocá la fase arriba para activarla y la app
              recalcula tus objetivos keto.
            </span>
          </div>
        )}

        {/* Recommended config for active phase */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Tu configuración recomendada</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Programa</span>
              <span className="font-bold text-white leading-snug">{cfg.programTitle}</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Calorías</span>
              <span className="font-bold text-white">{cfg.calorieLabel}</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Proteína</span>
              <span className="font-bold text-white">{cfg.proteinPerKg} g/kg</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Cardio</span>
              <span className="font-bold text-white">{cfg.cardioMinPerWeek} min/sem{cfg.hiitSessionsPerWeek > 0 ? ` + ${cfg.hiitSessionsPerWeek} HIIT` : ""}</span>
            </div>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed">{cfg.description}</p>
          {onGoToPrograms && (
            <button
              onClick={onGoToPrograms}
              className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
            >
              Ver {cfg.programTitle.split("(")[0]} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= SUEÑO ================= */}
        <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-indigo-500/25 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Sueño & Turno Nocturno</h3>
              <p className="text-[11px] text-neutral-400">Clave para el déficit: dormí bien o la grasa no se va</p>
            </div>
            <button
              onClick={() => {
                if (!isNativePlatform()) {
                  showToast("La sincronización automática funciona en la app Android (APK). Acá podés registrar el sueño a mano.", "info");
                  return;
                }
                showToast("Sincronizando sueño y peso desde Health Connect…", "info");
                requestHealthSyncNow();
              }}
              className="ml-auto shrink-0 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1.5"
              title="Leer sueño y peso de Health Connect"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-neutral-300">
              <BedDouble className="w-4 h-4 text-indigo-400" />
              <span>
                Turno <strong className="text-white">{nutritionProfile.workStart}–{nutritionProfile.workEnd}</strong> → dormí
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-white font-mono">{sleepWindow.start} → {sleepWindow.end}</div>
              <div className="text-[9px] text-neutral-500">≈{sleepWindow.hours} h recomendadas</div>
            </div>
          </div>

          <form onSubmit={saveSleep} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Acostarse</span>
                <input
                  type="time"
                  value={sBed}
                  onChange={(e) => setSBed(e.target.value)}
                  className="mt-1 w-full px-2 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Despertar</span>
                <input
                  type="time"
                  value={sWake}
                  onChange={(e) => setSWake(e.target.value)}
                  className="mt-1 w-full px-2 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </label>
              <div className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Calidad</span>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSQuality(q)}
                      className={`flex-1 h-[42px] rounded-xl text-xs font-black transition-all ${
                        sQuality === q ? "bg-indigo-600 text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-500 hover:text-white"
                      }`}
                      title={QUALITY_LABELS[q]}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-neutral-500">{QUALITY_LABELS[sQuality]} · {sleepHoursOf(sBed, sWake)} h</span>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-colors shadow-lg shadow-indigo-600/20">
                Registrar noche
              </button>
            </div>
          </form>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-neutral-400">Últimas noches</span>
              <span className="text-indigo-300">{weeklySleepAvg != null ? `promedio ${weeklySleepAvg} h` : "sin datos"}</span>
            </div>
            {sleepLog.length === 0 ? (
              <p className="text-[10px] text-neutral-500 p-2 rounded-xl bg-neutral-950 border border-neutral-800">Registrá tu primera noche para ver el historial.</p>
            ) : (
              sleepLog.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.source === "healthconnect" && (
                      <span className="px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[8px] font-black" title="Sincronizado desde Health Connect">HC</span>
                    )}
                    <span className={`text-[10px] font-black ${QUALITY_COLORS[s.quality] || "text-neutral-400"}`}>{"●".repeat(s.quality)}{"○".repeat(5 - s.quality)}</span>
                    <span className="text-[11px] text-neutral-300 truncate">{s.date} · {s.bed}→{s.wake} · <strong className="text-white">{sleepHoursOf(s.bed, s.wake)}h</strong></span>
                  </div>
                  <button onClick={() => removeSleep(s.id)} className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
            <p className="text-[9px] text-neutral-600">
              Las noches registradas por tu reloj/balanza (Health Connect) se suman solas con el badge HC; no pisan tus registros manuales.
            </p>
          </div>
        </div>

        {/* ================= READINESS ================= */}
        <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-rose-500/25 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Readiness · ¿Cómo estás hoy?</h3>
              <p className="text-[11px] text-neutral-400">El coach decide: dale / moderado / descanso</p>
            </div>
          </div>

          {todayReadiness ? (
            <div className={`p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 ${READINESS_VERDICTS[todayReadiness.verdict].color}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider">{READINESS_VERDICTS[todayReadiness.verdict].label}</span>
                <span className="text-2xl font-black font-mono">{todayReadiness.score}<span className="text-sm text-neutral-500">/100</span></span>
              </div>
              <p className="text-[11px] text-neutral-400">{READINESS_VERDICTS[todayReadiness.verdict].tip}</p>
              <p className="text-[9px] text-neutral-500">registrado hoy · fatiga {todayReadiness.fatigue}/5 · agujetas {todayReadiness.soreness}/5 · sueño {todayReadiness.sleepHours} h</p>
            </div>
          ) : (
            <form onSubmit={saveReadiness} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Fatiga percibida</span>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" onClick={() => setRFatigue(v)} className={`flex-1 h-[42px] rounded-xl text-xs font-black transition-all ${rFatigue === v ? "bg-rose-600 text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-500 hover:text-white"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Agujetas (DOMS)</span>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" onClick={() => setRSoreness(v)} className={`flex-1 h-[42px] rounded-xl text-xs font-black transition-all ${rSoreness === v ? "bg-orange-600 text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-500 hover:text-white"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Horas de sueño anoche {lastSleep && "(de tu registro)"}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  max={14}
                  value={rSleepHours}
                  onChange={(e) => setRSleepHours(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-rose-500"
                />
              </label>

              <div className={`p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 ${READINESS_VERDICTS[readinessPreview.verdict].color}`}>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider">{READINESS_VERDICTS[readinessPreview.verdict].label}</span>
                  <p className="text-[9px] text-neutral-500 mt-0.5">{READINESS_VERDICTS[readinessPreview.verdict].tip}</p>
                </div>
                <span className="text-xl font-black font-mono">{readinessPreview.score}</span>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-colors shadow-lg shadow-rose-600/20">
                Guardar readiness de hoy
              </button>
            </form>
          )}

          {readinessLog.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Últimos 7 días</span>
              <div className="flex gap-1.5">
                {readinessLog.slice(0, 7).map((r) => (
                  <div key={r.id} className="flex-1 p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-center" title={`${r.date} · ${READINESS_VERDICTS[r.verdict].label}`}>
                    <div className="text-[9px] font-bold text-neutral-500">{new Date(r.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "narrow" })}</div>
                    <div className={`text-xs font-black ${READINESS_VERDICTS[r.verdict].color}`}>{r.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= CARDIO ================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-neutral-900 to-neutral-950 border border-emerald-500/25 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Cardio del Déficit</h3>
              <p className="text-[11px] text-neutral-400">LISS por zonas de FC quema grasa sin comer músculo · HIIT 1×/semana</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-300 font-mono">
            {weeklyCardio} / {cardioTarget} min esta semana
          </span>
        </div>

        <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${cardioPct}%` }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button onClick={() => quickCardio("liss", 20, "LISS 20 min")} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 transition-all text-left">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div className="text-sm font-black text-white mt-1">LISS 20'</div>
            <div className="text-[9px] text-neutral-500">65–70% FC · caminata rápida</div>
          </button>
          <button onClick={() => quickCardio("liss", 30, "LISS 30 min")} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 transition-all text-left">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div className="text-sm font-black text-white mt-1">LISS 30'</div>
            <div className="text-[9px] text-neutral-500">elite de la quema de grasa</div>
          </button>
          <button onClick={() => quickCardio("hiit", 10, "HIIT 10 min")} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-rose-500/40 transition-all text-left">
            <Timer className="w-4 h-4 text-rose-400" />
            <div className="text-sm font-black text-white mt-1">HIIT 10'</div>
            <div className="text-[9px] text-neutral-500">30s sprint / 45s descanso</div>
          </button>
          <button onClick={() => quickCardio("hiit", 15, "HIIT 15 min")} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-rose-500/40 transition-all text-left">
            <Timer className="w-4 h-4 text-rose-400" />
            <div className="text-sm font-black text-white mt-1">HIIT 15'</div>
            <div className="text-[9px] text-neutral-500">máx. 1–2×/semana</div>
          </button>
        </div>

        {cardioLog.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Historial reciente</span>
            {cardioLog.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-300">
                  {c.date} · <strong className={c.type === "liss" ? "text-emerald-300" : "text-rose-300"}>{c.type.toUpperCase()}</strong> · {c.minutes} min
                </span>
                <button onClick={() => removeCardio(c.id)} className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-neutral-500 leading-relaxed flex items-start gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Meta de la fase: {cardioTarget} min/semana{cfg.hiitSessionsPerWeek > 0 ? ` + ${cfg.hiitSessionsPerWeek} sesión HIIT` : ""}. Sumá tus pasos diarios (Reto 21 Días) como NEAT: cada 10.000 pasos ≈ 350–450 kcal extra por día.
          </span>
        </p>
      </div>
    </div>
  );
};