import React, { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { unlockVault } from "../utils/vault";
import { useToast } from "../context/ToastContext";

interface VaultLockScreenProps {
  onUnlocked: () => void;
}

/** P4: gate de arranque cuando el vault está bloqueado. Descifra todo y recarga. */
export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({ onUnlocked }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (checking || password.length === 0) return;
    setChecking(true);
    try {
      const ok = await unlockVault(password);
      if (!ok) {
        triggerShake();
        setPassword("");
        showToast("Contraseña incorrecta.", "error");
        setChecking(false);
        return;
      }
      // unlockVault recarga la app; este callback es por si el reload no ocurre (tests).
      onUnlocked();
    } catch {
      triggerShake();
      showToast("No se pudo desbloquear el vault.", "error");
      setChecking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center p-6 bg-neutral-950 animate-fadeIn"
      aria-label="Vault bloqueado"
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full max-w-xs space-y-5 ${shake ? "animate-shake" : ""}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Vault bloqueado</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Tus datos de entreno están cifrados en este dispositivo. Ingresá la contraseña del vault para descifrarlos.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-3 bg-neutral-900 border border-neutral-800 rounded-xl focus-within:border-violet-500">
            <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña del vault"
              autoComplete="off"
              aria-label="Contraseña del vault"
              className="flex-1 min-w-0 bg-transparent text-white text-[16px] placeholder:text-neutral-600 focus:outline-none text-center"
            />
          </div>
          <button
            type="submit"
            disabled={checking || password.length === 0}
            className="w-full min-h-[48px] py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-black transition-colors touch-target"
          >
            {checking ? "Descifrando…" : "Desbloquear"}
          </button>
        </form>

        <p className="text-center text-[11px] text-neutral-600 leading-relaxed">
          Sin la contraseña no hay recuperación posible. Cerrá la pestaña para mantener el bloqueo.
        </p>
      </div>
    </div>
  );
};
