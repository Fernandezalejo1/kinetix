import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Detects a new version of the app (new service worker installed/waiting)
 * and shows a banner so the user can reload to see the latest build.
 *
 * The service worker does NOT call skipWaiting() on install (see sw.js), so it
 * reliably transitions to "installed"/"waiting", which we detect here. Only a
 * tap on "Actualizar" triggers skipWaiting → controllerchange → reload.
 */
export const UpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let waitingWorker: ServiceWorker | null = null;

    // Reload exactly once when the new SW (sent SKIP_WAITING) takes control.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    });

    const promptIfWaiting = () => {
      if (navigator.serviceWorker.controller && waitingWorker) {
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      // If a new SW is already installed/waiting, prompt immediately.
      waitingWorker = registration.waiting;
      promptIfWaiting();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        waitingWorker = newWorker;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            // If the current page is controlled, wait for the SW to be waiting.
            if (registration.waiting) waitingWorker = registration.waiting;
            promptIfWaiting();
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", () => {});
    };
  }, []);

  const reload = () => {
    // Ask the WAITING service worker (the new version) to skipWaiting so it
    // activates, which fires controllerchange → reloads once. We must message
    // the *waiting* worker, not the currently active (old) controller.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
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
