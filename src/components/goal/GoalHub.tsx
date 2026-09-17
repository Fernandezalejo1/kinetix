import React, { useEffect, useMemo, useState } from "react";
import {
  Target,
  Moon,
  Sun,
  HeartPulse,
  Timer,
  Flame,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Activity,
  BedDouble,
  RefreshCw,
  Ruler,
  Trophy,
  ChevronDown,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import { useGoal } from "../../context/GoalContext";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { useBackHandler } from "../../context/BackNavContext";
import { FocusTrap } from "../FocusTrap";
import { GoalPhase, NutritionGoal } from "../../types";
import {
  isNutritionGoalCustomized,
  localStorageReader,
  phaseToNutritionGoal,
} from "../../utils/nutritionGoalSync";
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
import { computePersonalTargets, DEFAULT_WEIGHT_KG, NUTRITION_GOALS } from "../../data/nutritionData";
import { latestBodyMetric } from "../../utils/absEstimator";
import { isNativePlatform, requestHealthSyncNow } from "../../utils/healthConnect";
import { BASIC_LIFT_IDS } from "../../data/basicLifts";
import { formatWeight } from "../../utils/weightUnits";
import { BodyMeasurementsPanel } from "../profile/BodyMeasurementsPanel";
import { PrBasicsPanel } from "../profile/PrBasicsPanel";

interface GoalHubProps {
  onGoToPrograms?: () => void;
}

type SectionId = "objectives" | "measures" | "sleep" | "strength" | "cardio";

const QUALITY_LABELS = ["", "Muy mal", "Mal", "Regular", "Buena", "Excelente"];
const QUALITY_EMOJIS = ["", "😫", "😴", "😐", "🙂", "😊"];
const QUALITY_COLORS = ["", "text-rose-400", "text-orange-400", "text-amber-300", "text-emerald-300", "text-emerald-400"];
const QUALITY_BG = ["", "bg-rose-500/20 border-rose-500/30", "bg-orange-500/20 border-orange-500/30", "bg-amber-500/20 border-amber-500/30", "bg-emerald-500/20 border-emerald-500/30", "bg-emerald-500/25 border-emerald-400/40"];

const READINESS_HEX: Record<string, string> = {
  dale: "#34d399",
  moderado: "#fbbf24",
  descanso: "#fb7185",
};

const ReadinessGauge: React.FC<{ score: number; verdict: string; size?: number }> = ({ score, verdict, size = 84 }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const hex = READINESS_HEX[verdict] ?? "#34d399";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Energía ${score} de 100`}>
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black font-mono text-white leading-none" style={{ fontSize: Math.max(14, size * 0.22) }}>{score}</span>
        <span className="text-neutral-400 leading-none" style={{ fontSize: Math.max(8, size * 0.11) }}>/100</span>
      </div>
    </div>
  );
};

/** Panel de sección del Perfil: se abre desde una tarjeta, se cierra con la X,
 *  con Escape o con Atrás (registrado en el stack de navegación). */
const SectionSheet: React.FC<{
  id: SectionId;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ id, title, subtitle, onClose, children }) => {
  useBackHandler(`goal-section-${id}`, () => {
    onClose();
    return true;
  }, 200);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <FocusTrap>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-3xl max-h-[88vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 pb-nav space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="touch-target shrink-0 flex items-center justify-center rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              aria-label="Cerrar sección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </FocusTrap>
  );
};

/** Tarjeta de acceso a una sección: resumen primero, acción concreta después. */
const HubCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  summary: string;
  detail: string;
  action: string;
  accent: string;
  progress?: number;
  onOpen: () => void;
}> = ({ icon, title, summary, detail, action, accent, progress, onOpen }) => (
  <button
    onClick={onOpen}
    className="w-full text-left p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition-colors min-h-[132px] flex flex-col gap-2"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`p-2.5 rounded-xl border shrink-0 ${accent}`}>{icon}</span>
      <span className="text-sm font-black text-white tracking-tight break-words">{title}</span>
      <ChevronRight className="w-4 h-4 text-neutral-500 ml-auto shrink-0" />
    </div>
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-bold text-neutral-100">{summary}</p>
      <p className="text-[11px] text-neutral-400 leading-snug">{detail}</p>
      {progress !== undefined && (
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
    <span className="mt-auto inline-flex items-center gap-1 text-xs font-black text-cyan-300">
      {action} <ArrowRight className="w-3.5 h-3.5" />
    </span>
  </button>
);

/** Bloque desplegable para historiales: cerrado por defecto. */
const Disclosure: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-neutral-950 border border-neutral-800">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-[48px] px-3 flex items-center justify-between gap-2 text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">
          {label}
          {hint && <span className="ml-1 font-bold normal-case tracking-normal text-neutral-400">· {hint}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
};

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
  const { bodyMetrics, personalRecordHistory, nutritionProfile, nutritionGoal, updateMacroTargets, syncNutritionGoalFromPhase, weightUnit } = useWorkout();
  const { showToast } = useToast();

  const today = localDateKey();
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const closeSection = React.useCallback(() => setOpenSection(null), []);

  // ---- Fase / composición ----
  const bf = useMemo(() => currentBodyFat(bodyMetrics, nutritionProfile), [bodyMetrics, nutritionProfile]);
  const abs = useMemo(() => computeAbsEstimate(bodyMetrics, nutritionProfile), [bodyMetrics, nutritionProfile]);
  const targetBf = nutritionProfile.sex === "masculino" ? 12 : 20;
  const suggested = suggestPhase(bf.pct, nutritionProfile.sex);
  const progress = phaseProgress(bf.pct, nutritionProfile.sex);
  const cfg = PHASE_CONFIG[phase.id];
  const suggestedCfg = PHASE_CONFIG[suggested];

  // ---- Medidas ----
  const latest = useMemo(() => (bodyMetrics.length ? latestBodyMetric(bodyMetrics) : null), [bodyMetrics]);
  const measuredKinds = useMemo(() => {
    const names = new Set<string>();
    for (const m of bodyMetrics) {
      for (const [name, value] of Object.entries(m.measurements ?? {})) {
        if (typeof value === "number" && Number.isFinite(value)) names.add(name);
      }
    }
    return names.size;
  }, [bodyMetrics]);

  // ---- Marcas de fuerza ----
  const liftMarks = useMemo(
    () => new Set(personalRecordHistory.filter((p) => p.type === "1RM").map((p) => p.exerciseId)).size,
    [personalRecordHistory]
  );

  const applyPhase = (id: GoalPhase) => {
    setPhase(id);
    // Fuente única de verdad: la fase alinea la estrategia nutricional, salvo
    // que el usuario la haya personalizado en Nutrición (esa elección gana).
    const mapped = phaseToNutritionGoal(id);
    const customized = isNutritionGoalCustomized(localStorageReader);
    const effective: NutritionGoal = customized ? nutritionGoal : mapped;
    if (!customized && mapped !== nutritionGoal) syncNutritionGoalFromPhase(mapped);
    // Recalcula los objetivos con la estrategia efectiva según la fase
    // (déficit / mantenimiento / +8%).
    const weightKg = latestBodyMetric(bodyMetrics)?.weightKg ?? DEFAULT_WEIGHT_KG;
    const deficit = id === "cut" ? nutritionProfile.deficitPercent : id === "maintenance" ? 0 : -8;
    const t = computePersonalTargets(weightKg, effective, { ...nutritionProfile, deficitPercent: deficit });
    updateMacroTargets({ calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats });
    showToast(
      customized
        ? `Fase: ${PHASE_CONFIG[id].label} · Objetivos recalculados (tu estrategia nutricional no se tocó)`
        : `Fase: ${PHASE_CONFIG[id].label} · Nutrición alineada a ${NUTRITION_GOALS[mapped].label}`,
      "success"
    );
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
    showToast("Energía registrada", "success");
  };

  // ---- Cardio ----
  const weeklyCardio = weeklyCardioMinutes(cardioLog);
  const cardioTarget = cfg.cardioMinPerWeek;
  const cardioPct = Math.min(100, Math.round((weeklyCardio / Math.max(1, cardioTarget)) * 100));

  const quickCardio = (type: "liss" | "hiit", minutes: number, label: string) => {
    addCardio({ date: today, type, minutes });
    showToast(`${label} +${minutes} min registrados`, "success");
  };

  const bfSummary = bf.pct != null ? `Grasa corporal ${bf.pct}%` : "Grasa corporal sin dato";

  return (
    <div id="goal-hub" className="space-y-5 animate-fadeIn pb-8 min-w-0">
      {/* Resumen del día: qué toca y dónde tocar para cada cosa */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Perfil</h2>
        <p className="text-sm text-neutral-300 mt-1 leading-snug">
          {bf.pct != null
            ? `${bfSummary} · objetivo ≈${targetBf}% · fase ${cfg.short} activa`
            : "Registrá tu peso para activar el plan de fases y los objetivos"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HubCard
          icon={<Target className="w-5 h-5" />}
          title="Objetivos y preferencias"
          summary={`Fase ${cfg.short} · ${cfg.calorieLabel}`}
          detail={
            bf.pct != null
              ? `${bfSummary} · objetivo ≈${targetBf}% · ${progress}% del camino`
              : "Definí fase, calorías y cardio recomendado"
          }
          action="Configurar fase"
          accent="bg-amber-500/10 text-amber-400 border-amber-500/25"
          progress={bf.pct != null ? progress : undefined}
          onOpen={() => setOpenSection("objectives")}
        />
        <HubCard
          icon={<Ruler className="w-5 h-5" />}
          title="Medidas corporales"
          summary={
            latest
              ? `${latest.date} · ${formatWeight(latest.weightKg, weightUnit)} ${weightUnit}`
              : "Sin registros todavía"
          }
          detail={
            latest
              ? `${measuredKinds} medida${measuredKinds !== 1 ? "s" : ""} con datos · ${bodyMetrics.length} registro${bodyMetrics.length !== 1 ? "s" : ""}`
              : "Registrá peso y perímetros para ver su evolución"
          }
          action={latest ? "Registrar medición" : "Empezar a registrar"}
          accent="bg-violet-500/10 text-violet-400 border-violet-500/25"
          onOpen={() => setOpenSection("measures")}
        />
        <HubCard
          icon={<Moon className="w-5 h-5" />}
          title="Sueño y recuperación"
          summary={weeklySleepAvg != null ? `Promedio ${weeklySleepAvg} h (7 noches)` : "Sin noches registradas"}
          detail={
            todayReadiness
              ? `Energía de hoy ${todayReadiness.score}/100 · ${READINESS_VERDICTS[todayReadiness.verdict].label}`
              : "Energía de hoy sin registrar"
          }
          action="Registrar sueño o readiness"
          accent="bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
          onOpen={() => setOpenSection("sleep")}
        />
        <HubCard
          icon={<Trophy className="w-5 h-5" />}
          title="Marcas de fuerza"
          summary={`${liftMarks} de ${BASIC_LIFT_IDS.length} básicos con 1RM`}
          detail={liftMarks > 0 ? "Mirá cuánto tardó en subir cada marca" : "Registrá tu primer 1RM de los básicos"}
          action={liftMarks > 0 ? "Ver marcas" : "Registrar marca"}
          accent="bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
          onOpen={() => setOpenSection("strength")}
        />
        <HubCard
          icon={<Flame className="w-5 h-5" />}
          title="Cardio del déficit"
          summary={`${weeklyCardio} / ${cardioTarget} min esta semana`}
          detail={`LISS por zonas de FC y HIIT ${cfg.hiitSessionsPerWeek > 0 ? `${cfg.hiitSessionsPerWeek}×/semana` : "opcional"}`}
          action="Registrar cardio"
          accent="bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
          progress={cardioPct}
          onOpen={() => setOpenSection("cardio")}
        />
      </div>

      {/* ============ SECCIÓN: OBJETIVOS Y PREFERENCIAS ============ */}
      {openSection === "objectives" && (
        <SectionSheet
          id="objectives"
          title="Objetivos y preferencias"
          subtitle="Fase activa, objetivo de grasa y configuración recomendada"
          onClose={closeSection}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Fases del plan</span>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {PHASE_ORDER.map((pid, idx) => {
                  const pcfg = PHASE_CONFIG[pid];
                  const isActive = phase.id === pid;
                  const isDone = PHASE_ORDER.indexOf(phase.id) > idx;
                  return (
                    <button
                      key={pid}
                      onClick={() => applyPhase(pid)}
                      className={`flex-1 p-3 rounded-2xl border text-left transition-all min-h-[88px] ${
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
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? "text-white" : "text-neutral-400"}`}>
                          {pcfg.short}
                        </span>
                      </div>
                      <div className={`text-[11px] font-bold mt-1 ${isActive ? "text-amber-300" : "text-neutral-400"}`}>{pcfg.label}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                        {pcfg.calorieLabel} · {pcfg.cardioMinPerWeek} min cardio/sem
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {bf.pct != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-neutral-300">Progreso hacia ≈{targetBf}% de grasa</span>
                  <span className="text-amber-300">{progress}%</span>
                </div>
                <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{bf.pct}% actual</span>
                  {abs.timeline && <span>{abs.timeline.kgToLose.toFixed(1)} kg de grasa por perder</span>}
                  <span className="text-emerald-400">≈{targetBf}%</span>
                </div>
              </div>
            )}

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

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Tu configuración recomendada</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400 block text-[11px]">Programa</span>
                  <span className="font-bold text-white leading-snug">{cfg.programTitle}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400 block text-[11px]">Calorías</span>
                  <span className="font-bold text-white">{cfg.calorieLabel}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400 block text-[11px]">Proteína</span>
                  <span className="font-bold text-white">{cfg.proteinPerKg} g/kg</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400 block text-[11px]">Cardio</span>
                  <span className="font-bold text-white">
                    {cfg.cardioMinPerWeek} min/sem{cfg.hiitSessionsPerWeek > 0 ? ` + ${cfg.hiitSessionsPerWeek} HIIT` : ""}
                  </span>
                </div>
              </div>
              <Disclosure label="Por qué esta configuración">
                <p className="text-xs text-neutral-300 leading-relaxed">{cfg.description}</p>
              </Disclosure>
              {onGoToPrograms && (
                <button
                  onClick={() => {
                    closeSection();
                    onGoToPrograms();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black transition-colors shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5"
                >
                  Elegir programa en Entrenar <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </SectionSheet>
      )}

      {/* ============ SECCIÓN: MEDIDAS CORPORALES ============ */}
      {openSection === "measures" && (
        <SectionSheet
          id="measures"
          title="Medidas corporales"
          subtitle="Registrá peso y perímetros: cada registro queda con su fecha"
          onClose={closeSection}
        >
          <BodyMeasurementsPanel />
        </SectionSheet>
      )}

      {/* ============ SECCIÓN: MARCAS DE FUERZA ============ */}
      {openSection === "strength" && (
        <SectionSheet
          id="strength"
          title="Marcas de fuerza"
          subtitle="1RM de los básicos con su fecha, para ver la evolución"
          onClose={closeSection}
        >
          <PrBasicsPanel />
        </SectionSheet>
      )}

      {/* ============ SECCIÓN: SUEÑO Y RECUPERACIÓN ============ */}
      {openSection === "sleep" && (
        <SectionSheet
          id="sleep"
          title="Sueño y recuperación"
          subtitle={`Turno ${nutritionProfile.workStart}–${nutritionProfile.workEnd} · readiness del día`}
          onClose={closeSection}
        >
          <div className="space-y-4">
            {/* Sueño */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-indigo-500/25 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                  <Moon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white">Sueño</h3>
                  <p className="text-[11px] text-neutral-400">
                    {weeklySleepAvg != null ? `Promedio ${weeklySleepAvg} h en las últimas 7 noches` : "Sin noches registradas"}
                  </p>
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
                  className="ml-auto shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-transparent border border-neutral-700 hover:border-indigo-400 hover:bg-indigo-500/10 text-neutral-300 hover:text-indigo-300 text-[11px] font-bold transition-colors flex items-center gap-1.5"
                  title="Leer sueño y peso de Health Connect"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sincronizar
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <BedDouble className="w-4 h-4 text-indigo-400" />
                  <span>
                    Ventana recomendada por tu turno{" "}
                    <strong className="text-neutral-200">{nutritionProfile.workStart}–{nutritionProfile.workEnd}</strong>
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-white font-mono">{sleepWindow.start} → {sleepWindow.end}</div>
                  <div className="text-[11px] text-neutral-400">≈{sleepWindow.hours} h sugeridas</div>
                </div>
              </div>

              <form onSubmit={saveSleep} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Hora de acostarse</span>
                    <input
                      type="time"
                      value={sBed}
                      onChange={(e) => setSBed(e.target.value)}
                      className="mt-1.5 w-full px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-indigo-400"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Hora de despertarse</span>
                    <input
                      type="time"
                      value={sWake}
                      onChange={(e) => setSWake(e.target.value)}
                      className="mt-1.5 w-full px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-indigo-400"
                    />
                  </label>
                </div>
                <div className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Calidad del sueño</span>
                  <div className="flex gap-1.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSQuality(q)}
                        className={`flex-1 min-h-[48px] rounded-xl text-[13px] font-black transition-all flex flex-col items-center justify-center leading-none gap-0.5 ${
                          sQuality === q
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500"
                        }`}
                        title={`${QUALITY_EMOJIS[q]} ${QUALITY_LABELS[q]}`}
                        aria-pressed={sQuality === q}
                      >
                        <span aria-hidden="true">{QUALITY_EMOJIS[q]}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{QUALITY_LABELS[q].slice(0, 4)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${QUALITY_BG[sQuality] ?? "bg-neutral-800 border-neutral-700"} ${QUALITY_COLORS[sQuality]}`}>
                      <span aria-hidden="true">{QUALITY_EMOJIS[sQuality]}</span> {QUALITY_LABELS[sQuality]}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black font-mono">
                      ⏱ {sleepHoursOf(sBed, sWake)} h
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="min-h-[48px] px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black transition-colors shadow-lg shadow-cyan-600/25"
                  >
                    Registrar noche
                  </button>
                </div>
              </form>

              <Disclosure label="Últimas noches" hint={sleepLog.length > 0 ? `${sleepLog.length} registradas` : "sin registros"}>
                {sleepLog.length === 0 ? (
                  <p className="text-[11px] text-neutral-300">Todavía no hay noches registradas. El formulario de arriba guarda la primera.</p>
                ) : (
                  sleepLog.slice(0, 7).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <div className="flex items-center gap-2 min-w-0">
                        {s.source === "healthconnect" && (
                          <span className="px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[11px] font-black" title="Sincronizado desde Health Connect">HC</span>
                        )}
                        <span className={`text-[11px] font-black ${QUALITY_COLORS[s.quality] || "text-neutral-400"}`} aria-label={`Calidad ${QUALITY_LABELS[s.quality] ?? s.quality}`}>
                          {"●".repeat(s.quality)}{"○".repeat(5 - s.quality)}
                        </span>
                        <span className="text-[11px] text-neutral-300 truncate">
                          {s.date} · {s.bed}→{s.wake} · <strong className="text-white">{sleepHoursOf(s.bed, s.wake)}h</strong>
                        </span>
                      </div>
                      <button
                        onClick={() => removeSleep(s.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
                        aria-label={`Eliminar la noche del ${s.date}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
                <p className="text-[11px] text-neutral-400 pt-1">
                  Las noches registradas por tu reloj/balanza (Health Connect) se suman solas con el badge HC; no pisan tus registros manuales.
                </p>
              </Disclosure>
            </div>

            {/* Readiness */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-rose-500/25 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25">
                  <HeartPulse className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white">Energía · ¿Cómo estás hoy?</h3>
                  <p className="text-[11px] text-neutral-400">El coach decide: dale / moderado / descanso</p>
                </div>
              </div>

              {todayReadiness ? (
                <div className={`p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-4 ${READINESS_VERDICTS[todayReadiness.verdict].color}`}>
                  <ReadinessGauge score={todayReadiness.score} verdict={todayReadiness.verdict} />
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider">{READINESS_VERDICTS[todayReadiness.verdict].label}</span>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">{READINESS_VERDICTS[todayReadiness.verdict].tip}</p>
                    <p className="text-[11px] text-neutral-400">
                      registrado hoy · fatiga {todayReadiness.fatigue}/5 · agujetas {todayReadiness.soreness}/5 · sueño {todayReadiness.sleepHours} h
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={saveReadiness} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Fatiga percibida</span>
                      <div className="flex gap-1.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setRFatigue(v)}
                            aria-pressed={rFatigue === v}
                            className={`flex-1 min-h-[48px] rounded-xl text-sm font-black transition-all ${
                              rFatigue === v ? "bg-rose-600 text-white" : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Agujetas (DOMS)</span>
                      <div className="flex gap-1.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setRSoreness(v)}
                            aria-pressed={rSoreness === v}
                            className={`flex-1 min-h-[48px] rounded-xl text-sm font-black transition-all ${
                              rSoreness === v ? "bg-orange-600 text-white" : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="block min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                      Horas de sueño anoche {lastSleep ? "(de tu registro)" : ""}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={0}
                      max={14}
                      value={rSleepHours}
                      onChange={(e) => setRSleepHours(e.target.value)}
                      className="mt-1.5 w-full px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-rose-400"
                    />
                  </label>

                  <div className={`p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 ${READINESS_VERDICTS[readinessPreview.verdict].color}`}>
                    <ReadinessGauge score={readinessPreview.score} verdict={readinessPreview.verdict} size={56} />
                    <div className="min-w-0">
                      <span className="text-xs font-black uppercase tracking-wider">{READINESS_VERDICTS[readinessPreview.verdict].label}</span>
                      <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">{READINESS_VERDICTS[readinessPreview.verdict].tip}</p>
                    </div>
                  </div>

                  <button type="submit" className="w-full min-h-[48px] py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black transition-colors shadow-lg shadow-rose-600/20">
                    Guardar readiness de hoy
                  </button>
                </form>
              )}

              <Disclosure label="Últimos 7 días" hint={readinessLog.length > 0 ? `${readinessLog.length} registros` : "sin registros"}>
                {readinessLog.length === 0 ? (
                  <p className="text-[11px] text-neutral-300">Sin registros todavía: el formulario calcula tu readiness de hoy.</p>
                ) : (
                  <div className="flex gap-1.5">
                    {readinessLog.slice(0, 7).map((r) => (
                      <div
                        key={r.id}
                        className="flex-1 p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-center min-w-0"
                        title={`${r.date} · ${READINESS_VERDICTS[r.verdict].label}`}
                      >
                        <div className="text-[11px] font-bold text-neutral-400">
                          {new Date(r.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "narrow" })}
                        </div>
                        <div className={`text-xs font-black ${READINESS_VERDICTS[r.verdict].color}`}>{r.score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Disclosure>
            </div>
          </div>
        </SectionSheet>
      )}

      {/* ============ SECCIÓN: CARDIO ============ */}
      {openSection === "cardio" && (
        <SectionSheet
          id="cardio"
          title="Cardio del déficit"
          subtitle="LISS por zonas de FC quema grasa sin comer músculo · HIIT 1×/semana"
          onClose={closeSection}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Semana en curso</span>
                <span className="text-xs font-bold text-emerald-300 font-mono">
                  {weeklyCardio} / {cardioTarget} min
                </span>
              </div>
              <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${cardioPct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => quickCardio("liss", 20, "LISS 20 min")} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all text-left min-h-[88px]">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <div className="text-sm font-black text-white mt-1">LISS 20'</div>
                  <div className="text-[11px] text-neutral-400">65–70% FC · caminata rápida</div>
                </button>
                <button onClick={() => quickCardio("liss", 30, "LISS 30 min")} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all text-left min-h-[88px]">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <div className="text-sm font-black text-white mt-1">LISS 30'</div>
                  <div className="text-[11px] text-neutral-400">elite de la quema de grasa</div>
                </button>
                <button onClick={() => quickCardio("hiit", 10, "HIIT 10 min")} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 transition-all text-left min-h-[88px]">
                  <Timer className="w-4 h-4 text-rose-400" />
                  <div className="text-sm font-black text-white mt-1">HIIT 10'</div>
                  <div className="text-[11px] text-neutral-400">30s sprint / 45s descanso</div>
                </button>
                <button onClick={() => quickCardio("hiit", 15, "HIIT 15 min")} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-rose-500/40 transition-all text-left min-h-[88px]">
                  <Timer className="w-4 h-4 text-rose-400" />
                  <div className="text-sm font-black text-white mt-1">HIIT 15'</div>
                  <div className="text-[11px] text-neutral-400">máx. 1–2×/semana</div>
                </button>
              </div>

              <Disclosure label="Historial reciente" hint={cardioLog.length > 0 ? `${cardioLog.length} sesiones` : "sin registros"}>
                {cardioLog.length === 0 ? (
                  <p className="text-[11px] text-neutral-300">Sin sesiones registradas: usá los botones de arriba para sumar minutos.</p>
                ) : (
                  cardioLog.slice(0, 8).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <span className="text-[11px] text-neutral-300">
                        {c.date} · <strong className={c.type === "liss" ? "text-emerald-300" : "text-rose-300"}>{c.type.toUpperCase()}</strong> · {c.minutes} min
                      </span>
                      <button
                        onClick={() => removeCardio(c.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
                        aria-label={`Eliminar la sesión de cardio del ${c.date}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </Disclosure>

              <p className="text-[11px] text-neutral-300 leading-relaxed flex items-start gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Meta de la fase: {cardioTarget} min/semana{cfg.hiitSessionsPerWeek > 0 ? ` + ${cfg.hiitSessionsPerWeek} sesión HIIT` : ""}. Sumá tus pasos
                  diarios (Reto 21 Días) como NEAT: cada 10.000 pasos ≈ 350–450 kcal extra por día.
                </span>
              </p>
            </div>
          </div>
        </SectionSheet>
      )}
    </div>
  );
};
