import { describe, expect, it, beforeEach } from "vitest";
import {
  isValidPin,
  setAppPin,
  hasAppPin,
  verifyAppPin,
  changeAppPin,
  removeAppPin,
  isPinLockedOut,
  pinBlockedUntil,
  pinAttemptsRemaining,
  isPinSkipped,
  setPinSkipped,
  isAppLocked,
  setAppLocked,
  isAutoLockOn,
  setAutoLockOn,
  lockAppIfNeeded,
  MAX_ATTEMPTS,
} from "../src/utils/pinLock";
import { installTestEnv } from "./helpers/testEnv";

installTestEnv();

describe("pinLock — validación y hash local", () => {
  beforeEach(() => localStorage.clear());

  it("isValidPin acepta solo 4 dígitos", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });

  it("setAppPin guarda hash y hasAppPin lo detecta (sin almacenar el PIN en claro)", async () => {
    expect(hasAppPin()).toBe(false);
    expect(await setAppPin("1234")).toBe(true);
    expect(await setAppPin("12")).toBe(false);
    expect(hasAppPin()).toBe(true);
    const raw = localStorage.getItem("kinetix_pin_hash") ?? "{}";
    const rec = JSON.parse(raw);
    expect(typeof rec.hash).toBe("string");
    expect(rec.hash).not.toContain("1234");
    expect(rec.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyAppPin acepta el PIN correcto y rechaza el incorrecto", async () => {
    await setAppPin("2468");
    expect(await verifyAppPin("2468")).toBe(true);
    expect(await verifyAppPin("0000")).toBe(false);
  });

  it("contabiliza intentos y bloquea tras MAX_ATTEMPTS fallidos", async () => {
    await setAppPin("1234");
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(pinAttemptsRemaining()).toBe(MAX_ATTEMPTS - i);
      expect(await verifyAppPin("9999")).toBe(false);
    }
    expect(isPinLockedOut()).toBe(true);
    expect(pinBlockedUntil()).toBeGreaterThan(0);
    expect(pinAttemptsRemaining()).toBe(0);
    // Incluso el PIN correcto queda bloqueado mientras dure el lockout.
    expect(await verifyAppPin("1234")).toBe(false);
  });

  it("el acierto resetea los intentos", async () => {
    await setAppPin("1234");
    await verifyAppPin("0000");
    await verifyAppPin("0000");
    expect(pinAttemptsRemaining()).toBe(3);
    expect(await verifyAppPin("1234")).toBe(true);
    expect(pinAttemptsRemaining()).toBe(MAX_ATTEMPTS);
  });

  it("changeAppPin exige el PIN actual correcto", async () => {
    await setAppPin("1111");
    expect(await changeAppPin("9999", "2222")).toBe(false);
    expect(await changeAppPin("1111", "2222")).toBe(true);
    expect(await verifyAppPin("1111")).toBe(false);
    expect(await verifyAppPin("2222")).toBe(true);
  });

  it("removeAppPin elimina todo el estado de PIN", async () => {
    await setAppPin("1234");
    setPinSkipped(true);
    setAppLocked(true);
    removeAppPin();
    expect(hasAppPin()).toBe(false);
    expect(isPinSkipped()).toBe(false);
    expect(isAppLocked()).toBe(false);
    expect(await verifyAppPin("1234")).toBe(false);
  });

  it("verifyAppPin correcto limpia 'omitir'", async () => {
    await setAppPin("1234");
    setPinSkipped(true);
    expect(isPinSkipped()).toBe(true);
    await verifyAppPin("1234");
    expect(isPinSkipped()).toBe(false);
  });
});

describe("pinLock — bloqueo y auto-lock", () => {
  beforeEach(() => localStorage.clear());

  it("isAutoLockOn por defecto es true", () => {
    expect(isAutoLockOn()).toBe(true);
    setAutoLockOn(false);
    expect(isAutoLockOn()).toBe(false);
  });

  it("lockAppIfNeeded no bloquea sin PIN", () => {
    expect(lockAppIfNeeded()).toBe(false);
    expect(isAppLocked()).toBe(false);
  });

  it("lockAppIfNeeded bloquea solo con autolock activo", async () => {
    await setAppPin("1234");
    expect(lockAppIfNeeded()).toBe(true);
    expect(isAppLocked()).toBe(true);
    setAppLocked(false);
    setAutoLockOn(false);
    expect(lockAppIfNeeded()).toBe(false);
    expect(isAppLocked()).toBe(false);
  });

  it("lockAppIfNeeded respeta 'omitir por ahora'", async () => {
    await setAppPin("1234");
    setPinSkipped(true);
    expect(lockAppIfNeeded()).toBe(false);
  });

  it("setAppLocked persiste el estado de bloqueo", () => {
    expect(isAppLocked()).toBe(false);
    setAppLocked(true);
    expect(isAppLocked()).toBe(true);
    setAppLocked(false);
    expect(isAppLocked()).toBe(false);
  });
});