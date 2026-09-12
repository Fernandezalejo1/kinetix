import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE, recommendProgram, shortenRoutine } from "../src/utils/userProfile";

describe("realistic schedules", () => {
  it("two-day definition fits two days with full-body coverage", () => {
    const plan = recommendProgram({ ...DEFAULT_USER_PROFILE, goal: "cut", daysPerWeek: 2 });
    expect(plan.daysPerWeek).toBe(2);
    expect(plan.id).toBe("fbeod-full-body");
    expect(plan.routines.length).toBeLessThanOrEqual(2);
  });
  it("short sessions preserve the split and priority without mutating the plan", () => {
    const routine = recommendProgram(DEFAULT_USER_PROFILE).routines[0];
    const before = JSON.stringify(routine);
    const short = shortenRoutine(routine, 25);
    expect(short.name).toBe(routine.name);
    expect(short.targetSplit).toBe(routine.targetSplit);
    expect(short.exercises[0].exerciseId).toBe(routine.exercises[0].exerciseId);
    expect(short.estimatedDurationMin).toBeLessThanOrEqual(25);
    expect(JSON.stringify(routine)).toBe(before);
    expect(short.exercises.every(e => e.targetSets >= 1)).toBe(true);
  });
});
