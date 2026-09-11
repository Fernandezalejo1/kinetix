import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  CardioEntry,
  GoalPhase,
  GoalPhaseState,
  ReadinessEntry,
  SleepEntry,
} from "../types";
import { safeParse, safeSet, VALIDATORS, SANITIZERS } from "../utils/storage";
import { computeReadiness } from "../utils/goalEngine";

interface GoalContextType {
  phase: GoalPhaseState;
  setPhase: (id: GoalPhase) => void;
  sleepLog: SleepEntry[];
  addSleep: (entry: Omit<SleepEntry, "id">) => void;
  removeSleep: (id: string) => void;
  readinessLog: ReadinessEntry[];
  /** Calcula score + veredicto automáticamente desde los datos crudos. */
  addReadiness: (entry: Omit<ReadinessEntry, "id" | "score" | "verdict">) => void;
  cardioLog: CardioEntry[];
  addCardio: (entry: Omit<CardioEntry, "id">) => void;
  removeCardio: (id: string) => void;
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

const capForStorage = <T,>(arr: T[], max: number): T[] =>
  Array.isArray(arr) && arr.length > max ? arr.slice(0, max) : arr;

export const GoalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [phase, setPhaseState] = useState<GoalPhaseState>(() =>
    safeParse<GoalPhaseState>(
      "kinetix_goal_phase",
      { id: "cut", setAt: Date.now() },
      (v) =>
        v !== null &&
        typeof v === "object" &&
        (v as GoalPhaseState).id != null &&
        ["cut", "maintenance", "lean_bulk"].includes((v as GoalPhaseState).id)
    )
  );

  const [sleepLog, setSleepLog] = useState<SleepEntry[]>(() =>
    safeParse("kinetix_sleep_log", [], VALIDATORS["kinetix_sleep_log"], SANITIZERS["kinetix_sleep_log"])
  );

  const [readinessLog, setReadinessLog] = useState<ReadinessEntry[]>(() =>
    safeParse("kinetix_readiness", [], VALIDATORS["kinetix_readiness"], SANITIZERS["kinetix_readiness"])
  );

  const [cardioLog, setCardioLog] = useState<CardioEntry[]>(() =>
    safeParse("kinetix_cardio_log", [], VALIDATORS["kinetix_cardio_log"], SANITIZERS["kinetix_cardio_log"])
  );

  const setPhase = useCallback((id: GoalPhase) => {
    setPhaseState({ id, setAt: Date.now() });
  }, []);

  const addSleep = useCallback((entry: Omit<SleepEntry, "id">) => {
    setSleepLog((prev) =>
      capForStorage([{ id: `sleep-${Date.now()}`, ...entry }, ...prev], 365)
    );
  }, []);

  const removeSleep = useCallback((id: string) => {
    setSleepLog((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addReadiness = useCallback(
    (entry: Omit<ReadinessEntry, "id" | "score" | "verdict">) => {
      // La calidad de sueño se toma del último registro de sueño (default 3).
      const sleepQuality = sleepLog[0]?.quality ?? 3;
      const r = computeReadiness({ ...entry, sleepQuality });
      setReadinessLog((prev) =>
        capForStorage(
          [
            { id: `rdy-${Date.now()}`, ...entry, score: r.score, verdict: r.verdict },
            ...prev,
          ],
          365
        )
      );
    },
    [sleepLog]
  );

  const addCardio = useCallback((entry: Omit<CardioEntry, "id">) => {
    setCardioLog((prev) =>
      capForStorage([{ id: `cardio-${Date.now()}`, ...entry }, ...prev], 730)
    );
  }, []);

  const removeCardio = useCallback((id: string) => {
    setCardioLog((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Persistencia
  React.useEffect(() => {
    safeSet("kinetix_goal_phase", phase);
  }, [phase]);
  React.useEffect(() => {
    safeSet("kinetix_sleep_log", sleepLog);
  }, [sleepLog]);
  React.useEffect(() => {
    safeSet("kinetix_readiness", readinessLog);
  }, [readinessLog]);
  React.useEffect(() => {
    safeSet("kinetix_cardio_log", cardioLog);
  }, [cardioLog]);

  return (
    <GoalContext.Provider
      value={{
        phase,
        setPhase,
        sleepLog,
        addSleep,
        removeSleep,
        readinessLog,
        addReadiness,
        cardioLog,
        addCardio,
        removeCardio,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
};

export const useGoal = () => {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error("useGoal must be used within a GoalProvider");
  return ctx;
};