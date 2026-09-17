import React, { useMemo, useRef, useState } from "react";
import { Ruler, Plus, X, Trash2, ChevronDown, Info, TrendingUp } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../ConfirmDialog";
import { latestBodyMetric } from "../../utils/absEstimator";
import { localDateKey } from "../../utils/dateUtils";
import { displayToKg, formatWeight, kgToDisplay } from "../../utils/weightUnits";
import { describeDecimalIssue, parseDecimalInput } from "../../utils/parseDecimal";
import type { BodyMetricEntry } from "../../types";

/** Límites de escala razonables para una medida corporal en cm. */
const MEASURE_MIN_CM = 1;
const MEASURE_MAX_CM = 300;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 400;

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

/** Etiqueta + campo con la unidad visible fuera del valor editable. */
const UnitField: React.FC<{
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputMode?: "decimal" | "numeric";
  onEnter?: () => void;
  maxLength?: number;
  helper?: string;
}> = ({ label, unit, value, onChange, error, inputMode = "decimal", onEnter, maxLength, helper }) => (
  <label className="block min-w-0">
    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">{label}</span>
    <div
      className={`mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-900 border px-3 focus-within:border-violet-400 ${
        error ? "border-red-500/70" : "border-neutral-700"
      }`}
    >
      <input
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className="flex-1 min-w-0 bg-transparent py-3 text-base font-bold text-white focus:outline-none placeholder:text-neutral-600"
      />
      <span className="text-[11px] font-bold text-neutral-400 shrink-0">{unit}</span>
    </div>
    {error ? (
      <span role="alert" className="mt-1 block text-[11px] font-bold text-red-300">
        {error}
      </span>
    ) : helper ? (
      <span className="mt-1 block text-[11px] text-neutral-500">{helper}</span>
    ) : null}
  </label>
);

