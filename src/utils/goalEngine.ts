import {
  BodyMetricEntry,
  CardioEntry,
  GoalPhase,
  NutritionProfile,
} from "../types";
import { ABS_TARGET_BODY_FAT, latestBodyMetric, estimateBodyFatFromBMI } from "./absEstimator";

// =============================================================
// KINETIX — Motor del Objetivo (Plan de Fases + Recuperación).
// Lógica 100% determinista: fases, sueño, readiness, cardio,
// media móvil de peso y detección de estancamiento.
// =============================================================

export interface PhaseConfig {
  id: GoalPhase;
  label: string;
  short: string;
  description: string;
  programId: string;
  programTitle: string;
  calorieLabel: string;
  proteinPerKg: number;
  cardioMinPerWeek: number;
  hiitSessionsPerWeek: number;
  accent: string;
}

export const PHASE_ORDER: GoalPhase[] = ["cut", "maintenance", "lean_bulk"];

export const PHASE_CONFIG: Record<GoalPhase, PhaseConfig> = {
  cut: {
    id: "cut",
    label: "Déficit · Definición",
    short: "Déficit",
    description:
      "Pérdida de grasa controlada (−15%) con proteína alta para conservar masa magra. Volumen de fuerza reducido (~60–70%) y cardio diario para acelerar el déficit.",
    programId: "definition-abs-4d",
    programTitle: "DEFINICIÓN + ABDOMINALES (4 Días)",
    calorieLabel: "TDEE −15%",
    proteinPerKg: 2.0,
    cardioMinPerWeek: 150,
    hiitSessionsPerWeek: 1,
    accent: "text-amber-300",
  },
  maintenance: {
    id: "maintenance",
    label: "Mantenimiento",
    short: "Mantener",
    description:
      "Calorías de equilibrio para consolidar el resultado, mejorar fuerza y recuperar el margen metabólico antes del próximo ciclo. Ideal 4–8 semanas.",
    programId: "science-upper-lower-4d",
    programTitle: "Torso / Pierna Científico (4 Días)",
    calorieLabel: "TDEE",
    proteinPerKg: 2.0,
    cardioMinPerWeek: 120,
    hiitSessionsPerWeek: 1,
    accent: "text-emerald-300",
  },
  lean_bulk: {
    id: "lean_bulk",
    label: "Volumen Magro",
    short: "Lean Bulk",
    description:
      "Superávit suave (+5–8%) con el volumen de hipertrofia completo: el momento de crecer. Frecuencia 2x por grupo con doble progresión.",
    programId: "science-hypertrophy-ppl",
    programTitle: "Hipertrofia PPL Científica (6 Días)",
    calorieLabel: "TDEE +8%",
    proteinPerKg: 2.2,
    cardioMinPerWeek: 90,
    hiitSessionsPerWeek: 0,
    accent: "text-cyan-300",
  },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** % de grasa actual: medido, o estimado por IMC como fallback. */
export function currentBodyFat(
  bodyMetrics: BodyMetricEntry[],
  profile: NutritionProfile
): { pct: number | null; source: "medido" | "estimado_imc" | null } {
  const latest = latestBodyMetric(bodyMetrics);
  if (!latest) return { pct: null, source: null };
  if (latest.estimatedBodyFat != null) return { pct: latest.estimatedBodyFat, source: "medido" };
  if (profile.heightCm > 0 && latest.weightKg > 0) {
    return {
      pct: estimateBodyFatFromBMI(latest.weightKg, profile.heightCm, profile.age, profile.sex),
      source: "estimado_imc",
    };
  }
  return { pct: null, source: null };
}

/**
 * Fase sugerida según el % de grasa contra el objetivo del six-pack
 * (12% hombres / 20% mujeres). El usuario siempre puede elegir otra.
 */
export function suggestPhase(bodyFatPct: number | null, sex: NutritionProfile["sex"]): GoalPhase {
  if (bodyFatPct == null) return "cut";
  const target = ABS_TARGET_BODY_FAT[sex];
  if (bodyFatPct > target) return "cut";
  if (bodyFatPct > target - 2) return "maintenance";
  return "lean_bulk";
}

/** Progreso (0-100) hacia el % de grasa objetivo, en una escala útil. */
export function phaseProgress(
  bodyFatPct: number | null,
  sex: NutritionProfile["sex"]
): number {
  if (bodyFatPct == null) return 0;
  const target = ABS_TARGET_BODY_FAT[sex];
  const startMax = target + 25; // escala: desde ~37% (hombre) / ~45% (mujer)
  if (bodyFatPct >= startMax) return 0;
  if (bodyFatPct <= target) return 100;
  return Math.round(clamp(((startMax - bodyFatPct) / (startMax - target)) * 100, 0, 100));
}

/** Ventana de sueño recomendada según el turno laboral (ej. 17:00–02:00 → 02:30–10:00). */
export function recommendedSleepWindow(
  workEnd: string
): { start: string; end: string; hours: number } {
  const [eh, em] = (workEnd || "02:00").split(":").map(Number);
  const endMin = (isNaN(eh) ? 2 : eh) * 60 + (isNaN(em) ? 0 : em);
  const hours = 7.5;
  const bedMin = endMin + 30;
  const wakeMin = bedMin + hours * 60;
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  return { start: fmt(bedMin), end: fmt(wakeMin), hours };
}

/** Horas de sueño a partir de acostarse/despertarse (cruza la medianoche si hace falta). */
export function sleepHoursOf(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if (isNaN(bh) || isNaN(wh)) return 0;
  let mins = wh * 60 + (isNaN(wm) ? 0 : wm) - (bh * 60 + (isNaN(bm) ? 0 : bm));
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}

export interface ReadinessResult {
  score: number;
  verdict: "dale" | "moderado" | "descanso";
}

export const READINESS_VERDICTS: Record<ReadinessResult["verdict"], { label: string; tip: string; color: string }> = {
  dale: {
    label: "Dale — entrená fuerte",
    tip: "Buenas señales de recuperación. Podés apuntar al RIR objetivo (1–2) y hasta intentar PR.",
    color: "text-emerald-300",
  },
  moderado: {
    label: "Moderado — bajá la intensidad",
    tip: "Fatiga media: mantené el volumen pero subí el RIR a 2–3, o hacé LISS en vez de la sesión fuerte.",
    color: "text-amber-300",
  },
  descanso: {
    label: "Descanso — recuperación activa",
    tip: "Fatiga alta: una caminata de 20–30 min (NEAT) y a dormir. El músculo crece recuperándose.",
    color: "text-rose-300",
  },
};

/**
 * Readiness diario (0-100) ponderado: sueño 40%, calidad de sueño 20%,
 * fatiga percibida 25%, agujetas 15%.
 */
export function computeReadiness(input: {
  sleepHours: number;
  sleepQuality: number; // 1-5
  fatigue: number; // 1-5 (5 = muy fatigado)
  soreness: number; // 1-5
}): ReadinessResult {
  const sleepScore = clamp(input.sleepHours / 8, 0, 1) * 40;
  const qualityScore = (clamp(input.sleepQuality, 1, 5) / 5) * 20;
  const fatigueScore = (1 - (clamp(input.fatigue, 1, 5) - 1) / 4) * 25;
  const sorenessScore = (1 - (clamp(input.soreness, 1, 5) - 1) / 4) * 15;
  const score = Math.round(sleepScore + qualityScore + fatigueScore + sorenessScore);
  const verdict: ReadinessResult["verdict"] = score >= 70 ? "dale" : score >= 45 ? "moderado" : "descanso";
  return { score, verdict };
}

/** Media móvil de peso (suaviza el ruido diario de las pesadas). */
export function movingAverageWeight(
  bodyMetrics: BodyMetricEntry[],
  window = 7
): { date: string; avg: number; raw: number }[] {
  const sorted = [...bodyMetrics].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return sorted.map((m, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = sorted.slice(from, i + 1);
    const avg = slice.reduce((s, x) => s + x.weightKg, 0) / slice.length;
    return { date: m.date, avg: Math.round(avg * 100) / 100, raw: m.weightKg };
  });
}

/** Estancamiento: días sin que la media móvil baje >0.15 kg. */
export function detectStall(
  bodyMetrics: BodyMetricEntry[],
  minWeeks = 3
): { stalled: boolean; days: number; since: string | null } {
  if (!bodyMetrics || bodyMetrics.length < 2) return { stalled: false, days: 0, since: null };
  const ma = movingAverageWeight(bodyMetrics, 7);
  const last = ma[ma.length - 1];
  let days = 0;
  let since: string | null = null;
  for (let i = ma.length - 2; i >= 0; i--) {
    if (last.avg - ma[i].avg > 0.15) break;
    days = Math.round((new Date(last.date).getTime() - new Date(ma[i].date).getTime()) / 86400000);
    since = ma[i].date;
  }
  return { stalled: days >= minWeeks * 7, days, since };
}

/** Minutos de cardio registrados en los últimos N días. */
export function weeklyCardioMinutes(cardioLog: CardioEntry[], days = 7): number {
  const cutoff = Date.now() - days * 86400000;
  return cardioLog
    .filter((c) => new Date(c.date).getTime() >= cutoff)
    .reduce((s, c) => s + (Number(c.minutes) || 0), 0);
}

/**
 * Comprime una foto a dataURL JPEG (para guardar en localStorage sin agotar
 * la cuota): máximo maxDim px y calidad ~0.65 (~60-150 KB por foto).
 */
export function downscalePhotoFile(file: File, maxDim = 700, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas no disponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("imagen inválida"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("no se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}