import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Trophy, RotateCcw, Zap, Target, Flame } from "lucide-react";
import { RANK_EMBLEM_SRC } from "../../utils/challengeStorage";
import {
  readChallenge,
  startChallenge,
  resetChallenge,
  processTodaySteps,
  checkYesterdayStreak,
  getRank,
  getCurrentDay,
  getDaysRemaining,
  isChallengeCompleted,
  RANK_LABELS,
  RANK_COLORS,
  RANK_THRESHOLDS,
  DAILY_GOAL,
  CHALLENGE_DAYS,
  type Rank,
  type ChallengeState,
} from "../../utils/challengeStorage";
import { readTodaySteps, readStepsForDate, isNativePlatform, getHealthStatus, requestHealthAuthorization } from "../../utils/healthConnect";

// ─── Rank Emblem Image ──────────────────────────────────────────
// Uses the official League of Legends rank emblems bundled locally.

const RankEmblem: React.FC<{ rank: Rank; size?: number; className?: string }> = ({ rank, size = 120, className }) => (
  <img
    src={RANK_EMBLEM_SRC[rank]}
    alt={`Emblema ${RANK_LABELS[rank]}`}
    width={size}
    height={size}
    draggable={false}
    className={`select-none ${className ?? ""}`}
    style={{ width: size, height: size }}
  />
);

// ─── Progress Ring ─────────────────────────────────────────────

const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({
  progress, size = 100, strokeWidth = 8,
}) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(progress, 1));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(38 38 38)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22d3ee" strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700 ease-out" />
    </svg>
  );
};

// ─── Calendar Grid ─────────────────────────────────────────────

const DayCell: React.FC<{ day: number; completed: boolean; isToday: boolean; isFuture: boolean }> = ({
  day, completed, isToday, isFuture,
}) => (
  <div className={`relative w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
    completed
      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
      : isToday
        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse"
        : isFuture
          ? "bg-neutral-900/50 text-neutral-600 border border-neutral-800/50"
          : "bg-neutral-900 text-neutral-500 border border-neutral-800"
  }`}>
    {completed ? (
      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      day
    )}
  </div>
);

// ─── Main Component ────────────────────────────────────────────

