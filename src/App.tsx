import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { WorkoutProvider, useWorkout } from "./context/WorkoutContext";
import { GoalProvider } from "./context/GoalContext";
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

  // Contador de entradas "fantasma" en el historial: cada vez que se abre un
  // modal se hace pushState. Si el modal se cierra con su botón propio (no con
  // back), esa entrada queda huérfana en el historial y el back posterior la
  // salta como navegación fantasma. Este ref perm ite limpiarla al cerrar.
  // `dismissPhantomRef` marca que el próximo popstate es NUESTRO back() de
  // limpieza (no un back real del usuario): el handler lo ignora.
  const pendingPhantomRef = useRef(false);
  const dismissPhantomRef = useRef(false);

  const handleBack = useCallback(() => {
    if (selectedExerciseForDetail) {
      setSelectedExerciseForDetail(null);
      return true;
    }
    if (isWorkoutModalOpen) {
      setIsWorkoutModalOpen(false);
      return true;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }
    return false;
  }, [selectedExerciseForDetail, isWorkoutModalOpen, isSettingsOpen, setSelectedExerciseForDetail, setIsWorkoutModalOpen]);

  // Push a history entry when a modal opens so Android back button closes it.
  // Cuando el modal se cierra por su propio botón (X/Escape/submit), desenrosca
  // la entrada fantasma para que el back posterior no navegue a ningún lado.
  useEffect(() => {
    const hasModalOpen = !!(selectedExerciseForDetail || isWorkoutModalOpen || isSettingsOpen);
    if (hasModalOpen) {
      pendingPhantomRef.current = true;
      history.pushState({ modal: true }, "");
    } else if (pendingPhantomRef.current) {
      pendingPhantomRef.current = false;
      // Solo desenroscar si la entrada actual es la que nosotros agregamos.
      if (window.history.state && window.history.state.modal) {
        dismissPhantomRef.current = true;
        window.history.back();
      }
    }
  }, [selectedExerciseForDetail, isWorkoutModalOpen, isSettingsOpen]);

  useEffect(() => {
    const onPopState = () => {
      // Este pop fue generado por nuestro propio back() de limpieza: ignorar.
      if (dismissPhantomRef.current) {
        dismissPhantomRef.current = false;
        return;
      }
      setCurrentTab(getTabFromURL());
      const handled = handleBack();
      if (!handled) {
        // El back del usuario llegó a una entrada fantasma de un modal ya
        // cerrado o a la raíz: en Android nativo cerramos la app cuando no hay
        // más modal que desplegar; en web dejamos que el navegador la gestione.
        const bridge = (window as unknown as { AndroidBridge?: { closeApp: () => void } }).AndroidBridge;
        if (window.history.state && window.history.state.modal) {
          dismissPhantomRef.current = true;
          window.history.back();
        } else if (bridge) {
          bridge.closeApp();
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBack();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleBack]);

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-black">
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-20 md:pb-6">
        {/* TodayHub is eagerly loaded for instant first paint (default tab) */}
        {currentTab === "hoy" && (
          <TodayHub
            onGoToWorkout={() => setCurrentTab("workout")}
            onGoToPrograms={() => setCurrentTab("programs")}
            onGoToBiomechanics={() => setCurrentTab("exercises")}
            onGoToNutrition={() => setCurrentTab("nutrition")}
          />
        )}

        {/* WorkoutHub is eagerly loaded for instant first paint */}
        {currentTab === "workout" && (
          <WorkoutHub
            onGoToPrograms={() => setCurrentTab("programs")}
            onGoToBiomechanics={() => setCurrentTab("exercises")}
          />
        )}

        {/* Everything else is lazy-loaded on first visit */}
        <Suspense fallback={<TabLoader />}>
          {currentTab === "programs" && <ProgramsExplorer />}
          {currentTab === "exercises" && <BiomechanicsHub />}
          {currentTab === "analytics" && <ScienceDashboard />}
          {currentTab === "nutrition" && <NutritionVisionHub />}
          {currentTab === "reto" && <ChallengeHub />}
          {currentTab === "objetivo" && <GoalHub onGoToPrograms={() => setCurrentTab("programs")} />}
        </Suspense>
      </main>

      <LiveWorkoutLogger onGoToAnalytics={() => setCurrentTab("analytics")} />

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
        <StepsEngine />
        <HealthSyncEngine />
        <AppWithPin />
      </GoalProvider>
    </WorkoutProvider>
  );
}