/** Panel "Medidas Corporales" del Perfil: registro con historial (sin nada
 *  hardcodeado: cada medida la define el usuario) y evolución en el tiempo.
 *
 *  Tres acciones separadas a propósito:
 *  - "Añadir tipo de medida": define qué se mide (no guarda valores).
 *  - "Registrar medición": guarda valores con fecha.
 *  - "Ver historial": consulta y borra registros guardados.
 */
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

  const formRef = useRef<HTMLFormElement | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [fDate, setFDate] = useState(today);
  const [fWeight, setFWeight] = useState<string>(latest ? String(latest.weightKg) : "");
  const [fValues, setFValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BodyMetricEntry | null>(null);

  const addName = () => {
    const name = newName.trim();
    if (!name) {
      setNewNameError("Escribí el nombre de la medida.");
      return;
    }
    if (bodyMeasurementNames.includes(name)) {
      setNewNameError(`"${name}" ya está en la lista.`);
      return;
    }
    setBodyMeasurementNames([...bodyMeasurementNames, name]);
    setFValues((f) => ({ ...f, [name]: "" }));
    setNewName("");
    setNewNameError(null);
    showToast(`Medida "${name}" agregada al formulario.`, "success");
  };

  /** Quita la medida del formulario. NO borra historial: eso vive en "Ver historial". */
  const removeName = (name: string) => {
    setBodyMeasurementNames(bodyMeasurementNames.filter((n) => n !== name));
    showToast(`"${name}" quitada del formulario. Su historial se conserva.`, "info");
  };

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    const date = fDate || today;
    const errors: Record<string, string> = {};

    const hadWeightInput = fWeight.trim().length > 0;
    let weightKg: number | null = null;

    if (hadWeightInput) {
      const parsed = parseDecimalInput(fWeight, { min: WEIGHT_MIN, max: WEIGHT_MAX, unit: weightUnit });
      if (!parsed.ok) {
        errors.weight = describeDecimalIssue(parsed.issue, {
          label: `Peso (${weightUnit})`,
          unit: weightUnit,
          min: WEIGHT_MIN,
          max: WEIGHT_MAX,
        });
      } else {
        weightKg = Math.round(displayToKg(parsed.value, weightUnit) * 10) / 10;
      }
    } else if (latest) {
      weightKg = Math.round(latest.weightKg * 10) / 10;
    } else {
      errors.weight = "Ingresá tu peso: es necesario para el primer registro.";
    }

    const measurements: Record<string, number> = {};
    for (const name of allNames) {
      const raw = (fValues[name] ?? "").trim();
      if (!raw) continue;
      const parsed = parseDecimalInput(raw, { min: MEASURE_MIN_CM, max: MEASURE_MAX_CM, unit: "cm" });
      if (!parsed.ok) {
        errors[`m:${name}`] = describeDecimalIssue(parsed.issue, {
          label: name,
          unit: "cm",
          min: MEASURE_MIN_CM,
          max: MEASURE_MAX_CM,
        });
        continue;
      }
      measurements[name] = parsed.value;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
        invalid?.focus();
        invalid?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

    if (Object.keys(measurements).length === 0 && !hadWeightInput) {
      showToast("No hay datos nuevos para guardar.", "error");
      return;
    }

    if (weightKg === null) {
      // Red de seguridad: sin peso válido ya se marcó error y no se llega acá.
      showToast("Ingresá tu peso: es necesario para el primer registro.", "error");
      return;
    }

    const entry: BodyMetricEntry = {
      id: `bm-${Date.now()}`,
      date,
      weightKg,
      measurements: Object.keys(measurements).length ? measurements : undefined,
    };
    addBodyMetric(entry);
    setFieldErrors({});
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

  const describeRecord = (m: BodyMetricEntry) =>
    m.measurements
      ? Object.entries(m.measurements)
          .filter(([, v]) => Number.isFinite(v))
          .map(([n, v]) => `${n} ${v} cm`)
          .join(" · ") || "sin medidas"
      : "sin medidas";

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-violet-500/10 via-neutral-900 to-neutral-950 border border-violet-500/25 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/25 shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white tracking-tight">Medidas Corporales</h3>
            <p className="text-xs text-neutral-300">
              {latest
                ? `Último registro: ${latest.date} · ${formatWeight(latest.weightKg, weightUnit)} ${weightUnit}`
                : "Sin registros todavía"}
              {records.length > 0 && ` · ${records.length} registro${records.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormOpen((v) => !v);
            setFieldErrors({});
          }}
          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black transition-colors shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 shrink-0"
          aria-expanded={formOpen}
        >
          <Plus className="w-4 h-4" />
          {formOpen ? "Cerrar formulario" : "Registrar medición"}
        </button>
      </div>

      {/* 1 · Registrar medición */}
      {formOpen && (
        <form
          ref={formRef}
          onSubmit={save}
          className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black text-white">Registrar medición</h4>
            <span className="text-[11px] text-neutral-400">Los campos en blanco no se guardan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">Fecha</span>
              <input
                type="date"
                value={fDate}
                max={today}
                onChange={(e) => setFDate(e.target.value)}
                className="mt-1.5 w-full px-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-base font-bold text-white focus:outline-none focus:border-violet-400"
              />
            </label>
            <UnitField
              label={`Peso (${weightUnit})`}
              unit={weightUnit}
              value={fWeight}
              onChange={(v) => setFWeight(v)}
              error={fieldErrors.weight}
              helper={latest ? "Si lo dejás vacío se reusa el último registrado." : undefined}
            />
          </div>

          {allNames.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                Medidas (cm)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allNames.map((name) => (
                  <UnitField
                    key={name}
                    label={name}
                    unit="cm"
                    value={fValues[name] ?? ""}
                    onChange={(v) => {
                      setFValues((f) => ({ ...f, [name]: v }));
                      setFieldErrors((e) => {
                        if (!e[`m:${name}`]) return e;
                        const next = { ...e };
                        delete next[`m:${name}`];
                        return next;
                      });
                    }}
                    error={fieldErrors[`m:${name}`]}
                    onEnter={save}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-300">
              Todavía no definiste ninguna medida. Agregá una abajo en “Tipos de medida” y vuelve a abrir este
              formulario.
            </p>
          )}

          <div className="sticky-above-nav -mx-4 px-4 pt-3 pb-2 bg-neutral-950/95 backdrop-blur-sm border-t border-neutral-800 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="min-h-[48px] flex-1 min-w-[180px] px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black transition-colors shadow-lg shadow-cyan-600/20"
            >
              Guardar medición
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setFieldErrors({});
              }}
              className="min-h-[48px] px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-bold text-neutral-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* 2 · Tipos de medida (definir qué se mide; no guarda valores) */}
      <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">
            Tipos de medida · {allNames.length}
          </span>
        </div>
        {allNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[11px] font-bold text-violet-200"
              >
                {name}
                {bodyMeasurementNames.includes(name) && (
                  <button
                    onClick={() => removeName(name)}
                    className="min-h-[28px] px-1.5 rounded-full hover:text-red-300 transition-colors"
                    aria-label={`Quitar ${name} del formulario`}
                    title="Quitar del formulario (el historial se conserva)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-300">
            Elegí qué vas a medir (cintura, cuello, bíceps, pierna, pecho…). Podés agregar y quitar cuando quieras.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:items-end">
          <label className="block min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Nueva medida
            </span>
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewNameError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addName())}
              placeholder="Cuello"
              maxLength={60}
              aria-invalid={newNameError ? true : undefined}
              className={`mt-1.5 w-full px-3 py-3 bg-neutral-900 border rounded-xl text-base font-bold text-white focus:outline-none ${
                newNameError ? "border-red-500/70" : "border-neutral-700 focus:border-violet-400"
              }`}
            />
            {newNameError ? (
              <span role="alert" className="mt-1 block text-[11px] font-bold text-red-300">
                {newNameError}
              </span>
            ) : (
              <span className="mt-1 block text-[11px] text-neutral-500">
                Nombre libre, por ejemplo: Cuello, Cintura, Bíceps.
              </span>
            )}
          </label>
          <button
            onClick={addName}
            className="min-h-[48px] px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-colors"
          >
            Agregar medida
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
          <span>
            Quitar una medida acá solo la saca del formulario y no borra nada. Los datos guardados se eliminan
            desde el historial.
          </span>
        </p>
      </div>

      {/* 3 · Resumen por medida */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Resumen actual</span>
        {allNames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
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
                    <span className="text-xs font-bold text-neutral-200 break-words">{name}</span>
                  </div>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {last ? `${last.value}` : "—"}{" "}
                    <span className="text-[11px] font-normal text-neutral-400">{last ? "cm" : "sin datos"}</span>
                  </div>
                  <div className="text-[11px] font-bold">
                    {delta !== null ? (
                      <span className={delta <= 0 ? "text-emerald-300" : "text-amber-300"}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)} {delta > 0 ? "↑" : delta < 0 ? "↓" : "·"}
                      </span>
                    ) : (
                      <span className="text-neutral-400">
                        {series.length > 0 ? `${series.length} registro${series.length !== 1 ? "s" : ""}` : "sin registros"}
                      </span>
                    )}
                    {delta !== null && last && (
                      <span className="text-neutral-400 font-normal">
                        {" "}
                        · {series.length} registro{series.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 opacity-80">
                    <Sparkline values={series.map((s) => s.value)} color={color} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-neutral-300 p-3 mt-2 rounded-2xl bg-neutral-950 border border-neutral-800">
            <Info className="w-3.5 h-3.5 inline text-violet-400 mr-1" />
            Definí tus medidas para empezar: cada vez que registres, quedará guardado con su fecha y vas a ver la
            evolución.
          </p>
        )}
      </div>

      {/* 4 · Ver historial */}
      {records.length > 0 && (
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center justify-between w-full text-left min-h-[44px]"
            aria-expanded={historyOpen}
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">
              {historyOpen ? "Ocultar historial" : "Ver historial"} · {records.length}
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="space-y-1.5">
              {records.slice(0, 60).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">
                      {m.date} · <span className="font-mono">{formatWeight(m.weightKg, weightUnit)} {weightUnit}</span>
                    </div>
                    <div className="text-[11px] text-neutral-300">{describeRecord(m)}</div>
                  </div>
                  <button
                    onClick={() => setPendingDelete(m)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
                    aria-label={`Eliminar el registro del ${m.date}`}
                    title="Eliminar este registro del historial"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-300 leading-relaxed flex items-start gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
        <span>
          {kgToDisplay(latest?.weightKg ?? 0, weightUnit) > 0
            ? `Dato actual: ${formatWeight(latest!.weightKg, weightUnit)} ${weightUnit}. `
            : ""}
          Medí siempre en la misma condición (en ayunas, sin ropa) y con la misma cinta para que las
          comparaciones sean honestas.
        </span>
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="Eliminar registro"
        message={
          pendingDelete
            ? `Se borrará el registro del ${pendingDelete.date} (${describeRecord(pendingDelete)}). Los demás registros y los tipos de medida no se tocan. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar registro"
        cancelLabel="Conservar"
        onConfirm={() => {
          if (pendingDelete) {
            deleteBodyMetric(pendingDelete.id);
            showToast("Registro eliminado.", "info");
          }
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
