import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const ID = 4712;
let queue: Promise<void> = Promise.resolve();
let revision = 0;
let permissionPrompted = false;
/** Serialize cancellation/scheduling so a rapid adjustment cannot restore an older alarm. */
export function syncRestNotification(endAt: number | null, exerciseName: string, sound: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  const requestedRevision = ++revision;
  queue = queue.catch(() => {}).then(async () => {
    if (requestedRevision !== revision) return;
    await LocalNotifications.cancel({ notifications: [{ id: ID }] });
    if (!endAt || endAt <= Date.now() || requestedRevision !== revision) return;
    let permission = await LocalNotifications.checkPermissions();
    // Fresh install: nobody tapped "Habilitar avisos" yet. Ask ONCE (first rest
    // of this app lifetime) so lock-screen alerts actually work in the gym;
    // afterwards the manual button in session settings remains the fallback.
    if (permission.display !== "granted" && !permissionPrompted) {
      permissionPrompted = true;
      try {
        permission = await LocalNotifications.requestPermissions();
      } catch { /* user dismissed: in-app timer + sound remain */ }
    }
    if (permission.display !== "granted") return;
    const channelId = sound ? "workout-rest" : "workout-rest-silent";
    if (Capacitor.getPlatform() === "android") await LocalNotifications.createChannel({
      id: channelId, name: sound ? "Descanso de entrenamiento" : "Descanso sin sonido",
      importance: sound ? 4 : 2, vibration: true, sound: sound ? "default" : undefined,
    });
    if (requestedRevision !== revision || endAt <= Date.now()) return;
    await LocalNotifications.schedule({ notifications: [{ id: ID,
      title: "Descanso terminado", body: exerciseName ? `Podés continuar con ${exerciseName}.` : "Tu próxima serie está lista.",
      channelId, schedule: { at: new Date(endAt), allowWhileIdle: true },
      sound: sound ? "default" : undefined, autoCancel: true,
    }] });
  }).catch(() => { /* The in-app timer remains available if Android rejects scheduling. */ });
  return queue;
}
