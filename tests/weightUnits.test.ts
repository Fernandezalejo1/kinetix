import { describe, expect, it } from "vitest";
import { kgToDisplay, displayToKg, formatWeight } from "../src/utils/weightUnits";

describe("weightUnits", () => {
  it("convierte kg -> lb para mostrar", () => {
    expect(kgToDisplay(100, "lbs")).toBeCloseTo(220.46, 1);
    expect(kgToDisplay(100, "kg")).toBe(100);
  });

  it("convierte lb -> kg para guardar (unidad canónica)", () => {
    expect(displayToKg(220.5, "lbs")).toBeCloseTo(100.02, 1);
    expect(displayToKg(100, "kg")).toBe(100);
  });

  it("round-trip kg -> lb -> kg no pierde el valor", () => {
    const kg = 82.5;
    expect(displayToKg(kgToDisplay(kg, "lbs"), "lbs")).toBeCloseTo(kg, 1);
  });

  it("formatWeight muestra lb para 100 kg", () => {
    expect(formatWeight(100, "lbs")).toBe("220,5");
    expect(formatWeight(100, "kg")).toBe("100");
  });

  it("maneja valores inválidos sin explotar", () => {
    expect(kgToDisplay(NaN, "lbs")).toBe(0);
    expect(displayToKg(NaN, "kg")).toBe(0);
  });
});
