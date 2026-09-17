import { describe, expect, it } from "vitest";
import type { NavTab } from "../src/components/Navigation";
import {
  decidePopState,
  isNavTabId,
  popTabStack,
  pushTabStack,
  reconcileTabStack,
} from "../src/utils/tabStack";

describe("historial de pestañas (Atrás)", () => {
  it("reproduce el recorrido reportado: Inicio → Perfil → Entrenar → Atrás → Perfil → Atrás → Inicio", () => {
    let stack: NavTab[] = [];
    let current: NavTab = "hoy";
    const go = (tab: NavTab) => {
      stack = pushTabStack(stack, current);
      current = tab;
    };
    const back = () => {
      const res = popTabStack(stack, current);
      expect(res).not.toBeNull();
      stack = res!.stack;
      current = res!.previous;
    };

    go("objetivo");
    go("workout");
    back();
    expect(current).toBe("objetivo");
    back();
    // El segundo regreso debe llevar a Inicio, no salir de la app.
    expect(current).toBe("hoy");
    expect(popTabStack(stack, current)).toBeNull();
  });

  it("tolera varios regresos consecutivos sin bucles ni duplicados", () => {
    let stack: NavTab[] = [];
    let current: NavTab = "hoy";
    // Igual que App.navigateToTab: renavegar a la visible no apila.
    const go = (tab: NavTab) => {
      if (tab === current) return;
      stack = pushTabStack(stack, current);
      current = tab;
    };
    go("workout");
    go("workout"); // renavegar a la actual no debe duplicar
    go("nutrition");
    go("nutrition");
    expect(stack).toEqual(["hoy", "workout"]);

    const order: NavTab[] = [];
    let res = popTabStack(stack, current);
    while (res) {
      order.push(res.previous);
      stack = res.stack;
      current = res.previous;
      res = popTabStack(stack, current);
    }
    expect(order).toEqual(["workout", "hoy"]);
  });

  it("reconcilia el stack cuando el navegador dicta la pestaña destino", () => {
    // Entradas del navegador: [hoy][objetivo][workout], visible = workout.
    const stack: NavTab[] = ["hoy", "objetivo"];
    expect(reconcileTabStack(stack, "objetivo")).toEqual(["hoy"]);
    expect(reconcileTabStack(["hoy"], "hoy")).toEqual([]);
  });

  it("valida ids de pestaña del historial", () => {
    expect(isNavTabId("workout")).toBe(true);
    expect(isNavTabId("objetivo")).toBe(true);
    expect(isNavTabId("inventada")).toBe(false);
    expect(isNavTabId(null)).toBe(false);
  });
});

describe("decisión ante popstate del navegador", () => {
  it("cierra el overlay abierto y sincroniza la pestaña si cambió", () => {
    expect(
      decidePopState({ hadPhantom: true, overlayConsumed: true, stateTab: "workout", current: "workout" })
    ).toEqual({ action: "close-overlay" });
    expect(
      decidePopState({ hadPhantom: true, overlayConsumed: true, stateTab: "hoy", current: "workout" })
    ).toEqual({ action: "close-overlay", syncTab: "hoy" });
  });

  it("navega a la pestaña de la entrada destino", () => {
    expect(
      decidePopState({ hadPhantom: false, overlayConsumed: false, stateTab: "objetivo", current: "workout" })
    ).toEqual({ action: "goto-tab", tab: "objetivo" });
  });

  it("ignora cuando el destino ya es la pestaña visible", () => {
    expect(
      decidePopState({ hadPhantom: false, overlayConsumed: false, stateTab: "hoy", current: "hoy" })
    ).toEqual({ action: "ignore" });
  });

  it("cae al stack interno con entradas ajenas (sin estado nuestro)", () => {
    expect(
      decidePopState({ hadPhantom: false, overlayConsumed: false, stateTab: null, current: "workout" })
    ).toEqual({ action: "pop-internal" });
  });
});
