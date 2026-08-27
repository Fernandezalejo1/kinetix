import React, { useState, useEffect, useCallback } from "react";
import { Zap, ShieldAlert } from "lucide-react";

// PIN fijo requerido para acceder a la app en cualquier dispositivo.
const REQUIRED_PIN = "2113";
const PIN_ATTEMPTS_KEY = "kinetix_pin_attempts";

interface PinLockProps {
  onUnlock: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock }) => {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const storedAttempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) || "0", 10);
    setAttempts(storedAttempts);
  }, []);

  // Shake animation on error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleDigit = useCallback(
    (num: string | number) => {
      if (digits.length >= 4) return;
      if (navigator.vibrate) navigator.vibrate(10);
      const newDigits = digits + String(num);
      setDigits(newDigits);
      setError("");

      // Auto-submit when 4 digits entered
      if (newDigits.length === 4) {
        setTimeout(() => {
          if (newDigits === REQUIRED_PIN) {
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
        }, 200);
      }
    },
    [digits, attempts, onUnlock]
  );

  const handleDelete = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setError("");
  }, []);

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
        <p className="text-xs text-neutral-400 mb-8">Ingresá tu PIN de acceso</p>

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

        {/* Attempts hint */}
        {attempts >= 3 && (
          <p className="mt-6 text-[11px] text-red-400/70 font-mono">
            {attempts} intentos fallidos
          </p>
        )}
      </div>
    </div>
  );
};
