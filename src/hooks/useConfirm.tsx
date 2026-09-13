import React, { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Pinta el botón de confirmar en rojo (acciones destructivas). */
  danger?: boolean;
}

/**
 * Reemplazo accesible de window.confirm().
 *
 * window.confirm bloquea el hilo principal, se renderiza fuera del branding y
 * en un WebView de Capacitor puede estar deshabilitado: en ese caso devuelve
 * false sin mostrar nada, así que la acción del usuario se descartaba en
 * silencio (crítico en "restaurar backup").
 *
 * Mantiene la misma forma de uso para que migrar sea directo:
 *   if (!(await confirm({ title, message }))) return;
 *
 * Devuelve [confirm, dialog]; hay que renderizar `dialog` en el árbol.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactElement] {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setPending(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    // Si ya hubiera uno abierto, se cancela para no dejar promesas colgadas.
    resolverRef.current?.(false);
    resolverRef.current = null;
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={pending?.title ?? ""}
      message={pending?.message ?? ""}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      danger={pending?.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return [confirm, dialog];
}
