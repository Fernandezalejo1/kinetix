import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  Sparkles,
  BookOpen,
  Dumbbell,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  BarChart2,
  Clock,
  History
} from "lucide-react";
import { useWorkout } from "../../context/WorkoutContext";
import { EXERCISES_DATABASE } from "../../data/exercisesData";

interface ScienceCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScienceCoachModal: React.FC<ScienceCoachModalProps> = ({ isOpen, onClose }) => {
  const { workoutHistory, personalRecords, exerciseHistory, weightUnit, activeSession } = useWorkout();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string; citations?: string[] }>>([
    {
      role: "assistant",
      text: "¡Hola! Soy tu Preparador Físico y Doctor en Ciencias del Deporte con IA.\n\nPuedo:\n• Auditar tus rutinas y detectar desequilibrios\n• Recomendar cargas basadas en tu historial real\n• Explicar cualquier concepto biomecánico\n• Calcular tu necesidad de deload\n\n¿En qué puedo ayudarte hoy?",
      citations: ["Brad Schoenfeld (2021) Science and Development of Muscle Hypertrophy", "Israetel & Helms (2020) Scientific Principles of Hypertrophy Training"],
    },
  ]);

  const userDataContext = useMemo(() => {
    const recentWorkouts = workoutHistory.slice(0, 5);
    const totalVolume = workoutHistory.reduce((acc, w) => acc + w.totalVolumeKg, 0);
    const totalWorkouts = workoutHistory.length;
    const recentPRs = personalRecords.slice(0, 3);
    const lastWorkout = workoutHistory[0];
    const uniqueExercises = new Set(workoutHistory.flatMap((w) => w.exercises.map((e) => e.exercise?.name || e.exerciseId))).size;

    let summary = `\n[DATOS DEL USUARIO - Solo para tu contexto interno]\n`;
    summary += `- Entrenamientos totales registrados: ${totalWorkouts}\n`;
    summary += `- Volumen total acumulado: ${totalVolume.toLocaleString()} ${weightUnit}\n`;
    summary += `- Ejercicios diferentes utilizados: ${uniqueExercises}\n`;
    summary += `- PRs registrados: ${personalRecords.length}\n`;
    if (lastWorkout) {
      const lastDate = new Date(lastWorkout.date).toLocaleDateString("es-ES");
      summary += `- Último entrenamiento: "${lastWorkout.routineName}" el ${lastDate}\n`;
      summary += `- Último tonelaje: ${lastWorkout.totalVolumeKg} ${weightUnit} en ${lastWorkout.totalSets} series\n`;
    }
    if (recentPRs.length > 0) {
      summary += `- PRs recientes: ${recentPRs.map((pr) => `${pr.exerciseName} ${pr.value}${weightUnit}`).join(", ")}\n`;
    }
    if (activeSession) {
      summary += `- Sesión activa: "${activeSession.routineName}" con ${activeSession.exercises.length} ejercicios\n`;
    }
    return summary;
  }, [workoutHistory, personalRecords, weightUnit, activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const contextualQuestions = useMemo(() => {
    const qs: string[] = [];
    if (workoutHistory.length > 0) {
      qs.push("¿Necesito una semana de deload basado en mi volumen reciente?");
    }
    if (personalRecords.length > 0) {
      qs.push("Analiza mis PRs y sugiéreme dónde puedo mejorar");
    }
    if (activeSession) {
      qs.push("¿Cómo optimizo el RIR en mi sesión actual?");
    }
    qs.push("¿Cuál es la diferencia entre 0 RIR y 1-2 RIR para hipertrofia?");
    qs.push("Explícame la sobrecarga en estiramiento (lengthened bias)");
    return qs.slice(0, 4);
  }, [workoutHistory, personalRecords, activeSession]);

  if (!isOpen) return null;

  const handleSend = async (questionToSend?: string) => {
    const text = questionToSend || query;
    if (!text.trim() || isLoading) return;

    const userMsg = { role: "user" as const, text };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/science-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          context: userDataContext,
        }),
      });

      if (!res.ok) throw new Error("Error en la consulta");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No se pudo obtener una respuesta.",
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Lo siento, hubo un problema al conectar con el motor de IA. Por favor intenta de nuevo en unos momentos.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: BarChart2, label: "Auditar Rutina", color: "cyan", question: "Audita mi rutina actual y dime qué debo cambiar para maximizar hipertrofia" },
    { icon: Target, label: "Calcular Volumen", color: "emerald", question: "¿Cuántas series efectivas semanales debo hacer por grupo muscular según mi nivel?" },
    { icon: AlertTriangle, label: "Detectar Desequilibrios", color: "amber", question: "Analiza si tengo desequilibrios musculares basado en mi historial de entrenamientos" },
    { icon: TrendingUp, label: "Plan de Progresión", color: "purple", question: "Créame un plan de progresión de 4 semanas para fuerza e hipertrofia" },
  ];

  return (
    <div
      id="science-coach-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border-neutral-800 sm:border rounded-none sm:rounded-3xl w-full max-w-3xl h-full max-h-full sm:h-[85dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-5 border-b border-neutral-800 bg-neutral-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">Kinetix Science Coach</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hidden sm:inline">
                  PhD SPORTS SCIENCE
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate">Grounded en literatura científica peer-reviewed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-cyan-600 text-white rounded-br-none"
                    : "bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-bl-none shadow-md"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Fuentes & Evidencia Científica:
                    </span>
                    <ul className="text-[11px] text-neutral-400 space-y-0.5">
                      {m.citations.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 max-w-sm">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Analizando literatura biomecánica y fisiológica...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Grid */}
        {messages.length <= 1 && (
          <div className="px-4 sm:px-6 pb-2 grid grid-cols-2 gap-2">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(action.question)}
                  className={`p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-${action.color}-500/40 transition-all text-left flex items-center gap-2.5 group`}
                >
                  <div className={`p-2 rounded-lg bg-${action.color}-500/10 text-${action.color}-400 border border-${action.color}-500/20 group-hover:scale-105 transition-transform shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-300 group-hover:text-white transition-colors">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Suggested Prompts */}
        <div className="px-4 py-2 sm:px-6 bg-neutral-950/60 border-t border-neutral-800 flex gap-2 overflow-x-auto scrollbar-thin text-xs shrink-0">
          {contextualQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-3 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-cyan-300 whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-neutral-950 border-t border-neutral-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Haz una pregunta sobre biomecánica, RIR, tempo, nutrición..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-0 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="p-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-2xl transition-all shadow-lg shadow-cyan-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
