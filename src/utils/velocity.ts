// =============================================================
// KINETIX — VBT proxy (P2): velocidad concéntrica estimada sin encoder.
//
// Curvas carga-velocidad de referencia (velocidad media propulsiva, m/s)
// de González-Badillo / Sánchez-Medina: a igual %1RM la barra se mueve
// a velocidad predecible. Sin sensor, estimamos %1RM por Epley y
// mapeamos a velocidad → zona de entrenamiento. Es un PROXY con ±0.05 m/s
// de error típico: sirve para orientar (fuerza vs potencia), no para
// prescribir al kg.
//
// Puntos: [fracción 1RM, m/s]. Interpolación lineal entre puntos.
// =============================================================

export type VbtPattern = "squat" | "bench" | "hinge";
export type VelocityZone = "fuerza" | "potencia" | "velocidad";

const CURVES: Record<VbtPattern, [number, number][]> = {
  // Sentadilla (Sánchez-Medina 2017, MPV): 1RM ≈ 0.30 m/s.
  squat: [
    [1.0, 0.3],
    [0.9, 0.48],
    [0.8, 0.65],
    [0.7, 0.82],
    [0.6, 0.98],
  ],
  // Press banca (González-Badillo 2010, MPV): 1RM ≈ 0.17 m/s.
  bench: [
    [1.0, 0.17],
    [0.9, 0.34],
    [0.8, 0.52],
    [0.7, 0.68],
    [0.6, 0.85],
  ],
  // Peso muerto / hinge (proxy conservador, Beckham 2018): 1RM ≈ 0.25 m/s.
  hinge: [
    [1.0, 0.25],
    [0.9, 0.4],
    [0.8, 0.55],
    [0.7, 0.7],
    [0.6, 0.85],
  ],
};

export const VBT_ZONE_LABEL: Record<VelocityZone, string> = {
  fuerza: "Zona fuerza (<0.5 m/s)",
  potencia: "Zona potencia (0.5–0.75 m/s)",
  velocidad: "Zona velocidad (>0.75 m/s)",
};

/** Patrón VBT por categoría del ejercicio (core/isométricos → null). */
export function vbtPatternFor(category?: string): VbtPattern | null {
  if (category === "legs") return "squat";
  if (category === "push") return "bench";
  if (category === "pull") return "hinge";
  return null;
}

/** Velocidad estimada (m/s) para una fracción del 1RM. null si fuera de rango útil. */
export function estimateVelocity(pattern: VbtPattern, fraction1RM: number): number | null {
  if (!Number.isFinite(fraction1RM) || fraction1RM < 0.5 || fraction1RM > 1.05) return null;
  const curve = CURVES[pattern];
  const f = Math.min(1.0, fraction1RM);
  for (let i = 0; i < curve.length - 1; i++) {
    const [fHi, vHi] = curve[i];
    const [fLo, vLo] = curve[i + 1];
    if (f <= fHi && f >= fLo) {
      const t = (fHi - f) / (fHi - fLo);
      return Math.round((vHi + (vLo - vHi) * t) * 100) / 100;
    }
  }
  // Por debajo del 60%: extrapolación lineal suave del último tramo.
  const [f1, v1] = curve[curve.length - 2];
  const [f0, v0] = curve[curve.length - 1];
  const slope = (v0 - v1) / (f0 - f1);
  return Math.round((v0 + (f - f0) * slope) * 100) / 100;
}

export function velocityZone(velocityMs: number): VelocityZone {
  if (velocityMs < 0.5) return "fuerza";
  if (velocityMs <= 0.75) return "potencia";
  return "velocidad";
}

/**
 * Zona estimada de una serie: peso / e1RM → velocidad → zona.
 * Devuelve null si no hay e1RM válido (no se inventa).
 */
export function velocityZoneForSet(
  category: string | undefined,
  weight: number,
  e1rm: number | null
): { velocityMs: number; zone: VelocityZone; label: string } | null {
  const pattern = vbtPatternFor(category);
  if (!pattern || e1rm == null || !(e1rm > 0) || !(weight > 0)) return null;
  const v = estimateVelocity(pattern, weight / e1rm);
  if (v == null) return null;
  const zone = velocityZone(v);
  return { velocityMs: v, zone, label: VBT_ZONE_LABEL[zone] };
}
