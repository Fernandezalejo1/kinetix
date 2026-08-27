import React, { Component, ReactNode, useCallback, useEffect, useState } from "react";

/**
 * On-screen error overlay for diagnosing crashes in production/Android WebView,
 * where devtools are not available. Captures three sources of errors:
 *
 *  1. React render errors  -> GlobalErrorBoundary
 *  2. window.onerror       -> uncaught runtime errors
 *  3. unhandledrejection   -> rejected promises / async failures
 */

export interface CrashInfo {
  id: number;
  kind: string;
  message: string;
  stack?: string;
  time: string;
}

let crashId = 0;
const CRASH_EVENT = "kinetix-crash";

/** Dispatch a crash so the overlay can display it. */
export function reportCrash(kind: string, error: unknown): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const detail: Omit<CrashInfo, "id" | "time"> = {
    kind,
    message: message || "(sin mensaje)",
    stack: error instanceof Error ? error.stack : undefined,
  };
  try {
    window.dispatchEvent(new CustomEvent(CRASH_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}

/** Install global JS error listeners. Call once at app startup. */
export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (e) => {
    // Ignore resource-load errors without an error object (script/img failures)
    if (!e.error && !e.message) return;
    reportCrash("Uncaught error", e.error ?? e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    reportCrash("Promise rechazada", e.reason);
  });
}

/** Red full-screen overlay showing crash details. */
const CrashCard: React.FC<{ crash: CrashInfo; onDismiss: () => void }> = ({ crash, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const copyDetails = useCallback(async () => {
    const text = `[${crash.kind}] ${crash.time}\n${crash.message}\n\n${crash.stack ?? ""}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable in some WebViews — fallback to textarea hack
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [crash]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[99999] p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-2xl rounded-xl border-2 border-red-500 bg-red-950 shadow-2xl shadow-red-900/50 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-900">
          <span className="text-xs font-bold uppercase tracking-wider text-red-100">
            ⚠️ {crash.kind} — {crash.time}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyDetails}
              className="px-2 py-1 rounded-md bg-red-800 hover:bg-red-700 text-red-50 text-[10px] font-bold min-h-[28px]"
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button
              onClick={onDismiss}
              className="px-2 py-1 rounded-md bg-red-800 hover:bg-red-700 text-red-50 text-[10px] font-bold min-h-[28px]"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto px-3 py-2 overscroll-contain">
          <p className="text-xs font-mono font-bold text-red-100 break-words">{crash.message}</p>
          {crash.stack && (
            <pre className="mt-1.5 text-[10px] font-mono text-red-300/80 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
              {crash.stack}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

/** Subscribes to crash events and shows them on screen. */
export const ErrorOverlay: React.FC = () => {
  const [crashes, setCrashes] = useState<CrashInfo[]>([]);

  useEffect(() => {
    const onCrash = (e: Event) => {
      const detail = (e as CustomEvent).detail as Omit<CrashInfo, "id" | "time">;
      setCrashes((prev) =>
        [
          {
            ...detail,
            id: ++crashId,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 3)
      );
    };
    window.addEventListener(CRASH_EVENT, onCrash);
    return () => window.removeEventListener(CRASH_EVENT, onCrash);
  }, []);

  if (crashes.length === 0) return null;

  return (
    <>
      {crashes.map((c) => (
        <CrashCard key={c.id} crash={c} onDismiss={() => setCrashes((prev) => prev.filter((x) => x.id !== c.id))} />
      ))}
    </>
  );
};

interface BoundaryState {
  error: Error | null;
}

/** Top-level React error boundary: catches render crashes inside App. */
export class GlobalErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportCrash("React crash", error);
    console.error("[KINETIX] React crash:", error, info.componentStack);
    // Store full error for debugging
    try {
      localStorage.setItem("kinetix_last_crash", JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      }));
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-4xl mb-4">💥</p>
          <h1 className="text-lg font-bold text-neutral-100 mb-2">La app encontró un error</h1>
          <p className="text-xs font-mono text-red-400 max-w-md break-words mb-2">{this.state.error.message}</p>
          {this.state.error.stack && (
            <pre className="text-[9px] font-mono text-red-500/60 max-w-md max-h-32 overflow-y-auto text-left mb-6 whitespace-pre-wrap break-words">
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold"
            >
              Reintentar
            </button>
            <button
              onClick={() => location.reload()}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-bold"
            >
              Reiniciar app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
