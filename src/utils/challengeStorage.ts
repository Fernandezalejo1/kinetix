// =============================================================
// KINETIX — Reto 21 Días: persistencia + lógica.
// =============================================================

import { localDateKey } from "./dateUtils";

const CHALLENGE_KEY = "kinetix_challenge";

export type Rank = "bronze" | "gold" | "master" | "challenger";

export const RANK_THRESHOLDS: Record<Rank, number> = {
  bronze: 0,
  gold: 8000,
  master: 15000,
  challenger: 20000,
};

/** Official League of Legends rank emblem images (bundled locally). */
export const RANK_EMBLEM_SRC: Record<Rank, string> = {
  bronze: "/assets/ranks/bronze.png",
  gold: "/assets/ranks/gold.png",
  master: "/assets/ranks/master.png",
  challenger: "/assets/ranks/challenger.png",
};

export const RANK_LABELS: Record<Rank, string> = {
  bronze: "Bronce",
  gold: "Oro",
  master: "Master",
  challenger: "Challenger",
};

export const RANK_COLORS: Record<Rank, { from: string; to: string; glow: string }> = {
  bronze: { from: "#CD7F32", to: "#8B4513", glow: "rgba(205,127,50,0.4)" },
  gold: { from: "#FFD700", to: "#B8860B", glow: "rgba(255,215,0,0.4)" },
  master: { from: "#9B59B6", to: "#6C3483", glow: "rgba(155,89,182,0.4)" },
  challenger: { from: "#00D4FF", to: "#0066FF", glow: "rgba(0,212,255,0.5)" },
};

export const DAILY_GOAL = 15000; // default (nivel avanzado)
export const CHALLENGE_DAYS = 21;

/** P1: metas escaladas por nivel (antes 15k fijo excluía principiantes). */
export const CHALLENGE_GOALS = [8000, 10000, 12000, 15000] as const;

export const CHALLENGE_GOAL_LABELS: Record<number, string> = {
  8000: "Base (8k)",
  10000: "Activo (10k)",
  12000: "Atlético (12k)",
  15000: "Élite (15k)",
};

export interface ChallengeState {
  active: boolean;
  startDate: string; // ISO date string (YYYY-MM-DD)
  completedDates: string[]; // ISO date strings of days with >= dailyGoal steps
  currentStreak: number;
  bestStreak: number;
  lastCheckedDate: string; // YYYY-MM-DD
  /** P1: meta diaria elegida al iniciar (default 15000, back-compat). */
  dailyGoal: number;
  /** P1: el reto venció sin completarse (hoy > inicio + 21 días). */
  expired: boolean;
}

function effectiveGoal(state: ChallengeState): number {
  return state.dailyGoal > 0 ? state.dailyGoal : DAILY_GOAL;
}

/** Días calendario desde el inicio (1-based, tope 21+). */
export function daysSinceStart(state: ChallengeState, todayKey?: string): number {
  if (!state.startDate) return 0;
  const today = todayKey ?? dateKey(new Date());
  const diff = Math.round(
    (new Date(today + "T12:00:00").getTime() - new Date(state.startDate + "T12:00:00").getTime()) / 86400000
  );
  return Math.max(0, diff + 1);
}

/** True si el reto venció por calendario sin completarse. */
export function isExpired(state: ChallengeState, todayKey?: string): boolean {
  if (!state.active || isChallengeCompleted(state)) return false;
  return daysSinceStart(state, todayKey) > CHALLENGE_DAYS;
}

function dateKey(d: Date): string {
  // Día local (YYYY-MM-DD) para que coincida con la lectura local de
  // Health Connect y con el calendario de la UI.
  return localDateKey(d);
}

function defaultState(): ChallengeState {
  return {
    active: false,
    startDate: "",
    completedDates: [],
    currentStreak: 0,
    bestStreak: 0,
    lastCheckedDate: "",
    dailyGoal: DAILY_GOAL,
    expired: false,
  };
}

export function readChallenge(): ChallengeState {
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (raw) {
      const parsed = { ...defaultState(), ...JSON.parse(raw) };
      // Back-compat: estados viejos sin dailyGoal → 15000.
      if (!parsed.dailyGoal || parsed.dailyGoal <= 0) parsed.dailyGoal = DAILY_GOAL;
      return parsed;
    }
  } catch { /* ignore */ }
  return defaultState();
}

