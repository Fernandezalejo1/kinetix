/**
 * Etiquetas de equipamiento en español.
 *
 * Las fichas de ejercicio mezclaban slugs en inglés ("barbell", "cable",
 * "machine") con el texto en español. Aquí se traducen conservando el término
 * habitual cuando aporta precisión (p. ej. "Barra EZ", "Multipower").
 */
const EQUIPMENT_LABELS_ES: Record<string, string> = {
  barbell: "Barra",
  "olympic barbell": "Barra olímpica",
  "ez bar": "Barra EZ",
  ezbar: "Barra EZ",
  dumbbell: "Mancuernas",
  dumbbells: "Mancuernas",
  cable: "Polea",
  "cable machine": "Polea",
  machine: "Máquina",
  smith: "Multipower",
  "smith machine": "Multipower",
  kettlebell: "Pesa rusa (kettlebell)",
  band: "Banda elástica",
  bands: "Banda elástica",
  bodyweight: "Peso corporal",
  "body weight": "Peso corporal",
  none: "Sin equipamiento",
  plate: "Disco",
  "plate loaded": "Máquina de discos",
  lever: "Máquina de palanca",
  trx: "TRX / suspensión",
  bench: "Banco",
  "pull-up bar": "Barra fija",
  pullup: "Barra fija",
  dip: "Paralelas",
  "suspension": "TRX / suspensión",
};

/**
 * Perfil de resistencia (curva de fuerza) en lenguaje claro.
 *
 * El valor canónico llega en inglés ("lengthened", "mid_range") y se mostraba
 * crudo en la interfaz (p. ej. "mid_range" junto a un texto en español).
 */
const RESISTANCE_PROFILE_LABELS_ES: Record<string, string> = {
  lengthened: "más tensión con el músculo estirado",
  shortened: "más tensión con el músculo acortado",
  mid_range: "tensión máxima a mitad del recorrido",
  linear: "tensión uniforme en todo el recorrido",
  accommodating: "resistencia que se adapta (poleas/bandas)",
};

export function resistanceProfileLabelEs(profile: string | null | undefined): string {
  if (!profile) return "Sin especificar";
  return RESISTANCE_PROFILE_LABELS_ES[profile.trim().toLowerCase()] ?? "Sin especificar";
}

/** Devuelve la etiqueta en español; si no hay traducción, deja el texto original. */
export function equipmentLabelEs(equipment: string | null | undefined): string {
  if (!equipment) return "Sin especificar";
  const key = equipment.trim().toLowerCase();
  if (EQUIPMENT_LABELS_ES[key]) return EQUIPMENT_LABELS_ES[key];
  // Fallback: primera letra en mayúscula para no mostrar slugs crudos en minúscula.
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export { EQUIPMENT_LABELS_ES };
