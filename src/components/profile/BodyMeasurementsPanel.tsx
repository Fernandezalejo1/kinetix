import React, { useMemo, useState } from "react";
import { Ruler, Plus, X, Trash2, ChevronDown, Info, TrendingUp } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { latestBodyMetric } from "../../utils/absEstimator";
import { localDateKey } from "../../utils/dateUtils";
import { displayToKg, formatWeight, kgToDisplay } from "../../utils/weightUnits";
import type { BodyMetricEntry } from "../../types";

/** Minigráfico SVG liviano de la evolución de una medida. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 100;
  const h = 28;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / range) * (h - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Panel "Medidas Corporales" del Perfil: registro con historial (sin nada
 *  hardcodeado: cada medida la define el usuario) y evolución en el tiempo. */
export const BodyMeasurementsPanel: React.FC = () => {
  const {
    bodyMetrics,
    bodyMeasurementNames,
    setBodyMeasurementNames,
    addBodyMetric,
    deleteBodyMetric,
    weightUnit,
  } = useWorkout();
  const { showToast } = useToast();

  const today = localDateKey();
  const latest = useMemo(() => (bodyMetrics.length ? latestBodyMetric(bodyMetrics) : null), [bodyMetrics]);

  // Nombre -> serie (fecha, valor) en orden cronológico.
  const seriesByMetric = useMemo(() => {
    const sorted = [...bodyMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const map: Record<string, { values: { date: string; value: number }[] }> = {};
    for (const m of sorted) {
      if (!m.measurements) continue;
      for (const [name, value] of Object.entries(m.measurements)) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        (map[name] ??= { values: [] }).values.push({ date: m.date, value });
      }
    }
    return map;
  }, [bodyMetrics]);

  // Medidas activas: las configuradas primero, luego las históricas no configuradas.
  const allNames = useMemo(() => {
    const configured = bodyMeasurementNames.filter(Boolean);
    const extra = Object.keys(seriesByMetric)
      .filter((n) => !configured.includes(n))
      .sort((a, b) => a.localeCompare(b, "es"));
    return [...configured, ...extra];
  }, [bodyMeasurementNames, seriesByMetric]);

  const [formOpen, setFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [fDate, setFDate] = useState(today);
  const [fWeight, setFWeight] = useState<string>(latest ? String(latest.weightKg) : "");
  const [fValues, setFValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  const addName = () => {
    const name = newName.trim();
    if (!name) {
      showToast("Escribí el nombre de la medida.", "error");
      return;
    }
    if (bodyMeasurementNames.includes(name)) {
      showToast("Esa medida ya está agregada.", "error");
      return;
    }
    setBodyMeasurementNames([...bodyMeasurementNames, name]);
    setFValues((f) => ({ ...f, [name]: "" }));
    setNewName("");
    showToast(`Medida "${name}" agregada.`, "success");
  };

  const removeName = (name: string) => {
    setBodyMeasurementNames(bodyMeasurementNames.filter((n) => n !== name));
    showToast(`"${name}" quitada del formulario (el historial se conserva).`, "info");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const date = fDate || today;
    const hadWeightInput = fWeight.trim().length > 0;
    let weightKg: number | null = null;
    if (hadWeightInput) {
      const w = parseFloat(fWeight);
      if (!Number.isFinite(w) || w <= 0 || w > 400) {
        showToast("Ingresá un peso válido (kg).", "error");
        return;
      }
      weightKg = Math.round(displayToKg(w, weightUnit) * 10) / 10;
    } else if (latest) {
      weightKg = Math.round(latest.weightKg * 10) / 10;
    } else {
      showToast("Ingresá tu peso (es necesario para el primer registro).", "error");
      return;
    }

    const measurements: Record<string, number> = {};
    for (const name of allNames) {
      const v = parseFloat(fValues[name] ?? "");
      if (Number.isFinite(v) && v > 0) measurements[name] = Math.round(v * 10) / 10;
    }
    if (Object.keys(measurements).length === 0 && !hadWeightInput) {
      showToast("No hay datos nuevos para guardar.", "error");
      return;
    }

    const entry: BodyMetricEntry = {
      id: `bm-${Date.now()}`,
      date,
      weightKg,
      measurements: Object.keys(measurements).length ? measurements : undefined,
    };
    addBodyMetric(entry);
    setFDate(today);
    setFWeight(hadWeightInput ? fWeight : String(weightKg));
    setFValues({});
    setFormOpen(false);
    showToast(`Medición guardada · ${formatWeight(weightKg, weightUnit)} ${weightUnit}`, "success");
  };

  const records = useMemo(
    () =>
      [...bodyMetrics].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [bodyMetrics]
  );

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-violet-500/10 via-neutral-900 to-neutral-950 border border-violet-500/25 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/25 shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white tracking-tight">Medidas Corporales</h3>
            <p className="text-[11px] text-neutral-400">
              Registrá tus medidas con fecha para ver cómo cambian en el tiempo
            </p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-colors shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {formOpen ? "Cerrar" : "Registrar medición"}
        </button>
      </div>

      {/* Gestión de medidas (nada hardcodeado) */}
      <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            Tus medidas
          </span>
          <span className="text-[11px] text-neutral-400">{allNames.length} activa{allNames.length !== 1 ? "s" : ""}</span>
        </div>
        {allNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allNames.map((name) => (
              <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] font-bold text-violet-200">
                {name}
                {bodyMeasurementNames.includes(name) && (
                  <button
                    onClick={() => removeName(name)}
                    className="hover:text-red-400 transition-colors"
                    aria-label={`Quitar ${name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-400">
            Agregá tus medidas (panza, cuello, bíceps, pierna, torso, espalda, envergadura…).
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addName())}
            placeholder="Nueva medida… ej: Cuello"
            maxLength={60}
            className="flex-1 min-w-0 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={addName}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Formulario */}
      {formOpen && (
        <form onSubmit={save} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Fecha</span>
              <input
                type="date"
                value={fDate}
                max={today}
                onChange={(e) => setFDate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-violet-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Peso ({weightUnit}) {!latest && "*"}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={400}
                value={fWeight}
                onChange={(e) => setFWeight(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-violet-500"
              />
            </label>
            <div className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Medidas (cm)</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allNames.map((name) => (
                  <label key={name} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700">
                    <span className="text-[11px] text-neutral-300 whitespace-nowrap">{name}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={1}
                      value={fValues[name] ?? ""}
                      onChange={(e) => setFValues((f) => ({ ...f, [name]: e.target.value }))}
                      placeholder="cm"
                      className="w-16 bg-transparent text-sm font-bold text-white focus:outline-none placeholder:text-neutral-600"
                    />
                  </label>
                ))}
                {allNames.length === 0 && (
                  <span className="text-[11px] text-neutral-500">Agregá una medida arriba primero.</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-neutral-400">
              💡 Si dejás el peso vacío se reusa el último registrado.
            </p>
            <button type="submit" className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-colors shadow-lg shadow-cyan-600/20">
              Guardar medición
            </button>
          </div>
        </form>
      )}

      {/* Evolución de cada medida */}
      {allNames.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {allNames.map((name, idx) => {
            const series = seriesByMetric[name]?.values ?? [];
            const last = series[series.length - 1];
            const prev = series[series.length - 2];
            const delta = last && prev ? Math.round((last.value - prev.value) * 10) / 10 : null;
            const colors = ["#8b5cf6", "#a78bfa", "#34d399", "#f59e0b", "#22d3ee", "#fb7185", "#fbbf24", "#60a5fa", "#f472b6", "#4ade80", "#c084fc", "#f87171", "#38bdf8", "#a3e635"];
            const color = colors[idx % colors.length];
            return (
              <div key={name} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-neutral-300 truncate">{name}</span>
                  {bodyMeasurementNames.includes(name) && series.length > 0 && (
                    <button onClick={() => removeName(name)} className="text-neutral-500 hover:text-red-400 transition-colors shrink-0" aria-label={`Quitar ${name}`}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-lg font-black text-white font-mono mt-0.5">
                  {last ? `${last.value}` : "—"} <span className="text-[10px] font-normal text-neutral-400">cm</span>
                </div>
                <div className="text-[11px] font-bold">
                  {delta !== null ? (
                    <span className={delta <= 0 ? "text-emerald-400" : "text-amber-300"}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)} {delta > 0 ? "↑" : delta < 0 ? "↓" : "·"}
                    </span>
                  ) : (
                    <span className="text-neutral-500">{series.length > 0 ? "sin cambio previo" : "sin datos"}</span>
                  )}
                  {last && <span className="text-neutral-500 font-normal"> · {series.length} registro{series.length !== 1 ? "s" : ""}</span>}
                </div>
                <div className="mt-1.5 opacity-80">
                  <Sparkline values={series.map((s) => s.value)} color={color} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !formOpen && (
          <p className="text-[11px] text-neutral-400 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
            <Info className="w-3.5 h-3.5 inline text-violet-400 mr-1" />
            Definí tus medidas para empezar: cada vez que registres, quedará guardado con su fecha y vas a ver la evolución.
          </p>
        )
      )}

      {/* Historial */}
      {records.length > 0 && (
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
              Historial de registros · {records.length}
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <div className="space-y-1.5">
              {records.slice(0, 60).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">
                      {m.date} · <span className="font-mono">{formatWeight(m.weightKg, weightUnit)} {weightUnit}</span>
                    </div>
                    {m.measurements && (
                      <div className="text-[11px] text-neutral-400 truncate">
                        {Object.entries(m.measurements)
                          .filter(([, v]) => Number.isFinite(v))
                          .map(([n, v]) => `${n} ${v} cm`)
                          .join(" · ") || "sin medidas"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteBodyMetric(m.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    aria-label="Borrar registro"
                    title="Borrar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
        <span>
          {kgToDisplay(latest?.weightKg ?? 0, weightUnit) > 0
            ? `Dato actual: ${formatWeight(latest!.weightKg, weightUnit)} ${weightUnit}. `
            : ""}
          Medí siempre en la misma condición (en ayunas, sin ropa) y con la misma cinta para que las
          comparaciones sean honestas.
        </span>
      </p>
    </div>
  );
};