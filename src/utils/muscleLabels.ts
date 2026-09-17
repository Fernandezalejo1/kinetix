import { MUSCLE_LANDMARKS_CONFIG } from "./scienceCalculators";

/**
 * Nombres de músculo en español para la UI.
 *
 * Los datos canónicos guardan claves en inglés ("chest", "front_delts"), pero
 * mostrarlas crudas mezclaba idiomas en las fichas. Se reutiliza el mapa de
 * landmarks (fuente única) y se completan los grupos que no tienen volumen
 * semanal definido.
 */
const EXTRA_LABELS_ES: Record<string, string> = {
  abs: "Abdominales",
  core: "Core",
  obliques: "Oblicuos",
  glutes: "Glúteos",
  glute_max: "Glúteo mayor",
  calves: "Gemelos",
  adductors: "Aductores",
  abductors: "Abductores",
  hip_flexors: "Flexores de cadera",
  lower_back: "Lumbar",
  rotator_cuff: "Manguito rotador",
  neck: "Cuello",
  full_body: "Cuerpo completo",
};

export function muscleLabelEs(muscle: string | null | undefined): string {
  if (!muscle) return "—";
  const key = muscle.trim().toLowerCase();
  const fromLandmarks = (MUSCLE_LANDMARKS_CONFIG as Record<string, { nameEs?: string }>)[key];
  if (fromLandmarks?.nameEs) return fromLandmarks.nameEs;
  if (EXTRA_LABELS_ES[key]) return EXTRA_LABELS_ES[key];
  // Sin traducción conocida: mostrar el texto original sin romper la lectura.
  return muscle.trim();
}
