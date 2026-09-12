import React, { useEffect, useState } from "react";
import {
  Dumbbell,
  Timer,
  TrendingUp,
  ArrowRight,
  X,
  Zap,
  ChevronLeft,
  Flame,
  Target,
  Wrench,
} from "lucide-react";
import { useGoal } from "../context/GoalContext";
import { useToast } from "../context/ToastContext";
import {
  saveUserProfile,
  recommendProgram,
  persistSelectedProgram,
  DEFAULT_USER_PROFILE,
} from "../utils/userProfile";
import { UserProfile } from "../types";
import { FocusTrap } from "./FocusTrap";

// v2: el onboarding v1 eran solo 3 tips (sin perfil) y usaba la MISMA clave.
// Al bumpear a v2, los usuarios existentes vuelven a ver las preguntas del
// perfil (objetivo, experiencia, días, equipamiento, duración) que sus datos
// reales usan para las recomendaciones.
const ONBOARDING_KEY = "kinetix_onboarding_v2";

const PROFILE_STEPS = 5;

const TIP_STEPS: {
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

const GOAL_OPTIONS: { value: UserProfile["goal"]; label: string; desc: string }[] = [
  { value: "cut", label: "Definir", desc: "Bajar grasa manteniendo músculo" },
  { value: "maintenance", label: "Mantener", desc: "Conservar tu físico actual" },
  { value: "lean_bulk", label: "Volumen limpio", desc: "Ganar masa sin grasa de más" },
];

const EXPERIENCE_OPTIONS: { value: UserProfile["experience"]; label: string; desc: string }[] = [
  { value: "principiante", label: "Principiante", desc: "Menos de 1 año entrenando" },
  { value: "intermedio", label: "Intermedio", desc: "Entre 1 y 3 años" },
  { value: "avanzado", label: "Avanzado", desc: "3 años o más" },
];

const EQUIPMENT_OPTIONS: { value: UserProfile["equipment"]; label: string; desc: string }[] = [
  { value: "gym", label: "Gimnasio completo", desc: "Barras, mancuernas, poleas y máquinas" },
  { value: "basic", label: "Básico", desc: "Mancuernas y banco ajustable" },
  { value: "home", label: "Solo casa", desc: "Peso corporal y poco material" },
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

interface ProfileStepProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const ProfileStep: React.FC<ProfileStepProps> = ({ title, subtitle, children }) => (
  <div>
    <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">{title}</h2>
    <p className="text-[13px] text-neutral-400 leading-relaxed mb-5">{subtitle}</p>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const OptionCard: React.FC<{
  selected: boolean;
  label: string;
  desc?: string;
  icon?: React.ElementType;
  onClick: () => void;
}> = ({ selected, label, desc, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all press-scale ${
      selected
        ? "bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
        : "bg-neutral-950 border-neutral-800 hover:border-neutral-600"
    }`}
  >
    {Icon && (
      <div
        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
          selected
            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            : "bg-neutral-900 text-neutral-500 border-neutral-800"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
    )}
    <div className="min-w-0">
      <span className={`block text-sm font-black ${selected ? "text-cyan-300" : "text-white"}`}>{label}</span>
      {desc && <span className="block text-[11px] text-neutral-500 mt-0.5">{desc}</span>}
    </div>
    {selected && <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
  </button>
);

export const OnboardingIntro: React.FC = () => {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const { setPhase } = useGoal();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShow(true);
    } catch {
      /* storage no disponible */
    }
  }, []);

  const totalSteps = PROFILE_STEPS + TIP_STEPS.length;
  const isProfileStep = step < PROFILE_STEPS;
  const isLast = step === totalSteps - 1;

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const complete = () => {
    const withDate: UserProfile = { ...profile, completedAt: new Date().toISOString() };
    saveUserProfile(withDate);
    setPhase(profile.goal);
    // No pisar una selección explícita previa del usuario.
    let explicit: string | null = null;
    try {
      explicit = localStorage.getItem("kinetix_selected_program");
    } catch {
      /* noop */
    }
    if (!explicit) {
      const recommended = recommendProgram(withDate);
      persistSelectedProgram(recommended);
      showToast(`Programa recomendado: ${recommended.title}`, "success");
    }
    dismiss();
  };

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* noop */
    }
    setShow(false);
  };

  const renderProfileStep = (): React.ReactNode => {
    switch (step) {
      case 0:
        return (
          <ProfileStep title="¿Cuál es tu objetivo?" subtitle="Tu plan de fases y recomendaciones se ajustan a esto.">
            {GOAL_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.goal === o.value}
                label={o.label}
                desc={o.desc}
                icon={Target}
                onClick={() => update("goal", o.value)}
              />
            ))}
          </ProfileStep>
        );
      case 1:
        return (
          <ProfileStep title="¿Cuánta experiencia tenés?" subtitle="La progresión de cargas se calibra con tu punto de partida.">
            {EXPERIENCE_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.experience === o.value}
                label={o.label}
                desc={o.desc}
                icon={Flame}
                onClick={() => update("experience", o.value)}
              />
            ))}
          </ProfileStep>
        );
      case 2:
        return (
          <ProfileStep
            title="¿Cuántos días podés entrenar?"
            subtitle="Elegí un número sostenible: el mejor programa es el que podés mantener."
          >
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => update("daysPerWeek", d)}
                  aria-pressed={profile.daysPerWeek === d}
                  className={`flex-1 min-w-[52px] py-3 rounded-2xl border text-center transition-all press-scale ${
                    profile.daysPerWeek === d
                      ? "bg-cyan-500/10 border-cyan-400/60 text-cyan-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span className="block text-xl font-black">{d}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">días</span>
                </button>
              ))}
            </div>
          </ProfileStep>
        );
      case 3:
        return (
          <ProfileStep title="¿Con qué equipamiento contás?" subtitle="Nunca te recomendaremos un ejercicio que no puedas hacer.">
            {EQUIPMENT_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.equipment === o.value}
                label={o.label}
                desc={o.desc}
                icon={Wrench}
                onClick={() => update("equipment", o.value)}
              />
            ))}
          </ProfileStep>
        );
      default:
        return (
          <ProfileStep
            title="¿Cuánto tiempo por sesión?"
            subtitle="Si hoy tu rutina excede ese tiempo, te sugerimos una versión que entre en tu franja."
          >
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => update("sessionMinutes", m)}
                  aria-pressed={profile.sessionMinutes === m}
                  className={`flex-1 min-w-[60px] py-3 rounded-2xl border text-center transition-all press-scale ${
                    profile.sessionMinutes === m
                      ? "bg-cyan-500/10 border-cyan-400/60 text-cyan-300"
                      : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span className="block text-lg font-black">{m}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">min</span>
                </button>
              ))}
            </div>
          </ProfileStep>
        );
    }
  };

  if (!show) return null;

  // strict: TIP_STEPS[...] puede ser undefined si el índice se sale de rango.
  const currentTip = isProfileStep ? null : (TIP_STEPS[step - PROFILE_STEPS] ?? null);

  return (
    <FocusTrap>
      <div
        id="onboarding-intro"
        className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-0 sm:p-4"
        onClick={dismiss}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isProfileStep ? "Personalizá tu plan" : `Bienvenida: ${currentTip?.title}`}
        className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-cyan-400" : i < step ? "w-3 bg-cyan-700" : "w-3 bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div className="p-6 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {isProfileStep && (
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Tu plan
              </span>
            </div>
          )}
          {isProfileStep ? (
            renderProfileStep()
          ) : currentTip ? (
            <>
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${currentTip.accent}`}>
                <currentTip.icon className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Paso {step + 1} de {totalSteps}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">{currentTip.title}</h2>
              <p className="text-[13px] text-neutral-300 leading-relaxed">{currentTip.body}</p>
            </>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="shrink-0 p-2 rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                title="Volver"
                aria-label="Paso anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={dismiss}
                className="shrink-0 p-2 rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                title="Omitir"
                aria-label="Omitir onboarding"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={(isProfileStep && step === PROFILE_STEPS - 1) || isLast ? complete : () => setStep((s) => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 min-h-[48px] rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-black shadow-lg shadow-cyan-500/25 transition-colors"
            >
              {(isProfileStep && step === PROFILE_STEPS - 1) || isLast ? (
                <>
                  <Dumbbell className="w-4 h-4" /> ¡A entrenar!
                </>
              ) : isProfileStep ? (
                <>
                  Siguiente <ArrowRight className="w-4 h-4" />
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
    </FocusTrap>
  );
};