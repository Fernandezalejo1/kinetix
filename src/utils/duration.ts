// =============================================================
// KINETIX — Formato de duraciones.
//
// Dos formatos distintos, con propósitos distintos:
//   formatDuration(value)  → duración "humana" sin relleno: 3:53, 0:09, 1:02:30
//                            (descanso, tiempo restante, duración de sesión).
//   formatStopwatch(value) → reloj de sesión con MM:SS relleno: 03:21, 1:03:21
//                            (el ancho se mantiene estable segundo a segundo).
//
// Formato único y testeable: la UI no vuelve a armar "mm:ss" a mano.
// =============================================================

/** Normaliza a segundos enteros, no negativos y finitos. */
function toWholeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.floor(seconds));
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

/**
 * Duración legible con el mínimo de dígitos necesarios en los minutos.
 *   233 → "3:53" · 224 → "3:44" · 150 → "2:30" · 65 → "1:05" · 9 → "0:09"
 * Con horas incluye el bloque horario: 3661 → "1:01:01".
 */
export function formatDuration(seconds: number): string {
  const total = toWholeSeconds(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

/**
 * Reloj de sesión: minutos rellenos a 2 dígitos para que el ancho del
 * indicador no salte cada minuto. 201 → "03:21" · 3801 → "1:03:21".
 * Se combina con `font-variant-numeric: tabular-nums` en la UI.
 */
export function formatStopwatch(seconds: number): string {
  const total = toWholeSeconds(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}
