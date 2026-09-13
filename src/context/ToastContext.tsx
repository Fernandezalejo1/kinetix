import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

const STYLES: Record<ToastType, { icon: React.ReactNode; bar: string; border: string }> = {
  success: {
    icon: <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-emerald-400 shrink-0" />,
    bar: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  error: {
    icon: <AlertTriangle aria-hidden="true" className="w-4 h-4 text-red-400 shrink-0" />,
    bar: "bg-red-500",
    border: "border-red-500/30",
  },
  info: {
    icon: <Info aria-hidden="true" className="w-4 h-4 text-cyan-400 shrink-0" />,
    bar: "bg-cyan-500",
    border: "border-cyan-500/30",
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  const renderToast = (toast: Toast) => {
    const s = STYLES[toast.type];
    return (
      <div
        key={toast.id}
        className={`pointer-events-auto flex items-center gap-3 pl-3 pr-1 py-2 rounded-2xl bg-neutral-900 border ${s.border} shadow-2xl animate-fadeIn`}
      >
        <div aria-hidden="true" className={`w-1 self-stretch rounded-full ${s.bar}`} />
        {s.icon}
        <span className="flex-1 text-xs font-bold text-white leading-snug py-1">{toast.message}</span>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Cerrar aviso"
          className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const errors = toasts.filter((t) => t.type === "error");
  const others = toasts.filter((t) => t.type !== "error");

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast viewport.
          Las regiones live deben existir en el DOM ANTES de recibir contenido
          para que los lectores de pantalla anuncien los cambios, por eso se
          renderizan siempre (aunque estén vacías). Se separan en dos:
          los errores interrumpen (assertive) y el resto espera turno (polite). */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-sm px-4 space-y-2 pointer-events-none">
        <div role="alert" aria-live="assertive" aria-atomic="false" className="space-y-2">
          {errors.map(renderToast)}
        </div>
        <div role="status" aria-live="polite" aria-atomic="false" className="space-y-2">
          {others.map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
