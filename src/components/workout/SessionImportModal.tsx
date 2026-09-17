import React, { useState, useMemo } from "react";
import { X, Search, Download, Dumbbell, Check } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { EXERCISES_DATABASE } from "../../data/exercisesData";
import { Exercise, DifficultyLevel } from "../../types";
import { e1rmFromSet } from "../../utils/startingLoads";
import { localDateKey } from "../../utils/dateUtils";
import { FocusTrap } from "../FocusTrap";
import { useBackHandler } from "../../context/BackNavContext";

interface ParsedSet {
  weight: number;
  reps: number;
  rir?: number;
}

/** Parser tolerante de una serie: "85x8 rir2", "85 × 8 @2", "85kg x 8 rir 2", "80*10 rir1" */
export function parseSetLine(line: string): ParsedSet | null {
  const t = line.trim();
  if (!t) return null;
  const m = t
    .toLowerCase()
    .match(/(\d+[.,]?\d*)\s*(?:kg)?\s*[x×*]\s*(\d+)(?:\s*(?:rir|rpe|@)\s*(\d+))?/);
  if (!m) return null;
  const weight = parseFloat(m[1].replace(",", "."));
  const reps = parseInt(m[2], 10);
  const rir = m[3] !== undefined ? parseInt(m[3], 10) : undefined;
  if (!(weight > 0) || !(reps > 0)) return null;
  if (rir !== undefined && (Number.isNaN(rir) || rir < 0)) return null;
  return { weight, reps, rir };
}

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: "had_more", label: "Me sobraron reps (subir)" },
  { value: "just_right", label: "Justo (RIR 1-2)" },
  { value: "good", label: "Bien" },
  { value: "very_hard", label: "Muy difícil (bajar)" },
];

export const SessionImportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { logImportedSession } = useWorkout();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  // FIX (bloqueante 3): fecha por defecto en día LOCAL.
  const [date, setDate] = useState(() => localDateKey());
  const [setsText, setSetsText] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("" as DifficultyLevel | "");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return EXERCISES_DATABASE.filter((e) => (e.nameEs || e.name).toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const parsed = useMemo(
    () =>
      setsText
        .split(/[\n,;]+/)
        .map(parseSetLine)
        .filter((s): s is ParsedSet => s !== null),
    [setsText]
  );

  const previewE1rm = useMemo(() => {
    if (parsed.length === 0) return null;
    let best = -1;
    for (const s of parsed) {
      const est = e1rmFromSet(s.weight, s.reps, s.rir);
      if (est.valid && est.average > best) best = est.average;
    }
    return best > 0 ? Math.round(best) : null;
  }, [parsed]);

  const save = () => {
    if (!selected) {
      showToast("Elegí un ejercicio primero", "info");
      return;
    }
    if (parsed.length === 0) {
      showToast("Cargá al menos una serie (ej. 85x8 rir2)", "info");
      return;
    }
    logImportedSession(selected, date, parsed, difficulty || undefined);
    showToast(`${parsed.length} series de ${selected.nameEs || selected.name} importadas`, "success");
    setSelected(null);
    setSetsText("");
    setDifficulty("" as DifficultyLevel | "");
    setQuery("");
    onClose();
  };

  // Atrás cierra el importador de sesiones.
  useBackHandler("session-import", isOpen ? () => { onClose(); return true; } : null);

  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Importar sesión pasada" className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950/50 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-cyan-400" />
                Importar sesión pasada
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                Cargá tus sesiones de la app alpha: cada serie como <code className="text-cyan-300">85x8 rir2</code>.
                Con esto la app calcula tu 1RM estimado y ajusta los pesos solos.
              </p>
            </div>
            <button onClick={onClose} aria-label="Cerrar importar sesión" className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 overscroll-contain scrollbar-thin">
          {/* Exercise picker */}
          {!selected ? (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Ejercicio</label>
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar ejercicio (ej. press banca, sentadilla…)"
                  className="w-full bg-transparent text-sm text-white placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
              {results.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-2xl bg-neutral-950 border border-neutral-800 divide-y divide-neutral-800/60">
                  {results.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setSelected(ex);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800/50 transition-colors text-left"
                    >
                      <span className="w-8 h-8 rounded-lg bg-neutral-800 text-cyan-400 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white truncate">{ex.nameEs || ex.name}</span>
                        <span className="block text-[11px] text-neutral-400">{ex.equipment} • {ex.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-sm font-bold text-white truncate">{selected.nameEs || selected.name}</span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[11px] font-bold text-neutral-400 hover:text-white shrink-0"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Fecha de la sesión</label>
            <input
              type="date"
              value={date}
              max={localDateKey()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          {/* Sets */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Series — una por línea o separadas por coma
            </label>
            <textarea
              value={setsText}
              onChange={(e) => setSetsText(e.target.value)}
              rows={5}
              placeholder={"85x8 rir2\n85x8 rir2\n85x6 rir4\n\nFormato: peso x reps rirN\n(rir = reps que te sobraron; si no sabés, omitilo)"}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-neutral-400 font-mono focus:outline-none focus:border-cyan-500/40 resize-none"
            />
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-neutral-400">
                {parsed.length === 0 ? "Sin series detectadas todavía" : `${parsed.length} serie(s) detectadas`}
              </span>
              {previewE1rm !== null && (
                <span className="font-bold text-indigo-300">
                  1RM est. ~{previewE1rm} kg
                </span>
              )}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">¿Cómo fue el esfuerzo? (opcional)</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel | "")}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-neutral-900">No especificado</option>
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value} className="bg-neutral-900">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 shrink-0">
          <button
            onClick={save}
            disabled={!selected || parsed.length === 0}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Importar sesión
          </button>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
};