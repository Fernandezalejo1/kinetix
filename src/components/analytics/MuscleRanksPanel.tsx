import React, { useMemo } from "react";
import { Swords } from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { computeMuscleRanks } from "../../utils/muscleRanks";
import {
  RANK_EMBLEM_SRC,
  RANK_LABELS,
  RANK_COLORS,
  type Rank,
} from "../../utils/challengeStorage";

const RankEmblem: React.FC<{ rank: Rank; size?: number }> = ({ rank, size = 56 }) => (
  <img
    src={RANK_EMBLEM_SRC[rank]}
    alt={RANK_LABELS[rank]}
    width={size}
    height={size}
    draggable={false}
    className="select-none"
    style={{ width: size, height: size }}
  />
);

const RANK_ORDER: Rank[] = ["challenger", "master", "gold", "bronze"];

export const MuscleRanksPanel: React.FC = () => {
  const { personalRecords, exerciseHistory, bodyMetrics } = useWorkout();

  const bodyWeight = bodyMetrics.length ? bodyMetrics[bodyMetrics.length - 1]?.weightKg ?? null : null;

  const ranks = useMemo(
    () => computeMuscleRanks(personalRecords, exerciseHistory, bodyWeight).sort((a, b) => RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank)),
    [personalRecords, exerciseHistory, bodyWeight]
  );

  const best = ranks.filter((r) => r.rank === "challenger" || r.rank === "master").length;

  return (
    <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Rangos por Músculo</h3>
            <p className="text-xs text-neutral-400">
              Fuerza relativa: mejor e1RM del grupo ÷ tu peso corporal
              {bodyWeight ? ` (${Math.round(bodyWeight)} kg)` : " (registrá tu peso para rankear)"}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-300 border border-violet-500/30">
          {best}/10 en Master+
        </span>
      </div>

      {ranks.length === 0 || ranks.every((r) => r.bestKg === 0) ? (
        <p className="text-xs text-neutral-500 leading-relaxed">
          Todavía no hay registros de fuerza. Completá entrenamientos con peso y reps para calcular tu e1RM por
          músculo y subir de Bronce a Challenger.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-2">
          {ranks.map((r) => {
            const colors = RANK_COLORS[r.rank];
            return (
              <div
                key={r.group.id}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-violet-500/40 transition-all space-y-2"
              >
                <div className="flex items-center gap-3">
                  <RankEmblem rank={r.rank} size={52} />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{r.group.label}</h4>
                    <p className="text-xs font-black" style={{ color: colors.from }}>
                      {RANK_LABELS[r.rank]}
                    </p>
                  </div>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {r.ratio.toFixed(2)}x <span className="text-[10px] font-bold text-neutral-500">BW</span>
                </div>
                <p className="text-[11px] text-neutral-400 truncate" title={r.exerciseName}>
                  {r.bestKg > 0 ? `${r.bestKg} kg · ${r.exerciseName}` : "Sin registros"}
                </p>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round(r.progress * 100)}%`,
                      background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500">
                  {r.nextLabel && r.nextRatio ? (
                    <>Faltan {(r.nextRatio - r.ratio).toFixed(2)}x para {r.nextLabel}</>
                  ) : (
                    <>Rango máximo alcanzado</>
                  )}
                </p>
                <p className="text-[10px] text-neutral-600">{r.group.hint}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
