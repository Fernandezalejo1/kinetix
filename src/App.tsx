import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { WorkoutProvider, useWorkout } from "./context/WorkoutContext";
import { GoalProvider } from "./context/GoalContext";
import { BackNavProvider, useBackNav, useBackHandler } from "./context/BackNavContext";
import { Navigation, NavTab } from "./components/Navigation";
import { LiveWorkoutLogger } from "./components/workout/LiveWorkoutLogger";
import { SettingsModal } from "./components/SettingsModal";
import { StepsEngine } from "./components/nutrition/StepsEngine";
import { HealthSyncEngine } from "./components/health/HealthSyncEngine";
import { OnboardingIntro } from "./components/OnboardingIntro";
import { StorageWarning } from "./components/StorageWarning";
import { PinLockScreen } from "./components/PinLockScreen";
import { VaultLockScreen } from "./components/VaultLockScreen";
import { createAutoBackup } from "./utils/backupService";
import { decidePopState, isNavTabId, popTabStack, pushTabStack, reconcileTabStack } from "./utils/tabStack";
import { isAppLocked, hasAppPin, lockAppIfNeeded } from "./utils/pinLock";
import { isVaultLocked, isVaultEnabled, initVaultSessionFromStorage } from "./utils/vault";

// Eagerly load the first screen (today hub) for instant display
import { TodayHub } from "./components/TodayHub";
// Eagerly load the workout hub too (core flow)
import { WorkoutHub } from "./components/workout/WorkoutHub";
// Ficha completa del ejercicio (icono {i} en Programas / Biomecánica / Análisis)
import { ExerciseDetailModal } from "./components/exercises/ExerciseDetailModal";

// Lazy load everything else — these become separate chunks
const ProgramsExplorer = React.lazy(() =>
  import("./components/programs/ProgramsExplorer").then((m) => ({ default: m.ProgramsExplorer }))
);
const BiomechanicsHub = React.lazy(() =>
  import("./components/exercises/BiomechanicsHub").then((m) => ({ default: m.BiomechanicsHub }))
);
const ScienceDashboard = React.lazy(() =>
  import("./components/analytics/ScienceDashboard").then((m) => ({ default: m.ScienceDashboard }))
);
const NutritionVisionHub = React.lazy(() =>
  import("./components/nutrition/NutritionVisionHub").then((m) => ({ default: m.NutritionVisionHub }))
);
const ChallengeHub = React.lazy(() =>
  import("./components/challenge/ChallengeHub").then((m) => ({ default: m.ChallengeHub }))
);
const GoalHub = React.lazy(() =>
  import("./components/goal/GoalHub").then((m) => ({ default: m.GoalHub }))
);

const TAB_ORDER: NavTab[] = ["hoy", "workout", "programs", "exercises", "analytics", "nutrition", "reto", "objetivo"];

/** Reads the PWA deep-link target (?tab=...) from the URL (manifest shortcuts). */
const getTabFromURL = (): NavTab => {
  if (typeof window === "undefined") return "hoy";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return (TAB_ORDER as readonly string[]).includes(tab ?? "")
    ? (tab as NavTab)
    : "hoy";
};

const IS_NATIVE = Capacitor.isNativePlatform();

