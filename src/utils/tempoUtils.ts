// =============================================================
// KINETIX — Utilidades de tempo / TUT (tiempo bajo tensión).
// Formato: "excéntrico-pausaAbajo-concéntrico-pausaArriba" (ej. "3-1-0-1").
// TUT por serie = (suma de fases) × reps. La fase excéntrica queda
// expuesta como variable separada para trackearla.
// =============================================================

export interface TempoPhases {
  eccentric: number;
  bottomPause: number;
  concentric: number;
  topPause: number;
}

export function parseTempo(tempo?: string): TempoPhases {
  const parts = (tempo ?? "").split("-").map((v) => parseInt(v, 10) || 0);
  return {
    eccentric: parts[0] ?? 3,
    bottomPause: parts[1] ?? 1,
    concentric: Math.max(1, parts[2] ?? 1),
    topPause: parts[3] ?? 0,
  };
}

export function tempoSecondsPerRep(tempo?: string): number {
  const p = parseTempo(tempo);
  return p.eccentric + p.bottomPause + p.concentric + p.topPause;
}

/** TUT de una serie en segundos. Para isométricos usa durationSeconds. */
export function computeSetTUT(reps: number, tempo?: string, durationSeconds?: number): number {
  if (durationSeconds && durationSeconds > 0) return durationSeconds;
  if (!(reps > 0)) return 0;
  return tempoSecondsPerRep(tempo) * reps;
}

/** Segundos de fase excéntrica acumulados en una serie. */
export function computeSetEccentricSeconds(reps: number, tempo?: string): number {
  if (!(reps > 0)) return 0;
  return parseTempo(tempo).eccentric * reps;
}
