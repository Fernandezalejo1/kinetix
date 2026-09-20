import { describe, it, expect, vi, beforeEach } from "vitest";
import { mediaBackdrop } from "../src/utils/mediaBackdrop";
const native = vi.hoisted(() => ({ available: true }));
const notifications = vi.hoisted(() => ({ cancel: vi.fn().mockResolvedValue(undefined), checkPermissions: vi.fn().mockResolvedValue({ display: "granted" }), createChannel: vi.fn().mockResolvedValue(undefined), schedule: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => native.available, getPlatform: () => "android" } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: notifications }));
import { syncRestNotification } from "../src/utils/restNotifications";

describe("training media frame", () => {
  it("matches a white video instead of adding black bands", () => expect(mediaBackdrop(Array(4).fill([255,255,255]))).toBe("rgb(255, 255, 255)"));
  it("retains dark sources and rejects mixed corners", () => {
    expect(mediaBackdrop(Array(4).fill([0,0,0]))).toBe("rgb(0, 0, 0)");
    expect(mediaBackdrop([[255,255,255],[0,0,0],[255,255,255],[0,0,0]])).toBe("#0a0a0a");
  });
});
describe("rest notification races", () => {
  beforeEach(() => { vi.clearAllMocks(); native.available = true; notifications.checkPermissions.mockResolvedValue({ display: "granted" }); });
  it("a newer stop supersedes a queued start", async () => {
    const start = syncRestNotification(Date.now()+60000, "Press", true);
    const stop = syncRestNotification(null, "", true);
    await Promise.all([start,stop]);
    expect(notifications.schedule).not.toHaveBeenCalled();
    expect(notifications.cancel).toHaveBeenCalled();
  });
  it("schedules only the latest adjusted deadline", async () => {
    const latest = Date.now()+90000;
    await Promise.all([syncRestNotification(Date.now()+30000,"Press",true),syncRestNotification(latest,"Sentadilla",false)]);
    expect(notifications.schedule).toHaveBeenCalledTimes(1);
    const alarm = notifications.schedule.mock.calls[0][0].notifications[0];
    expect(alarm.schedule.at.getTime()).toBe(latest);
    expect(alarm.channelId).toBe("workout-rest-silent");
  });
  it("does not schedule expired alarms or request permission silently", async () => {
    await syncRestNotification(Date.now()-1000,"Press",true);
    notifications.checkPermissions.mockResolvedValue({ display: "denied" });
    await syncRestNotification(Date.now()+10000,"Press",true);
    expect(notifications.schedule).not.toHaveBeenCalled();
  });
  it("is inert in a web browser", async () => {
    native.available = false;
    await syncRestNotification(Date.now()+60000,"Press",true);
    expect(notifications.cancel).not.toHaveBeenCalled();
  });
});
