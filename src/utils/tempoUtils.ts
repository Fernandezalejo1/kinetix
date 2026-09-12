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
  // P0 fix: "0" = explosivo (sin clamp a 1) y "X" = explosivo (parseInt→NaN→0).
  // Antes Math.max(1, ...) rompía "3-1-0-1" y "Explosivo".
  const raw = (tempo ?? "").trim().toUpperCase();
  if (raw === "" || raw === "EXPLOSIVO" || raw === "X") {
    return { eccentric: 2, bottomPause: 0, concentric: 0, topPause: 0 };
  }
  const parts = (tempo ?? "").split("-").map((v) => {
    const t = v.trim().toUpperCase();
    if (t === "X") return 0;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  return {
    eccentric: parts[0] ?? 3,
    bottomPause: parts[1] ?? 1,
    concentric: Math.max(0, parts[2] ?? 1),
    topPause: parts[3] ?? 0,
  };
}

export function tempoSecondsPerRep(tempo?: string): number {
  const p = parseTempo(tempo);
  return p.eccentric + p.bottomPause + p.concentric + p.topPause;
}

/** TUT de una serie en segundos. Para isométricos usa durationSeconds. */
export function computeSetTUT(reps: number, tempo?: string, durationSeconds?: number): number {
  if (durationSeconds != null && durationSeconds > 0) return durationSeconds;
  if (!(reps > 0)) return 0;
  return tempoSecondsPerRep(tempo) * reps;
}

/** Segundos de fase excéntrica acumulados en una serie. */
export function computeSetEccentricSeconds(reps: number, tempo?: string): number {
  if (!(reps > 0)) return 0;
  return parseTempo(tempo).eccentric * reps;
}
