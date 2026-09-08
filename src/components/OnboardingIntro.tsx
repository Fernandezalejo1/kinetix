import React, { useEffect, useState } from "react";
import { Dumbbell, Timer, TrendingUp, ArrowRight, X, Zap } from "lucide-react";

const ONBOARDING_KEY = "kinetix_onboarding_v1";

const STEPS: {
  icon: React.ElementType;
  accent: string;
  title: string;
  body: string;
}[] = [
  {
    icon: Zap,
    accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
    title: "Entrenás con Intención: RIR",
    body: "El RIR (repeticiones en reserva) es cuántas reps te dejas en el tanque. RIR 2 = el sweet spot para crecer sin reventarte. Cada serie la registrás así y KINETIX decide cuándo subir el peso.",
  },
  {
    icon: Timer,
    accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    title: "Tempo Controlado",
    body: "El metrónomo marca tu cadencia (ej. 3-1-0-1: 3s bajando, 1s abajo, subida explosiva, 1s arriba). Lo abrís desde cualquier ejercicio y lo minimizás como barra flotante mientras cargás pesos.",
  },
  {
    icon: TrendingUp,
    accent: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    title: "Sobrecarga Progresiva Automática",
    body: "Con tus registros reales, la app calcula el incremento exacto (+2.5 kg cuando cumplís el objetivo de reps). Nada se estima sin datos: cargá tus series y mirá cómo sube la barra.",
  },
];

export const OnboardingIntro: React.FC = () => {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
    } catch {
      /* storage no disponible */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* noop */
    }
    setShow(false);
  };

  if (!show) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      id="onboarding-intro"
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-0 sm:p-4"
      onClick={dismiss}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-cyan-400" : i < step ? "w-3 bg-cyan-700" : "w-3 bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${s.accent}`}>
            <Icon className="w-7 h-7" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Paso {step + 1} de {STEPS.length}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">{s.title}</h2>
          <p className="text-[13px] text-neutral-300 leading-relaxed">{s.body}</p>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={dismiss}
              className="shrink-0 p-2 rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
              title="Omitir"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={isLast ? dismiss : () => setStep((curr) => curr + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 min-h-[48px] rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-black shadow-lg shadow-cyan-500/25 transition-colors"
            >
              {isLast ? (
                <>
                  <Dumbbell className="w-4 h-4" /> ¡A entrenar!
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};