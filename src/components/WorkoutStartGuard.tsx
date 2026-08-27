import React, { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class WorkoutStartGuard extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log the EXACT component stack to localStorage
    try {
      const crashData = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("kinetix_crash_detail", JSON.stringify(crashData));
      console.error("[KINETIX CRASH]", crashData);
    } catch {}
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[99999] bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
            <span className="text-2xl">💥</span>
          </div>
          <h1 className="text-lg font-bold text-white mb-2">Error al iniciar entrenamiento</h1>
          <p className="text-xs font-mono text-red-400 max-w-md break-words mb-2">{this.state.error.message}</p>
          <pre className="text-[9px] font-mono text-red-500/60 max-w-md max-h-40 overflow-y-auto text-left mb-6 whitespace-pre-wrap break-words bg-red-950/30 p-3 rounded-xl border border-red-900/30">
            {this.state.error.stack}
          </pre>
          <div className="flex gap-3">
            <button onClick={() => this.setState({ error: null })} className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold">Reintentar</button>
            <button onClick={() => location.reload()} className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-bold">Recargar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
