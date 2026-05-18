import { Calendar, MapPin, User, Monitor, Paperclip } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface KanbanCardProps {
  tarea: {
    id: string;
    titulo: string;
    descripcion: string;
    prioridad: 'baja' | 'media' | 'alta';
    fechaLimite?: string;
    fechaCreacion: string;
    ubicacion?: string;
    activoCodigo?: string;
    asignados?: string[];
    creadoPor: string;
    adjuntos?: { id: string }[];
  };
  onClick?: () => void;
}

export default function KanbanCard({ tarea, onClick }: KanbanCardProps) {
  // Parsea "YYYY-MM-DD" como hora local para evitar desfase de zona horaria
  const parseDate = (s: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(s);
  };

  const formatDate = (dateString: string) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const isDueToday = tarea.fechaLimite
    ? toDay(parseDate(tarea.fechaLimite)).getTime() === toDay(new Date()).getTime()
    : false;

  const isOverdue = tarea.fechaLimite
    ? toDay(parseDate(tarea.fechaLimite)) < toDay(new Date()) && !isDueToday
    : false;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm flex-1 dark:text-white">{tarea.titulo}</h4>
        <StatusBadge status={tarea.prioridad} type="prioridad" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{tarea.descripcion}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Calendar size={14} className="text-gray-400 shrink-0" />
          <span>Creado: {formatDate(tarea.fechaCreacion)}</span>
        </div>

        {tarea.fechaLimite && (
          <div className="flex items-center gap-2 text-xs">
            <Calendar
              size={14}
              className={
                isOverdue ? 'text-red-600 dark:text-red-400 shrink-0'
                : isDueToday ? 'text-amber-500 dark:text-amber-400 shrink-0'
                : 'text-gray-400 shrink-0'
              }
            />
            <span
              className={
                isOverdue ? 'text-red-600 dark:text-red-400 font-medium'
                : isDueToday ? 'text-amber-600 dark:text-amber-400 font-medium'
                : 'text-gray-600 dark:text-gray-400'
              }
            >
              {isDueToday
                ? 'Esta tarea vence hoy'
                : `Límite: ${formatDate(tarea.fechaLimite)}${isOverdue ? ' (Plazo vencido)' : ''}`
              }
            </span>
          </div>
        )}

        {tarea.ubicacion && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <MapPin size={14} className="text-gray-400" />
            <span className="truncate">{tarea.ubicacion}</span>
          </div>
        )}

        {tarea.activoCodigo && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Monitor size={14} className="text-gray-400" />
            <span>{tarea.activoCodigo}</span>
          </div>
        )}

        {/* Asignados */}
        {tarea.asignados && tarea.asignados.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <User size={14} className="text-gray-400 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {tarea.asignados.slice(0, 2).map((nombre) => (
                <span
                  key={nombre}
                  className="px-1.5 py-0.5 rounded-full bg-[#00a6d6]/10 dark:bg-[#00a6d6]/20 text-[#00a6d6] dark:text-[#00c8f0]"
                >
                  {nombre.split(' ')[0]}
                </span>
              ))}
              {tarea.asignados.length > 2 && (
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  +{tarea.asignados.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Adjuntos */}
        {tarea.adjuntos && tarea.adjuntos.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Paperclip size={13} className="text-gray-400 shrink-0" />
            <span>{tarea.adjuntos.length} adjunto{tarea.adjuntos.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}