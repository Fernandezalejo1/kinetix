// =============================================================
// KINETIX — Utilidades de fecha.
// La app trabaja con días locales. `localDateKey` formatea una
// fecha en `YYYY-MM-DD` usando la zona horaria LOCAL (no UTC),
// para que la clave del día coincida siempre con el día real del
// usuario (pasos, reto, metas diarias, etc.).
// =============================================================

/**
 * Clave de día en zona horaria LOCAL (YYYY-MM-DD).
 * A diferencia de `new Date().toISOString().split("T")[0]` (que usa
 * UTC y se desfasa cerca de la medianoche local), esta usa el día
 * real del usuario.
 */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Clave LOCAL de ayer. */
export function localDateKeyOfDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
}
