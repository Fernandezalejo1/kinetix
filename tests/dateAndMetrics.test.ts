import { describe, expect, it } from "vitest";
import { localDateKey, localDateKeyOfDaysAgo } from "../src/utils/dateUtils";
import { latestBodyMetric } from "../src/utils/absEstimator";

describe("localDateKey", () => {
  it("formatea YYYY-MM-DD con ceros", () => {
    const d = new Date(2026, 8, 7, 23, 59); // 7 sep 2026 23:59 LOCAL
    expect(localDateKey(d)).toBe("2026-09-07");
  });

  it("NO se desfasa a UTC cerca de medianoche (día local, no UTC)", () => {
    // 2026-09-07 23:30 en UTC-3 son 2026-09-08 02:30 UTC; toISOString diría "08".
    const d = new Date(Date.UTC(2026, 8, 8, 2, 30)); // = 7 sep 23:30 en UTC-3
    const expectedLocalDay = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    expect(localDateKey(d)).toBe(expectedLocalDay);
    expect(localDateKey(d)).not.toBe(d.toISOString().slice(0, 10));
  });

  it("localDateKeyOfDaysAgo resta días", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(localDateKeyOfDaysAgo(1)).toBe(localDateKey(yesterday));
  });
});

describe("latestBodyMetric", () => {
  it("devuelve la medición más reciente POR FECHA, no por orden de array", () => {
    // Historial con entradas desordenadas (bug original: length-1 daba la más vieja).
    const metrics = [
      { id: "a", date: "2026-01-01", weightKg: 90 },
      { id: "b", date: "2026-03-05", weightKg: 82 },
      { id: "c", date: "2026-02-10", weightKg: 86 },
    ];
    expect(latestBodyMetric(metrics)!.id).toBe("b");
    expect(latestBodyMetric(metrics)!.weightKg).toBe(82);
  });

  it("devuelve null con array vacío", () => {
    expect(latestBodyMetric([])).toBeNull();
  });
});
