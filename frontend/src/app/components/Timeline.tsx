import { Circle } from 'lucide-react';

interface TimelineItem {
  id: string;
  fecha: string;
  titulo?: string;
  descripcion: string;
  usuario?: string;
  tipo?: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export default function Timeline({ items }: TimelineProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4">
          {/* Line connector */}
          {index !== items.length - 1 && (
            <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          )}

          {/* Dot */}
          <div className="relative z-10 flex items-start pt-1">
            <Circle className="fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400" size={16} />
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              {item.titulo && (
                <h4 className="font-medium text-sm mb-1 dark:text-white">{item.titulo}</h4>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{item.descripcion}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(item.fecha)}</span>
                {item.usuario && (
                  <>
                    <span>•</span>
                    <span>{item.usuario}</span>
                  </>
                )}
                {item.tipo && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{item.tipo}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No hay registros en el historial
        </div>
      )}
    </div>
  );
}