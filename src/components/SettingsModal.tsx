import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Check,
  Download,
  Upload,
  Bell,
  BellOff,
  ShieldAlert,
  ShieldCheck,
  Database,
  Footprints,
  FileText,
  Lock,
  Trash2,
} from "lucide-react";
import { StepsPanel } from "./nutrition/StepsPanel";
import { useToast } from "../context/ToastContext";
import { useWorkout } from "../context/WorkoutContext";
import { parseWorkoutCsv, ImportResult } from "../utils/csvImporter";
import { VALIDATORS, isArray, isPlainObject } from "../utils/storage";
import { localDateKey } from "../utils/dateUtils";
import {
  nativeRemindersAvailable,
  scheduleNativeReminder,
  cancelNativeReminder,
} from "../utils/reminderNotifications";
import { encryptJson, decryptBackup, isEncryptedBackup, EncryptedBackup } from "../utils/encryption";
import {
  createAutoBackup,
  collectFullState,
  replaceFullState,
  listAutoBackups,
  restoreAutoBackup,
  EXCLUDED_BACKUP_KEYS,
} from "../utils/backupService";
import { AutoBackupMeta, idbBackupDelete } from "../utils/indexedDb";
import {
  hasAppPin,
  setAppPin,
  changeAppPin,
  removeAppPin,
  verifyAppPin,
  isAutoLockOn,
  setAutoLockOn,
  PIN_LENGTH,
  isValidPin,
} from "../utils/pinLock";
import {
  VAULT_MIN_PASSWORD,
  changeVaultPassword,
  disableVault,
  enableVault,
  isVaultEnabled,
  isVaultUnlocked,
  lockVault,
} from "../utils/vault";
import { RETENTION_POLICY } from "../context/workoutData";
import { FocusTrap } from "./FocusTrap";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const REMINDER_KEY = "kinetix_reminder";
const EXCLUDED_KEYS = EXCLUDED_BACKUP_KEYS;

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
  const [encryptedPending, setEncryptedPending] = useState<EncryptedBackup | null>(null);
  const [passDialog, setPassDialog] = useState<"encrypt" | "decrypt" | null>(null);
  const [passValue, setPassValue] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipeTyped, setWipeTyped] = useState("");
  const [autoBackups, setAutoBackups] = useState<AutoBackupMeta[]>([]);
  const [autoBackupBusy, setAutoBackupBusy] = useState(false);
  const [pinMode, setPinMode] = useState<"setup" | "change" | "remove" | null>(null);
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinInput2, setPinInput2] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinEnabled, setPinEnabled] = useState<boolean>(() => hasAppPin());
  const [autoLockOn, setAutoLockOnState] = useState<boolean>(() => isAutoLockOn());
  // P4 Vault (cifrado en reposo).
  const [vaultOn, setVaultOn] = useState<boolean>(() => {
    try {
      return isVaultEnabled();
    } catch {
      return false;
    }
  });
  const [vaultMode, setVaultMode] = useState<"setup" | "lock" | "disable" | "change" | null>(null);
  const [vaultCurrent, setVaultCurrent] = useState("");
  const [vaultInput, setVaultInput] = useState("");
  const [vaultInput2, setVaultInput2] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);
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

  // Listener de recorte de retención: informa al usuario cuando se
  // descartan entradas antiguas (la política es visible más abajo).
  useEffect(() => {
    const handler = (e: Event) => {
      const { key, dropped } = (e as CustomEvent).detail ?? {};
      const label = key?.includes("nutrition")
        ? "días de nutrición"
        : key?.includes("exercise")
        ? "registros de ejercicios"
        : key?.includes("body")
        ? "mediciones corporales"
        : "entrenamientos";
      showToast(
        `Historial recortado: se descartaron ${dropped} ${label} antiguos por capacidad del dispositivo.`,
        "info"
      );
    };
    window.addEventListener("kinetix-retention-trim", handler);
    return () => window.removeEventListener("kinetix-retention-trim", handler);
  }, [showToast]);

  // Lista de copias automáticas (IndexedDB) al abrir Configuración.
  useEffect(() => {
    if (!open) return;
    let active = true;
    void listAutoBackups().then((list) => {
      if (active && isMounted.current) setAutoBackups(list);
    });
    return () => {
      active = false;
    };
  }, [open]);

  const handleCreateAutoBackup = async () => {
    setAutoBackupBusy(true);
    const created = await createAutoBackup(true);
    setAutoBackupBusy(false);
    if (created) showToast("Copia creada. Solo vive en este dispositivo.", "success");
    else showToast("No se pudo crear la copia. Comprobá el almacenamiento del dispositivo.", "error");
    const list = await listAutoBackups();
    if (isMounted.current) setAutoBackups(list);
  };

  const handleRestoreAutoBackup = async (id: number) => {
    const data = await restoreAutoBackup(id);
    if (!data) {
      showToast("No se pudo leer la copia", "error");
      return;
    }
    if (!window.confirm("Se reemplazarán TODOS tus datos actuales con los de la copia automática seleccionada. ¿Continuar?")) return;
    applyBackup({ data });
  };

  const handleDeleteAutoBackup = async (id: number) => {
    if (!window.confirm("¿Eliminar esta copia automática? Se borra de este dispositivo de forma permanente.")) return;
    await idbBackupDelete(id);
    const list = await listAutoBackups();
    if (isMounted.current) setAutoBackups(list);
    showToast("Copia eliminada", "info");
  };

  const handleClearAutoBackups = async () => {
    if (autoBackups.length === 0) return;
    if (!window.confirm(`¿Eliminar las ${autoBackups.length} copias automáticas guardadas? No se puede deshacer.`)) return;
    setAutoBackupBusy(true);
    for (const b of autoBackups) await idbBackupDelete(b.id);
    setAutoBackupBusy(false);
    const list = await listAutoBackups();
    if (isMounted.current) setAutoBackups(list);
    showToast("Copias automáticas eliminadas", "info");
  };

  const formatBackupDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("es")} ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const resetPinDialog = () => {
    setPinMode(null);
    setPinCurrent("");
    setPinInput("");
    setPinInput2("");
  };

  // P4 Vault: los flujos recargan la app (ver vault.ts), así que tras el
  // éxito no hace falta actualizar estado local.
  const resetVaultDialog = () => {
    setVaultMode(null);
    setVaultCurrent("");
    setVaultInput("");
    setVaultInput2("");
  };

  const checkVaultInputs = (needCurrent: boolean, needNew: boolean): boolean => {
    if (needCurrent && vaultCurrent.length === 0) {
      showToast("Ingresá la contraseña actual del vault", "error");
      return false;
    }
    if (needNew) {
      if (vaultInput.length < VAULT_MIN_PASSWORD || vaultInput2.length < VAULT_MIN_PASSWORD) {
        showToast(`La contraseña necesita al menos ${VAULT_MIN_PASSWORD} caracteres`, "error");
        return false;
      }
      if (vaultInput !== vaultInput2) {
        showToast("Las contraseñas no coinciden", "error");
        return false;
      }
    }
    return true;
  };

  const confirmVaultSetup = async () => {
    if (!checkVaultInputs(false, true)) return;
    setVaultBusy(true);
    try {
      await enableVault(vaultInput);
      showToast("Vault habilitado. Datos cifrados en reposo.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo habilitar el vault", "error");
      setVaultBusy(false);
    }
  };

  const confirmVaultLock = async () => {
    setVaultBusy(true);
    try {
      await lockVault();
      showToast("Vault bloqueado. En disco queda solo cifrado.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo bloquear", "error");
      setVaultBusy(false);
    }
  };

  const confirmVaultDisable = async () => {
    if (!checkVaultInputs(true, false)) return;
    if (!window.confirm("¿Desactivar el cifrado en reposo? Tus datos quedarán en claro en este dispositivo.")) return;
    setVaultBusy(true);
    try {
      await disableVault(vaultCurrent);
      showToast("Vault desactivado.", "info");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo desactivar", "error");
      setVaultBusy(false);
    }
  };

  const confirmVaultChange = async () => {
    if (!checkVaultInputs(true, true)) return;
    setVaultBusy(true);
    try {
      await changeVaultPassword(vaultCurrent, vaultInput);
      showToast("Contraseña del vault actualizada.", "success");
      resetVaultDialog();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cambiar", "error");
    } finally {
      setVaultBusy(false);
    }
  };

  const confirmPinSetup = async () => {
    if (!isValidPin(pinInput) || !isValidPin(pinInput2)) {
      showToast(`El PIN debe tener exactamente ${PIN_LENGTH} dígitos`, "error");
      return;
    }
    if (pinInput !== pinInput2) {
      showToast("Los PIN no coinciden", "error");
      return;
    }
    setPinBusy(true);
    const ok = await setAppPin(pinInput);
    setPinBusy(false);
    if (ok) {
      setPinEnabled(true);
      showToast("PIN configurado. La app se bloqueará al cerrarla.", "success");
      resetPinDialog();
    } else {
      showToast("No se pudo guardar el PIN (almacenamiento no disponible)", "error");
    }
  };

  const confirmPinChange = async () => {
    if (!isValidPin(pinInput) || !isValidPin(pinInput2) || pinInput !== pinInput2) {
      showToast("El PIN nuevo debe ser de 4 dígitos y coincidir en ambos campos", "error");
      return;
    }
    setPinBusy(true);
    const ok = await changeAppPin(pinCurrent, pinInput);
    setPinBusy(false);
    if (ok) {
      showToast("PIN actualizado", "success");
      resetPinDialog();
    } else {
      showToast("El PIN actual es incorrecto", "error");
    }
  };

  const confirmPinRemove = async () => {
    setPinBusy(true);
    const ok = await verifyAppPin(pinCurrent);
    setPinBusy(false);
    if (!ok) {
      showToast("El PIN actual es incorrecto", "error");
      return;
    }
    removeAppPin();
    setPinEnabled(false);
    showToast("PIN eliminado. La app ya no se bloquea.", "info");
    resetPinDialog();
  };

  const toggleAutoLock = () => {
    const next = !autoLockOn;
    setAutoLockOn(next);
    setAutoLockOnState(next);
    showToast(next ? "Se bloqueará al minimizar o cerrar la app" : "Ya no se bloqueará al minimizar la app", "info");
  };

  const exportData = async (cipherOpts?: { password?: string }) => {
    let data: Record<string, unknown>;
    try { data = await collectFullState(); }
    catch { showToast("No se pudo leer el historial completo para exportar", "error"); return; }
    const payload = {
      app: "KINETIX",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    if (cipherOpts?.password) {
      encryptJson(payload, cipherOpts.password)
        .then((enc) => {
          const blob = new Blob([JSON.stringify(enc, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `kinetix-backup-cifrado-${localDateKey()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast("Backup cifrado exportado. No olvides tu contraseña.", "success");
        })
        .catch(() => showToast("No se pudo cifrar el backup", "error"));
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinetix-backup-${localDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exportado correctamente", "success");
  };

  const IMPORT_VERSION = 1;
  const MAX_BACKUP_SIZE = 100 * 1024 * 1024; // complete long-term backups

  // Json-safe check para claves desconocidas del backup: solo estructuras
  // JSON serializables, nunca funciones/undefined/prototypes.
  const isJsonSafe = (v: unknown): boolean =>
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    isArray(v) ||
    isPlainObject(v);

  const parseBackupPayload = (pdf: unknown): { data: unknown } | null => {
    if (!pdf || (pdf as any).app !== "KINETIX" || (pdf as any).version !== IMPORT_VERSION) {
      showToast("El archivo no es un backup válido de KINETIX", "error");
      return null;
    }
    const data = (pdf as any)?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      showToast("El archivo no es un backup válido de KINETIX", "error");
      return null;
    }
    return { data };
  };

  /** Snapshot JSON-puro de las claves kinetix_ actuales (excluidas las
   *  reservadas), para poder restaurarlas si una restauración falla. */
  const applyBackup = async (parsed: { data: Record<string, unknown> }) => {
    if (!Object.keys(parsed.data).some(key => key.startsWith("kinetix_") && !EXCLUDED_KEYS.includes(key))) {
      showToast("El backup no contiene datos de KINETIX", "error"); return;
    }
    try {
      await replaceFullState(parsed.data);
      window.location.reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo restaurar el backup", "error");
    }
  };

  const confirmImport = (parsed: { data: Record<string, unknown> }) => {
    if (!window.confirm("Se reemplazarán TODOS tus datos actuales con los del backup. ¿Continuar?")) return;
    applyBackup(parsed);
  };

  const handleEncryptedPassphrase = (pass: string) => {
    if (!encryptedPending) return;
    decryptBackup<{ app: string; version: number; data: unknown }>(encryptedPending, pass)
      .then((pdf) => {
        setEncryptedPending(null);
        const parsed = parseBackupPayload(pdf);
        if (!parsed) return;
        if (!window.confirm("Se reemplazarán TODOS tus datos actuales con los del backup. ¿Continuar?")) return;
        applyBackup(parsed as { data: Record<string, unknown> });
      })
      .catch(() => {
        showToast("Contraseña incorrecta o backup dañado", "error");
        setEncryptedPending(null);
      });
  };

  const importFile = (file: File) => {
    if (file.size > MAX_BACKUP_SIZE) {
      showToast("El archivo es demasiado grande (máx. 100 MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let parsed0: unknown;
      try {
        parsed0 = JSON.parse(String(reader.result));
      } catch {
        showToast("Error al leer el backup", "error");
        return;
      }
      if (isEncryptedBackup(parsed0)) {
        setEncryptedPending(parsed0);
        setPassDialog("decrypt");
        setPassValue("");
        showToast("Backup cifrado detectado: escribí la contraseña para desbloquear", "info");
        return;
      }
      const parsed = parseBackupPayload(parsed0);
      if (!parsed) return;
      confirmImport(parsed as { data: Record<string, unknown> });
    };
    reader.readAsText(file);
  };

  const wipeAllData = async () => {
    try {
      await replaceFullState({}, true);
      window.location.reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudieron borrar los datos", "error");
    }
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
      // FIX (prioridad alta): en APK nativo se programa una NOTIFICACIÓN LOCAL
      // real que se dispara aunque la app esté cerrada. El fallback web
      // (interval) sigue funcionando solo en navegador.
      if (nativeRemindersAvailable()) {
        const next: ReminderConfig = { ...reminder, enabled: true };
        const ok = await scheduleNativeReminder(next);
        if (!ok) {
          showToast("No se pudo programar la notificación (¿permiso denegado?)", "error");
          return;
        }
        setReminder(next);
        showToast("Recordatorio semanal programado (funciona con la app cerrada)", "success");
        return;
      }
      const { granted } = await requestNotification();
      if (!granted) {
        showToast("Permití las notificaciones para activar el recordatorio", "info");
        return;
      }
      setReminder((r) => ({ ...r, enabled: true }));
      showToast("Recordatorio activado (funciona con la app abierta)", "success");
    } else {
      if (nativeRemindersAvailable()) {
        await cancelNativeReminder();
      }
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
    <FocusTrap>
      <div
        className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración"
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain scrollbar-thin shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-5 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Configuración</h3>
          <button onClick={onClose} aria-label="Cerrar configuración" className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Privacidad: qué se guarda, dónde y qué pasa si se pierde */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Privacidad & almacenamiento</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              KINETIX es <strong className="text-neutral-200">100% local y offline</strong>: no hay servidores ni
              telemetría, y nada sale de este dispositivo.
            </p>
            <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-3.5 space-y-2 text-[11px] text-neutral-400">
              <p className="text-[10px] font-black text-neutral-300 uppercase tracking-wider">En este dispositivo guardamos</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Historial de entrenamientos, series, RIR/RPE y volumen</li>
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Marcas personales (PR) y progresión de pesos</li>
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Peso corporal y medidas</li>
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Nutrición: comidas, agua, objetivos y macros</li>
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Sueño, readiness y cardio</li>
                <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Tu perfil y preferencias (unidad, sonido, plan, recordatorio)</li>
              </ul>
              <p className="text-[10px] text-neutral-500 leading-relaxed pt-1">
                Los permisos de Health Connect (pasos/sueño/peso) se piden por separado y solo se leen cuando vos los
                otorgás; podés revocarlos en cualquier momento desde los ajustes del sistema.
              </p>
            </div>
            <p className="text-[10px] text-amber-400/90 leading-relaxed flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Si borrás los datos del navegador, desinstalás la app o se daña el dispositivo, estos datos se pierden.
              Exportá un backup periódicamente (sección siguiente) y guardalo en un lugar seguro.
            </p>
          </section>

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
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              El historial completo se conserva en un archivo local y se incluye en tus backups.
              La app mantiene una copia reciente para abrir más rápido; los registros antiguos siguen guardados.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => exportData()}
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
            <button
              onClick={() => {
                setPassDialog("encrypt");
                setPassValue("");
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-colors touch-target"
            >
              <Lock className="w-4 h-4" />
              Exportar datos cifrado (con contraseña)
            </button>
            <button
              onClick={handleCreateAutoBackup}
              disabled={autoBackupBusy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-colors touch-target disabled:opacity-40 disabled:pointer-events-none"
            >
              <Database className="w-4 h-4" />
              {autoBackupBusy ? "Creando copia…" : "Crear copia de seguridad ahora"}
            </button>
            <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-3 space-y-2">
              <p className="text-[10px] font-black text-neutral-300 uppercase tracking-wider">Copias automáticas (en este dispositivo)</p>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Cada 6 horas con datos se guarda una copia completa en este dispositivo (hasta {autoBackups.length || 24} copias, se conservan las más recientes). No usan nube.
              </p>
              {autoBackups.length === 0 ? (
                <p className="text-[10px] text-neutral-600">Todavía no hay copias automáticas.</p>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                  {autoBackups.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <span className="text-[10px] text-neutral-300 font-medium">
                        {formatBackupDate(b.createdAt)}
                        <span className="block text-neutral-500 font-normal">{b.entries} claves · copia Nº {b.id}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRestoreAutoBackup(b.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition-colors"
                        >
                          Restaurar
                        </button>
                        <button
                          onClick={() => handleDeleteAutoBackup(b.id)}
                          aria-label={`Eliminar copia ${b.id}`}
                          className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-300 text-[10px] border border-red-500/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {autoBackups.length > 0 && (
                <button
                  onClick={handleClearAutoBackups}
                  disabled={autoBackupBusy}
                  className="w-full py-2 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-300 text-[10px] font-bold border border-red-500/30 transition-colors disabled:opacity-40"
                >
                  Vaciar todas las copias
                </button>
              )}
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
                {nativeRemindersAvailable()
                  ? "Notificación programada en el sistema: se muestra aunque la app esté cerrada."
                  : "Se mostrará una notificación local a la hora elegida (con la app abierta)."}
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

          {/* Bloqueo con PIN */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Bloqueo con PIN</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Bloqueá la app con un PIN de {PIN_LENGTH} dígitos. Se guarda solo como hash (PBKDF2) en este dispositivo y
              nunca entra en los backups ni se exporta. Después de {5} intentos fallidos se bloquea por 30 segundos.
            </p>

            {!pinEnabled ? (
              <button
                onClick={() => setPinMode("setup")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors touch-target"
              >
                <Lock className="w-4 h-4" />
                Crear PIN de bloqueo
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-[11px] font-black text-emerald-300 uppercase">PIN activo</span>
                  <span className="text-[10px] text-neutral-500">La app está protegida</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPinMode("change")}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-xs font-bold border border-neutral-700 transition-colors touch-target"
                  >
                    Cambiar PIN
                  </button>
                  <button
                    onClick={() => setPinMode("remove")}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-300 text-xs font-bold border border-neutral-700 transition-colors touch-target"
                  >
                    Eliminar PIN
                  </button>
                </div>
                <button
                  onClick={toggleAutoLock}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 transition-colors"
                >
                  <span className="text-[11px] font-bold text-neutral-300">Bloquear al minimizar o cerrar la app</span>
                  <span
                    className={`relative w-11 h-6 rounded-full transition-colors ${autoLockOn ? "bg-emerald-600" : "bg-neutral-700"}`}
                    aria-pressed={autoLockOn}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${autoLockOn ? "left-5" : "left-0.5"}`}
                    />
                  </span>
                </button>
              </div>
            )}

            {pinMode && (
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 animate-fadeIn">
                <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                  {pinMode === "setup" ? "Crear PIN" : pinMode === "change" ? "Cambiar PIN" : "Eliminar PIN"}
                </p>
                {pinMode !== "setup" && (
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={PIN_LENGTH}
                    value={pinCurrent}
                    onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, ""))}
                    placeholder={`PIN actual (${PIN_LENGTH} dígitos)`}
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 text-center"
                  />
                )}
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="PIN nuevo (4 dígitos)"
                  autoComplete="off"
                  disabled={pinMode === "remove"}
                  className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 text-center disabled:opacity-40"
                />
                {pinMode !== "remove" && (
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={PIN_LENGTH}
                    value={pinInput2}
                    onChange={(e) => setPinInput2(e.target.value.replace(/\D/g, ""))}
                    placeholder="Confirmar PIN nuevo"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 text-center"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={resetPinDialog}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors touch-target"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={
                      pinMode === "setup"
                        ? confirmPinSetup
                        : pinMode === "change"
                          ? confirmPinChange
                          : confirmPinRemove
                    }
                    disabled={pinBusy}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-black transition-colors touch-target"
                  >
                    {pinBusy ? "Verificando…" : "Confirmar"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* P4 Vault: cifrado en reposo */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Vault · Cifrado en reposo</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Cifra tu historial, peso y nutrición con AES-GCM (PBKDF2) en este dispositivo. Con el vault bloqueado,
              ni el archivo local ni las copias guardan texto plano. Sin la contraseña no hay recuperación posible.
              Mientras el vault esté activo, el archivo de largo plazo y las copias automáticas se pausan (el respaldo
              es la exportación manual cifrada).
            </p>

            {!vaultOn ? (
              <button
                onClick={() => setVaultMode("setup")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 text-xs font-bold border border-violet-500/30 transition-colors touch-target"
              >
                <ShieldCheck className="w-4 h-4" />
                Habilitar cifrado en reposo
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-950/30 border border-violet-500/30">
                  <span className="text-[11px] font-black text-violet-300 uppercase">Vault activo</span>
                  <span className="text-[10px] text-neutral-500">
                    {isVaultUnlocked() ? "Desbloqueado en esta pestaña" : "Bloqueado"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setVaultMode("lock")}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-violet-300 text-xs font-bold border border-neutral-700 transition-colors touch-target"
                  >
                    Bloquear
                  </button>
                  <button
                    onClick={() => setVaultMode("change")}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-violet-300 text-xs font-bold border border-neutral-700 transition-colors touch-target"
                  >
                    Cambiar clave
                  </button>
                  <button
                    onClick={() => setVaultMode("disable")}
                    className="py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-300 text-xs font-bold border border-neutral-700 transition-colors touch-target"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            )}

            {vaultMode && (
              <div className="space-y-3 p-4 rounded-2xl bg-neutral-950 border border-violet-500/30 animate-fadeIn">
                <p className="text-[11px] font-black text-violet-300 uppercase tracking-wider">
                  {vaultMode === "setup" ? "Habilitar vault" : vaultMode === "lock" ? "Bloquear ahora" : vaultMode === "disable" ? "Desactivar vault" : "Cambiar contraseña"}
                </p>
                {(vaultMode === "lock" || vaultMode === "disable" || vaultMode === "change") && (
                  <input
                    type="password"
                    value={vaultCurrent}
                    onChange={(e) => setVaultCurrent(e.target.value)}
                    placeholder="Contraseña actual del vault"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 text-center"
                  />
                )}
                {(vaultMode === "setup" || vaultMode === "change") && (
                  <>
                    <input
                      type="password"
                      value={vaultInput}
                      onChange={(e) => setVaultInput(e.target.value)}
                      placeholder={`Nueva contraseña (mín ${VAULT_MIN_PASSWORD} caracteres)`}
                      autoComplete="off"
                      className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 text-center"
                    />
                    <input
                      type="password"
                      value={vaultInput2}
                      onChange={(e) => setVaultInput2(e.target.value)}
                      placeholder="Confirmar contraseña"
                      autoComplete="off"
                      className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500 text-center"
                    />
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={resetVaultDialog}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors touch-target"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={
                      vaultMode === "setup"
                        ? confirmVaultSetup
                        : vaultMode === "lock"
                          ? confirmVaultLock
                          : vaultMode === "disable"
                            ? confirmVaultDisable
                            : confirmVaultChange
                    }
                    disabled={vaultBusy}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-black transition-colors touch-target"
                  >
                    {vaultBusy ? "Procesando…" : "Confirmar"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Peligro: borrar todos los datos */}
          <section className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-black text-white uppercase tracking-wider text-red-400">Zona de riesgo</h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Borra TODO el historial de entrenamiento, PRs, nutrición, métricas y preferencias guardadas en este
              dispositivo. Esta acción no se puede deshacer.
            </p>
            {!confirmWipe ? (
              <button
                onClick={() => {
                  setConfirmWipe(true);
                  setWipeTyped("");
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-bold border border-red-500/40 transition-colors touch-target"
              >
                <Trash2 className="w-4 h-4" />
                Borrar todos los datos
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-red-950/30 border border-red-500/40 animate-fadeIn">
                <p className="text-xs text-red-200 font-bold">
                  Confirmá escribiendo <span className="font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700">BORRAR</span>
                </p>
                <input
                  type="text"
                  value={wipeTyped}
                  onChange={(e) => setWipeTyped(e.target.value)}
                  placeholder="Escribí BORRAR"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white text-center focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmWipe(false)}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors touch-target"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={wipeAllData}
                    disabled={wipeTyped.trim().toUpperCase() !== "BORRAR"}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black transition-colors touch-target"
                  >
                    Borrar todo
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Diálogo de contraseña para exportar/importar cifrado */}
      {passDialog && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPassDialog(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label={passDialog === "encrypt" ? "Exportar backup cifrado" : "Desbloquear backup cifrado"}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-slideUp"
            onSubmit={(e) => {
              e.preventDefault();
              if (passDialog === "encrypt") {
                if (!passValue || passValue.length < 6) {
                  showToast("La contraseña debe tener al menos 6 caracteres", "error");
                  return;
                }
                exportData({ password: passValue });
                setPassDialog(null);
                setPassValue("");
              } else if (encryptedPending) {
                handleEncryptedPassphrase(passValue);
                setPassValue("");
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {passDialog === "encrypt" ? (
                <Lock className="w-5 h-5 text-cyan-400" />
              ) : (
                <Upload className="w-5 h-5 text-cyan-400" />
              )}
              <h4 className="text-base font-black text-white">
                {passDialog === "encrypt" ? "Cifrar backup" : "Desbloquear backup"}
              </h4>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {passDialog === "encrypt"
                ? "Tu backup se cifra con AES-256 en este dispositivo. Guardá bien la contraseña: sin ella no hay forma de recuperar los datos."
                : "Escribí la contraseña que usaste al exportar. Sin ella no se pueden recuperar los datos."}
            </p>
            <input
              type="password"
              value={passValue}
              onChange={(e) => setPassValue(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              className="w-full px-3 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white text-center focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPassDialog(null);
                  setEncryptedPending(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors touch-target"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-colors touch-target"
              >
                {passDialog === "encrypt" ? "Exportar cifrado" : "Desbloquear"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </FocusTrap>
  );
};
