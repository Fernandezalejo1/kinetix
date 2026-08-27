import React, { useState, useEffect, useCallback, Suspense } from "react";
import { WorkoutProvider, useWorkout } from "./context/WorkoutContext";
import { Navigation, NavTab } from "./components/Navigation";
import { LiveWorkoutLogger } from "./components/workout/LiveWorkoutLogger";
import { PinLock } from "./components/PinLock";

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

const TAB_ORDER: NavTab[] = ["workout", "programs", "exercises", "analytics", "nutrition"];

/** Minimal loading skeleton shown while a chunk downloads */
const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24 animate-fadeIn">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Cargando…</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>("workout");
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
    return false;
  }, [selectedExerciseForDetail, isWorkoutModalOpen, setSelectedExerciseForDetail, setIsWorkoutModalOpen]);

  // Push a history entry when a modal opens so Android back button closes it
  useEffect(() => {
    const hasModalOpen = !!(selectedExerciseForDetail || isWorkoutModalOpen);
    if (hasModalOpen) {
      history.pushState({ modal: true }, "");
    }
  }, [selectedExerciseForDetail, isWorkoutModalOpen]);

  useEffect(() => {
    const onPopState = () => {
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
        </Suspense>
      </main>

      <LiveWorkoutLogger />

    </div>
  );
};

function AppWithPin() {
  const [isUnlocked, setIsUnlocked] = useState(() => false);

  if (!isUnlocked) {
    return <PinLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <WorkoutProvider>
      <AppWithPin />
    </WorkoutProvider>
  );
}
