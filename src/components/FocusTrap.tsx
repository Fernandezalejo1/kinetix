import React, { useEffect, useRef, ReactNode } from "react";

const activeTraps: HTMLElement[] = [];
const topTrap = () => activeTraps.filter(root => !activeTraps.some(other => other !== root && root.contains(other))).at(-1);

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Trampa de foco para diálogos accesibles (a11y):
 *  - Al montar, recuerda el elemento enfocado y mueve el foco al primer
 *    elemento enfocable del diálogo.
 *  - Atrapa la tecla Tab/Shift+Tab dentro del contenedor (en vez de dejar
 *    que el foco se escape hacia la página detrás del modal).
 *  - Al desmontar, devuelve el foco al elemento que lo tenía antes de
 *    abrirse (crítico para lectores de pantalla y navegación por teclado).
 */
export const FocusTrap: React.FC<{ children: ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;
    const root = containerRef.current;
    if (!root) return;
    activeTraps.push(root);

    const scope = () => Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]'))
      .filter(el => el.getClientRects().length > 0).at(-1) ?? root;
    const focusables = () =>
      Array.from(scope().querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

    const first = () => focusables()[0];


    const active = document.activeElement as HTMLElement | null;
    if (!active || !root.contains(active)) {
      const f = first();
      // preventScroll: mover el foco NO debe desplazar la página ni el fondo
      // (al cerrar, el usuario debe volver exactamente a donde estaba).
      f?.focus({ preventScroll: true });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || topTrap() !== root) return;
      e.stopImmediatePropagation();
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        }
      } else if (idx === -1 || idx === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };

    let currentScope = scope();
    const scopeRestore = new Map<HTMLElement, HTMLElement>();
    const observer = new MutationObserver(() => {
      const nextScope = scope();
      if (nextScope === currentScope || topTrap() !== root) return;
      const previous = scopeRestore.get(currentScope);
      if (!currentScope.isConnected && previous?.isConnected) previous.focus();
      else {
        scopeRestore.set(nextScope, document.activeElement as HTMLElement);
        first()?.focus();
      }
      currentScope = nextScope;
    });
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown);
      const wasTop = topTrap() === root;
      const index = activeTraps.indexOf(root);
      if (index >= 0) activeTraps.splice(index, 1);
      if (wasTop && restoreRef.current?.isConnected) restoreRef.current.focus({ preventScroll: true });
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
};