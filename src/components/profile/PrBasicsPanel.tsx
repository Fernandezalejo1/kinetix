import React, { useMemo, useState } from "react";
import { Trophy, ChevronDown, Plus, CalendarDays, Zap } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { getBasicLifts } from "../../data/basicLifts";
import { calculate1RM, MAX_VALID_1RM_REPS } from "../../utils/scienceCalculators";
import { displayToKg, kgToDisplay, formatWeight } from "../../utils/weightUnits";
import { localDateKey } from "../../utils/dateUtils";
import type { Exercise, PersonalRecord } from "../../types";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function fmtDate(d: string): string {
  const t = new Date(d + "T12:00:00");
  if (Number.isNaN(t.getTime())) return d;
  return t.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

interface BasicRow {
  exercise: Exercise;
  current: PersonalRecord | undefined;
  history: PersonalRecord[];
}

/** Formulario chico para registrar el 1RM de un único ejercicio básico. */
const MiniPrForm: React.FC<{ onDone: (valueKg: number, reps: number, date: string) => void }> = ({ onDone }) => {
  const { weightUnit } = useWorkout();
  const { showToast } = useToast();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [date, setDate] = useState(localDateKey());

  const w = parseFloat(weight);
  const r = Math.max(1, Math.min(MAX_VALID_1RM_REPS, parseInt(reps, 10) || 1));
  const estimated = useMemo(() => {
    if (!(w > 0)) return null;
    if (r === 1) return { value: w, valid: true };
    const calc = calculate1RM(w, r);
    return { value: calc.average, valid: calc.valid };
  }, [w, r]);

  const save = () => {
    if (!(w > 0)) {
      showToast("Ingresá un peso válido mayor a 0.", "error");
      return;
    }
    if (!estimated || !estimated.valid) {
      showToast(`No se puede estimar el 1RM con más de ${MAX_VALID_1RM_REPS} reps. Usá 1-${MAX_VALID_1RM_REPS} reps o un 1RM medido.`, "error");
      return;
    }
    onDone(Math.round(displayToKg(estimated.value, weightUnit) * 10) / 10, r, date || localDateKey());
  };

  return (
    <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Fecha</span>
          <input
            type="date"
            value={date}
            max={localDateKey()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Peso ({weightUnit})</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Ej: 100"
            className="mt-1 w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Reps</span>
          <input
            type="number"
            min={1}
            max={MAX_VALID_1RM_REPS}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 w-full px-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
          />
        </label>
      </div>
      {estimated !== null && estimated.valid && (
        <p className="text-[11px] text-neutral-400">
          e1RM:{" "}
          <strong className="text-amber-300">
            {Math.round(kgToDisplay(displayToKg(estimated.value, weightUnit), weightUnit) * 10) / 10} {weightUnit}
          </strong>{" "}
          {r > 1 ? "(estimado Brzycki/Epley/Wathan)" : "(peso directo de 1 rep)"}
        </p>
      )}
      <button
        onClick={save}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-colors"
      >
        <Trophy className="w-4 h-4" /> Guardar 1RM
      </button>
    </div>
  );
};

/** Panel "1RM de los Básicos" del Perfil: el PR de cada ejercicio compuesto con
 *  su fecha, para ver cuánto tardaste en subir cada marca. */
export const PrBasicsPanel: React.FC = () => {
  const { personalRecords, personalRecordHistory, addPersonalRecord, weightUnit } = useWorkout();
  const { showToast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const byEx = new Map<string, PersonalRecord[]>();
    for (const pr of personalRecordHistory) {
      if (pr.type !== "1RM") continue;
      const arr = byEx.get(pr.exerciseId) ?? [];
      arr.push(pr);
      byEx.set(pr.exerciseId, arr);
    }
    const out: BasicRow[] = getBasicLifts().map((exercise) => {
      const history = (byEx.get(exercise.id) ?? []).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const current = personalRecords.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
      return { exercise, current, history };
    });
    // Básicos con PR ya cargado primero; el resto detrás (orden de la lista curada).
    return out.sort((a, b) => (a.current ? 0 : 1) - (b.current ? 0 : 1));
  }, [personalRecords, personalRecordHistory]);

  const savePr = (exercise: Exercise, valueKg: number, reps: number, date: string) => {
    const prev = personalRecords.find((p) => p.exerciseId === exercise.id && p.type === "1RM");
    addPersonalRecord({
      exerciseId: exercise.id,
      exerciseName: exercise.nameEs || exercise.name,
      type: "1RM",
      value: valueKg,
      reps,
      date,
      previousValue: prev?.value,
    });
    showToast(
      `1RM de ${exercise.nameEs || exercise.name}: ${formatWeight(valueKg, weightUnit)} ${weightUnit}`,
      "success"
    );
    setOpenId(null);
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border border-amber-500/25 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white tracking-tight">1RM de los Básicos</h3>
            <p className="text-[11px] text-neutral-400">
              Tu marca máxima por ejercicio compuesto, con la fecha exacta de cada récord
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-amber-300 font-mono">
          {rows.filter((r) => r.current).length}/{rows.length} cargados
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-neutral-400 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
          No se encontraron los ejercicios básicos en la base de datos.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const cur = row.current;
            const prev = row.history[row.history.length - 2];
            const delta = cur && prev ? Math.round((cur.value - prev.value) * 10) / 10 : null;
            const daysSince = cur ? daysBetween(cur.date, localDateKey()) : null;
            const isOpen = openId === row.exercise.id;
            return (
              <div key={row.exercise.id} className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden">
                <div className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-white truncate">{row.exercise.nameEs || row.exercise.name}</div>
                    {cur ? (
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {fmtDate(cur.date)}
                        {daysSince !== null && daysSince > 0 && ` · hace ${daysSince} día${daysSince !== 1 ? "s" : ""}`}
                        {delta !== null && (
                          <span className={delta > 0 ? "text-emerald-400" : "text-amber-300"}>
                            {" "}· {delta > 0 ? "+" : ""}{formatWeight(delta, weightUnit)} {weightUnit}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-500 mt-0.5">sin récord todavía</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-white font-mono">
                      {cur ? formatWeight(cur.value, weightUnit) : "—"}
                      <span className="text-[11px] font-normal text-neutral-400 ml-1">{weightUnit}</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider text-[10px]">1RM</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setOpenId(isOpen ? null : row.exercise.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-amber-500/40 text-neutral-300 hover:text-amber-300 text-[11px] font-bold transition-colors flex-1 sm:flex-none justify-center"
                    >
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isOpen ? "Cerrar" : "Historial"}
                    </button>
                    <button
                      onClick={() => setOpenId(isOpen ? null : `form-${row.exercise.id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black transition-colors flex-1 sm:flex-none justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar 1RM
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-3 sm:px-4 pb-3 space-y-2">
                    {openId === `form-${row.exercise.id}` && (
                      <MiniPrForm onDone={(v, r, d) => savePr(row.exercise, v, r, d)} />
                    )}
                    <div className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                        Evolución del 1RM
                      </span>
                      {row.history.length === 0 ? (
                        <p className="text-[11px] text-neutral-500 p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                          Sin marcas todavía. Se cargan solas cuando superás tu 1RM en una sesión, o registralo a mano arriba.
                        </p>
                      ) : (
                        row.history.map((h, i) => {
                          const before = row.history[i - 1];
                          const dDelta = before ? Math.round((h.value - before.value) * 10) / 10 : null;
                          const dDays = before ? daysBetween(before.date, h.date) : null;
                          const isLatest = i === row.history.length - 1;
                          return (
                            <div key={h.id} className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${isLatest ? "bg-amber-500/5 border-amber-500/25" : "bg-neutral-900 border-neutral-800"}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {isLatest && <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                <span className="text-[11px] font-bold text-neutral-300">{fmtDate(h.date)}</span>
                                {dDays !== null && (
                                  <span className="text-[11px] text-neutral-500">
                                    · {dDays} día{dDays !== 1 ? "s" : ""} después
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-black text-white font-mono">
                                  {formatWeight(h.value, weightUnit)} {weightUnit}
                                </span>
                                {dDelta !== null && (
                                  <span className={`text-[11px] font-bold ${dDelta > 0 ? "text-emerald-400" : "text-amber-300"}`}>
                                    {dDelta > 0 ? "▲" : "▼"} {formatWeight(Math.abs(dDelta), weightUnit)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Cada 1RM queda guardado con su fecha: así ves cuánto tardás en subir de marca, no solo tu récord
          actual. La progresión de los compuestos es la señal de fuerza más honesta que existe.
        </span>
      </p>
    </div>
  );
};