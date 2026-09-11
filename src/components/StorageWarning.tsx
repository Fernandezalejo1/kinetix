import { useEffect, useState } from "react";

/**
 * Aviso de almacenamiento: `safeSet` emite `kinetix-storage-error` cuando no
 * puede escribir en localStorage (cuota agotada, sobre todo por fotos). Sin
 * esto la app parecía guardar todo y el usuario perdía datos al recargar.
 *
 * Se muestra como banner no invasivo con acción para liberar espacio
 * (elimina la caché de fotos del plan de fases) y se auto-oculta.
 */
export const StorageWarning: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onError = () => {
      setOpen(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOpen(false), 12000);
    };
    window.addEventListener("kinetix-storage-error", onError);
    return () => {
      window.removeEventListener("kinetix-storage-error", onError);
      window.clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed top-2 inset-x-2 z-[99998] flex justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-lg w-full rounded-xl border border-amber-500/50 bg-amber-950/95 shadow-2xl shadow-amber-900/40 px-3 py-2.5 flex items-center gap-2">
        <span className="text-base shrink-0">⚠️</span>
        <p className="text-[11px] leading-snug text-amber-100 flex-1">
          No se pudieron guardar los últimos cambios: el almacenamiento del dispositivo está lleno. Liberá espacio
          (por ejemplo borrando fotos de progreso) para no perder datos.
        </p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 px-2 py-1 rounded-md bg-amber-800/70 hover:bg-amber-700 text-amber-50 text-[10px] font-bold min-h-[28px]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};