import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Detects a new version of the app (new service worker active / cache updated)
 * and shows a banner so the user can reload to see the latest build.
 */
export const UpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    // Fire when a new service worker takes control (i.e. on next reload).
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const onUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      onUpdate(registration);
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const reload = () => {
    // Skip waiting so the new SW activates, which triggers controllerchange → reload.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] px-4 w-full max-w-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-cyan-600 border border-cyan-500 shadow-2xl shadow-cyan-600/30">
        <p className="text-xs font-bold text-white">
          Hay una nueva versión disponible
        </p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-cyan-700 text-xs font-black hover:bg-cyan-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>
    </div>
  );
};
