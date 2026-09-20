import { describe, expect, it } from "vitest";
import { formatDuration, formatStopwatch } from "../src/utils/duration";

describe("formatDuration", () => {
  it("formatea M:SS sin relleno en los minutos (descanso)", () => {
    expect(formatDuration(233)).toBe("3:53");
    expect(formatDuration(224)).toBe("3:44");
    expect(formatDuration(150)).toBe("2:30");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(59)).toBe("0:59");
    expect(formatDuration(60)).toBe("1:00");
  });

  it("agrega el bloque horario solo cuando hace falta", () => {
    expect(formatDuration(3599)).toBe("59:59");
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("sanea valores inválidos sin romper la UI", () => {
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("0:00");
    expect(formatDuration(12.9)).toBe("0:12");
  });
});

describe("formatStopwatch", () => {
  it("mantiene MM:SS relleno para que el ancho no salte", () => {
    expect(formatStopwatch(0)).toBe("00:00");
    expect(formatStopwatch(9)).toBe("00:09");
    expect(formatStopwatch(201)).toBe("03:21");
    expect(formatStopwatch(599)).toBe("09:59");
    expect(formatStopwatch(600)).toBe("10:00");
  });

  it("pasa a H:MM:SS después de una hora de sesión", () => {
    expect(formatStopwatch(3600)).toBe("1:00:00");
    expect(formatStopwatch(3801)).toBe("1:03:21");
  });
});