export const ChallengeHub: React.FC = () => {
  const [challenge, setChallenge] = useState<ChallengeState>(readChallenge);
  const [todaySteps, setTodaySteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prevRank, setPrevRank] = useState<Rank | null>(null);
  const [animatingRank, setAnimatingRank] = useState(false);
  const [hcAuthorized, setHcAuthorized] = useState(false);

  const currentRank = getRank(todaySteps);
  const currentDay = getCurrentDay(challenge);
  const daysRemaining = getDaysRemaining(challenge);
  const completed = isChallengeCompleted(challenge);
  const progress = challenge.completedDates.length / CHALLENGE_DAYS;

  // ─── Load steps from Health Connect ─────────────────────────

  const refreshSteps = useCallback(async () => {
    try {
      const status = await getHealthStatus();
      setHcAuthorized(status.authorized);

      if (status.authorized) {
        const today = await readTodaySteps();
        setTodaySteps(today.steps);

        // Process today's result
        setChallenge((prev) => processTodaySteps(prev, today.steps));

        // Check yesterday for streak maintenance
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdaySteps = await readStepsForDate(yesterday);
        setChallenge((prev) => checkYesterdayStreak(prev, yesterdaySteps));
      } else {
        // Web fallback: read from stored steps
        setTodaySteps(0);
      }
    } catch {
      setTodaySteps(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSteps();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(refreshSteps, 30000);
    return () => clearInterval(interval);
  }, [refreshSteps]);

  // ─── Rank animation ─────────────────────────────────────────

  useEffect(() => {
    if (prevRank !== null && prevRank !== currentRank) {
      setAnimatingRank(true);
      const t = setTimeout(() => setAnimatingRank(false), 800);
      return () => clearTimeout(t);
    }
    setPrevRank(currentRank);
  }, [currentRank, prevRank]);

  // ─── Request HC authorization ────────────────────────────────

  const handleAuthorize = async () => {
    const ok = await requestHealthAuthorization();
    if (ok) {
      setHcAuthorized(true);
      refreshSteps();
    }
  };

  // ─── Start / Reset ──────────────────────────────────────────

  const handleStart = () => {
    const newState = startChallenge();
    setChallenge(newState);
    refreshSteps();
  };

  const handleReset = () => {
    if (window.confirm("¿Reiniciar el reto? Se perderá todo el progreso.")) {
      const newState = resetChallenge();
      setChallenge(newState);
      setTodaySteps(0);
      setLoading(true);
    }
  };

  // ─── Calendar days ──────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const days: { day: number; completed: boolean; isToday: boolean; isFuture: boolean }[] = [];
    const today = new Date();
    const todayKey = today.toISOString().split("T")[0];
    for (let i = 1; i <= CHALLENGE_DAYS; i++) {
      const dayDate = new Date(challenge.startDate || today);
      dayDate.setDate(dayDate.getDate() + i - 1);
      const dayKey = dayDate.toISOString().split("T")[0];
      days.push({
        day: i,
        completed: challenge.completedDates.includes(dayKey),
        isToday: dayKey === todayKey,
        isFuture: dayDate > today,
      });
    }
    return days;
  }, [challenge]);

  // ─── Render ─────────────────────────────────────────────────

  const rankColors = RANK_COLORS[currentRank];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 pb-24 md:pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950/80 z-10" />
        <div className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 30%, ${rankColors.glow}, transparent 70%)` }} />
        <div className="relative z-20 pt-6 pb-8 px-4 flex flex-col items-center">
          <Trophy className="w-8 h-8 text-amber-400 mb-3" />
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Reto 21 Días</h1>
          <p className="text-xs text-neutral-400">15.000 pasos diarios • 21 días consecutivos</p>
        </div>
      </div>

      {!challenge.active && !completed ? (
        /* ─── Inactive State ─── */
        <div className="px-4 max-w-lg mx-auto space-y-6 pt-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-neutral-800 flex items-center justify-center">
              <Target className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-lg font-black text-white">Comenzá el Reto</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Alcanzá <span className="text-cyan-400 font-bold">15.000 pasos</span> durante{" "}
              <span className="text-cyan-400 font-bold">21 días consecutivos</span>.
              Si un día no llegás, el contador se reinicia a 0.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {(["bronze", "gold", "master", "challenger"] as Rank[]).map((r) => (
                <div key={r} className="flex flex-col items-center gap-1">
                  <RankEmblem rank={r} size={36} />
                  <span className="text-[9px] text-neutral-500 font-bold">{RANK_LABELS[r]}</span>
                  <span className="text-[8px] text-neutral-600">{(RANK_THRESHOLDS[r] / 1000).toFixed(0)}k+</span>
                </div>
              ))}
            </div>
            {!hcAuthorized && (
              <button onClick={handleAuthorize}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-600/20">
                Conectar Health Connect
              </button>
            )}
            <button onClick={handleStart}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Empezar Reto
            </button>
          </div>
        </div>
      ) : (
        /* ─── Active Challenge ─── */
        <div className="px-4 max-w-lg mx-auto space-y-5 pt-4">

          {/* Today's Rank */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 text-center space-y-3">
            <div className={`transition-all duration-500 ${animatingRank ? "scale-110 animate-bounce" : ""}`}>
              <RankEmblem rank={currentRank} size={100} />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Tu rango hoy</p>
              <p className="text-lg font-black" style={{ color: rankColors.from }}>{RANK_LABELS[currentRank]}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-white font-mono">{todaySteps.toLocaleString("es-AR")}</span>
              <span className="text-xs text-neutral-500 font-bold">pasos</span>
            </div>
            {/* Step bar */}
            <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min((todaySteps / DAILY_GOAL) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${rankColors.from}, ${rankColors.to})`,
                }} />
            </div>
            <p className="text-[10px] text-neutral-500">
              {Math.max(0, DAILY_GOAL - todaySteps).toLocaleString("es-AR")} pasos para Master
            </p>
          </div>

          {/* Progress */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-5 flex items-center gap-5">
            <div className="relative shrink-0">
              <ProgressRing progress={progress} size={80} strokeWidth={7} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{challenge.completedDates.length}</span>
                <span className="text-[9px] text-neutral-500 font-bold">/ {CHALLENGE_DAYS}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Día {completed ? CHALLENGE_DAYS : currentDay}</span>
                {completed && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    COMPLETADO
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {daysRemaining > 0 ? `${daysRemaining} días restantes` : "¡Lo lograste!"}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">{challenge.currentStreak}</span>
                  <span className="text-[10px] text-neutral-500">racha</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{challenge.bestStreak}</span>
                  <span className="text-[10px] text-neutral-500">mejor</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Calendario del Reto</p>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((d) => (
                <DayCell key={d.day} day={d.day} completed={d.completed} isToday={d.isToday} isFuture={d.isFuture} />
              ))}
            </div>
          </div>

          {/* Rank Thresholds */}
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sistema de Rangos</p>
            {(["challenger", "master", "gold", "bronze"] as Rank[]).map((r) => (
              <div key={r} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                currentRank === r ? "bg-neutral-800/60 border border-neutral-700" : "opacity-60"
              }`}>
                <RankEmblem rank={r} size={32} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{RANK_LABELS[r]}</p>
                  <p className="text-[10px] text-neutral-500">{RANK_THRESHOLDS[r].toLocaleString("es-AR")}+ pasos</p>
                </div>
                {currentRank === r && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${rankColors.from}20`, color: rankColors.from, border: `1px solid ${rankColors.from}40` }}>
                    ACTUAL
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button onClick={refreshSteps}
              className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm border border-neutral-700 transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Actualizar
            </button>
            <button onClick={handleReset}
              className="py-3 px-4 rounded-xl bg-red-950 hover:bg-red-900 text-red-400 font-bold text-sm border border-red-900/50 transition-all">
              Reiniciar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
