import React, { useMemo, useState } from "react";
import {
  X,
  CalendarCheck,
  Dumbbell,
  Trophy,
  Moon,
  Flame,
  Scale,
  Activity,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";
import { FocusTrap } from "../FocusTrap";
import { useWorkout } from "../../context/WorkoutContext";
import { useGoal } from "../../context/GoalContext";
import { useToast } from "../../context/ToastContext";
import {
  computeWeeklyReview,
  WeeklyAdjustment,
} from "../../utils/weeklyReview";
import {
  loadUserProfile,
  saveUserProfile,
  persistSelectedProgram,
} from "../../utils/userProfile";
import { PHASE_CONFIG } from "../../utils/goalEngine";
import { PREBUILT_PROGRAMS } from "../../data/programsData";
import { UserProfile } from "../../types";

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TONE_STYLE: Record<
  string,
  { text: string; bg: string; border: string; iconBg: string }
> = {
  good: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    iconBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  warn: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    iconBg: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  },
  tip: {
    text: "text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    iconBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  danger: {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/40",
    iconBg: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  },
};

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    workoutHistory,
    personalRecords,
    bodyMetrics,
  } = useWorkout();
  const { phase, setPhase, sleepLog, readinessLog, cardioLog } = useGoal();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());

  const review = useMemo(() => {
    return computeWeeklyReview({
      history: workoutHistory,
      profile,
      phaseId: phase.id,
      personalRecords,
      sleepLog,
      readinessLog,
      cardioLog,
      bodyMetrics,
      cardioTargetMin: PHASE_CONFIG[phase.id]?.cardioMinPerWeek ?? null,
    });
  }, [
    workoutHistory,
    profile,
    phase.id,
    personalRecords,
    sleepLog,
    readinessLog,
    cardioLog,
    bodyMetrics,
  ]);

  if (!isOpen) return null;

  const applyAdjustment = (adj: WeeklyAdjustment) => {
    const action = adj.action;
    if (action.type === "set_frequency") {
      if (!profile) return;
      const next = { ...profile, daysPerWeek: action.days };
      saveUserProfile(next);
      setProfile(next);
      showToast(`Frecuencia ajustada a ${action.days} días/sem`, "success");
    } else if (action.type === "set_program") {
      const program = PREBUILT_PROGRAMS.find((p) => p.id === action.programId);
      if (program) {
        persistSelectedProgram(program);
        showToast(`Programa activo → ${program.title}`, "success");
      }
    } else if (action.type === "set_phase") {
      setPhase(action.phaseId);
      showToast(`Fase actualizada`, "success");
    }
  };

  const verdictTone = TONE_STYLE[review.verdict.tone] ?? TONE_STYLE.tip;

  const metric = (
    icon: React.ReactNode,
    value: string,
    label: string,
    accent = "text-white"
  ) => (
    <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 min-w-0">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-lg font-black tabular-nums truncate ${accent}`}>{value}</div>
    </div>
  );

  return (
    <FocusTrap>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-0 sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Revisión semanal"
          className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto overscroll-contain scrollbar-thin safe-area-bottom"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <RefreshCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Revisión semanal</h2>
                <p className="text-[11px] text-neutral-400">
                  Adherencia · Progreso · Recuperación · {PHASE_CONFIG[phase.id]?.label ?? phase.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar revisión semanal"
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Veredicto */}
            <div className={`p-4 rounded-2xl ${verdictTone.bg} border ${verdictTone.border}`}>
              <div className={`text-[10px] font-black uppercase tracking-wider ${verdictTone.text}`}>
                Veredicto de la semana
              </div>
              <div className="text-lg font-black text-white mt-1">{review.verdict.label}</div>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{review.verdict.summary}</p>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-center min-w-0">
                <CalendarCheck className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-lg font-black text-white tabular-nums">
                  {review.workoutsDone}
                  <span className="text-xs font-bold text-neutral-500">/{review.workoutsExpected}</span>
                </div>
                <span className="text-[9px] font-bold text-neutral-500 uppercase">Sesiones (adherencia {review.adherencePercent}%)</span>
              </div>
              {metric(<Dumbbell className="w-3.5 h-3.5 text-neutral-500" />, `${review.setsThisWeek}`, "Series")}
              {metric(<TrendingUp className="w-3.5 h-3.5 text-neutral-500" />, `${review.volumeDeltaPercent > 0 ? "+" : ""}${review.volumeDeltaPercent}%`, "Volumen vs anterior", review.volumeDeltaPercent >= 0 ? "text-emerald-400" : "text-amber-300")}
              {metric(<Trophy className="w-3.5 h-3.5 text-neutral-500" />, `${review.prCount}`, "PRs")}
              {metric(<ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />, review.avgRir != null ? `${review.avgRir}` : "—", "RIR promedio")}
              {metric(<Activity className="w-3.5 h-3.5 text-neutral-500" />, review.avgReadiness != null ? `${review.avgReadiness}/100` : "—", "Readiness")}
              {metric(<Moon className="w-3.5 h-3.5 text-neutral-500" />, review.avgSleepHours != null ? `${review.avgSleepHours}h` : "—", "Sueño")}
              {metric(<Flame className="w-3.5 h-3.5 text-neutral-500" />, `${review.cardioMinutes}${review.cardioTarget != null ? `/${review.cardioTarget}` : ""}`, "Cardio min")}
              {metric(<Scale className="w-3.5 h-3.5 text-neutral-500" />, review.weightDeltaKg != null ? `${review.weightDeltaKg > 0 ? "+" : ""}${review.weightDeltaKg} kg` : "—", "Peso (Δ)", review.weightDeltaKg != null && review.weightDeltaKg <= 0 ? "text-emerald-400" : "text-white")}
            </div>

            {/* Deuda deload */}
            {review.deloadStatus === "due" && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{review.deloadSummary}</p>
              </div>
            )}

            {/* Ítems de la revisión */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Análisis</h3>
              {review.items.length === 0 ? (
                <p className="text-xs text-neutral-500">Sin datos suficientes esta semana.</p>
              ) : (
                review.items.map((item) => {
                  const tone = TONE_STYLE[item.tone] ?? TONE_STYLE.tip;
                  return (
                    <div key={item.id} className={`p-3 rounded-2xl ${tone.bg} border ${tone.border}`}>
                      <div className={`flex items-center gap-2 ${tone.text} text-xs font-black`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.text}`} />
                        {item.title}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Ajustes accionables */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Ajustes sugeridos</h3>
              {review.adjustments.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  Sin ajustes necesarios. Mantené el plan y reevaluá el domingo.
                </p>
              ) : (
                review.adjustments.map((adj) => {
                  const tone = TONE_STYLE[adj.tone] ?? TONE_STYLE.tip;
                  const actionable = adj.action.type !== "tip";
                  return (
                    <div key={adj.id} className={`p-3 rounded-2xl ${tone.bg} border ${tone.border}`}>
                      <div className={`text-xs font-black ${tone.text}`}>{adj.title}</div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{adj.detail}</p>
                      {actionable && (
                        <button
                          onClick={() => applyAdjustment(adj)}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors press-scale"
                        >
                          Aplicar ajuste
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-neutral-800 flex items-center gap-3 shrink-0">
            <p className="text-[10px] text-neutral-500">
              La revisión es 100% local y determinista: analiza tus últimos 7 días de entrenamiento.
            </p>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};