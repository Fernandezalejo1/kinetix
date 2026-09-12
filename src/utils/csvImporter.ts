// =============================================================
// KINETIX — Importador Universal de Historial CSV (Strong & Hevy)
// Permite migrar historial completo desde apps líderes sin fricción.
// =============================================================

import { Exercise, ExerciseHistoryEntry, PersonalRecord } from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import { calculate1RM } from "./scienceCalculators";

export interface ParsedCsvRow {
  date: string;
  workoutName: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  rir?: number;
}

export interface ImportResult {
  totalRows: number;
  importedSessionsCount: number;
  importedSetsCount: number;
  recognizedExercises: string[];
  unrecognizedExercises: string[];
  historyEntries: ExerciseHistoryEntry[];
  newPrs: PersonalRecord[];
}

/** Limpia y normaliza texto para comparación tolerante */
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\].,\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mapa de equivalencias directas para ejercicios comunes en inglés/español */
const EXERCISE_ALIAS_MAP: Record<string, string> = {
  "bench press": "barbell-bench-press",
  "bench press barbell": "barbell-bench-press",
  "flat barbell bench press": "barbell-bench-press",
  "incline bench press barbell": "incline-barbell-bench-press",
  "incline dumbbell press": "incline-dumbbell-bench-press",
  "dumbbell bench press": "dumbbell-bench-press",
  "squat barbell": "barbell-back-squat",
  "barbell squat": "barbell-back-squat",
  "back squat": "barbell-back-squat",
  "deadlift barbell": "conventional-deadlift",
  "barbell deadlift": "conventional-deadlift",
  "romanian deadlift barbell": "romanian-deadlift",
  "romanian deadlift": "romanian-deadlift",
  "overhead press barbell": "overhead-press",
  "military press": "overhead-press",
  "pull up": "pull-ups",
  "chin up": "chin-ups",
  "lat pulldown cable": "lat-pulldown",
  "lat pulldown": "lat-pulldown",
  "barbell row": "barbell-bent-over-row",
  "bent over row barbell": "barbell-bent-over-row",
  "cable row": "seated-cable-row",
  "seated cable row": "seated-cable-row",
  "bicep curl dumbbell": "dumbbell-biceps-curl",
  "dumbbell curl": "dumbbell-biceps-curl",
  "barbell curl": "barbell-curl",
  "triceps pushdown": "cable-triceps-pushdown",
  "triceps pushdown cable": "cable-triceps-pushdown",
  "lateral raise dumbbell": "dumbbell-lateral-raise",
  "lateral raise": "dumbbell-lateral-raise",
  "leg press": "leg-press",
  "leg extension": "leg-extension",
  "leg curl": "seated-leg-curl",
  "lying leg curl": "lying-leg-curl",
  "seated leg curl": "seated-leg-curl",
  "standing calf raise": "standing-calf-raise",
  "calf press": "standing-calf-raise",
};

/** Busca el ejercicio correspondiente en EXERCISES_DATABASE */
export function matchExercise(rawName: string): Exercise | null {
  const norm = normalizeName(rawName);

  // 1. Alias exacto
  if (EXERCISE_ALIAS_MAP[norm]) {
    const found = EXERCISES_DATABASE.find((e) => e.id === EXERCISE_ALIAS_MAP[norm]);
    if (found) return found;
  }

  // 2. Coincidencia por ID
  const byId = EXERCISES_DATABASE.find((e) => e.id === norm.replace(/\s+/g, "-"));
  if (byId) return byId;

  // 3. Coincidencia por nombre en inglés o español
  for (const ex of EXERCISES_DATABASE) {
    const exNameNorm = normalizeName(ex.name);
    const exNameEsNorm = normalizeName(ex.nameEs);
    if (exNameNorm === norm || exNameEsNorm === norm) return ex;
  }

  // 4. Búsqueda por inclusión de palabras clave principales
  for (const ex of EXERCISES_DATABASE) {
    const exNorm = normalizeName(ex.name);
    const esNorm = normalizeName(ex.nameEs);
    if (
      (norm.length > 5 && exNorm.includes(norm)) ||
      (norm.length > 5 && esNorm.includes(norm)) ||
      (exNorm.length > 5 && norm.includes(exNorm))
    ) {
      return ex;
    }
  }

  return null;
}

