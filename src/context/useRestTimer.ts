// =============================================================
// KINETIX — Hook del timer de descanso (P3: extraído de WorkoutContext).
// Timestamp-based: mantiene la hora correcta aunque la pantalla se
// bloquee o el navegador limite setInterval en segundo plano.
// =============================================================
import { useState, useEffect, useCallback } from "react";
import {
  unlockAudio,
  playRestTimerCompletedSound,
  playTickSound,
} from "../utils/scienceCalculators";

export interface RestTimerState {
  active: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string;
  endAt: number | null;
}

const INITIAL: RestTimerState = {
  active: false,
  totalSeconds: 90,
  remainingSeconds: 90,
  exerciseName: "",
  endAt: null,
};

export function useRestTimer(soundEnabled: boolean) {
  const [restTimer, setRestTimer] = useState<RestTimerState>(INITIAL);

  // Rest Timer Interval — timestamp-based so it keeps correct time even if the
  // phone screen locks / the app is backgrounded and setInterval is throttled.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (restTimer.active && restTimer.endAt !== null) {
      const tick = () => {
        setRestTimer((prev) => {
          if (prev.endAt === null) return prev;
          const left = Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000));
          if (left <= 0) {
            if (soundEnabled) playRestTimerCompletedSound();
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([150, 75, 150]);
            }
            return { ...prev, remainingSeconds: 0, active: false };
          }
          if (soundEnabled && left <= 4 && left > 1 && prev.remainingSeconds > left) {
            playTickSound();
          }
          return { ...prev, remainingSeconds: left };
        });
      };
      tick();
      interval = setInterval(tick, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.active, restTimer.endAt, soundEnabled]);

  const startRestTimer = useCallback(
    (seconds: number, exerciseName = "") => {
      unlockAudio();
      setRestTimer({
        active: true,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        exerciseName,
        endAt: Date.now() + seconds * 1000,
      });
    },
    []
  );

  const stopRestTimer = useCallback(() => {
    setRestTimer((prev) => ({ ...prev, active: false, remainingSeconds: 0, endAt: null }));
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      if (prev.endAt === null) return prev;
      const nextRemaining = Math.max(0, prev.remainingSeconds + deltaSeconds);
      const nextTotal = Math.max(nextRemaining, prev.totalSeconds + deltaSeconds);
      return {
        ...prev,
        remainingSeconds: nextRemaining,
        totalSeconds: nextTotal,
        active: nextRemaining > 0,
        endAt: nextRemaining > 0 ? Date.now() + nextRemaining * 1000 : null,
      };
    });
  }, []);

  return { restTimer, startRestTimer, stopRestTimer, adjustRestTimer };
}
