import React, { useState } from "react";
import {
  Trophy,
  Flame,
  Clock,
  Dumbbell,
  Share2,
  Check,
  Zap,
  ArrowRight,
  TrendingUp,
  Award
} from "lucide-react";
import { PersonalRecord, CompletedWorkout } from "../../types";

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: CompletedWorkout | null;
  prs: PersonalRecord[];
  weightUnit: "kg" | "lbs";
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  onClose,
  workout,
  prs,
  weightUnit,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !workout) return null;

  const durationMin = Math.round(workout.durationSeconds / 60);
  const formattedVolume = workout.totalVolumeKg.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  });

  const generateShareText = () => {
    let text = `⚡ KINETIX — ${workout.routineName}\n`;
    text += `⏱️ Duración: ${durationMin} min | 🏋️ Volumen: ${formattedVolume} ${weightUnit}\n`;
    text += `🔥 Series efectivas: ${workout.totalSets}`;
    if (workout.averageRir !== null) {
      text += ` | RIR prom: ${workout.averageRir}`;
    }
    text += `\n`;

    if (prs.length > 0) {
      text += `\n🏆 ¡${prs.length} Récord${prs.length > 1 ? "s" : ""} Personal${prs.length > 1 ? "es" : ""}!\n`;
      prs.forEach((pr) => {
        text += `• ${pr.exerciseName}: 1RM est. ${pr.value} ${weightUnit}\n`;
      });
    }

    text += `\nEntrenando con evidencia científica en KINETIX 🧬`;
    return text;
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrenamiento KINETIX — ${workout.routineName}`,
          text,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header con gradiente de victoria */}
        <div className="relative p-6 sm:p-7 text-center bg-gradient-to-b from-cyan-950/60 via-neutral-900 to-neutral-900 border-b border-neutral-800 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_24px_rgba(34,211,238,0.35)]">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
            ¡Sesión Finalizada!
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {workout.routineName}
          </h2>
          <p className="text-xs text-neutral-400 font-medium mt-1">
            {new Date(workout.date).toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        {/* Contenido con scroll si es necesario */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
          {/* Tarjeta de Métricas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <div className="flex items-center justify-center gap-1 text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Dumbbell className="w-3.5 h-3.5" />
                Volumen
              </div>
              <div className="text-lg font-black text-white font-mono leading-tight">
                {formattedVolume}
              </div>
              <div className="text-[10px] text-neutral-500 font-medium uppercase mt-0.5">
                {weightUnit}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
                Tiempo
              </div>
              <div className="text-lg font-black text-white font-mono leading-tight">
                {durationMin}
              </div>
              <div className="text-[10px] text-neutral-500 font-medium uppercase mt-0.5">
                minutos
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Flame className="w-3.5 h-3.5" />
                Series
              </div>
              <div className="text-lg font-black text-white font-mono leading-tight">
                {workout.totalSets}
              </div>
              <div className="text-[10px] text-neutral-500 font-medium uppercase mt-0.5">
                efectivas
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                RIR Prom.
              </div>
              <div className="text-lg font-black text-white font-mono leading-tight">
                {workout.averageRir !== null ? workout.averageRir : "—"}
              </div>
              <div className="text-[10px] text-neutral-500 font-medium uppercase mt-0.5">
                en reserva
              </div>
            </div>
          </div>

          {/* Récords Personales (PRs) */}
          {prs.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-amber-300">
                    ¡{prs.length} Nuevo{prs.length > 1 ? "s" : ""} Récord{prs.length > 1 ? "es" : ""} Personal{prs.length > 1 ? "es" : ""}!
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Superaste tus marcas previas estimadas de fuerza
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {prs.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/90 border border-amber-500/20"
                  >
                    <span className="text-xs font-bold text-white truncate mr-2">
                      {pr.exerciseName}
                    </span>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-amber-400">
                        1RM {pr.value} {weightUnit}
                      </span>
                      {pr.previousValue && (
                        <span className="text-[10px] font-mono text-neutral-500 block">
                          antes {pr.previousValue} {weightUnit} (+{pr.value - pr.previousValue})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tarjeta de Vista Previa para Compartir */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
              <span>Tarjeta de Progreso</span>
              <span className="text-[10px] text-cyan-400 font-mono uppercase">#KINETIX</span>
            </div>
            <p className="text-xs text-neutral-300 font-mono bg-neutral-900 p-3 rounded-xl border border-neutral-800 leading-relaxed">
              ⚡ Entrené {workout.routineName} en KINETIX.<br />
              🏋️ {formattedVolume} {weightUnit} levantados en {durationMin} min con {workout.totalSets} series efectivas.
              {prs.length > 0 ? ` 🏆 ${prs.length} PR(s) alcanzados.` : ""}
            </p>
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-colors touch-target"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                ¡Copiado al portapapeles!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-cyan-400" />
                Compartir Resumen
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all touch-target"
          >
            Continuar al Hub
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
