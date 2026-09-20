import { describe, it, expect, beforeEach } from "vitest";
import { installTestEnv } from "./helpers/testEnv";
import { restoreRestTimer, REST_TIMER_KEY } from "../src/context/useRestTimer";
import { VALIDATORS } from "../src/utils/storage";

installTestEnv();

const NOW = 1_700_000_000_000;

const seedActiveWorkout = () => localStorage.setItem("kinetix_active_workout", JSON.stringify({ id: "s1" }));
const seedRest = (endAt: number, totalSeconds = 180, exerciseName = "Press de Banca con Barra") =>
  localStorage.setItem(REST_TIMER_KEY, JSON.stringify({ endAt, totalSeconds, exerciseName }));

describe("restoreRestTimer (descanso persistido por timestamp)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reconstruye el restante desde endAt, no desde un contador guardado", () => {
    seedActiveWorkout();
    seedRest(NOW + 120_000, 180);
    const state = restoreRestTimer(NOW);
    expect(state.active).toBe(true);
    expect(state.remainingSeconds).toBe(120);
    expect(state.totalSeconds).toBe(180);
    expect(state.exerciseName).toBe("Press de Banca con Barra");
    expect(state.endAt).toBe(NOW + 120_000);
  });

  it("descarta un descanso ya vencido (no resucita tiempo muerto)", () => {
    seedActiveWorkout();
    seedRest(NOW - 5_000);
    expect(restoreRestTimer(NOW).active).toBe(false);
    expect(restoreRestTimer(NOW).remainingSeconds).toBe(90);
  });

  it("descarta el descanso si la sesión activa ya no existe", () => {
    seedRest(NOW + 120_000);
    expect(restoreRestTimer(NOW).active).toBe(false);
  });

  it("ignora snapshots corruptos o incompletos", () => {
    seedActiveWorkout();
    localStorage.setItem(REST_TIMER_KEY, JSON.stringify({ endAt: "mañana", totalSeconds: 180 }));
    expect(restoreRestTimer(NOW).active).toBe(false);

    localStorage.setItem(REST_TIMER_KEY, JSON.stringify({ totalSeconds: 180 }));
    expect(restoreRestTimer(NOW).active).toBe(false);

    localStorage.setItem(REST_TIMER_KEY, "no-es-json");
    expect(restoreRestTimer(NOW).active).toBe(false);
  });

  it("ajusta el total si el restante quedó por encima (el anillo no se desborda)", () => {
    seedActiveWorkout();
    // +30s aplicado justo antes de cerrar: total registrado 180, restante 200.
    seedRest(NOW + 200_000, 180);
    const state = restoreRestTimer(NOW);
    expect(state.remainingSeconds).toBe(200);
    expect(state.totalSeconds).toBe(200);
  });

  it("el validador de storage acepta solo el shape esperado", () => {
    const validate = VALIDATORS[REST_TIMER_KEY];
    expect(validate({ endAt: NOW, totalSeconds: 90 })).toBe(true);
    expect(validate({ endAt: NOW, totalSeconds: 90, exerciseName: "Sentadilla" })).toBe(true);
    expect(validate({ endAt: NOW })).toBe(false);
    expect(validate({ endAt: NOW, totalSeconds: -1 })).toBe(false);
    expect(validate({ endAt: NOW, totalSeconds: 90, exerciseName: 7 })).toBe(false);
    expect(validate([])).toBe(false);
    expect(validate(null)).toBe(false);
  });
});
