import React, { useState, useEffect } from 'react';
import {
  X, Clock, PlusCircle, LogIn, LogOut, ArrowRightLeft,
  MapPin, User, Monitor, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getHistorialComponente,
  type Componente,
  type HistorialMovimientoComponente,
} from '../services/apiClient';

interface HistorialComponenteModalProps {
  isOpen: boolean;
  componente: Componente | null;
  onClose: () => void;
}

const ACCION_CONFIG: Record<
  HistorialMovimientoComponente['accion'],
  { label: string; color: string; dotColor: string; icon: React.ReactNode }
> = {
  creado: {
    label: 'Registrado en sistema',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    dotColor: 'bg-blue-500',
    icon: <PlusCircle size={14} className="text-blue-500" />,
  },
  instalado: {
    label: 'Instalado en equipo',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    dotColor: 'bg-green-500',
    icon: <LogIn size={14} className="text-green-500" />,
  },
  removido: {
    label: 'Removido de equipo',
    color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
    icon: <LogOut size={14} className="text-red-500" />,
  },
  transferido: {
    label: 'Transferido',
    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    icon: <ArrowRightLeft size={14} className="text-amber-500" />,
  },
};

function formatFechaCompleta(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function HistorialComponenteModal({
  isOpen, componente, onClose,
}: HistorialComponenteModalProps) {
  const [historial, setHistorial] = useState<HistorialMovimientoComponente[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !componente) return;
    setLoading(true);
    getHistorialComponente(componente.id)
      .then(data => setHistorial(data))
      .finally(() => setLoading(false));
  }, [isOpen, componente]);

  if (!isOpen || !componente) return null;

  // Calcular equipos únicos por los que pasó
  const equiposUnicos = [
    ...new Map(
      historial
        .filter(h => h.activoCodigo)
        .map(h => [h.activoCodigo, { codigo: h.activoCodigo!, nombre: h.activoNombre }])
    ).values(),
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl my-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00a6d6]/10 dark:bg-[#00a6d6]/20 flex items-center justify-center">
              <Clock size={18} className="text-[#00a6d6]" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                Historial Clínico
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="font-mono text-[#00a6d6] font-medium">{componente.idManual}</span>
                {' · '}
                {componente.tipoComponente} {componente.marca} {componente.modelo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Resumen de equipos */}
        {!loading && equiposUnicos.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Equipos por los que pasó este componente
            </p>
            <div className="flex flex-wrap gap-2">
              {equiposUnicos.map(eq => (
                <div
                  key={eq.codigo}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  <Monitor size={12} className="text-[#00a6d6] flex-shrink-0" />
                  <span className="text-xs font-mono font-medium text-gray-800 dark:text-gray-200">
                    {eq.codigo}
                  </span>
                  {eq.nombre && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      · {eq.nombre}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando historial...</span>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay eventos registrados para este componente.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                {historial.map((evento, idx) => {
                  const config = ACCION_CONFIG[evento.accion];
                  const isExpanded = expandedId === evento.id;
                  const isFirst = idx === 0;

                  return (
                    <div key={evento.id} className="relative pl-10">
                      {/* Dot */}
                      <div
                        className={`absolute left-3 top-3 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${config.dotColor} ${isFirst ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 ring-current' : ''}`}
                        style={isFirst ? { ringColor: config.dotColor } : undefined}
                      />

                      {/* Card */}
                      <div
                        className={`border rounded-xl overflow-hidden ${config.color} transition-all`}
                      >
                        {/* Card header — clickable para expandir */}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : evento.id)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3"
                        >
                          <span className="flex-shrink-0">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {config.label}
                              </span>
                              {evento.activoCodigo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600 text-xs font-mono text-gray-700 dark:text-gray-300">
                                  <Monitor size={10} />
                                  {evento.activoCodigo}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatFechaCompleta(evento.fecha)}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-gray-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </button>

                        {/* Expandido */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-current/10 space-y-3">
                            {/* Activo */}
                            {evento.activoNombre && (
                              <div className="flex items-start gap-2">
                                <Monitor size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Equipo</p>
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    {evento.activoNombre}
                                    {evento.activoCodigo && (
                                      <span className="ml-1 font-mono text-[#00a6d6]">
                                        ({evento.activoCodigo})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Ubicación */}
                            {(evento.ubicacionOrigen || evento.ubicacionDestino) && (
                              <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Ubicación</p>
                                  {evento.ubicacionOrigen && evento.ubicacionDestino && evento.ubicacionOrigen !== evento.ubicacionDestino ? (
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      <span className="text-red-500 dark:text-red-400">{evento.ubicacionOrigen}</span>
                                      <span className="mx-2 text-gray-400">→</span>
                                      <span className="text-green-600 dark:text-green-400">{evento.ubicacionDestino}</span>
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-900 dark:text-white">
                                      {evento.ubicacionDestino || evento.ubicacionOrigen}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Responsable */}
                            <div className="flex items-start gap-2">
                              <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Responsable</p>
                                <p className="text-sm text-gray-900 dark:text-white">{evento.responsable}</p>
                              </div>
                            </div>

                            {/* Observaciones */}
                            {evento.observaciones && (
                              <div className="mt-1 p-2.5 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                                <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                                  "{evento.observaciones}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Fecha abreviada a la derecha en timeline */}
                      <span className="absolute right-0 top-3 text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                        {formatFechaCorta(evento.fecha)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {historial.length} evento{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
