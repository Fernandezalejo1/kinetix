// =============================================================
// KINETIX — Recomendación de progresión en vivo (doble progresión).
//
// Regla: primero progresar reps dentro del rango objetivo y SOLO al llegar al
// tope con el RIR objetivo ejecutado (o más duro) se autoriza subir el peso.
//
// ESTRUCTURA (fix de layout): la card es una COLUMNA (título → resultado →
// recomendación → CTA). Antes, el CTA era un hermano flex de la fila de texto
// con `flex-wrap`: su ancho intrínseco (~250px) dejaba al texto ~30px y lo
// partía en una palabra por línea. Acá el CTA va SIEMPRE debajo, en el flujo
// normal del documento, a ancho completo (`w-full`), sin `position:absolute`
// ni `flex-shrink` que pueda comprimir el texto.
// =============================================================
import React, { useCallback, useMemo, useState } from "react";
import { TrendingUp, Target, ChevronDown, Check } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { WorkoutExercise } from "../../types";
import { resolveLiveProgression } from "../../utils/progressionEngine";
import { formatWeight } from "../../utils/weightUnits";

interface Props {
  wEx: WorkoutExercise;
  weightUnit: "kg" | "lbs";
}

/** Fila de dato: etiqueta corta + valor, con el texto protegido ante anchos chicos. */
const DataRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 min-w-0">
    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 shrink-0">{label}</span>
    <span className="min-w-0 flex-1 text-right text-sm font-black text-white tabular-nums break-words">
      {children}
    </span>
  </div>
);

export const ProgressionRecommendation: React.FC<Props> = ({ wEx, weightUnit }) => {
  const { updateSet } = useWorkout();
  const { showToast } = useToast();
  // La explicación larga se despliega a demanda: el resumen ya se lee de un vistazo.
  const [showHelp, setShowHelp] = useState(false);
  const a = useMemo(() => resolveLiveProgression(wEx), [wEx]);

  const fmtW = (kg: number) => formatWeight(kg, weightUnit);

  const applyIncrease = useCallback(() => {
    const delta = a.deltaWeight;
    let applied = 0;
    wEx.sets.forEach((s) => {
      if (!s.completed && s.type !== "warmup") {
        updateSet(wEx.id, s.id, { weight: Math.round((s.weight + delta) * 4) / 4 });
        applied += 1;
      }
    });
    showToast(
      applied > 0
        ? `Sobrecarga +${formatWeight(delta, weightUnit)} ${weightUnit} aplicada a ${applied} serie(s) restantes`
        : "No hay series restantes para sobrecargar"
    );
  }, [wEx, a.deltaWeight, updateSet, showToast, weightUnit]);

  if (!a.range) return null;

  const remainingSets = wEx.sets.filter((s) => !s.completed && s.type !== "warmup").length;
  const targetLabel = `${a.targetSets ? `${a.targetSets}× ` : ""}${a.range.min}–${a.range.max} reps · RIR ${a.targetRir ?? "—"}`;
  const todayReps = `${a.maxReps}/${a.range.max} reps`;
  const todaySets =
    a.completedSets > 0 ? `${a.setsAtTop}/${a.completedSets} ${a.completedSets === 1 ? "serie" : "series"} al tope` : null;
  const rirLabel = a.avgRir !== null ? `RIR ${a.avgRir}${a.targetRir != null ? ` (objetivo ${a.targetRir})` : ""}` : "RIR sin registrar";
  const missingReps = Math.max(0, a.range.max - a.maxReps);

  const helpToggle = (
    <button
      type="button"
      onClick={() => setShowHelp((v) => !v)}
      aria-expanded={showHelp}
      className="w-full min-h-[44px] rounded-xl bg-neutral-950/50 border border-neutral-800 px-3 text-xs font-bold text-neutral-300 hover:text-white flex items-center justify-center gap-1.5"
    >
      {showHelp ? "Ocultar detalle" : "¿Cómo progreso?"}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );

  const helpText = showHelp ? (
    <p className="text-xs text-neutral-300 leading-relaxed break-words">{a.message}</p>
  ) : null;

  // ── Objetivo alcanzado: se autoriza la sobrecarga (verde = éxito) ──────────
  if (a.status === "target_reached" && a.suggestedWeight != null) {
    return (
      <div className="px-4 sm:px-5 pt-3">
        <div className="w-full min-w-0 box-border rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4 space-y-3 text-emerald-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">Progresión</span>
          </div>

          {/* Resultado de la serie/sesiones de hoy */}
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-black text-white break-words">Objetivo logrado</p>
            <p className="text-xs text-emerald-200/90 tabular-nums break-words">
              {todayReps}
              {" · "}
              {rirLabel}
              {todaySets ? ` · ${todaySets}` : ""}
            </p>
          </div>

          {/* Carga propuesta para la próxima sesión */}
          <div className="w-full min-w-0 rounded-xl bg-neutral-950/50 border border-emerald-500/20 p-2.5 space-y-1.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Próxima sesión</p>
            <DataRow label="Carga">{fmtW(a.suggestedWeight)} {weightUnit}</DataRow>
            <DataRow label="Serie">{targetLabel}</DataRow>
            <DataRow label="Salto">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-black">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                +{fmtW(a.deltaWeight)} {weightUnit}
              </span>
            </DataRow>
            <p className="text-[11px] text-emerald-200/80 break-words">
              Sobre los {fmtW(a.currentWeight)} {weightUnit} de hoy.
            </p>
          </div>

          {/* CTA en el flujo normal: ancho completo, nunca flotando sobre el texto.
              Estilo secundario (verde tenue con borde): la acción PRIMARIA de la
              pantalla sigue siendo "Completar serie", que es sólida. */}
          <button
            type="button"
            onClick={applyIncrease}
            className="w-full min-h-[48px] px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 border border-emerald-500/40 text-sm font-black transition-colors press-scale flex items-center justify-center gap-2 text-center"
          >
            <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            Aplicar +{fmtW(a.deltaWeight)} {weightUnit} a las series restantes
            {remainingSets > 0 ? ` (${remainingSets})` : ""}
          </button>

          {helpToggle}
          {helpText}
        </div>
      </div>
    );
  }

  // ── Todavía en progreso: objetivo + cómo se progresa (neutral/cyan) ────────
  return (
    <div className="px-4 sm:px-5 pt-3">
      <div className="w-full min-w-0 box-border rounded-2xl bg-neutral-950/50 border border-neutral-800 p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Progresión</span>
        </div>

        <div className="space-y-1 min-w-0">
          <p className="text-sm font-black text-white break-words tabular-nums">{targetLabel}</p>
          <p className="text-xs text-neutral-300 tabular-nums break-words">
            Hoy {todayReps}
            {todaySets ? ` · ${todaySets}` : ""}
            {" · "}
            {rirLabel}
          </p>
          {missingReps > 0 && (
            <p className="text-xs text-neutral-400 break-words">
              Faltan {missingReps} {missingReps === 1 ? "rep" : "reps"} para el tope del rango.
            </p>
          )}
        </div>

        {helpToggle}
        {helpText}
      </div>
    </div>
  );
};