/** Parsea texto CSV simple respetando comillas */
function parseCsvLines(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

/** Parsea un archivo CSV en formato Strong o Hevy */
export function parseWorkoutCsv(csvText: string): ImportResult {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) {
    throw new Error("El archivo CSV está vacío o no contiene suficientes filas.");
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/[\s_]/g, ""));

  // Detectar formato Strong vs Hevy
  const isStrong = header.includes("date") && header.includes("exercisename");
  const isHevy = header.includes("exercisetitle") || (header.includes("title") && header.includes("weightkg"));

  if (!isStrong && !isHevy) {
    throw new Error(
      "Formato no reconocido. Asegúrate de exportar el CSV estándar desde Strong o Hevy."
    );
  }

  // Índices de columnas
  let colDate = -1;
  let colExercise = -1;
  let colWeight = -1;
  let colReps = -1;
  let colRpe = -1;

  if (isStrong) {
    colDate = header.findIndex((h) => h === "date");
    colExercise = header.findIndex((h) => h === "exercisename");
    colWeight = header.findIndex((h) => h === "weight");
    colReps = header.findIndex((h) => h === "reps");
    colRpe = header.findIndex((h) => h === "rpe");
  } else {
    // Hevy
    colDate = header.findIndex((h) => h === "starttime" || h === "date");
    colExercise = header.findIndex((h) => h === "exercisetitle" || h === "exercisename");
    colWeight = header.findIndex((h) => h === "weightkg" || h === "weight");
    colReps = header.findIndex((h) => h === "reps");
    colRpe = header.findIndex((h) => h === "rpe");
  }

  const recognizedSet = new Set<string>();
  const unrecognizedSet = new Set<string>();

  // Agrupar filas por clave [fecha + ejercicio]
  const sessionGroups: Record<
    string,
    {
      date: string;
      exercise: Exercise;
      sets: { weight: number; reps: number; rpe?: number }[];
    }
  > = {};

  let totalValidRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rawDate = r[colDate] || "";
    const rawExercise = r[colExercise] || "";
    const rawWeight = parseFloat(r[colWeight]) || 0;
    const rawReps = parseInt(r[colReps], 10) || 0;
    const rawRpe = colRpe >= 0 && r[colRpe] ? parseFloat(r[colRpe]) : undefined;

    if (!rawDate || !rawExercise || rawReps <= 0) continue;

    const matched = matchExercise(rawExercise);
    if (!matched) {
      unrecognizedSet.add(rawExercise);
      continue;
    }

    recognizedSet.add(matched.nameEs || matched.name);
    totalValidRows++;

    // Extraer solo fecha ISO YYYY-MM-DD
    const isoDate = rawDate.split(" ")[0].split("T")[0];
    const groupKey = `${isoDate}_${matched.id}`;

    if (!sessionGroups[groupKey]) {
      sessionGroups[groupKey] = {
        date: isoDate,
        exercise: matched,
        sets: [],
      };
    }

    sessionGroups[groupKey].sets.push({
      weight: rawWeight,
      reps: rawReps,
      rpe: rawRpe && rawRpe >= 6 && rawRpe <= 10 ? rawRpe : undefined,
    });
  }

  const historyEntries: ExerciseHistoryEntry[] = [];
  const newPrs: PersonalRecord[] = [];
  const distinctSessions = new Set<string>();

  Object.values(sessionGroups).forEach((group, idx) => {
    distinctSessions.add(group.date);
    let maxWeight = 0;
    let volumeKg = 0;
    let bestSet: { weight: number; reps: number; rir?: number } | undefined;
    let bestE1rm = 0;
    const repsArr: number[] = [];
    let rpeSum = 0;
    let rpeCount = 0;

    group.sets.forEach((s) => {
      maxWeight = Math.max(maxWeight, s.weight);
      volumeKg += s.weight * s.reps;
      repsArr.push(s.reps);

      if (s.rpe) {
        rpeSum += s.rpe;
        rpeCount++;
      }

      const e1rm = calculate1RM(s.weight, s.reps);
      if (e1rm.valid && e1rm.average > bestE1rm) {
        bestE1rm = e1rm.average;
        bestSet = {
          weight: s.weight,
          reps: s.reps,
          rir: s.rpe ? Math.max(0, 10 - s.rpe) : undefined,
        };
      }
    });

    const avgRpe = rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : undefined;

    historyEntries.push({
      id: `imp-${Date.now()}-${idx}`,
      exerciseId: group.exercise.id,
      date: group.date,
      weight: maxWeight,
      sets: repsArr.length,
      reps: repsArr,
      rpe: avgRpe,
      rir: avgRpe ? Math.max(0, Math.round(10 - avgRpe)) : undefined,
      bestSet,
      volumeKg: Math.round(volumeKg * 10) / 10,
    });

    if (bestE1rm > 0 && bestSet) {
      newPrs.push({
        id: `imp-pr-${Date.now()}-${group.exercise.id}`,
        exerciseId: group.exercise.id,
        exerciseName: group.exercise.nameEs || group.exercise.name,
        type: "1RM",
        value: Math.round(bestE1rm),
        reps: bestSet.reps,
        date: group.date,
      });
    }
  });

  return {
    totalRows: rows.length - 1,
    importedSessionsCount: distinctSessions.size,
    importedSetsCount: totalValidRows,
    recognizedExercises: Array.from(recognizedSet),
    unrecognizedExercises: Array.from(unrecognizedSet),
    historyEntries,
    newPrs,
  };
}
