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

export const DAILY_GOAL = 15000;
export const CHALLENGE_DAYS = 21;

export interface ChallengeState {
  active: boolean;
  startDate: string; // ISO date string (YYYY-MM-DD)
  completedDates: string[]; // ISO date strings of days with >= DAILY_GOAL steps
  currentStreak: number;
  bestStreak: number;
  lastCheckedDate: string; // YYYY-MM-DD
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
  };
}

export function readChallenge(): ChallengeState {
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultState();
}

export function saveChallenge(state: ChallengeState): void {
  try {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function startChallenge(): ChallengeState {
  const today = dateKey(new Date());
  const state: ChallengeState = {
    active: true,
    startDate: today,
    completedDates: [],
    currentStreak: 0,
    bestStreak: 0,
    lastCheckedDate: today,
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

/** Returns the current day number (1-21) based on completedDates. */
export function getCurrentDay(state: ChallengeState): number {
  return state.completedDates.length + 1;
}

/** Returns days remaining. */
export function getDaysRemaining(state: ChallengeState): number {
  return Math.max(0, CHALLENGE_DAYS - state.completedDates.length);
}

/** Returns whether the challenge is completed (21/21). */
export function isChallengeCompleted(state: ChallengeState): boolean {
  return state.completedDates.length >= CHALLENGE_DAYS;
}

/**
 * Process today's steps: check if the daily goal was met,
 * update completedDates and streak. Returns updated state.
 */
export function processTodaySteps(state: ChallengeState, todaySteps: number): ChallengeState {
  if (!state.active) return state;

  const today = dateKey(new Date());
  const alreadyCompleted = state.completedDates.includes(today);

  if (todaySteps >= DAILY_GOAL && !alreadyCompleted) {
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

  if (todaySteps < DAILY_GOAL && !alreadyCompleted) {
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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  if (state.completedDates.includes(yesterdayKey)) return state; // already counted

  if (yesterdaySteps >= DAILY_GOAL) {
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
