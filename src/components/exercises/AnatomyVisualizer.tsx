import React from "react";
import { MuscleGroup } from "../../types";

interface AnatomyVisualizerProps {
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  viewMode?: "front" | "back";
  className?: string;
}

export const AnatomyVisualizer: React.FC<AnatomyVisualizerProps> = ({
  primaryMuscles,
  secondaryMuscles,
  viewMode = "front",
  className = "w-48 h-64",
}) => {
  const isPrimary = (group: MuscleGroup) => primaryMuscles.includes(group);
  const isSecondary = (group: MuscleGroup) => secondaryMuscles.includes(group);

  const getMuscleColor = (group: MuscleGroup) => {
    if (isPrimary(group)) {
      return "fill-cyan-400 stroke-cyan-200 stroke-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]";
    }
    if (isSecondary(group)) {
      return "fill-purple-400 stroke-purple-200 stroke-1 drop-shadow-[0_0_6px_rgba(192,132,252,0.6)]";
    }
    return "fill-neutral-800 stroke-neutral-700 stroke-[0.75] hover:fill-neutral-700 transition-colors";
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 320"
        className="w-full h-full filter drop-shadow-md select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {viewMode === "front" ? (
          // FRONT ANATOMY VIEW
          <g id="front-anatomy">
            {/* Head & Neck */}
            <ellipse cx="100" cy="30" rx="14" ry="18" className="fill-neutral-800 stroke-neutral-700" />
            <path d="M92 48 L108 48 L106 62 L94 62 Z" className="fill-neutral-800 stroke-neutral-700" />

            {/* Traps Front */}
            <path
              d="M85 52 Q100 60 115 52 L125 70 Q100 68 75 70 Z"
              className={getMuscleColor("traps")}
            />

            {/* Front Deltoids */}
            <path
              d="M62 70 Q75 68 76 82 Q65 92 58 78 Z"
              className={getMuscleColor("front_delts")}
            />
            <path
              d="M138 70 Q125 68 124 82 Q135 92 142 78 Z"
              className={getMuscleColor("front_delts")}
            />

            {/* Side Deltoids */}
            <path
              d="M56 75 Q60 88 52 100 Q48 85 56 75 Z"
              className={getMuscleColor("side_delts")}
            />
            <path
              d="M144 75 Q140 88 148 100 Q152 85 144 75 Z"
              className={getMuscleColor("side_delts")}
            />

            {/* Pectorals (Chest) */}
            <path
              d="M75 72 Q100 70 100 80 L99 105 Q78 108 68 90 Z"
              className={getMuscleColor("chest")}
            />
            <path
              d="M125 72 Q100 70 100 80 L101 105 Q122 108 132 90 Z"
              className={getMuscleColor("chest")}
            />

            {/* Biceps */}
            <path
              d="M52 102 Q60 115 54 130 Q46 120 52 102 Z"
              className={getMuscleColor("biceps")}
            />
            <path
              d="M148 102 Q140 115 146 130 Q154 120 148 102 Z"
              className={getMuscleColor("biceps")}
            />

            {/* Forearms */}
            <path
              d="M54 134 Q60 155 50 175 Q42 155 54 134 Z"
              className={getMuscleColor("forearms")}
            />
            <path
              d="M146 134 Q140 155 150 175 Q158 155 146 134 Z"
              className={getMuscleColor("forearms")}
            />

            {/* Rectus Abdominis / Core */}
            <path
              d="M84 108 L116 108 L112 165 L88 165 Z"
              className={getMuscleColor("abs")}
            />
            {/* Ab pack segment lines */}
            <line x1="86" y1="122" x2="114" y2="122" className="stroke-black/50 stroke-1" />
            <line x1="88" y1="138" x2="112" y2="138" className="stroke-black/50 stroke-1" />
            <line x1="100" y1="108" x2="100" y2="165" className="stroke-black/50 stroke-1" />

            {/* Quads (Front Thighs) */}
            <path
              d="M74 172 Q98 170 98 190 L94 240 Q70 238 68 195 Z"
              className={getMuscleColor("quads")}
            />
            <path
              d="M126 172 Q102 170 102 190 L106 240 Q130 238 132 195 Z"
              className={getMuscleColor("quads")}
            />

            {/* Calves (Front Tibialis / Gastrocnemius view) */}
            <path
              d="M70 248 Q90 250 86 295 L74 295 Q64 270 70 248 Z"
              className={getMuscleColor("calves")}
            />
            <path
              d="M130 248 Q110 250 114 295 L126 295 Q136 270 130 248 Z"
              className={getMuscleColor("calves")}
            />
          </g>
        ) : (
          // BACK ANATOMY VIEW
          <g id="back-anatomy">
            {/* Head & Neck Back */}
            <ellipse cx="100" cy="30" rx="14" ry="18" className="fill-neutral-800 stroke-neutral-700" />

            {/* Upper Back / Traps */}
            <path
              d="M80 50 Q100 45 120 50 L135 85 L100 115 L65 85 Z"
              className={getMuscleColor("upper_back") || getMuscleColor("traps")}
            />

            {/* Rear Deltoids */}
            <path
              d="M58 72 Q68 70 66 88 Q54 92 58 72 Z"
              className={getMuscleColor("rear_delts")}
            />
            <path
              d="M142 72 Q132 70 134 88 Q146 92 142 72 Z"
              className={getMuscleColor("rear_delts")}
            />

            {/* Triceps (Lateral & Long Head) */}
            <path
              d="M52 98 Q60 112 56 130 Q46 118 52 98 Z"
              className={getMuscleColor("triceps")}
            />
            <path
              d="M148 98 Q140 112 144 130 Q154 118 148 98 Z"
              className={getMuscleColor("triceps")}
            />

            {/* Latissimus Dorsi (Lats) */}
            <path
              d="M66 90 Q100 118 100 145 L78 152 Q62 125 66 90 Z"
              className={getMuscleColor("lats")}
            />
            <path
              d="M134 90 Q100 118 100 145 L122 152 Q138 125 134 90 Z"
              className={getMuscleColor("lats")}
            />

            {/* Lower Back (Erectors) */}
            <path
              d="M88 145 L112 145 L110 172 L90 172 Z"
              className={getMuscleColor("lower_back")}
            />

            {/* Gluteus Maximus */}
            <path
              d="M72 172 Q100 170 100 185 L98 208 Q70 208 68 185 Z"
              className={getMuscleColor("glutes")}
            />
            <path
              d="M128 172 Q100 170 100 185 L102 208 Q130 208 132 185 Z"
              className={getMuscleColor("glutes")}
            />

            {/* Hamstrings (Biceps Femoris / Semitendinosus) */}
            <path
              d="M70 210 Q96 210 94 245 L72 245 Q64 228 70 210 Z"
              className={getMuscleColor("hamstrings")}
            />
            <path
              d="M130 210 Q104 210 106 245 L128 245 Q136 228 130 210 Z"
              className={getMuscleColor("hamstrings")}
            />

            {/* Gastrocnemius (Calves) */}
            <path
              d="M68 250 Q92 250 86 295 L74 295 Q62 272 68 250 Z"
              className={getMuscleColor("calves")}
            />
            <path
              d="M132 250 Q108 250 114 295 L126 295 Q138 272 132 250 Z"
              className={getMuscleColor("calves")}
            />
          </g>
        )}
      </svg>
    </div>
  );
};
