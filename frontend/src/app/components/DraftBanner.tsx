/**
 * DraftBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Aviso visual (inline) que se muestra cuando un formulario restauró
 * automáticamente un borrador guardado en sessionStorage.
 *
 * Props:
 *  - show      → true si hay un borrador que mostrar (se evalúa al montar)
 *  - onDiscard → callback que limpia el draft del formulario (y opcionalmente
 *                resetea los campos)
 *  - message   → mensaje personalizado (opcional)
 */
import { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

interface DraftBannerProps {
  /** Mostrar o no el banner (determinado por el padre basándose en hasPersistedData) */
  show: boolean;
  /** Se ejecuta cuando el usuario pulsa "Descartar borrador" */
  onDiscard: () => void;
  /** Mensaje descriptivo opcional */
  message?: string;
}

export default function DraftBanner({ show, onDiscard, message }: DraftBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start sm:items-center justify-between gap-3 px-4 py-3 bg-[#e6f7fc] dark:bg-[#004d63]/30 border border-[#b3e7f7] dark:border-[#00688a]/50 rounded-xl text-sm"
    >
      {/* Ícono + Mensaje */}
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <RotateCcw
          size={16}
          className="text-[#00a6d6] flex-shrink-0 mt-0.5 sm:mt-0"
          aria-hidden
        />
        <p className="text-[#005f80] dark:text-[#7dd6f0] leading-snug">
          {message ??
            'Borrador recuperado — tus cambios anteriores fueron restaurados automáticamente.'}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-1">
        <button
          type="button"
          onClick={() => {
            onDiscard();
            setDismissed(true);
          }}
          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2 transition-colors whitespace-nowrap"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          title="Cerrar aviso"
          className="p-1 rounded hover:bg-[#b3e7f7] dark:hover:bg-[#00688a]/40 text-[#007a9e] dark:text-[#7dd6f0] transition-colors"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
