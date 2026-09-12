import React, { useEffect, useState } from "react";
import { Lock, Delete, ShieldCheck } from "lucide-react";
import {
  PIN_LENGTH,
  LOCKOUT_MS,
  verifyAppPin,
  setPinSkipped,
  setAppLocked,
  pinAttemptsRemaining,
  pinBlockedUntil,
} from "../utils/pinLock";
import { useToast } from "../context/ToastContext";

interface PinLockScreenProps {
  onUnlocked: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlocked }) => {
  const { showToast } = useToast();
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setBlockedUntil(pinBlockedUntil());
  }, []);

  useEffect(() => {
    if (!blockedUntil) return;
    if (blockedUntil <= now) {
      setBlockedUntil(0);
      setDigits("");
      return;
    }
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [blockedUntil, now]);

  const remaining = blockedUntil > now ? Math.ceil((blockedUntil - now) / 1000) : 0;

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  const onSkip = () => {
    setPinSkipped(true);
    setAppLocked(false);
    onUnlocked();
  };

  const onDigit = (d: string) => {
    if (checking || remaining > 0 || digits.length >= PIN_LENGTH) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      void checkPin(next);
    }
  };

  const onBackspace = () => {
    if (checking) return;
    setDigits((p) => p.slice(0, -1));
  };

  const checkPin = async (pin: string) => {
    setChecking(true);
    const ok = await verifyAppPin(pin);
    if (!ok) {
      triggerShake();
      setDigits("");
      const remainingAttempts = pinAttemptsRemaining();
      if (remainingAttempts === 0) {
        setBlockedUntil(pinBlockedUntil());
        setNow(Date.now());
        showToast(`Demasiados intentos. App bloqueada por ${Math.round(LOCKOUT_MS / 1000)}s.`, "error");
      } else {
        showToast(`PIN incorrecto. Te quedan ${remainingAttempts} intento(s).`, "error");
      }
      setChecking(false);
      return;
    }
    setChecking(false);
    onUnlocked();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6 bg-neutral-950 animate-fadeIn"
      aria-label="Pantalla de bloqueo"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-6 h-6 text-cyan-400" />
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
      </div>
      <h1 className="text-xl font-black text-white tracking-widest">KINETIX</h1>
      <p className="text-xs text-neutral-500 mt-1 mb-6">App bloqueada — ingresá tu PIN</p>

      <div className={`flex gap-3 mb-6 ${shake ? "animate-shake" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
              i < digits.length
                ? "bg-cyan-600/20 border-cyan-400 text-cyan-300"
                : "bg-neutral-900 border-neutral-800 text-neutral-700"
            }`}
          >
            {digits[i] ?? "•"}
          </div>
        ))}
      </div>

      {remaining > 0 ? (
        <p className="text-xs font-black text-amber-400 mb-4">Reintentá en {remaining}s</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              onClick={() => onDigit(n)}
              disabled={checking}
              aria-label={`Dígito ${n}`}
              className="min-h-[52px] h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-lg font-black active:scale-95 transition-all disabled:opacity-40 touch-target"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => onDigit("0")}
            disabled={checking}
            aria-label="Dígito 0"
            className="min-h-[52px] h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-lg font-black active:scale-95 transition-all disabled:opacity-40 touch-target"
          >
            0
          </button>
          <button
            onClick={onBackspace}
            disabled={checking || digits.length === 0}
            aria-label="Borrar último dígito"
            className="min-h-[52px] h-14 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 active:scale-95 transition-all disabled:opacity-40 touch-target"
          >
            <Delete className="w-5 h-5 mx-auto" />
          </button>
        </div>
      )}

      <button
        onClick={onSkip}
        className="mt-8 text-[11px] font-bold text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        Omitir por ahora
      </button>
    </div>
  );
};