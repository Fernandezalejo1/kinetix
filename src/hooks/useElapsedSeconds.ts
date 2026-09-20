// =============================================================
// KINETIX — Reloj de sesión (workoutElapsedTime).
//
// El TIEMPO se deriva SIEMPRE del timestamp de inicio de la sesión
// (`activeSession.startTime`, persistido en localStorage). El intervalo
// únicamente refresca la UI: si la app se minimiza, el teléfono se bloquea
// o el navegador estrangula los timers, al volver el valor se recalcula
// desde el timestamp y nunca se atrasa ni se duplica.
//
// NO es el temporizador de descanso: el descanso vive en `useRestTimer`
// (`endAt` → restRemainingTime). Ambos estados son independientes y
// completar una serie no toca este reloj.
// =============================================================
import { useEffect, useState } from "react";

const SECONDS = 1000;

/**
 * Segundos transcurridos desde `startedAt` (timestamp en ms).
 * Devuelve 0 cuando no hay sesión activa.
 */
export function useElapsedSeconds(startedAt: number | null | undefined): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (startedAt == null || !Number.isFinite(startedAt)) {
      setElapsedSeconds(0);
      return;
    }

    // Única fuente de verdad: el timestamp. El tick solo redibuja.
    const compute = () => Math.max(0, Math.floor((Date.now() - startedAt) / SECONDS));

    setElapsedSeconds(compute());
    const interval = setInterval(() => setElapsedSeconds(compute()), SECONDS);

    // Al volver del background / recuperar foco, el intervalo puede haber
    // quedado throttled: se recalcula al instante en vez de esperar el tick.
    const resync = () => {
      if (typeof document === "undefined" || !document.hidden) setElapsedSeconds(compute());
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, [startedAt]);

  return elapsedSeconds;
}
