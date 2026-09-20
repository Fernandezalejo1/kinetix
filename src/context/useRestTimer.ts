import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { syncRestNotification } from "../utils/restNotifications";
// =============================================================
// KINETIX — Hook del timer de descanso (P3: extraído de WorkoutContext).
// Timestamp-based: mantiene la hora correcta aunque la pantalla se
// bloquee o el navegador limite setInterval en segundo plano.
//
// Independiente del reloj de sesión (`workoutElapsedTime`, derivado de
// `activeSession.startTime`): acá el tiempo restante sale de `endAt`.
//
// PERSISTENCIA: se guarda SOLO el snapshot { endAt, totalSeconds, exerciseName }
// en `kinetix_rest_timer`. Al reabrir la app el restante se RECALCULA desde
// `endAt` (nunca se guarda el contador, que quedaría congelado). Un descanso
// vencido o sin sesión activa se descarta: no se resucita nada viejo.
// =============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import {
  unlockAudio,
  playRestTimerCompletedSound,
  playTickSound,
} from "../utils/scienceCalculators";
import { safeParse, safeSet, safeRemove, isPlainObject, VALIDATORS } from "../utils/storage";

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

/** Clave de persistencia del descanso (efímera, se limpia al terminar). */
export const REST_TIMER_KEY = "kinetix_rest_timer";

interface RestTimerSnapshot {
  endAt: number;
  totalSeconds: number;
  exerciseName?: string;
}

/** ¿Hay una sesión activa guardada? Sin sesión, el descanso no se restaura. */
function hasPersistedActiveWorkout(): boolean {
  const session = safeParse<unknown>(
    "kinetix_active_workout",
    null,
    (v) => v === null || isPlainObject(v)
  );
  return session !== null && session !== undefined;
}

/**
 * Reconstruye el descanso desde el snapshot persistido usando `now`.
 * Exportado para poder testear la hidratación sin montar React.
 */
export function restoreRestTimer(now: number = Date.now()): RestTimerState {
  const snap = safeParse<RestTimerSnapshot | null>(REST_TIMER_KEY, null, VALIDATORS[REST_TIMER_KEY]);
  if (!snap) return INITIAL;
  const left = Math.max(0, Math.ceil((snap.endAt - now) / 1000));
  // Descanso ya vencido: se descarta en vez de mostrar un tiempo muerto.
  if (left <= 0) return INITIAL;
  // La sesión se terminó/descartó mientras la app estaba cerrada.
  if (!hasPersistedActiveWorkout()) return INITIAL;
  return {
    active: true,
    // Si quedó más tiempo del total registrado (p. ej. +30s aplicado justo
    // antes de cerrar), el total se ajusta para que el anillo no se desborde.
    totalSeconds: Math.max(snap.totalSeconds, left),
    remainingSeconds: left,
    exerciseName: snap.exerciseName ?? "",
    endAt: snap.endAt,
  };
}

/** Guarda el snapshot del descanso; si no hay descanso activo, lo elimina. */
function persistRestTimer(state: RestTimerState): void {
  if (!state.active || state.endAt === null) {
    safeRemove(REST_TIMER_KEY);
    return;
  }
  const snap: RestTimerSnapshot = {
    endAt: state.endAt,
    totalSeconds: state.totalSeconds,
    exerciseName: state.exerciseName,
  };
  safeSet(REST_TIMER_KEY, snap);
}

export function useRestTimer(soundEnabled: boolean) {
  const [restTimer, setRestTimer] = useState<RestTimerState>(restoreRestTimer);

  const previousTimer = useRef(restTimer);
  useEffect(() => {
    const previous = previousTimer.current;
    previousTimer.current = restTimer;
    if (document.hidden || previous.endAt !== restTimer.endAt) return;
    if (previous.active && !restTimer.active && restTimer.endAt !== null && restTimer.remainingSeconds === 0 && Date.now() - restTimer.endAt < 1500) {
      if (soundEnabled) playRestTimerCompletedSound();
      navigator.vibrate?.([150, 75, 150]);
    } else if (soundEnabled && restTimer.active && restTimer.remainingSeconds > 1 && restTimer.remainingSeconds <= 4 && previous.remainingSeconds > restTimer.remainingSeconds) playTickSound();
  }, [restTimer, soundEnabled]);

  useEffect(() => {
    const update = () => syncRestNotification(restTimer.active && document.hidden ? restTimer.endAt : null, restTimer.exerciseName ?? "", soundEnabled);
    update();
    document.addEventListener("visibilitychange", update);
    const listener = Capacitor.isNativePlatform() ? App.addListener("appStateChange", ({ isActive }) => {
      syncRestNotification(restTimer.active && !isActive ? restTimer.endAt : null, restTimer.exerciseName ?? "", soundEnabled);
    }) : null;
    return () => {
      document.removeEventListener("visibilitychange", update);
      void listener?.then(handle => handle.remove()).catch(() => {});
    };
  }, [restTimer.active, restTimer.endAt, restTimer.exerciseName, soundEnabled]);

  // Persistencia: solo re-escribe cuando cambia el `endAt` (inicio, ajuste o
  // fin). El tick por segundo actualiza `remainingSeconds` y NO toca el disco.
  useEffect(() => {
    persistRestTimer(restTimer);
  }, [restTimer.active, restTimer.endAt, restTimer.totalSeconds, restTimer.exerciseName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rest Timer Interval — timestamp-based so it keeps correct time even if the
  // phone screen locks / the app is backgrounded and setInterval is throttled.
  // Hay UN solo intervalo: se crea al iniciar el descanso y se destruye al
  // terminar/desmontar (nunca dos descansos en paralelo).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (restTimer.active && restTimer.endAt !== null) {
      const tick = () => {
        setRestTimer((prev) => {
          if (prev.endAt === null) return prev;
          const left = Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000));
          if (left <= 0) {
            return { ...prev, remainingSeconds: 0, active: false };
          }
          return { ...prev, remainingSeconds: left };
        });
      };
      tick();
      interval = setInterval(tick, 1000);

      // Volver del background / recuperar foco: recalcular YA desde `endAt`
      // (los timers en segundo plano vienen throttled y el tick puede tardar).
      const resync = () => {
        if (typeof document === "undefined" || !document.hidden) tick();
      };
      document.addEventListener("visibilitychange", resync);
      window.addEventListener("focus", resync);
      return () => {
        if (interval) clearInterval(interval);
        document.removeEventListener("visibilitychange", resync);
        window.removeEventListener("focus", resync);
      };
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.active, restTimer.endAt, soundEnabled]);

  const startRestTimer = useCallback(
    (seconds: number, exerciseName = "") => {
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      seconds = Math.min(3600, Math.ceil(seconds));
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
    if (!Number.isFinite(deltaSeconds)) return;
    setRestTimer((prev) => {
      if (prev.endAt === null) return prev;
      const nextRemaining = Math.max(0, Math.ceil((prev.endAt - Date.now()) / 1000) + deltaSeconds);
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
