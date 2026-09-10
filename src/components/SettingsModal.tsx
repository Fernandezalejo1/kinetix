import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Upload,
  Bell,
  BellOff,
  ShieldAlert,
  Database,
  Footprints,
  FileText,
} from "lucide-react";
import { StepsPanel } from "./nutrition/StepsPanel";
import { useToast } from "../context/ToastContext";
import { useWorkout } from "../context/WorkoutContext";
import { parseWorkoutCsv, ImportResult } from "../utils/csvImporter";
import { VALIDATORS, isArray, isPlainObject } from "../utils/storage";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const REMINDER_KEY = "kinetix_reminder";
const EXCLUDED_KEYS = ["kinetix_pin_hash", "kinetix_pin_attempts", "kinetix_pin_skipped", "kinetix_reminder", "kinetix_backup_saved"];

interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  dayIndex: number; // 0-6 (0 = Lunes)
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { showToast } = useToast();
  const [reminder, setReminder] = useState<ReminderConfig>(() => {
    try {
      const raw = localStorage.getItem(REMINDER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { enabled: false, hour: 18, minute: 0, dayIndex: 0 };
  });
  const { importBulkData } = useWorkout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<ImportResult | null>(null);
  const isMounted = useRef(true);

  // Persist reminder config
  useEffect(() => {
    try {
      localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
    } catch {}
  }, [reminder]);

  // Always-on reminder scheduler (kept alive while the modal stays mounted)
  useEffect(() => {
    const check = () => {
      if (!isMounted.current) return;
      let cfg: ReminderConfig | null = null;
      try {
        const raw = localStorage.getItem(REMINDER_KEY);
        if (raw) cfg = JSON.parse(raw);
      } catch {}
      if (!cfg || !cfg.enabled) return;
      const now = new Date();
      // dayIndex 0 = Monday. getDay(): 0=Sun..6=Sat. Convert.
      const todayIndex = (now.getDay() + 6) % 7;
      if (todayIndex !== cfg.dayIndex) return;
      if (now.getHours() === cfg.hour && now.getMinutes() === cfg.minute) {
        const shownKey = `kinetix_reminder_shown_${now.toDateString()}_${cfg.hour}_${cfg.minute}`;
        if (!localStorage.getItem(shownKey)) {
          localStorage.setItem(shownKey, "1");
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("KINETIX — ¡Hora de entrenar! 💪", {
              body: "Tu rutina programada para hoy te espera. ¡A darle!",
              icon: "/icon-192.png",
            });
          } else {
            showToast("¡Es hora de entrenar! 💪", "info");
          }
        }
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [showToast]);

  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("kinetix_") && !EXCLUDED_KEYS.includes(key)) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || "null");
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    const payload = {
      app: "KINETIX",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinetix-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exportado correctamente", "success");
  };

  const IMPORT_VERSION = 1;
  const MAX_BACKUP_SIZE = 5 * 1024 * 1024; // 5 MB

  // Json-safe check para claves desconocidas del backup: solo estructuras
  // JSON serializables, nunca funciones/undefined/prototypes.
  const isJsonSafe = (v: unknown): boolean =>
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    isArray(v) ||
    isPlainObject(v);

  const importFile = (file: File) => {
    if (file.size > MAX_BACKUP_SIZE) {
      showToast("El archivo es demasiado grande (máx. 5 MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: any;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch {
        showToast("Error al leer el backup", "error");
        return;
      }
      // Validación de esquema: debe ser un backup real de KINETIX.
      if (!parsed || parsed.app !== "KINETIX" || parsed.version !== IMPORT_VERSION) {
        showToast("El archivo no es un backup válido de KINETIX", "error");
        return;
      }
      const data = parsed?.data;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        showToast("El archivo no es un backup válido de KINETIX", "error");
        return;
      }
      // M1 — Validación por esquema: importar solo entradas con la forma
      // esperada (las claves conocidas pasan su type guard; las desconocidas
      // deben ser JSON-safe). Lo inválido se descarta.
      const validEntries: [string, unknown][] = [];
      let skipped = 0;
      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith("kinetix_") || EXCLUDED_KEYS.includes(key)) continue;
        const ok = key in VALIDATORS ? VALIDATORS[key](value) : isJsonSafe(value);
        if (ok) validEntries.push([key, value]);
        else skipped++;
      }
      if (validEntries.length === 0) {
        showToast("El backup no contiene datos válidos para importar", "error");
        return;
      }
      if (!window.confirm("Se reemplazarán TODOS tus datos actuales con los del backup. ¿Continuar?")) {
        return;
      }
      // Clear all previous kinetix keys, then write new ones
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("kinetix_") && !EXCLUDED_KEYS.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      validEntries.forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          /* skip entries that can't be serialized */
        }
      });
      showToast(
        skipped > 0
          ? `Datos restaurados (${skipped} entradas inválidas omitidas). Recargando…`
          : "Datos restaurados. Recargando…",
        skipped > 0 ? "info" : "success"
      );
      setTimeout(() => window.location.reload(), 1200);
    };
    reader.readAsText(file);
  };

  const requestNotification = async () => {
    if (!("Notification" in window)) {
      showToast("Tu navegador no soporta notificaciones", "error");
      return { granted: false };
    }
    const perm = await Notification.requestPermission();
    return { granted: perm === "granted" };
  };

  const toggleReminder = async () => {
    if (!reminder.enabled) {
      const { granted } = await requestNotification();
      if (!granted) {
        showToast("Permití las notificaciones para activar el recordatorio", "info");
        return;
      }
      setReminder((r) => ({ ...r, enabled: true }));
      showToast("Recordatorio activado", "success");
    } else {
      setReminder((r) => ({ ...r, enabled: false }));
      showToast("Recordatorio desactivado", "info");
    }
  };

  const handleCsvSelected = async (file: File) => {
    try {
      const text = await file.text();
      const result = parseWorkoutCsv(text);
      setCsvPreview(result);
      showToast(`Archivo procesado: ${result.importedSetsCount} series detectadas`, "info");
    } catch (err: any) {
      showToast(err.message || "Error al leer el archivo CSV", "error");
    }
  };

  const confirmCsvImport = () => {
    if (!csvPreview) return;
    importBulkData(csvPreview.historyEntries, csvPreview.newPrs);
    showToast(
      `¡${csvPreview.importedSessionsCount} sesiones y ${csvPreview.importedSetsCount} series añadidas al historial!`,
      "success"
    );
    setCsvPreview(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain scrollbar-thin shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-5 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Configuración</h3>
          <button onClick={onClose} className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Backup section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Datos & Backup</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Tu historial de entrenamiento, PRs, nutrición y métricas se guardan en este dispositivo.
              Exportalos para respaldarlos o transferirlos a otro dispositivo.
            </p>
            <p className="text-[10px] text-amber-400/90 leading-relaxed flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              El backup contiene datos personales (peso, medidas, historial). Guardalo en un lugar seguro y no lo compartas.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportData}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar datos
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar datos
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFile(file);
                e.target.value = "";
              }}
            />
          </section>

          {/* Strong / Hevy CSV Migration section */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Migración Strong / Hevy (CSV)
              </h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Importa tu historial previo desde Strong o Hevy. KINETIX reconocerá tus ejercicios, marcas de 1RM y series efectivas automáticamente.
            </p>
            <button
              onClick={() => csvInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 text-xs font-bold border border-purple-500/30 transition-colors touch-target"
            >
              <Upload className="w-4 h-4" />
              Seleccionar archivo CSV (Strong o Hevy)
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvSelected(file);
                e.target.value = "";
              }}
            />

            {/* Previsualización del CSV antes de importar */}
            {csvPreview && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-purple-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Vista previa de importación</span>
                  <span className="text-[10px] text-purple-400 font-bold uppercase bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    Formato Válido
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block uppercase">Sesiones</span>
                    <span className="font-mono font-black text-white text-base">{csvPreview.importedSessionsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block uppercase">Series</span>
                    <span className="font-mono font-black text-cyan-400 text-base">{csvPreview.importedSetsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block uppercase">Ejercicios</span>
                    <span className="font-mono font-black text-emerald-400 text-base">{csvPreview.recognizedExercises.length}</span>
                  </div>
                </div>

                {csvPreview.newPrs.length > 0 && (
                  <p className="text-[11px] text-amber-300 font-medium">
                    🏆 Se detectaron {csvPreview.newPrs.length} marcas personales (1RM) para actualizar en tu perfil.
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={confirmCsvImport}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all touch-target"
                  >
                    Confirmar e Importar
                  </button>
                  <button
                    onClick={() => setCsvPreview(null)}
                    className="px-3 py-2.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition-colors touch-target"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Reminder section */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {reminder.enabled ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-neutral-500" />}
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Recordatorio de entrenamiento</h4>
              </div>
              <button
                onClick={toggleReminder}
                className={`relative w-11 h-6 rounded-full transition-colors ${reminder.enabled ? "bg-emerald-600" : "bg-neutral-700"}`}
                aria-pressed={reminder.enabled}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${reminder.enabled ? "left-5" : "left-0.5"}`}
                />
              </button>
            </div>

            <div className={`grid grid-cols-2 gap-2 ${reminder.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="block">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Hora</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={reminder.hour}
                    onChange={(e) => setReminder((r) => ({ ...r, hour: Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)) }))}
                    className="w-1/2 px-2 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-center text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={reminder.minute}
                    onChange={(e) => setReminder((r) => ({ ...r, minute: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)) }))}
                    className="w-1/2 px-2 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-center text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Día</span>
                <select
                  value={reminder.dayIndex}
                  onChange={(e) => setReminder((r) => ({ ...r, dayIndex: parseInt(e.target.value, 10) }))}
                  className="w-full mt-1 px-2 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
            {reminder.enabled && (
              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Se mostrará una notificación local a la hora elegida.
              </p>
            )}
          </section>

          {/* Health Connect / Steps section */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Salud & Pasos (Health Connect)</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Conectá la app a Health Connect para leer tus pasos diarios y ajustar automáticamente la
              dieta según las reglas del plan (sin IA). Disponible en la versión instalada (APK de
              Capacitor/Capacitor Android).
            </p>
            <StepsPanel />
          </section>
        </div>
      </div>
    </div>
  );
};
