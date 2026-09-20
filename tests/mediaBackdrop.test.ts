import { describe, it, expect } from "vitest";
import { mediaBackdrop } from "../src/utils/mediaBackdrop";

describe("mediaBackdrop (bandas del video)", () => {
  it("devuelve el color medio cuando las esquinas son uniformes", () => {
    const white = Array.from({ length: 16 }, () => [255, 255, 255]);
    expect(mediaBackdrop(white)).toBe("rgb(255, 255, 255)");
  });

  it("tolera ruido leve de compresión (promedio 2x2 por esquina)", () => {
    const samples = Array.from({ length: 16 }, (_, i) => [250 + (i % 3), 251, 249]);
    expect(mediaBackdrop(samples)).toBe("rgb(251, 251, 249)");
  });

  it("cae a marco neutro si hay gradiente o esquinas distintas", () => {
    const mixed = [
      ...Array.from({ length: 8 }, () => [10, 10, 10]),
      ...Array.from({ length: 8 }, () => [250, 250, 250]),
    ];
    expect(mediaBackdrop(mixed)).toBe("#0a0a0a");
  });

  it("cae a marco neutro con entrada inválida", () => {
    expect(mediaBackdrop([])).toBe("#0a0a0a");
    expect(mediaBackdrop([[255, 255]])).toBe("#0a0a0a");
    expect(mediaBackdrop([[NaN, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])).toBe("#0a0a0a");
  });
});
