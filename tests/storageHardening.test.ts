import { beforeEach, describe, expect, it } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import { mergeArchived } from "../src/utils/longTermHistory";
import { readChallenge, DAILY_GOAL } from "../src/utils/challengeStorage";
import { readStepsConfig } from "../src/utils/healthConnect";

installTestEnv();

beforeEach(() => {
  localStorage.clear();
});

describe("mergeArchived defensivo (archivo sin validadores)", () => {
  it("salta entradas corruptas del archivo sin romper la hidratación", () => {
    const prev = [{ id: "a", date: "2026-09-01" }];
    const archived = [
      { id: "b", date: "2026-08-01" },
      null,
      undefined,
      { sinId: true },
    ] as unknown as { id: string; date: string }[];
    const merged = mergeArchived(prev, archived, (w) => w.id);
    expect(merged.map((w) => w.id).sort()).toEqual(["a", "b"]);
  });

  it("sigue fusionando por identidad con datos sanos", () => {
    const prev = [{ id: "a", date: "2026-09-02" }];
    const archived = [
      { id: "a", date: "2026-09-01" },
      { id: "b", date: "2026-08-01" },
    ];
    const merged = mergeArchived(prev, archived, (w) => w.id);
    expect(merged.map((w) => w.id)).toEqual(["a", "b"]);
    expect(merged[0].date).toBe("2026-09-02");
  });
});

describe("readChallenge sanea la forma", () => {
  it("repara completedDates, fechas y números corruptos", () => {
    localStorage.setItem(
      "kinetix_challenge",
      JSON.stringify({
        active: "si",
        startDate: 123,
        completedDates: "no-array",
        currentStreak: NaN,
        bestStreak: null,
        lastCheckedDate: 42,
        dailyGoal: -5,
        expired: 1,
      })
    );
    const s = readChallenge();
    expect(s.completedDates).toEqual([]);
    expect(s.startDate).toBe("");
    expect(s.lastCheckedDate).toBe("");
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(0);
    expect(s.dailyGoal).toBe(DAILY_GOAL);
    expect(s.active).toBe(false);
    expect(s.expired).toBe(false);
  });

  it("conserva un estado válido intacto", () => {
    localStorage.setItem(
      "kinetix_challenge",
      JSON.stringify({
        active: true,
        startDate: "2026-08-31",
        completedDates: ["2026-09-01"],
        currentStreak: 3,
        bestStreak: 5,
        lastCheckedDate: "2026-09-03",
        dailyGoal: 10000,
        expired: false,
      })
    );
    const s = readChallenge();
    expect(s.completedDates).toEqual(["2026-09-01"]);
    expect(s.dailyGoal).toBe(10000);
    expect(s.active).toBe(true);
  });
});

describe("readStepsConfig sanea tipos", () => {
  it("repara stepGoal corrupto sin tocar flags válidos", () => {
    localStorage.setItem(
      "kinetix_steps_config",
      JSON.stringify({ stepGoal: "muchos", enabled: true, autoApply: false })
    );
    const c = readStepsConfig();
    expect(c.stepGoal).toBe(10000);
    expect(c.enabled).toBe(true);
    expect(c.autoApply).toBe(false);
  });
});