export function saveChallenge(state: ChallengeState): void {
  try {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function startChallenge(dailyGoal: number = DAILY_GOAL): ChallengeState {
  const today = dateKey(new Date());
  const goal = CHALLENGE_GOALS.includes(dailyGoal as (typeof CHALLENGE_GOALS)[number])
    ? dailyGoal
    : DAILY_GOAL;
  const state: ChallengeState = {
    active: true,
    startDate: today,
    completedDates: [],
    currentStreak: 0,
    bestStreak: 0,
    lastCheckedDate: today,
    dailyGoal: goal,
    expired: false,
  };
  saveChallenge(state);
  return state;
}

export function resetChallenge(): ChallengeState {
  const state = defaultState();
  saveChallenge(state);
  return state;
}

/** Returns the rank for a given step count. */
export function getRank(steps: number): Rank {
  if (steps >= RANK_THRESHOLDS.challenger) return "challenger";
  if (steps >= RANK_THRESHOLDS.master) return "master";
  if (steps >= RANK_THRESHOLDS.gold) return "gold";
  return "bronze";
}

/**
 * Día actual por CALENDARIO desde el inicio (P1 fix: antes era
 * completedDates.length+1, así se podía "completar" en 60 días).
 */
export function getCurrentDay(state: ChallengeState): number {
  if (!state.active || !state.startDate) return state.completedDates.length + 1;
  return Math.min(daysSinceStart(state), CHALLENGE_DAYS);
}

/** Días restantes por calendario. */
export function getDaysRemaining(state: ChallengeState): number {
  if (!state.active || !state.startDate) return Math.max(0, CHALLENGE_DAYS - state.completedDates.length);
  return Math.max(0, CHALLENGE_DAYS - daysSinceStart(state) + 1);
}

/** Returns whether the challenge is completed (21/21). */
export function isChallengeCompleted(state: ChallengeState): boolean {
  return state.completedDates.length >= CHALLENGE_DAYS;
}

/**
 * Rollover diario con regla estricta (P1): si AYER pasó entero sin cumplir
 * la meta y el reto ya había empezado, el reto SE REINICIA A 0
 * (completedDates + racha) y el ciclo vuelve a empezar hoy.
 * Llamar al abrir/refrescar, antes de procesar los pasos de hoy.
 */
export function rolloverIfMissed(state: ChallengeState, todayKey?: string): ChallengeState {
  if (!state.active || !state.startDate || isChallengeCompleted(state)) return state;
  const today = todayKey ?? dateKey(new Date());
  if (today <= state.startDate) return state; // mismo día del inicio: nada que rolar
  const yesterday = new Date(today + "T12:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dateKey(yesterday);
  if (yKey < state.startDate) return state;
  if (state.completedDates.includes(yKey)) {
    return state.lastCheckedDate === today ? state : { ...state, lastCheckedDate: today };
  }
  // Ayer se falló → reinicio a 0, el ciclo re-arranca hoy.
  const updated: ChallengeState = {
    ...state,
    startDate: today,
    completedDates: [],
    currentStreak: 0,
    lastCheckedDate: today,
  };
  saveChallenge(updated);
  return updated;
}

/**
 * Process today's steps: check if the daily goal was met,
 * update completedDates and streak. Usa la meta elegida del reto.
 */
export function processTodaySteps(state: ChallengeState, todaySteps: number): ChallengeState {
  if (!state.active) return state;
  const goal = effectiveGoal(state);

  const today = dateKey(new Date());
  // Vencimiento por calendario.
  if (isExpired({ ...state, lastCheckedDate: today })) {
    const updated = { ...state, expired: true, active: false, lastCheckedDate: today };
    saveChallenge(updated);
    return updated;
  }
  // Rollover de día fallado antes de contar hoy.
  state = rolloverIfMissed(state, today);

  const alreadyCompleted = state.completedDates.includes(today);

  if (todaySteps >= goal && !alreadyCompleted) {
    // Goal met today — add to completed dates
    const newCompleted = [...state.completedDates, today].sort();
    const newStreak = state.currentStreak + 1;
    const newBest = Math.max(state.bestStreak, newStreak);

    const updated: ChallengeState = {
      ...state,
      completedDates: newCompleted,
      currentStreak: newStreak,
      bestStreak: newBest,
      lastCheckedDate: today,
    };
    saveChallenge(updated);
    return updated;
  }

  if (todaySteps < goal && !alreadyCompleted) {
    // Goal not met today — check if yesterday was completed to maintain streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dateKey(yesterday);
    const yesterdayCompleted = state.completedDates.includes(yesterdayKey);

    if (!yesterdayCompleted && state.currentStreak > 0) {
      // Streak broken
      const updated: ChallengeState = {
        ...state,
        currentStreak: 0,
        lastCheckedDate: today,
      };
      saveChallenge(updated);
      return updated;
    }
  }

  // No change needed (already counted or not yet goal met)
  return state;
}

/**
 * Check if yesterday's steps met the goal (for streak maintenance).
 * Used on app startup to update streak if user closed app before midnight.
 */
export function checkYesterdayStreak(state: ChallengeState, yesterdaySteps: number): ChallengeState {
  if (!state.active) return state;
  const goal = effectiveGoal(state);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  if (state.completedDates.includes(yesterdayKey)) return state; // already counted

  if (yesterdaySteps >= goal) {
    const newCompleted = [...state.completedDates, yesterdayKey].sort();
    const newStreak = state.currentStreak + 1;
    const newBest = Math.max(state.bestStreak, newStreak);

    const updated: ChallengeState = {
      ...state,
      completedDates: newCompleted,
      currentStreak: newStreak,
      bestStreak: newBest,
      lastCheckedDate: dateKey(new Date()),
    };
    saveChallenge(updated);
    return updated;
  }

  return state;
}
