import React from "react";
import {
  Dumbbell,
  Layers,
  Activity,
  BarChart3,
  Utensils,
  Play,
  Volume2,
  VolumeX,
  Settings,

  Zap
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";

export type NavTab = "workout" | "programs" | "exercises" | "analytics" | "nutrition";

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
}) => {
  const {
    activeSession,
    setIsWorkoutModalOpen,
    startEmptyWorkout,
    weightUnit,
    setWeightUnit,
    soundEnabled,
    setSoundEnabled,
  } = useWorkout();

  const navItems = [
    { id: "workout", label: "Entrenar", shortLabel: "Entrenar", icon: Dumbbell },
    { id: "programs", label: "Programas", shortLabel: "Programas", icon: Layers },
    { id: "exercises", label: "Biomecánica", shortLabel: "Músculos", icon: Activity },
    { id: "analytics", label: "Analytics & MEV", shortLabel: "Stats", icon: BarChart3 },
    { id: "nutrition", label: "Nutrición", shortLabel: "Nutrición", icon: Utensils },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 glass-effect border-b border-neutral-800 safe-area-top">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          {/* Brand - compact on mobile */}
          <div
            className="flex items-center gap-2 cursor-pointer min-w-0 shrink-0"
            onClick={() => onSelectTab("workout")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-cyan-400" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">KINETIX</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SCIENCE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">
                Evidence-Based Hypertrophy & Biomechanics Engine
              </p>
            </div>
            <span className="text-sm font-black tracking-tight text-white sm:hidden">KX</span>
          </div>

          {/* Active Session Pill - takes remaining space */}
          {activeSession && (
            <div
              onClick={() => setIsWorkoutModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)] animate-pulse min-w-0 max-w-[140px] sm:max-w-xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-black truncate">
                {activeSession.routineName}
              </span>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setWeightUnit(weightUnit === "kg" ? "lbs" : "kg")}
              className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] sm:text-xs font-bold text-neutral-300 hover:text-white transition-colors touch-target"
              title="Cambiar unidades"
            >
              {weightUnit.toUpperCase()}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors touch-target"
              title="Audio temporizador"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors touch-target"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>

            {!activeSession && (
              <button
                onClick={() => startEmptyWorkout("Entrenamiento Rápido")}
                className="px-3 sm:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 transition-all items-center gap-1.5 hidden md:flex"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Entrenar
              </button>
            )}
          </div>
        </div>

        {/* Desktop Sub-Navigation */}
        <div className="border-t border-neutral-900 bg-neutral-950/60 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 sm:gap-4 overflow-x-auto scrollbar-thin text-xs font-bold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as NavTab)}
                  className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                    isActive
                      ? "border-cyan-400 text-cyan-400 bg-cyan-500/5 font-extrabold"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-effect border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-stretch justify-around px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] relative transition-all touch-target ${
                  isActive ? "text-cyan-400" : "text-neutral-500 active:text-neutral-300"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-cyan-400" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" : ""}`} />
                <span className={`text-[9px] font-bold ${isActive ? "font-extrabold" : ""}`}>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
