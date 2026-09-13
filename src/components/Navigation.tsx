import React, { useState, useRef, useEffect } from "react";
import {
  Home,
  Dumbbell,
  Layers,
  Activity,
  BarChart3,
  Utensils,
  Play,
  Volume2,
  VolumeX,
  Settings,
  Trophy,
  Zap,
  Target,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { useWorkout } from "../context/WorkoutContext";
import { useToast } from "../context/ToastContext";

export type NavTab = "hoy" | "workout" | "programs" | "exercises" | "analytics" | "nutrition" | "reto" | "objetivo";

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
  const { showToast } = useToast();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  /**
   * FIX (bloqueante 4): antes este botón solo cambiaba la etiqueta. Ahora los
   * DATOS siempre viven en kg (canónico) y la unidad es presentación. Al
   * alternar a lbs reconvertimos las series NO COMPLETADAS de la sesión activa
   * para que los inputs sigan mostrando el mismo peso físico (100 kg -> 220.5
   * lb), y las series ya completadas + historial quedan intactos en kg.
   */
  const toggleWeightUnit = () => {
    const next = weightUnit === "kg" ? "lbs" : "kg";
    if (next === "lbs") {
      showToast("Unidad: lb · los datos internos siguen en kg y se convierten al mostrar", "info");
    }
    setWeightUnit(next);
  };

  // Close more menu on outside click + Escape (P0 a11y)
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // 5 destinos primarios (Hoy, Entrenar, Progreso, Nutrición, Perfil) +
  // overflow con el resto (Programas, Ejercicios, Reto). Lenguaje consistente.
  const navItems = [
    { id: "hoy", label: "Hoy", shortLabel: "Hoy", icon: Home },
    { id: "workout", label: "Entrenar", shortLabel: "Entrenar", icon: Dumbbell },
    { id: "analytics", label: "Progreso", shortLabel: "Progreso", icon: BarChart3 },
    { id: "nutrition", label: "Nutrición", shortLabel: "Nutrición", icon: Utensils },
    { id: "objetivo", label: "Perfil", shortLabel: "Perfil", icon: Target },
    { id: "programs", label: "Programas", shortLabel: "Programas", icon: Layers },
    { id: "exercises", label: "Ejercicios", shortLabel: "Ejercicios", icon: Activity },
    { id: "reto", label: "Reto 21 Días", shortLabel: "Reto", icon: Trophy },
  ];

  // Mobile: show 5 primary + overflow menu (en el orden definido arriba)
  const mobilePrimary = navItems.slice(0, 5);
  const mobileOverflow = navItems.slice(5);
  const isOverflowActive = mobileOverflow.some((i) => i.id === currentTab);

  return (
    <>
      <header className="sticky top-0 z-30 bg-neutral-950 border-b border-neutral-800 safe-area-top">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          {/* Brand - compact on mobile (P0: botón focuseable con teclado) */}
          <button
            type="button"
            aria-label="Ir a Hoy"
            className="flex items-center gap-2 cursor-pointer min-w-0 shrink-0 rounded-xl"
            onClick={() => onSelectTab("hoy")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-cyan-400" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">KINETIX</span>
                <span className="text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SCIENCE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">
                Evidence-Based Hypertrophy & Biomechanics Engine
              </p>
            </div>
            <span className="text-sm font-black tracking-tight text-white sm:hidden">KX</span>
          </button>

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
              onClick={toggleWeightUnit}
              className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] sm:text-xs font-bold text-neutral-300 hover:text-white transition-colors touch-target"
              title="Cambiar unidades (los datos internos quedan en kg)"
              aria-label={`Cambiar unidad de peso. Actual: ${weightUnit === "kg" ? "kilogramos" : "libras"}`}
            >
              {weightUnit.toUpperCase()}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors touch-target"
              title="Audio temporizador"
              aria-label={soundEnabled ? "Silenciar audio del temporizador" : "Activar audio del temporizador"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors touch-target"
              title="Configuración"
              aria-label="Abrir configuración"
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
        <div className="border-t border-neutral-900 bg-neutral-950 hidden md:block">
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

      {/* Mobile Bottom Navigation — 5 primary + overflow menu (P0: nav etiquetado) */}
      <nav aria-label="Navegación principal" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-stretch justify-around px-1">
          {mobilePrimary.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as NavTab)}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[56px] relative transition-all press-scale ${
                  isActive ? "text-cyan-400" : "text-neutral-400 active:text-neutral-200"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}
                <span
                  className={`flex items-center justify-center w-11 h-8 rounded-xl transition-all ${
                    isActive ? "bg-cyan-500/15" : "bg-transparent"
                  }`}
                >
                  <Icon className={`w-[22px] h-[22px] ${isActive ? "drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" : ""}`} />
                </span>
                <span className={`text-[11px] leading-none ${isActive ? "font-extrabold" : "font-bold"}`}>{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Overflow menu button */}
          <div ref={moreRef} className="relative flex-1">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Más secciones"
              className={`w-full flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[56px] relative transition-all press-scale ${
                isOverflowActive ? "text-cyan-400" : moreOpen ? "text-white" : "text-neutral-400 active:text-neutral-200"
              }`}
            >
              {isOverflowActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              )}
              <span
                className={`flex items-center justify-center w-11 h-8 rounded-xl transition-all ${
                  isOverflowActive || moreOpen ? "bg-cyan-500/15" : "bg-transparent"
                }`}
              >
                <MoreHorizontal className="w-[22px] h-[22px]" />
              </span>
              <span className="text-[11px] font-bold leading-none">Más</span>
            </button>

            {/* Dropdown panel (P0: no recorta en 320px) */}
            {moreOpen && (
              <div role="menu" className="absolute bottom-full right-1 mb-2 w-52 max-w-[calc(100vw-1rem)] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                {mobileOverflow.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onSelectTab(item.id as NavTab); setMoreOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                        isActive ? "bg-cyan-500/10 text-cyan-400" : "text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold flex-1">{item.label}</span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
