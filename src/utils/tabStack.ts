import type { NavTab } from "../components/Navigation";

/**
 * Historial de pestañas + sincronía con el historial del navegador (web).
 *
 * El bug que corrige: en web, la navegación entre pestañas no dejaba entradas
 * en `window.history`, así que el segundo "Atrás" del navegador salía de la
 * app aunque el stack interno todavía tenía pestañas por visitar
 * (Inicio → Perfil → Entrenar → Atrás → Perfil → Atrás → fuera).
 *
 * La regla: cada navegación de pestaña hace `pushState({ kxTab })`; el
 * `popstate` vuelve a la pestaña de la entrada destino y reconcilia el stack
 * interno con ella. Funciones puras para poder probar los recorridos.
 */

/** Los ids válidos (espejo de `NavTab` en Navigation.tsx). */
const NAV_TAB_IDS: readonly string[] = [
  "hoy",
  "workout",
  "programs",
  "exercises",
  "analytics",
  "nutrition",
  "reto",
  "objetivo",
];

export function isNavTabId(value: unknown): value is NavTab {
  return typeof value === "string" && NAV_TAB_IDS.includes(value);
}

/**
 * Apila la pestaña anterior al navegar. Sin duplicados consecutivos:
 * si el tope ya es `prev`, se reemplaza en lugar de duplicarse.
 */
export function pushTabStack(stack: readonly NavTab[], prev: NavTab): NavTab[] {
  const next = [...stack];
  if (next[next.length - 1] === prev) next.pop();
  next.push(prev);
  return next;
}

/**
 * Vuelve a la pestaña anterior. Devuelve `null` si no hay a dónde volver.
 * Nunca entra en bucle: salta entradas iguales a la actual.
 */
export function popTabStack(
  stack: readonly NavTab[],
  current: NavTab
): { stack: NavTab[]; previous: NavTab } | null {
  const next = [...stack];
  while (next.length > 0) {
    const previous = next.pop() as NavTab;
    if (previous && previous !== current) return { stack: next, previous };
  }
  return null;
}

/**
 * Reconcilia el stack interno cuando el navegador dicta la pestaña destino
 * (evento `popstate`): descarta lo que quedó por delante y consume la
 * entrada que pasa a ser actual.
 */
export function reconcileTabStack(stack: readonly NavTab[], target: NavTab): NavTab[] {
  const next = [...stack];
  while (next.length > 0 && next[next.length - 1] !== target) next.pop();
  if (next.length > 0) next.pop();
  return next;
}

export type PopStateDecision =
  | { action: "ignore" }
  | { action: "close-overlay"; syncTab?: NavTab }
  | { action: "goto-tab"; tab: NavTab }
  | { action: "pop-internal" };

/**
 * Decide qué hacer ante un `popstate` del navegador.
 * - `hadPhantom`: había un overlay abierto (entrada fantasma en el historial).
 * - `overlayConsumed`: el overlay consumió el back (se cerró).
 * - `stateTab`: pestaña de la entrada destino (`null` si no es nuestra).
 * - `current`: pestaña visible ahora.
 */
export function decidePopState(opts: {
  hadPhantom: boolean;
  overlayConsumed: boolean;
  stateTab: NavTab | null;
  current: NavTab;
}): PopStateDecision {
  const { hadPhantom, overlayConsumed, stateTab, current } = opts;
  if (hadPhantom && overlayConsumed) {
    return stateTab && stateTab !== current
      ? { action: "close-overlay", syncTab: stateTab }
      : { action: "close-overlay" };
  }
  if (stateTab) {
    return stateTab === current ? { action: "ignore" } : { action: "goto-tab", tab: stateTab };
  }
  return { action: "pop-internal" };
}
