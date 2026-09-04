import React, { useState, useEffect, useCallback, Suspense } from "react";
import { WorkoutProvider, useWorkout } from "./context/WorkoutContext";
import { Navigation, NavTab } from "./components/Navigation";
import { LiveWorkoutLogger } from "./components/workout/LiveWorkoutLogger";
import { SettingsModal } from "./components/SettingsModal";
import { StepsEngine } from "./components/nutrition/StepsEngine";

// Eagerly load the first screen (workout hub) for instant display
import { WorkoutHub } from "./components/workout/WorkoutHub";

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

const TAB_ORDER: NavTab[] = ["workout", "programs", "exercises", "analytics", "nutrition", "reto"];

/** Reads the PWA deep-link target (?tab=...) from the URL (manifest shortcuts). */
const getTabFromURL = (): NavTab => {
  if (typeof window === "undefined") return "workout";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return (TAB_ORDER as readonly string[]).includes(tab ?? "")
    ? (tab as NavTab)
    : "workout";
};

/** Minimal loading skeleton shown while a chunk downloads */
const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24 animate-fadeIn" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cargando…</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>(getTabFromURL);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { selectedExerciseForDetail, setSelectedExerciseForDetail, isWorkoutModalOpen, setIsWorkoutModalOpen } = useWorkout();

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

  // Push a history entry when a modal opens so Android back button closes it
  useEffect(() => {
    const hasModalOpen = !!(selectedExerciseForDetail || isWorkoutModalOpen || isSettingsOpen);
    if (hasModalOpen) {
      history.pushState({ modal: true }, "");
    }
  }, [selectedExerciseForDetail, isWorkoutModalOpen, isSettingsOpen]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentTab(getTabFromURL());
      const handled = handleBack();
      if (!handled) {
        if (window.history.length > 1) {
          window.history.back();
        } else if ((window as any).AndroidBridge) {
          (window as any).AndroidBridge.closeApp();
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
        </Suspense>
      </main>

      <LiveWorkoutLogger onGoToAnalytics={() => setCurrentTab("analytics")} />

      {/* SettingsModal stays mounted so the workout reminder keeps active while closed */}
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
};

function AppWithPin() {
  return <AppContent />;
}

export default function App() {
  return (
    <WorkoutProvider>
      <StepsEngine />
      <AppWithPin />
    </WorkoutProvider>
  );
}
