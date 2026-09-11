import React, { useMemo, useState } from "react";
import {
  Target,
  Scale,
  Ruler,
  Percent,
  CalendarClock,
  Info,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  CheckCircle2,
  Camera,
  AlertTriangle,
  X,
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { useToast } from "../../context/ToastContext";
import { computePersonalTargets, DEFAULT_WEIGHT_KG } from "../../data/nutritionData";
import {
  computeAbsEstimate,
  ABS_TARGET_BODY_FAT,
} from "../../utils/absEstimator";
import { movingAverageWeight, detectStall, downscalePhotoFile } from "../../utils/goalEngine";
import { localDateKey } from "../../utils/dateUtils";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip } from "recharts";

/** Panel "Ruta a los Abdominales": ETA estimada + captura de peso/cintura/%grasa. */
export const AbsEstimatePanel: React.FC = () => {
  const { bodyMetrics, nutritionProfile, nutritionGoal, addBodyMetric, updateMacroTargets } = useWorkout();
  const { showToast } = useToast();

  const result = useMemo(
    () => computeAbsEstimate(bodyMetrics, nutritionProfile),
    [bodyMetrics, nutritionProfile]
  );

  const targetBf = ABS_TARGET_BODY_FAT[nutritionProfile.sex];

  const [formOpen, setFormOpen] = useState(false);
  const [fWeight, setFWeight] = useState<string>(result.weightKg ? String(result.weightKg) : "");
  const [fWaist, setFWaist] = useState<string>("");
  const [fBf, setFBf] = useState<string>("");
  const [fPhoto, setFPhoto] = useState<string>("");
  const [photoBusy, setPhotoBusy] = useState(false);

  const chartData = useMemo(() => {
    const sorted = [...bodyMetrics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const maMap = new Map(movingAverageWeight(bodyMetrics, 7).map((p) => [p.date, p.avg]));
    return sorted.slice(-30).map((m) => ({
      date: new Date(m.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      peso: m.weightKg,
      media7: maMap.get(m.date),
      grasa: m.estimatedBodyFat,
      cintura: m.waistCm,
    }));
  }, [bodyMetrics]);

  const stall = useMemo(() => detectStall(bodyMetrics), [bodyMetrics]);

  const photos = useMemo(
    () =>
      [...bodyMetrics]
        .filter((m) => m.photoUrl)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [bodyMetrics]
  );

  // FIX: usa el objetivo nutricional real del usuario, no "keto" fijo.
  const currentTarget = computePersonalTargets(
    result.weightKg ?? DEFAULT_WEIGHT_KG,
    nutritionGoal,
    nutritionProfile
  ).calories;

  const hasWeightData = chartData.length > 0;
  const hasBfData = chartData.some((d) => d.grasa != null);
  const hasWaistData = chartData.some((d) => d.cintura != null);

  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoBusy(true);
      const url = await downscalePhotoFile(file);
      setFPhoto(url);
      showToast("Foto lista · Guardá la medición para adjuntarla", "success");
    } catch {
      showToast("No se pudo procesar la foto", "error");
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(fWeight);
    if (!w || w <= 0 || w > 400) {
      showToast("Ingresá un peso válido.", "error");
      return;
    }
    const waist = parseFloat(fWaist);
    const bf = parseFloat(fBf);
    addBodyMetric({
      id: `bm-${Date.now()}`,
      date: localDateKey(),
      weightKg: w,
      waistCm: Number.isFinite(waist) && waist > 0 ? waist : undefined,
      estimatedBodyFat: Number.isFinite(bf) && bf > 0 && bf < 60 ? bf : undefined,
      photoUrl: fPhoto || undefined,
    });
    // Recalcula objetivos con el goal real del usuario desde el nuevo peso.
    const t = computePersonalTargets(w, nutritionGoal, nutritionProfile);
    updateMacroTargets({ calories: t.calories, protein: t.protein, carbs: t.carbs, fats: t.fats });
    setFPhoto("");
    setFormOpen(false);
    showToast("Medición guardada · Objetivos recalculados", "success");
  };

  const timeline = result.timeline;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border border-amber-500/25 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white tracking-tight">Ruta a los Abdominales Visibles</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25">
                OBJETIVO: SIX-PACK
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              ETA según tu % de grasa corporal y tu ritmo real de pérdida
            </p>
          </div>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-colors shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 shrink-0"
        >
          <Scale className="w-3.5 h-3.5" />
          {formOpen ? "Cerrar" : "Registrar medición"}
          {formOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <form onSubmit={save} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Peso (kg) *</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={400}
                value={fWeight}
                onChange={(e) => setFWeight(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                placeholder="78.5"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cintura (cm, opcional)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min={40}
                max={250}
                value={fWaist}
                onChange={(e) => setFWaist(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                placeholder="85"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">% Grasa (opcional)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={3}
                max={59}
                value={fBf}
                onChange={(e) => setFBf(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                placeholder="18.5"
              />
            </label>
          </div>
          {/* Foto de progreso (opcional) — comprimida a ~700px para no agotar el almacenamiento local */}
          <div className="flex flex-wrap items-center gap-3">
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
              fPhoto
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-amber-500/50"
            }`}>
              <Camera className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{photoBusy ? "Procesando…" : fPhoto ? "Foto lista ✓" : "Foto de progreso"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoFile} disabled={photoBusy} />
            </label>
            {fPhoto && (
              <div className="relative">
                <img src={fPhoto} alt="Vista previa" className="h-16 w-16 rounded-xl object-cover border border-neutral-700" />
                <button
                  type="button"
                  onClick={() => setFPhoto("")}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-400 hover:text-white"
                  aria-label="Quitar foto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <span className="text-[10px] text-neutral-500">Misma pose y luz para comparar bien el progreso.</span>
          </div>
          <button
            type="submit"
            className="min-h-[48px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-colors shadow-lg shadow-cyan-600/20"
          >
            Guardar medición
          </button>
          <p className="text-[10px] text-neutral-500">
            💡 Si no registrás % de grasa, se estima por IMC (fórmula de Deurenberg) y se marca como "estimado".
          </p>
        </form>
      )}

      {/* Empty state */}
      {!result.weightKg ? (
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400 space-y-3">
          <Dumbbell className="w-6 h-6 text-amber-400 mx-auto" />
          <p>
            Registrá tu peso (y si podés, tu % de grasa o cintura) para calcular cuántas
            semanas te faltan para revelar el six-pack. Los abdominales se ven cuando el
            % de grasa baja a ≈12% (hombres) / ≈20% (mujeres) — el déficit keto ya está activo.
          </p>
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <Percent className="w-3.5 h-3.5 text-amber-400" /> Grasa actual
              </div>
              <div className="text-xl font-black text-white mt-1">
                {result.bodyFatPct != null ? `${result.bodyFatPct}%` : "—"}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 block ${
                result.bodyFatSource === "medido" ? "text-emerald-400" : "text-neutral-500"
              }`}>
                {result.bodyFatSource === "medido" ? "medido" : result.bodyFatSource === "estimado_imc" ? "estimado por IMC" : ""}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <Target className="w-3.5 h-3.5 text-amber-400" /> Objetivo
              </div>
              <div className="text-xl font-black text-amber-300 mt-1">≈{targetBf}%</div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                {nutritionProfile.sex === "masculino" ? "hombres" : "mujeres"}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-amber-400" /> Kg a perder
              </div>
              <div className="text-xl font-black text-white mt-1">
                {timeline ? `${timeline.kgToLose.toFixed(1)} kg` : "—"}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                {timeline ? `peso objetivo ≈ ${timeline.targetWeightKg} kg` : ""}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <CalendarClock className="w-3.5 h-3.5 text-amber-400" /> Ritmo
              </div>
              <div className="text-xl font-black text-white mt-1">
                {result.weeklyLossKg != null ? `${result.weeklyLossKg.toFixed(2)}` : "0.50"}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                kg/semana {result.weeklyLossKg != null ? "(observado)" : "(estimado)"}
              </span>
            </div>
          </div>

          {/* ETA banner */}
          {timeline && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              timeline.reached
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}>
              <div className="flex items-start gap-3 min-w-0">
                {timeline.reached ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <CalendarClock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-black text-white">
                    {timeline.reached
                      ? "¡Ya estás en rango de six-pack visible!"
                      : `≈ ${timeline.weeks} semanas para revelar los abdominales`}
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                    {timeline.reached
                      ? `Grasa corporal ${result.bodyFatPct}% ≤ objetivo ${timeline.targetBodyFat}%. Mantené el déficit keto y la sobrecarga progresiva para no perder masa.`
                      : `ETA: ${timeline.etaDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} · ${timeline.kgToLose.toFixed(1)} kg de grasa a ${timeline.weeklyLossKg.toFixed(2)} kg/semana (déficit keto −15% activo).`}
                  </p>
                </div>
              </div>
              {!timeline.reached && (
                <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                  masa magra ≈ {timeline.leanMassKg} kg (se conserva)
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Stall detection: 3+ semanas sin que la media móvil baje */}
      {stall.stalled && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-neutral-200 leading-relaxed">
            <div className="text-xs font-black text-rose-300 uppercase tracking-wider">Estancamiento detectado</div>
            <p className="mt-1">
              Tu media móvil de peso no baja hace <strong className="text-white">{stall.days} días</strong>
              {stall.since ? <> (desde el {new Date(stall.since + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}).</> : "."}{" "}
              El déficit está frenando. Probá una de estas palancas:
            </p>
            <ul className="list-disc pl-4 mt-1.5 space-y-1 text-neutral-300">
              <li>Recortá ≈<strong className="text-white">{Math.round(currentTarget * 0.05)} kcal/día</strong> (−5% del objetivo actual) manteniendo la proteína.</li>
              <li>Sumá <strong className="text-white">+2.000 pasos/día</strong> (el motor NEAT ajusta las calorías automáticamente).</li>
              <li>Revisá la adherencia real: 1–2 días de "cheat" por semana pueden anular todo el déficit.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Progress photos: Antes / Ahora */}
      {photos.length > 0 && (
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Fotos de progreso · Antes / Ahora</span>
            <span className="text-[9px] text-neutral-500">{photos.length} medición{photos.length > 1 ? "es" : ""} con foto</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <img
                src={photos[0].photoUrl}
                alt={`Antes · ${photos[0].date}`}
                className="w-full aspect-[3/4] object-cover rounded-xl border border-neutral-700"
              />
              <div className="text-[10px] text-neutral-400 font-bold mt-1.5">Antes · {new Date(photos[0].date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className="text-[10px] text-neutral-500">{photos[0].weightKg} kg{photos[0].estimatedBodyFat != null ? ` · ${photos[0].estimatedBodyFat}% grasa` : ""}</div>
            </div>
            <div>
              <img
                src={photos[photos.length - 1].photoUrl}
                alt={`Ahora · ${photos[photos.length - 1].date}`}
                className="w-full aspect-[3/4] object-cover rounded-xl border border-emerald-500/30"
              />
              <div className="text-[10px] text-emerald-300 font-bold mt-1.5">Ahora · {new Date(photos[photos.length - 1].date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className="text-[10px] text-neutral-500">{photos[photos.length - 1].weightKg} kg{photos[photos.length - 1].estimatedBodyFat != null ? ` · ${photos[photos.length - 1].estimatedBodyFat}% grasa` : ""}</div>
            </div>
          </div>
          {photos.length === 1 && (
            <p className="text-[10px] text-neutral-500">💡 Sumá otra foto en 3–4 semanas para la comparación lado a lado.</p>
          )}
        </div>
      )}

      {/* Trend charts */}
      {(hasWeightData || hasBfData || hasWaistData) && (
        <div className={`grid ${hasBfData || hasWaistData ? "sm:grid-cols-2" : "grid-cols-1"} gap-3`}>
          {hasWeightData && (
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Peso corporal (kg)</span>
                <span className="text-[9px] text-neutral-500">línea = media 7 días</span>
              </div>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#525252" fontSize={9} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={9} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={45} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                      formatter={(val: any, name: any) => [
                        `${val} kg`,
                        name === "media7" ? "Media 7 días" : "Peso",
                      ]}
                    />
                    <Area type="monotone" dataKey="peso" stroke="#f59e0b" strokeWidth={2} fill="url(#pesoGrad)" />
                    <Line type="monotone" dataKey="media7" stroke="#fafafa" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {hasBfData && (
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">% Grasa corporal</span>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grasaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#525252" fontSize={9} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={9} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={45} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                      formatter={(val: any) => [`${val}%`, "Grasa"]}
                    />
                    <Area type="monotone" dataKey="grasa" stroke="#22d3ee" strokeWidth={2} fill="url(#grasaGrad)" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {hasWaistData && !hasBfData && (
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cintura (cm)</span>
              <div className="h-32 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cinturaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#525252" fontSize={9} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={9} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} width={45} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#171717", borderColor: "#404040", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                      formatter={(val: any) => [`${val} cm`, "Cintura"]}
                    />
                    <Area type="monotone" dataKey="cintura" stroke="#a78bfa" strokeWidth={2} fill="url(#cinturaGrad)" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Los abdominales se revelan con déficit calórico, no con series interminables de crunch:
          la grasa abdominal se quema desde el balance calórico total. Entrená el abdomen 2×/semana
          con carga progresiva (cable crunch, decline lastrado) para que sea más grueso y visible al bajar el % de grasa.
        </span>
      </p>
    </div>
  );
};