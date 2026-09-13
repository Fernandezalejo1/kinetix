import React, { useState } from "react";
import { Activity, Zap, Shield, Sparkles, TrendingUp, TrendingDown, Minus, Calculator, Trophy, BrainCircuit } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import type { TooltipValueType } from "recharts";
import { Exercise, ExerciseHistoryEntry, PersonalRecord } from "../../types";
import { calculate1RM } from "../../utils/scienceCalculators";
import { resolveNextWeightFromHistory } from "../../utils/progressionEngine";
import { detectStrengthPlateau } from "../../utils/plateauDetection";
import { velocityZoneForSet } from "../../utils/velocity";
import { e1rmFromSet } from "../../utils/startingLoads";
import { useWorkout } from "../../context/WorkoutContext";
import { ExerciseHistoryProgressionChart } from "./ExerciseHistoryProgressionChart";

interface ExerciseAnalyticsSectionProps {
  exercise: Exercise;
  weightUnit?: "kg" | "lbs";
}

export const ExerciseAnalyticsSection: React.FC<ExerciseAnalyticsSectionProps> = ({
  exercise,
  weightUnit = "kg",
}) => {
  const [calcWeight, setCalcWeight] = useState<number>(80);
  const [calcReps, setCalcReps] = useState<number>(8);
  const [calcRir, setCalcRir] = useState<number>(1);
  const [activeSubView, setActiveSubView] = useState<"history" | "simulator">("history");
  const { exerciseHistory, personalRecords } = useWorkout();

  // Total reps to failure = reps + rir
  const effectiveReps = calcReps + calcRir;
  const estimated1RM = Math.round(calculate1RM(calcWeight, effectiveReps).average);

  // Generate dynamic 1RM vs Reps Curve for this exercise
  const curveData = [
    { reps: 1, pct: 100, weight: Math.round(estimated1RM) },
    { reps: 3, pct: 93, weight: Math.round(estimated1RM * 0.93) },
    { reps: 6, pct: 85, weight: Math.round(estimated1RM * 0.85) },
    { reps: 8, pct: 80, weight: Math.round(estimated1RM * 0.80) },
    { reps: 10, pct: 75, weight: Math.round(estimated1RM * 0.75) },
    { reps: 12, pct: 70, weight: Math.round(estimated1RM * 0.70) },
    { reps: 15, pct: 65, weight: Math.round(estimated1RM * 0.65) },
  ];

  const analytics = exercise.analytics;

  return (
    <div className="space-y-6">
      {/* Sub-view Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubView("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubView === "history"
                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Historial de Fuerza & PRs</span>
          </button>

          <button
            onClick={() => setActiveSubView("simulator")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubView === "simulator"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador 1RM & Cargas</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Frecuencia y Tonalaje sincronizados</span>
        </div>
      </div>

      {/* Primary Historical Progression Visual Graph Component */}
      {activeSubView === "history" && (
        <div className="space-y-4">
          <RecommendationCard
            exercise={exercise}
            history={exerciseHistory}
            prs={personalRecords}
            weightUnit={weightUnit}
          />
          <PlateauBanner exercise={exercise} history={exerciseHistory} />
          <VelocityBanner exercise={exercise} history={exerciseHistory} />
          <ExerciseHistoryProgressionChart exercise={exercise} />
        </div>
      )}

      {/* 4 Biomechanical Score Cards (SFR, Tier, Axial Fatigue, Joint Stress) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SFR Score */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-cyan-500/20 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Ratio Estímulo/Fatiga</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          {analytics?.isEditorialEstimate ? (
            <>
              <div className="text-base font-black text-neutral-400 pt-1">Sin evidencia específica</div>
              <p className="text-[11px] text-neutral-400">Estimación heurística por categoría de ejercicio (no es un dato medido ni de publicación).</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-black text-cyan-400">
                {analytics?.sfrScore ?? "—"} <span className="text-xs font-normal text-neutral-400">/ 10</span>
              </div>
              <p className="text-[11px] text-neutral-400">Máximo estímulo hipertrófico con fatiga periférica controlada</p>
              {analytics?.evidenceSource && (
                <p className="text-[11px] text-cyan-300/70 break-words" title={analytics.evidenceSource}>Evidencia: {analytics.evidenceSource}</p>
              )}
            </>
          )}
        </div>

        {/* Hypertrophy Tier */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-purple-500/20 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Nivel de Hipertrofia</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          {analytics?.isEditorialEstimate ? (
            <div className="text-base font-black text-neutral-400 pt-1">Estimación editorial</div>
          ) : (
            <div className="text-2xl font-black text-purple-400">{analytics?.hypertrophyTier || "—"}</div>
          )}
          <p className="text-[11px] text-neutral-400">{analytics?.hypertrophyMechanism || "Tensión mecánica pura"}</p>
        </div>

        {/* Axial Fatigue */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/20 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Fatiga Axial (Espina)</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {analytics?.axialFatigue || "—"}
          </div>
          <p className="text-[11px] text-neutral-400">Impacto sistémico en el sistema nervioso central</p>
        </div>

        {/* Joint Stress */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/20 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-neutral-400">Estrés Articular</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {analytics?.jointStress || "—"}
          </div>
          <p className="text-[11px] text-neutral-400">Presión sobre cartílagos, tendones y bursas</p>
        </div>
      </div>

      {/* Interactive 1RM Curve & Calculator Simulator */}
      {activeSubView === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-3xl bg-neutral-950 border border-neutral-800 animate-fadeIn">
          {/* Interactive Calculator Inputs */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-neutral-800 pb-6 lg:pb-0 lg:pr-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Calculator className="w-4 h-4" />
              Simulador de Cargas & 1RM
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Carga de Trabajo:</span>
                  <span className="font-bold text-white font-mono">{calcWeight} {weightUnit}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="250"
                  step="2.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Repeticiones Realizadas:</span>
                  <span className="font-bold text-white font-mono">{calcReps} reps</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={calcReps}
                  onChange={(e) => setCalcReps(parseInt(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-neutral-400">Reps en Reserva (RIR):</span>
                  <span className="font-bold text-white font-mono">{calcRir} RIR</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={calcRir}
                  onChange={(e) => setCalcRir(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* e1RM Result Box */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-cyan-500/30 space-y-1">
              <span className="text-[11px] uppercase font-bold text-neutral-400">1RM Científico Estimado</span>
              <div className="text-3xl font-black text-cyan-400">
                {estimated1RM} <span className="text-sm font-normal text-neutral-300">{weightUnit}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Fórmula combinada Brzycki/Epley ajustada por proximidad real al fallo.
              </p>
            </div>
          </div>

          {/* Projection Area Chart */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Curva de Capacidad Carga vs Repeticiones
              </span>
              <span className="text-[11px] text-neutral-400">Proyección teórica</span>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curveData}>
                  <defs>
                    <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="reps" stroke="#737373" fontSize={10} unit=" reps" />
                  <YAxis stroke="#737373" fontSize={10} unit={` ${weightUnit}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171717",
                      borderColor: "#404040",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(val: TooltipValueType | undefined) => [`${val} ${weightUnit}`, "Carga Teórica"]}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2.5} fill="url(#curveGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px]">
                <span className="text-neutral-400 block text-[11px]">Rango de Hipertrofia Óptimo:</span>
                <strong className="text-white">{analytics?.optimalRepRange || "8 - 12 reps"}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px]">
                <span className="text-neutral-400 block text-[11px]">Volumen Semanal Sugerido:</span>
                <strong className="text-purple-400">{analytics?.optimalWeeklySets || "6 - 10 series efectivas"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RecommendationCardProps {
  exercise: Exercise;
  history: ExerciseHistoryEntry[];
  prs: PersonalRecord[];
  weightUnit: string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ exercise, history, prs, weightUnit }) => {
  const lastSession = history
    .filter((h) => h.exerciseId === exercise.id && h.weight > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastSession) return null;

  const targetReps = lastSession.targetReps;
  const rec = resolveNextWeightFromHistory(
    exercise,
    targetReps,
    lastSession.targetSets,
    lastSession.targetRir ?? exercise.defaultRir ?? 2,
    history,
    prs,
    { weightUnit }
  );

  if (rec.nextWeight <= 0) return null;

  const current = rec.nextWeight - rec.deltaWeight;
  const delta = rec.deltaWeight;
  const isUp = delta > 0;
  const isDown = delta < 0;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? "text-emerald-400" : isDown ? "text-amber-400" : "text-neutral-400";
  const iconBg = isUp
    ? "bg-emerald-500/15 border-emerald-500/30"
    : isDown
    ? "bg-amber-500/15 border-amber-500/30"
    : "bg-neutral-800 border-neutral-700";

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 via-neutral-950 to-neutral-950 border border-violet-500/30 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} border flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color} ${isUp ? "fill-emerald-400/30" : isDown ? "fill-amber-400/30" : ""}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] uppercase tracking-wider font-black text-violet-300 flex items-center gap-1">
            <BrainCircuit className="w-3.5 h-3.5" />
            Próxima carga sugerida
          </span>
          <span className="text-[11px] text-neutral-400 font-medium uppercase" title={targetReps ? `Objetivo: ${targetReps} reps` : "Ejercicio por tiempo"}>
            {targetReps ? `Objetivo ${targetReps}` : "Tiempo"} · última sesión {current} {weightUnit}
          </span>
        </div>
        <div className={`text-xl font-black font-mono mt-0.5 ${color}`}>
          {delta === 0 ? "Mantener carga" : `${current} → ${rec.nextWeight} ${weightUnit}`}
          <span className="ml-2 text-[11px] font-bold lowercase text-neutral-400">
            {delta > 0 ? `(+${delta})` : delta < 0 ? `(${delta})` : ""}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-snug mt-1">{rec.rationale}</p>
      </div>
    </div>
  );
};

/** P2: banner de plateau (e1RM plano ±2% en 3 sesiones) con palanca sugerida. */
const PlateauBanner: React.FC<{ exercise: Exercise; history: ExerciseHistoryEntry[] }> = ({ exercise, history }) => {
  const lastSession = history
    .filter((h) => h.exerciseId === exercise.id && h.weight > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const result = detectStrengthPlateau(exercise.id, history, lastSession?.targetReps);
  if (!result.plateau) return null;
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/30 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
        <TrendingDown className="w-5 h-5 text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
          Plateau detectado ({result.changePct}% en {result.sessionsUsed} sesiones)
        </p>
        <p className="text-[11px] text-neutral-300 leading-snug mt-1">{result.suggestion}</p>
      </div>
    </div>
  );
};

/** P2: VBT proxy — zona de velocidad estimada del mejor set reciente. */
const VelocityBanner: React.FC<{ exercise: Exercise; history: ExerciseHistoryEntry[] }> = ({ exercise, history }) => {
  const lastSession = history
    .filter((h) => h.exerciseId === exercise.id && h.weight > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!lastSession?.bestSet || !(lastSession.bestSet.weight > 0)) return null;
  const est = e1rmFromSet(lastSession.bestSet.weight, lastSession.bestSet.reps, lastSession.bestSet.rir);
  const vbt = velocityZoneForSet(exercise.category, lastSession.bestSet.weight, est.valid ? est.average : null);
  if (!vbt) return null;
  return (
    <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
        <Zap className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-white uppercase tracking-wider">
          Velocidad estimada ~{vbt.velocityMs} m/s · {vbt.label}
        </p>
        <p className="text-[11px] text-neutral-400 leading-snug">
          Proxy sin encoder (±0.05 m/s): orienta si estás en fuerza o potencia. No prescribe carga.
        </p>
      </div>
    </div>
  );
};
