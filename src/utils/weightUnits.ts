// =============================================================
// KINETIX — Unidades de peso (conversión real kg <-> lb).
//
// PRINCIPIO: los datos (sesiones, sets, PRs, historial) SIEMPRE se
// guardan en kg (unidad canónica). La unidad seleccionada es solo
// presentación:
//   - ENTRADA (usuario escribe en lb) -> convertir a kg antes de guardar.
//   - SALIDA (mostrar al usuario)     -> convertir de kg a la unidad UI.
//
// Esto arregla el bug del selector KG/LBS que solo cambiaba el
// rótulo: 100 kg se mostraba como "100 lb". Ahora 100 kg se muestra
// como 220.5 lb y al escribir 200 lb se guardan 90.7 kg.
// =============================================================

export const KG_PER_LB = 0.45359237;

/** Redondeo "de plato": 2 decimales como mucho, sin flotantes sucios. */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** kg -> lb (para MOSTRAR valores guardados en kg). */
export function kgToDisplay(kg: number, unit: "kg" | "lbs"): number {
  if (!Number.isFinite(kg)) return 0;
  return unit === "lbs" ? round2(kg / KG_PER_LB) : round2(kg);
}

/** lb -> kg (para GUARDAR lo que el usuario ingresó en lb). */
export function displayToKg(value: number, unit: "kg" | "lbs"): number {
  if (!Number.isFinite(value)) return 0;
  return unit === "lbs" ? round2(value * KG_PER_LB) : round2(value);
}

/**
 * Formatea un peso guardado en kg para la unidad activa, con el
 * redondeo de exhibición apropiado (0.1 kg / 0.5 lb). Devuelve string.
 */
export function formatWeight(kg: number, unit: "kg" | "lbs"): string {
  const v = kgToDisplay(kg, unit);
  if (unit === "lbs") {
    // Medios kilos se ven como lbs limpios: 2.5 kg -> 5.5 lb
    return (Math.round(v * 2) / 2).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  }
  return v.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

/** Delta de incremento según unidad (para saltos de sobrecarga legibles). */
export function incrementFor(unit: "kg" | "lbs", compound: boolean): number {
  return unit === "lbs" ? (compound ? 5 : 2.5) : compound ? 2.5 : 1;
}
