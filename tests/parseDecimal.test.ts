import { describe, expect, it } from "vitest";
import { describeDecimalIssue, parseDecimalInput } from "../src/utils/parseDecimal";

/** Límites usados por el panel de medidas corporales. */
const MEASURE = { min: 1, max: 300, unit: "cm" } as const;

describe("parseDecimalInput", () => {
  it("acepta enteros y decimales con punto o coma", () => {
    expect(parseDecimalInput("82")).toEqual({ ok: true, value: 82 });
    expect(parseDecimalInput("82.5")).toEqual({ ok: true, value: 82.5 });
    expect(parseDecimalInput("82,5")).toEqual({ ok: true, value: 82.5 });
    expect(parseDecimalInput(",5")).toEqual({ ok: true, value: 0.5 });
  });

  it("ignora la unidad escrita al final y los espacios", () => {
    expect(parseDecimalInput(" 82 cm ", MEASURE)).toEqual({ ok: true, value: 82 });
    expect(parseDecimalInput("82cm", MEASURE)).toEqual({ ok: true, value: 82 });
    expect(parseDecimalInput("82,5 CM", MEASURE)).toEqual({ ok: true, value: 82.5 });
    expect(parseDecimalInput("80 kg", { unit: "kg" })).toEqual({ ok: true, value: 80 });
  });

  it("redondea a los decimales indicados", () => {
    expect(parseDecimalInput("82,46", { decimals: 1 })).toEqual({ ok: true, value: 82.5 });
    expect(parseDecimalInput("82,44", { decimals: 1 })).toEqual({ ok: true, value: 82.4 });
  });

  it("distingue entrada vacía de texto inválido", () => {
    expect(parseDecimalInput("")).toEqual({ ok: false, issue: "empty" });
    expect(parseDecimalInput("   ")).toEqual({ ok: false, issue: "empty" });
    expect(parseDecimalInput("cm", MEASURE)).toEqual({ ok: false, issue: "empty" });
    expect(parseDecimalInput("abc")).toEqual({ ok: false, issue: "not-number" });
    expect(parseDecimalInput("82,,5")).toEqual({ ok: false, issue: "not-number" });
    expect(parseDecimalInput("1.234,5")).toEqual({ ok: false, issue: "not-number" });
  });

  it("rechaza negativos antes que el mínimo", () => {
    expect(parseDecimalInput("-5", MEASURE)).toEqual({ ok: false, issue: "negative" });
  });

  it("marca valores fuera de escala con el motivo correcto", () => {
    // Caso del video: "3333" en cuello no debe guardarse.
    expect(parseDecimalInput("3333", MEASURE)).toEqual({ ok: false, issue: "too-large" });
    expect(parseDecimalInput("0", MEASURE)).toEqual({ ok: false, issue: "too-small" });
    expect(parseDecimalInput("0,4", MEASURE)).toEqual({ ok: false, issue: "too-small" });
    expect(parseDecimalInput("50", { min: 20, max: 45, unit: "cm" })).toEqual({ ok: false, issue: "too-large" });
  });

  it("los límites son inclusivos", () => {
    expect(parseDecimalInput("1", MEASURE)).toEqual({ ok: true, value: 1 });
    expect(parseDecimalInput("300", MEASURE)).toEqual({ ok: true, value: 300 });
  });
});

describe("describeDecimalIssue", () => {
  it("menciona el campo y la unidad en cada motivo", () => {
    const ctx = { label: "Cuello", unit: "cm", min: 1, max: 300 };
    expect(describeDecimalIssue("empty", ctx)).toBe('Completá "Cuello".');
    expect(describeDecimalIssue("not-number", ctx)).toContain("número");
    expect(describeDecimalIssue("negative", ctx)).toContain("negativo");
    expect(describeDecimalIssue("too-small", ctx)).toContain("mínimo es 1 cm");
    expect(describeDecimalIssue("too-large", ctx)).toBe('"Cuello": el máximo es 300 cm.');
  });

  it("explica la escala también cuando no hay unidad (peso)", () => {
    const ctx = { label: "Peso (kg)", unit: "kg", min: 20, max: 400 };
    expect(describeDecimalIssue("too-large", ctx)).toBe('"Peso (kg)": el máximo es 400 kg.');
    expect(describeDecimalIssue("too-large", { label: "X", max: 10 })).toBe(
      '"X": parece fuera de escala (máximo 10).'
    );
  });
});
