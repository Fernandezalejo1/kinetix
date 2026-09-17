import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

/**
 * Registro central de capas de navegación ("Atrás" no bloqueado globalmente).
 *
 * Cada overlay (modal, panel, menú) que se debe cerrar antes de salir de una
 * pantalla registra un manejador con `useBackHandler`. Cuando el sistema pide
 * "Atrás" (botón de Android via Capacitor, o back del navegador en web), el
 * manejador global consume las capas en orden inverso al apilado (la más
 * reciente/tope primero). Si ninguna capa captura el evento, la navegación
 * cae a las pestañas y, agotada la navegación interna, a la salida normal.
 */
export type BackHandler = () => boolean;

interface BackBackHandlerEntry {
  id: string;
  handler: () => boolean;
  priority: number;
}

interface BackNavContextValue {
  /** Registra una capa. Devuelve la función para desregistrarla (llamar en cleanup). */
  registerHandler: (id: string, handler: () => boolean, priority?: number) => () => void;
  /** Ejecuta las capas del tope hacia abajo. true si alguna consumió el back. */
  consumeBack: () => boolean;
  /** Cantidad de capas de overlay actualmente registradas (para historial web). */
  layerCount: number;
}

const BackNavContext = createContext<BackNavContextValue | null>(null);

export const useBackNav = (): BackNavContextValue => {
  const ctx = useContext(BackNavContext);
  if (!ctx) throw new Error("useBackNav debe usarse dentro de BackNavProvider");
  return ctx;
};

/**
 * Hook para que un overlay se cierre con Atrás.
 * - `id`: identidad única (si se re-registra con el mismo id, se reemplaza).
 * - `handler`: devuelve true si consumió el back (normalmente: cerrar el overlay).
 * - `priority`: mayor = se cierra primero.
 */
export const useBackHandler = (
  id: string,
  handler: BackHandler | null,
  priority = 0
): void => {
  const { registerHandler } = useBackNav();
  const handlerRef = useRef<BackHandler>(() => false);
  useEffect(() => {
    handlerRef.current = handler ?? (() => false);
  }, [handler]);
  useEffect(() => {
    return registerHandler(id, () => handlerRef.current(), priority);
  }, [id, priority, registerHandler]);
};

export const BackNavProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlersRef = useRef<BackBackHandlerEntry[]>([]);
  const [layerCount, setLayerCount] = useState(0);
  const countRef = useRef(0);

  const registerHandler = useCallback(
    (id: string, handler: () => boolean, priority = 0) => {
      const entry: BackBackHandlerEntry = { id, handler, priority };
      const existed = handlersRef.current.some((h) => h.id === id);
      handlersRef.current = handlersRef.current.filter((h) => h.id !== id);
      handlersRef.current.push(entry);
      if (!existed) {
        countRef.current++;
        setLayerCount(countRef.current);
      }
      return () => {
        const before = handlersRef.current.length;
        handlersRef.current = handlersRef.current.filter((h) => h.id !== id);
        if (handlersRef.current.length !== before) {
          countRef.current = Math.max(0, countRef.current - 1);
          setLayerCount(countRef.current);
        }
      };
    },
    []
  );

  const consumeBack = useCallback(() => {
    const list = [...handlersRef.current].sort((a, b) => a.priority - b.priority);
    for (let i = list.length - 1; i >= 0; i--) {
      try {
        if (list[i].handler()) return true;
      } catch {
        /* una capa que falla no debe bloquear al resto */
      }
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({ registerHandler, consumeBack, layerCount }),
    [registerHandler, consumeBack, layerCount]
  );

  return <BackNavContext.Provider value={value}>{children}</BackNavContext.Provider>;
};