/** Minimal loading skeleton shown while a chunk downloads */
const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24 animate-fadeIn" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cargando…</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>(getTabFromURL);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { selectedExerciseForDetail, setSelectedExerciseForDetail, isWorkoutModalOpen, setIsWorkoutModalOpen } = useWorkout();

  // Capa de "Atrás": registros de overlays + navegación de pestañas.
  const { consumeBack } = useBackNav();

  // Historial de pestañas visitadas (para "Atrás" de nivel pestaña). Se evitan
  // entradas duplicadas consecutivas; cada back consume UNA entrada, sin bucles.
  const tabStackRef = useRef<NavTab[]>([]);

  // Posiciones de scroll por pestaña, para conservarlas al volver con Atrás.
  const scrollPositionsRef = useRef<Partial<Record<NavTab, number>>>({});

  // Espejo sincrónico de la pestaña visible (los refs no esperan al render).
  // Se actualiza en cada commit (cubre popTab/Escape/popstate) y también en
  // navigateToTab antes del pushState para no duplicar entradas con toques rápidos.
  const currentTabRef = useRef<NavTab>(currentTab);
  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  const navigateToTab = useCallback(
    (tab: NavTab) => {
      if (tab === currentTabRef.current) return;
      currentTabRef.current = tab;
      if (!IS_NATIVE && typeof window !== "undefined") {
        // En web cada pestaña deja una entrada en el historial: el botón
        // Atrás del navegador recorre las pestañas en orden en vez de salir
        // de la app al segundo toque (ver utils/tabStack.ts).
        try {
          window.history.pushState({ kxTab: tab }, "");
        } catch {
          /* historial no disponible */
        }
      }
      setCurrentTab((prev) => {
        if (tab === prev) return prev;
        // Sin duplicados consecutivos en el historial de pestañas.
        tabStackRef.current = pushTabStack(tabStackRef.current, prev);
        scrollPositionsRef.current[prev] = window.scrollY;
        return tab;
      });
    },
    []
  );

  // Restaurar el scroll de la pestaña al volver a ella (dom-content ya listo).
  useEffect(() => {
    const saved = scrollPositionsRef.current[currentTab];
    window.requestAnimationFrame(() => {
      window.scrollTo(0, saved ?? 0);
    });
  }, [currentTab]);

  // Cierra la pestaña actual abierta, volviendo a la anterior (si existe).
  // Sin bucles: salta entradas iguales a la actual.
  const popTab = useCallback((): boolean => {
    const res = popTabStack(tabStackRef.current, currentTabRef.current);
    if (!res) return false;
    tabStackRef.current = res.stack;
    currentTabRef.current = res.previous;
    setCurrentTab(res.previous);
    return true;
  }, []);

  // Aplica la pestaña que dicta el historial del navegador y reconcilia el
  // stack interno con ella (varios Atrás consecutivos funcionan en orden).
  const applyHistoryTab = useCallback((tab: NavTab) => {
    tabStackRef.current = reconcileTabStack(tabStackRef.current, tab);
    currentTabRef.current = tab;
    setCurrentTab(tab);
  }, []);

  // Evita dobles retrocesos si se pulsa Escape dos veces antes de que llegue el popstate.
  const historyNavPendingRef = useRef(false);

  // Atajo de teclado Esc (web/desktop): cierra capas, luego pestañas.
  // En web el navegador manda (history.back + popstate) para no desincronizar
  // el historial; Escape nunca saca del sitio.
  const handleEscape = useCallback(() => {
    if (consumeBack()) return;
    if (IS_NATIVE) {
      popTab();
      return;
    }
    if (historyNavPendingRef.current) return;
    if (tabStackRef.current.length === 0) return;
    historyNavPendingRef.current = true;
    try {
      window.history.back();
    } catch {
      historyNavPendingRef.current = false;
    }
  }, [consumeBack, popTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  // Android nativo: botón Atrás gestionado por Capacitor (App plugin). El plugin
  // consume el evento cuando hay listener, así que somos responsables de toda la
  // navegación: teclado → overlays → pestañas → salida.
  const keyboardVisibleRef = useRef(false);

  useEffect(() => {
    if (!IS_NATIVE) return;
    const handles: Promise<PluginListenerHandle>[] = [
      Keyboard.addListener("keyboardDidShow", () => { keyboardVisibleRef.current = true; }),
      Keyboard.addListener("keyboardDidHide", () => { keyboardVisibleRef.current = false; }),
    ];
    return () => {
      handles.forEach((h) => void h.then((handle) => handle.remove()));
    };
  }, []);

  useEffect(() => {
    if (!IS_NATIVE) return;
    let active = true;
    const listener = CapApp.addListener("backButton", async () => {
      if (!active) return;
      // 1) Teclado visible: ocultarlo sin navegar (fallback; Android ya cierra
      // el teclado nativamente antes de llegar aquí en la mayoría de los casos).
      if (keyboardVisibleRef.current) {
        keyboardVisibleRef.current = false;
        try {
          await Keyboard.hide();
        } catch {
          /* plugin de teclado no disponible */
        }
        return;
      }
      // 2) Overlays (diálogos, fichas, menús) en orden inverso al apilado.
      if (consumeBack()) return;
      // 3) Pestañas: volver a la anterior conservando su estado.
      if (popTab()) return;
      // 4) Navegación interna agotada → comportamiento normal de salida.
      // La sesión activa persiste en localStorage: volver a la app la retoma.
      await CapApp.exitApp();
    });
    return () => {
      active = false;
      void listener.then((l) => l.remove());
    };
  }, [consumeBack, popTab]);

  // Capas globales de la app: la sesión activa NO se descarta con Atrás; solo
  // se colapsa al panel anterior (la pill verde del header permite reabrirla).
  useBackHandler(
    "workout-modal",
    isWorkoutModalOpen ? () => { setIsWorkoutModalOpen(false); return true; } : null,
    100
  );
  useBackHandler(
    "settings-modal",
    isSettingsOpen ? () => { setIsSettingsOpen(false); return true; } : null,
    100
  );
  // La ficha del ejercicio se auto-registra (ExerciseDetailModal): no se
  // duplica acá para no contar dos capas por un solo overlay.

  // Web/PWA: el botón Atrás del navegador se traduce a la misma navegación.
  // Mientras haya overlays registrados mantenemos una entrada de historial para
  // que el back del navegador los cierre; al vaciarse, se desenrosca la entrada.
  const webPhantomRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const { layerCount } = useBackNav();

  useEffect(() => {
    if (IS_NATIVE) return;
    const open = layerCount > 0;
    if (open && !webPhantomRef.current) {
      webPhantomRef.current = true;
      history.pushState({ kxOverlay: true }, "");
    } else if (!open && webPhantomRef.current && window.history.state && window.history.state.kxOverlay) {
      webPhantomRef.current = false;
      ignoreNextPopRef.current = true;
      window.history.back();
    }
  }, [layerCount]);

  // Sembrar la entrada inicial con la pestaña actual (incluye ?tab=... de
  // los atajos PWA): así el primer Atrás ya tiene una entrada nuestra.
  useEffect(() => {
    if (IS_NATIVE) return;
    try {
      window.history.replaceState({ kxTab: currentTabRef.current }, "");
    } catch {
      /* historial no disponible */
    }
  }, []);

  useEffect(() => {
    if (IS_NATIVE) return;
    const onPopState = (e: PopStateEvent) => {
      historyNavPendingRef.current = false;
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      const raw = (e.state ?? window.history.state) as { kxTab?: unknown } | null;
      const stateTab = isNavTabId(raw?.kxTab) ? raw.kxTab : null;
      const hadPhantom = webPhantomRef.current;
      let overlayConsumed = false;
      if (hadPhantom) {
        // El Atrás del navegador cierra primero el overlay abierto.
        webPhantomRef.current = false;
        overlayConsumed = consumeBack();
      }
      const decision = decidePopState({
        hadPhantom,
        overlayConsumed,
        stateTab,
        current: currentTabRef.current,
      });
      if (decision.action === "close-overlay") {
        if (decision.syncTab) applyHistoryTab(decision.syncTab);
        return;
      }
      if (decision.action === "goto-tab") {
        applyHistoryTab(decision.tab);
        return;
      }
      if (decision.action === "pop-internal") {
        popTab();
      }
      // ignore: la entrada destino ya es la visible; sin navegación interna
      // se deja que el navegador siga (o cierre la pestaña).
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [consumeBack, popTab, applyHistoryTab]);

  // Copia de seguridad automática (100% local, IndexedDB): revisa cada 15 min
  // si toca guardar un snapshot (cada 6h con datos), al volver a primer plano y
  // unos segundos después del arranque. Nunca bloquea ni molesta al usuario.
  useEffect(() => {
    const run = () => {
      void createAutoBackup(false);
    };
    const timer = window.setInterval(run, 15 * 60 * 1000);
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const bootTimer = window.setTimeout(run, 2500);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(bootTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Pestañas visitadas: se mantienen montadas (ocultas) para conservar filtros,
  // búsquedas, scroll y borradores al volver con Atrás o cambiar de pestaña.
  const [visitedTabs, setVisitedTabs] = useState<Set<NavTab>>(() => new Set([currentTab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(currentTab)) return prev;
      const next = new Set(prev);
      next.add(currentTab);
      return next;
    });
  }, [currentTab]);

  const panelClass = (tab: NavTab) => (currentTab === tab ? "block" : "hidden");

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-black">
      <Navigation
        currentTab={currentTab}
        onSelectTab={navigateToTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-20 md:pb-6">
        <div className={panelClass("hoy")}>
          <TodayHub
            onGoToWorkout={() => navigateToTab("workout")}
            onGoToPrograms={() => navigateToTab("programs")}
            onGoToBiomechanics={() => navigateToTab("exercises")}
            onGoToNutrition={() => navigateToTab("nutrition")}
          />
        </div>

        <div className={panelClass("workout")}>
          <WorkoutHub
            onGoToPrograms={() => navigateToTab("programs")}
            onGoToBiomechanics={() => navigateToTab("exercises")}
          />
        </div>

        <Suspense fallback={<TabLoader />}>
          {visitedTabs.has("programs") && (
            <div className={panelClass("programs")}>
              <ProgramsExplorer />
            </div>
          )}
          {visitedTabs.has("exercises") && (
            <div className={panelClass("exercises")}>
              <BiomechanicsHub />
            </div>
          )}
          {visitedTabs.has("analytics") && (
            <div className={panelClass("analytics")}>
              <ScienceDashboard />
            </div>
          )}
          {visitedTabs.has("nutrition") && (
            <div className={panelClass("nutrition")}>
              <NutritionVisionHub />
            </div>
          )}
          {visitedTabs.has("reto") && (
            <div className={panelClass("reto")}>
              <ChallengeHub />
            </div>
          )}
          {visitedTabs.has("objetivo") && (
            <div className={panelClass("objetivo")}>
              <GoalHub onGoToPrograms={() => navigateToTab("programs")} />
            </div>
          )}
        </Suspense>
      </main>

      <LiveWorkoutLogger onGoToAnalytics={() => navigateToTab("analytics")} />

      {/* SettingsModal stays mounted so the workout reminder keeps active while closed */}
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Ficha del ejercicio: icono {i} desde Programas, Biomecánica y Análisis */}
      {selectedExerciseForDetail && (
        <ExerciseDetailModal
          exercise={selectedExerciseForDetail}
          onClose={() => setSelectedExerciseForDetail(null)}
        />
      )}

      {/* Primer-uso: mini tutorial de RIR / tempo / sobrecarga (una sola vez) */}
      <OnboardingIntro />

      {/* Aviso global si falla el guardado (cuota agotada) */}
      <StorageWarning />

    </div>
  );
};

function AppWithPin() {
  const [locked, setLocked] = useState<boolean>(() => isAppLocked() && hasAppPin());
  // P4 Vault v2: el boot intenta re-hidratar la sesión desde sessionStorage
  // (sin contraseña). Si no hay secreto de pestaña → bloqueado (gate).
  const [vaultLocked, setVaultLocked] = useState<boolean>(() => {
    try {
      return isVaultLocked();
    } catch {
      return false;
    }
  });
  const [vaultBootDone, setVaultBootDone] = useState<boolean>(() => {
    try {
      return !isVaultEnabled();
    } catch {
      return true;
    }
  });
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    let alive = true;
    void initVaultSessionFromStorage().then((unlocked) => {
      if (!alive) return;
      setVaultLocked(!unlocked);
      setVaultBootDone(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.hidden && !lockedRef.current) {
        // Bloqueo automático al oscurecer/minimizar (si lo habilita el usuario).
        if (lockAppIfNeeded()) setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const handleUnlocked = useCallback(() => {
    setLocked(false);
  }, []);

  const showVaultGate = isVaultEnabled() && (vaultLocked || !vaultBootDone);

  if (showVaultGate) {
    // Antes del boot del vault los providers NO montan: evita que hidraten
    // fallback y sobrescriban los datos descifrados reales.
    return <VaultLockScreen onUnlocked={() => setVaultLocked(false)} />;
  }

  return (
    <>
      <AppContent />
      {locked && <PinLockScreen onUnlocked={handleUnlocked} />}
    </>
  );
}

export default function App() {
  return (
    <WorkoutProvider>
      <GoalProvider>
        <BackNavProvider>
          <StepsEngine />
          <HealthSyncEngine />
          <AppWithPin />
        </BackNavProvider>
      </GoalProvider>
    </WorkoutProvider>
  );
}