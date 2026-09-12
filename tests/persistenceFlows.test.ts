import { beforeEach, describe, expect, it, vi } from "vitest";
import { installTestEnv } from "./helpers/testEnv";

const db = vi.hoisted(() => ({ archive: {} as Record<string, unknown>, backups: [1], fail: false }));
vi.mock("../src/utils/indexedDb", () => ({
  idbKvGet: async (key: string) => db.archive[key],
  idbKvPut: async (key: string, value: unknown) => { db.archive[key] = value; },
  replaceArchive: async (value: Record<string, unknown>, wipe: boolean) => {
    if (db.fail) throw new Error("disk full");
    db.archive = value;
    if (wipe) db.backups = [];
  },
}));
import { collectFullState, replaceFullState } from "../src/utils/backupService";
import { hydrateFromArchive, mergeArchived, mirrorHistoryToArchive, resumeHistoryWrites } from "../src/utils/longTermHistory";

installTestEnv();
const workout = (id: string, date = "2026-01-01T10:00:00.000Z") => ({
  id, date, routineName: "Push", durationSeconds: 600, totalVolumeKg: 800,
  totalSets: 1, exercises: [{ exerciseId: "bench", sets: [{ weight: 80, reps: 10, completed: true }] }],
});
beforeEach(() => {
  resumeHistoryWrites(); localStorage.clear(); db.archive = {}; db.backups = [1]; db.fail = false;
});
describe("complete persistence lifecycle", () => {
  it("exports records beyond the startup cache and preserves latest edits", async () => {
    db.archive.workoutHistory = [workout("old"), workout("new")];
    localStorage.setItem("kinetix_workout_history", JSON.stringify([{ ...workout("new"), totalSets: 2 }]));
    const state = await collectFullState();
    expect(state.kinetix_workout_history).toHaveLength(2);
    expect((state.kinetix_workout_history as any[]).find(w => w.id === "new").totalSets).toBe(2);
  });
  it("restores a smaller backup without resurrecting the previous archive", async () => {
    db.archive.workoutHistory = [workout("old"), workout("other")];
    await replaceFullState({ kinetix_workout_history: [workout("restored")] });
    const archive = await hydrateFromArchive();
    const loaded = mergeArchived(JSON.parse(localStorage.getItem("kinetix_workout_history")!), archive.workoutHistory, w => w.id);
    expect(loaded.map(w => w.id)).toEqual(["restored"]);
  });
  it("wipe removes archive and automatic copies while preserving unrelated data", async () => {
    db.archive.workoutHistory = [workout("old")];
    localStorage.setItem("kinetix_pin_hash", "secret");
    localStorage.setItem("other_app", "keep");
    await replaceFullState({}, true);
    expect(db.archive).toEqual({}); expect(db.backups).toEqual([]);
    expect(localStorage.getItem("kinetix_pin_hash")).toBeNull();
    expect(localStorage.getItem("other_app")).toBe("keep");
  });
  it("archive write failure restores the exact local state", async () => {
    db.archive.workoutHistory = [workout("old")]; db.fail = true;
    localStorage.setItem("kinetix_selected_program", "raw-program-id");
    await expect(replaceFullState({ kinetix_workout_history: [workout("new")] })).rejects.toThrow("disk full");
    expect(localStorage.getItem("kinetix_selected_program")).toBe("raw-program-id");
    expect(localStorage.getItem("kinetix_workout_history")).toBeNull();
    expect(db.archive.workoutHistory).toEqual([workout("old")]);
  });
  it("invalid backups are rejected before either store changes", async () => {
    db.archive.workoutHistory = [workout("old")];
    await expect(replaceFullState({ kinetix_workout_history: [{ id: "bad" }] })).rejects.toThrow("Backup inválido");
    expect(db.archive.workoutHistory).toEqual([workout("old")]);
  });
  it("continuous mirrors preserve nutrition older than the cache", async () => {
    db.archive.nutritionHistory = [{ date: "2020-01-01", meals: [] }];
    await mirrorHistoryToArchive({ workoutHistory: [], exerciseHistory: [], bodyMetrics: [], nutritionHistory: [{ date: "2026-01-01", meals: [] }] as any });
    expect((db.archive.nutritionHistory as any[]).map(n => n.date)).toEqual(["2026-01-01", "2020-01-01"]);
  });
});
