// =============================================================
// KINETIX — Timers de sesión (P3: extraídos de LiveWorkoutLogger).
// CardioTimer (20 min) e IsometricTimer (isométricos por tiempo).
// Ambos usan timestamp END para sobrevivir al bloqueo de pantalla.
// =============================================================
import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { WorkoutExercise } from "../../types";
import { getTargetSeconds } from "../../utils/exerciseMode";

/** Cardio Timer — 20 minute countdown for treadmill/cardio exercises.
 *  Uses a target END timestamp (not tick-counting) so the countdown keeps
 *  correct time even if the phone screen locks or the app is backgrounded and
 *  the browser throttles setInterval. */
export const CARDIO_SECONDS = 20 * 60;
export const CardioTimer: React.FC<{ exercise: WorkoutExercise }> = ({ exercise }) => {
  const [remaining, setRemaining] = useState(CARDIO_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const { completeSetAndTriggerTimer } = useWorkout();

  // El callback del contexto cambia de identidad con cada edición de la sesión:
  // se lee por ref para que el intervalo NO se recree serie a serie (un solo
  // setInterval por corrida) y para no depender de la identidad de `exercise`.
  const completeRef = useRef(completeSetAndTriggerTimer);
  useEffect(() => {
    completeRef.current = completeSetAndTriggerTimer;
  }, [completeSetAndTriggerTimer]);
  const exerciseRef = useRef(exercise);
  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  // El tick puede llegar a correr otra vez en left<=0 (el cleanup del intervalo
  // se aplica recién en el commit siguiente): la serie se completa UNA vez.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        setIsRunning(false);
        const current = exerciseRef.current;
        const firstSetId = current.sets[0]?.id;
        if (firstSetId) completeRef.current(current.id, firstSetId);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, endAt, exercise.id]);

  const toggle = () => {
    if (!started || remaining <= 0) {
      setEndAt(Date.now() + CARDIO_SECONDS * 1000);
      firedRef.current = false;
    } else if (isRunning) {
      setEndAt(null);
    } else {
      setEndAt(Date.now() + remaining * 1000);
    }
    setStarted(true);
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setRemaining(CARDIO_SECONDS);
    setIsRunning(false);
    setStarted(false);
    setEndAt(null);
    firedRef.current = false;
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = ((CARDIO_SECONDS - remaining) / CARDIO_SECONDS) * 100;
  const done = remaining === 0 && started;

  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-950/40 via-neutral-900 to-neutral-950 border border-cyan-500/20 p-6 text-center space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Cardio — {exercise.exercise.nameEs}</div>
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(23 23 23)" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#22d3ee" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white font-mono">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
            <span className="text-[11px] text-neutral-400 font-bold">{done ? "¡COMPLETADO!" : isRunning ? "EN PROGRESO" : "20:00 min"}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {!done ? (
            <>
              <button
                onClick={toggle}
                className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                  isRunning ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
                }`}
              >
                {isRunning ? <><Pause className="w-4 h-4 fill-white" />Pausar</> : <><Play className="w-4 h-4 fill-white" />{started ? "Reanudar" : "Iniciar Cardio"}</>}
              </button>
              {started && (
                <button
                  onClick={reset}
                  className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm border border-neutral-700 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">Cardio completado — 20 minutos</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Isometric Timer — countdown for time-based exercises (planks, holds, etc.).
 *  Manages sets sequentially: each set has its own target duration from the plan.
 *  Uses endAt timestamp to survive backgrounding. */
export const IsometricTimer: React.FC<{ exercise: WorkoutExercise }> = ({ exercise }) => {
  const { completeSetAndTriggerTimer } = useWorkout();

  const currentSetIdx = exercise.sets.findIndex((s) => !s.completed);
  const currentSet = currentSetIdx >= 0 ? exercise.sets[currentSetIdx] : null;
  // strict: getTargetSeconds puede devolver null → fallback 30s.
  const targetSeconds = getTargetSeconds(exercise) ?? 30;

  const [remaining, setRemaining] = useState(targetSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);

  // Igual que en CardioTimer: callback y serie actual se leen por ref para que
  // el intervalo no se recree con cada edición de la sesión, y un guard evita
  // completar la serie dos veces si el tick alcanza a repetirse.
  const completeRef = useRef(completeSetAndTriggerTimer);
  useEffect(() => {
    completeRef.current = completeSetAndTriggerTimer;
  }, [completeSetAndTriggerTimer]);
  const setRef = useRef(currentSet);
  useEffect(() => {
    setRef.current = currentSet;
  }, [currentSet]);
  const targetRef = useRef(targetSeconds);
  useEffect(() => {
    targetRef.current = targetSeconds;
  }, [targetSeconds]);
  const firedRef = useRef(false);

  // Reset timer when moving to next set
  useEffect(() => {
    if (currentSet) {
      setRemaining(currentSet.durationSeconds ?? targetSeconds);
      setIsRunning(false);
      setStarted(false);
      setEndAt(null);
      firedRef.current = false;
    }
  }, [currentSet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        setIsRunning(false);
        const target = setRef.current;
        if (target) {
          completeRef.current(exercise.id, target.id, {
            durationSeconds: target.durationSeconds ?? targetRef.current,
          });
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, endAt, exercise.id]);

  const toggle = () => {
    const dur = currentSet?.durationSeconds ?? targetSeconds;
    if (!started || remaining <= 0) {
      setEndAt(Date.now() + dur * 1000);
      firedRef.current = false;
    } else if (isRunning) {
      setEndAt(null);
    } else {
      setEndAt(Date.now() + remaining * 1000);
    }
    setStarted(true);
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setRemaining(currentSet?.durationSeconds ?? targetSeconds);
    setIsRunning(false);
    setStarted(false);
    setEndAt(null);
    firedRef.current = false;
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const dur = currentSet?.durationSeconds ?? targetSeconds;
  const progress = ((dur - remaining) / dur) * 100;
  const done = remaining === 0 && started;
  const allDone = exercise.sets.every((s) => s.completed);
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border border-amber-500/20 p-6 text-center space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
          {exercise.exercise.nameEs} — Serie {completedCount + (done ? 0 : 1)} de {exercise.sets.length}
        </div>

        {!allDone && currentSet ? (
          <>
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(23 23 23)" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white font-mono">
                  {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                </span>
                <span className="text-[11px] text-neutral-400 font-bold">
                  {done ? "¡COMPLETADO!" : isRunning ? "MANTENÉ LA POSICIÓN" : `${dur}s`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              {!done ? (
                <>
                  <button onClick={toggle}
                    className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                      isRunning
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                        : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20"
                    }`}
                  >
                    {isRunning
                      ? <><Pause className="w-4 h-4 fill-white" />Pausar</>
                      : <><Play className="w-4 h-4 fill-white" />{started ? "Reanudar" : "Iniciar"}</>}
                  </button>
                  {started && (
                    <button onClick={reset}
                      className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm border border-neutral-700 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">Serie completada — {dur}s</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-emerald-400 py-4">
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-sm font-bold">Todas las series completadas</span>
          </div>
        )}

        {completedCount > 0 && (
          <div className="flex justify-center gap-2 pt-2">
            {exercise.sets.map((s, i) => (
              <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                s.completed
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-neutral-800 text-neutral-400 border border-neutral-700"
              }`}>
                {s.completed ? "✓" : i + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
