import { BodyMetricEntry, NutritionProfile } from "../types";

/** % de grasa corporal objetivo para ver un six-pack (referencia clásica). */
export const ABS_TARGET_BODY_FAT: Record<"masculino" | "femenino", number> = {
  masculino: 12,
  femenino: 20,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Estimación de % de grasa por IMC (Deurenberg et al., 1991) — solo como
 * FALLBACK cuando el usuario no registró % de grasa medido. Es una
 * aproximación poblacional: subestima en personas muy musculosas y sobrestima
 * en sedentarias con poca masa magra. La UI lo etiqueta como "estimado".
 */
export function estimateBodyFatFromBMI(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "masculino" | "femenino"
): number {
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  const sexConst = sex === "femenino" ? 0 : 1;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sexConst - 5.4;
  return Math.round(clamp(bf, 3, 50) * 10) / 10;
}

export interface AbsTimelineInput {
  weightKg: number;
  bodyFatPct: number;
  sex: "masculino" | "femenino";
  /** Ritmo real observado de pérdida (kg/semana). Si no se pasa, usa 0.5. */
  weeklyLossKg?: number;
}

export interface AbsTimeline {
  targetBodyFat: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeightKg: number;
  kgToLose: number;
  weeklyLossKg: number;
  weeks: number;
  etaDate: Date;
  reached: boolean;
}

/**
 * Línea de tiempo: cuántos kg y semanas faltan para llegar al % de grasa del
 * six-pack. Modelo de 2 compartimentos (masa magra se conserva, la pérdida es
 * grasa): peso objetivo = masa magra / (1 − %grasa objetivo).
 */
export function computeAbsTimeline(input: AbsTimelineInput): AbsTimeline {
  const targetBodyFat = ABS_TARGET_BODY_FAT[input.sex];
  const leanMassKg = input.weightKg * (1 - input.bodyFatPct / 100);
  const fatMassKg = input.weightKg - leanMassKg;
  const targetWeightKg = leanMassKg / (1 - targetBodyFat / 100);
  const kgToLose = Math.max(0, input.weightKg - targetWeightKg);
  const weeklyLossKg = clamp(input.weeklyLossKg ?? 0.5, 0.15, 1.5);
  const weeks = kgToLose <= 0 ? 0 : Math.ceil(kgToLose / weeklyLossKg);
  const etaDate = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
  return {
    targetBodyFat,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    targetWeightKg: Math.round(targetWeightKg * 10) / 10,
    kgToLose: Math.round(kgToLose * 10) / 10,
    weeklyLossKg,
    weeks,
    etaDate,
    reached: kgToLose <= 0,
  };
}

/**
 * Ritmo real de pérdida (kg/semana) observado entre la medición más antigua y
 * la más reciente. Requiere al menos ~7 días de diferencia. Devuelve null si
 * no hay datos suficientes (el panel usa entonces el ritmo por defecto 0.5).
 */
export function observedWeeklyLoss(bodyMetrics: BodyMetricEntry[]): number | null {
  if (!bodyMetrics || bodyMetrics.length < 2) return null;
  const sorted = [...bodyMetrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
  if (days < 7) return null;
  const loss = (first.weightKg - last.weightKg) / (days / 7);
  if (!Number.isFinite(loss)) return null;
  return Math.round(clamp(loss, 0.1, 1.5) * 100) / 100;
}

/** Última medición (la más reciente por fecha, no por orden de array). */
export function latestBodyMetric(bodyMetrics: BodyMetricEntry[]): BodyMetricEntry | null {
  if (!bodyMetrics || bodyMetrics.length === 0) return null;
  return [...bodyMetrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export interface AbsEstimateResult {
  bodyFatPct: number | null;
  bodyFatSource: "medido" | "estimado_imc" | null;
  weightKg: number | null;
  waistCm: number | null;
  timeline: AbsTimeline | null;
  weeklyLossKg: number | null;
}

/** Arma el estado completo del panel con los datos disponibles. */
export function computeAbsEstimate(
  bodyMetrics: BodyMetricEntry[],
  profile: NutritionProfile
): AbsEstimateResult {
  const latest = latestBodyMetric(bodyMetrics);
  if (!latest) {
    return {
      bodyFatPct: null,
      bodyFatSource: null,
      weightKg: null,
      waistCm: null,
      timeline: null,
      weeklyLossKg: null,
    };
  }
  const weightKg = latest.weightKg;
  let bodyFatPct: number | null = latest.estimatedBodyFat ?? null;
  let bodyFatSource: AbsEstimateResult["bodyFatSource"] = bodyFatPct != null ? "medido" : null;
  if (bodyFatPct == null && profile.heightCm > 0 && weightKg > 0) {
    bodyFatPct = estimateBodyFatFromBMI(weightKg, profile.heightCm, profile.age, profile.sex);
    bodyFatSource = "estimado_imc";
  }
  const rate = observedWeeklyLoss(bodyMetrics);
  const timeline =
    bodyFatPct != null
      ? computeAbsTimeline({
          weightKg,
          bodyFatPct,
          sex: profile.sex,
          weeklyLossKg: rate ?? undefined,
        })
      : null;
  return {
    bodyFatPct,
    bodyFatSource,
    weightKg,
    waistCm: latest.waistCm ?? null,
    timeline,
    weeklyLossKg: rate,
  };
}