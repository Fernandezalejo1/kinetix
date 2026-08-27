import React, { useState, useEffect, useCallback, useRef } from "react";
import { Zap, ShieldAlert } from "lucide-react";

const PIN_STORAGE_KEY = "kinetix_pin_hash";
const PIN_ATTEMPTS_KEY = "kinetix_pin_attempts";

function hashPin(pin: string): string {
  let hash = 0;
  const str = "kinetix-salt-" + pin;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "pin_" + Math.abs(hash).toString(36);
}

interface PinLockProps {
  onUnlock: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock }) => {
  // "setup_first" → enter new PIN, "setup_confirm" → confirm new PIN, "verify" → enter existing PIN
  const [mode, setMode] = useState<"loading" | "setup_first" | "setup_confirm" | "verify">("loading");
  const [digits, setDigits] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    const storedAttempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) || "0", 10);
    setAttempts(storedAttempts);
    setMode(storedPin ? "verify" : "setup_first");
  }, []);

  // Shake animation on error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleDigit = useCallback((num: string | number) => {
    if (digits.length >= 4) return;
    if (navigator.vibrate) navigator.vibrate(10);
    const newDigits = digits + String(num);
    setDigits(newDigits);
    setError("");

    // Auto-submit when 4 digits entered
    if (newDigits.length === 4) {
      setTimeout(() => {
        if (mode === "setup_first") {
          setFirstPin(newDigits);
          setDigits("");
          setMode("setup_confirm");
        } else if (mode === "setup_confirm") {
          if (newDigits === firstPin) {
            localStorage.setItem(PIN_STORAGE_KEY, hashPin(newDigits));
            onUnlock();
          } else {
            setError("Los PINs no coinciden. Intentá de nuevo.");
            setDigits("");
            setFirstPin("");
            setMode("setup_first");
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        } else if (mode === "verify") {
          const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
          if (storedPin && hashPin(newDigits) === storedPin) {
            localStorage.removeItem(PIN_ATTEMPTS_KEY);
            onUnlock();
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            localStorage.setItem(PIN_ATTEMPTS_KEY, String(newAttempts));
            setError("PIN incorrecto");
            setDigits("");
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        }
      }, 200);
    }
  }, [digits, mode, firstPin, attempts, onUnlock]);

  const handleDelete = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem("kinetix_pin_skipped", "1");
    onUnlock();
  }, [onUnlock]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
    setDigits("");
    setFirstPin("");
    setMode("setup_first");
    setError("");
    setAttempts(0);
  }, []);

  if (mode === "loading") return null;

  const title =
    mode === "setup_first"
      ? "Creá tu PIN"
      : mode === "setup_confirm"
      ? "Confirmá tu PIN"
      : "Ingresá tu PIN";

  const subtitle =
    mode === "setup_first"
      ? "Elegí un código de 4 dígitos para proteger la app"
      : mode === "setup_confirm"
      ? "Ingresá los mismos 4 dígitos otra vez"
      : "Tu PIN de acceso";

  const PIN_LENGTH = 4;

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950 flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <Zap className="w-8 h-8 text-cyan-400 fill-cyan-400" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-black text-white tracking-tight mb-1">KINETIX</h1>
        <p className="text-xs text-neutral-400 mb-8">{subtitle}</p>

        {/* PIN Dots */}
        <div className={`flex items-center gap-3 mb-4 ${shake ? "animate-shake" : ""}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < digits.length;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  filled
                    ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)] scale-110"
                    : "bg-neutral-700 border border-neutral-600"
                }`}
              />
            );
          })}
        </div>

        {/* Mode label */}
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-6">
          {title}
        </p>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 mb-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs font-bold text-red-400">{error}</span>
          </div>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((num, idx) => {
            if (num === null) {
              // Skip button in bottom-left (only during setup_first)
              if (mode === "setup_first" && digits.length === 0) {
                return (
                  <button
                    key={idx}
                    onClick={handleSkip}
                    className="h-14 rounded-xl bg-transparent border border-neutral-700/30 text-neutral-500 text-[10px] font-bold hover:text-neutral-300 transition-all touch-target flex items-center justify-center"
                  >
                    Omitir
                  </button>
                );
              }
              return <div key={idx} />;
            }
            if (num === "del") {
              return (
                <button
                  key={idx}
                  onClick={handleDelete}
                  className="h-14 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-400 text-xs font-bold hover:bg-neutral-700/50 active:bg-neutral-600/50 transition-all touch-target flex items-center justify-center"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => handleDigit(num)}
                className="h-14 rounded-xl bg-neutral-800/30 border border-neutral-700/30 text-white text-xl font-bold hover:bg-neutral-700/50 active:bg-neutral-600/50 active:scale-95 transition-all touch-target flex items-center justify-center"
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Reset PIN link (only for verify mode after failed attempts) */}
        {mode === "verify" && attempts >= 3 && (
          <button
            onClick={handleReset}
            className="mt-6 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ¿Olvidaste tu PIN? Restablecer
          </button>
        )}
      </div>
    </div>
  );
};
