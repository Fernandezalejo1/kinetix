import { describe, expect, it } from "vitest";
import { equipmentLabelEs } from "../src/utils/equipmentLabels";
import { muscleLabelEs } from "../src/utils/muscleLabels";

describe("etiquetas de equipamiento en español", () => {
  it("traduce los slugs habituales", () => {
    expect(equipmentLabelEs("barbell")).toBe("Barra");
    expect(equipmentLabelEs("dumbbell")).toBe("Mancuernas");
    expect(equipmentLabelEs("cable")).toBe("Polea");
    expect(equipmentLabelEs("machine")).toBe("Máquina");
    expect(equipmentLabelEs("bodyweight")).toBe("Peso corporal");
  });

  it("ignora mayúsculas y espacios", () => {
    expect(equipmentLabelEs(" BARBELL ")).toBe("Barra");
    expect(equipmentLabelEs("Dumbbell")).toBe("Mancuernas");
  });

  it("no devuelve slugs crudos en minúscula", () => {
    expect(equipmentLabelEs("trap-bar-unknown")).toBe("Trap-bar-unknown");
  });

  it("maneja valores vacíos sin romper", () => {
    expect(equipmentLabelEs(undefined)).toBe("Sin especificar");
    expect(equipmentLabelEs(null)).toBe("Sin especificar");
    expect(equipmentLabelEs("")).toBe("Sin especificar");
  });
});

describe("nombres de músculo en español", () => {
  it("traduce las claves de los landmarks", () => {
    expect(muscleLabelEs("chest")).toBe("Pectoral");
    expect(muscleLabelEs("front_delts")).toBe("Deltoides Anterior");
  });

  it("traduce los grupos sin volumen semanal definido", () => {
    expect(muscleLabelEs("glutes")).toBe("Glúteos");
    expect(muscleLabelEs("calves")).toBe("Gemelos / Sóleo");
    expect(muscleLabelEs("abs")).toBe("Abdomen / Core");
  });

  it("no rompe con claves desconocidas o vacías", () => {
    expect(muscleLabelEs("weird_muscle")).toBe("weird_muscle");
    expect(muscleLabelEs(undefined)).toBe("—");
  });
});
