import React, { useState } from "react";
import { Pill, ChevronDown, ChevronUp, ShieldCheck, Clock, FlaskConical } from "lucide-react";
import { SUPPLEMENTS } from "../../data/nutritionData";

export const SupplementGuide: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl space-y-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/25">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">Guía de Suplementos</h3>
            <p className="text-[11px] text-neutral-400">Solo los que tienen respaldo científico · Sin fórmulas mágicas</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold border border-neutral-700 shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? "Ocultar" : "Ver guía"}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 animate-fadeIn">
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2.5 text-[11px] text-neutral-300 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              La base del progreso es <strong className="text-white">entrenar + comer + dormir</strong>. La creatina y la cafeína
              tienen evidencia fuerte; el resto complementa, nunca reemplaza.
            </span>
          </div>

          {SUPPLEMENTS.map((sup) => (
            <div key={sup.name} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white">{sup.name}</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Evidencia: {sup.level}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  <strong className="text-white">{sup.dose}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {sup.timing}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">{sup.evidence}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};