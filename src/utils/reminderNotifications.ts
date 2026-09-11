// =============================================================
// KINETIX — Recordatorios de entrenamiento.
//
// FIX (prioridad alta): antes el recordatorio era un setInterval de
// JavaScript que solo disparaba si la app estaba ABIERTA en la hora
// programada. En Android la app suspendida/serrada no dispara nada.
//
// Ahora:
//   - NATIVO (APK): programa notificaciones locales reales vía
//     @capacitor/local-notifications (sobreviven al cierre de la app).
//   - WEB/PWA: fallback al comportamiento anterior (interval + Notification API)
//     gestionado por SettingsModal, dejado intacto.
// =============================================================

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativePlatform } from "./healthConnect";

const REMINDER_NOTIFICATION_ID = 4711; // id estable: se reprograma/reemplaza
const DAY_INDEX_TO_ANDROID: Record<number, number> = {
  // dayIndex: 0 = Lunes ... 6 = Domingo (convención de la app)
  // Calendar: SUNDAY=1, MONDAY=2, ... SATURDAY=7
  0: 2, // Lunes
  1: 3, // Martes
  2: 4, // Miércoles
  3: 5, // Jueves
  4: 6, // Viernes
  5: 7, // Sábado
  6: 1, // Domingo
};

export interface ReminderSchedule {
  /** 0 = Lunes ... 6 = Domingo */
  dayIndex: number;
  hour: number;
  minute: number;
}

export function nativeRemindersAvailable(): boolean {
  return isNativePlatform();
}

/** Pide permiso de notificaciones (nativo). Devuelve true si fue concedido. */
export async function requestNativeReminderPermission(): Promise<boolean> {
  if (!nativeRemindersAvailable()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      return req.display === "granted";
    }
    return true;
  } catch {
    return false;
  }
}

/** Cancela el recordatorio programado (nativo). */
export async function cancelNativeReminder(): Promise<void> {
  if (!nativeRemindersAvailable()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });
  } catch {
    /* noop */
  }
}

/**
 * Programa (o reprograma) el recordatorio semanal como notificación local
 * de Android. Se dispara aunque la app esté cerrada.
 */
export async function scheduleNativeReminder(cfg: ReminderSchedule, routineName = ""): Promise<boolean> {
  if (!nativeRemindersAvailable()) return false;
  try {
    await cancelNativeReminder();

    const androidDay = DAY_INDEX_TO_ANDROID[cfg.dayIndex] ?? 2;
    const granted = await requestNativeReminderPermission();
    if (!granted) return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_NOTIFICATION_ID,
          title: "KINETIX — ¡Hora de entrenar! 💪",
          body: routineName
            ? `Tu rutina «${routineName}» te espera. ¡A darle!`
            : "Tu rutina programada para hoy te espera. ¡A darle!",
          schedule: {
            on: { weekday: androidDay, hour: cfg.hour, minute: cfg.minute },
            allowWhileIdle: true,
          },
          sound: "default",
          smallIcon: "ic_launcher",
          ongoing: false,
          autoCancel: true,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** ¿Está la app corriendo como APK nativo? (helper semántico) */
export function isAndroidApp(): boolean {
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}
