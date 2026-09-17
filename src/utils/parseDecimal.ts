/** Parseo de entradas decimales escritas por el usuario.
 *
 *  Acepta coma o punto como separador decimal, espacios finos de miles y una
 *  unidad al final del texto ("82 cm", "82kg"). Devuelve un motivo concreto
 *  cuando el valor es inválido para poder mostrar un mensaje específico en vez
 *  de descartarlo en silencio.
 */

export type DecimalParseIssue = "empty" | "not-number" | "negative" | "too-small" | "too-large";

export interface DecimalParseOptions {
  /** Valor mínimo aceptado (inclusive). */
  min?: number;
  /** Valor máximo aceptado (inclusive). */
  max?: number;
  /** Unidad aceptada e ignorada al final del texto: "cm", "kg"… */
  unit?: string;
  /** Decimales a los que se redondea el resultado. Por defecto 1. */
  decimals?: number;
}

export type DecimalParseResult =
  | { ok: true; value: number }
  | { ok: false; issue: DecimalParseIssue };

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function parseDecimalInput(raw: string, options: DecimalParseOptions = {}): DecimalParseResult {
  const { min, max, unit, decimals = 1 } = options;
  let text = (raw ?? "").toString().trim();

  if (unit) {
    const escaped = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped + "\\s*$", "i"), "").trim();
  }

  if (!text) return { ok: false, issue: "empty" };

  // Se descartan espacios (incluidos los finos que inserta el teclado móvil).
  text = text.replace(/\s+/g, "");

  // Un solo separador decimal, con dígitos a la derecha.
  if (!/^[+-]?[0-9]*[.,]?[0-9]+$/.test(text)) return { ok: false, issue: "not-number" };

  const value = parseFloat(text.replace(",", "."));
  if (!Number.isFinite(value)) return { ok: false, issue: "not-number" };
  if (value < 0) return { ok: false, issue: "negative" };
  if (min !== undefined && value < min) return { ok: false, issue: "too-small" };
  if (max !== undefined && value > max) return { ok: false, issue: "too-large" };

  return { ok: true, value: roundTo(value, decimals) };
}

export interface DecimalIssueContext {
  /** Nombre del campo tal como lo ve el usuario ("Cuello", "Peso"). */
  label: string;
  unit?: string;
  min?: number;
  max?: number;
}

/** Mensaje en español, específico por motivo, para mostrar junto al campo. */
export function describeDecimalIssue(issue: DecimalParseIssue, ctx: DecimalIssueContext): string {
  const unitSuffix = ctx.unit ? ` ${ctx.unit}` : "";
  switch (issue) {
    case "empty":
      return `Completá "${ctx.label}".`;
    case "not-number":
      return `"${ctx.label}": ingresá un número (podés usar coma o punto decimal).`;
    case "negative":
      return `"${ctx.label}": no puede ser negativo.`;
    case "too-small":
      return `"${ctx.label}": el mínimo es ${ctx.min}${unitSuffix}.`;
    case "too-large":
      return ctx.unit
        ? `"${ctx.label}": el máximo es ${ctx.max}${unitSuffix}.`
        : `"${ctx.label}": parece fuera de escala (máximo ${ctx.max}).`;
  }
}
