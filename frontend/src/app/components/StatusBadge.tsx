interface StatusBadgeProps {
  status: string | null | undefined;
  type?: 'activo' | 'ticket' | 'stock' | 'tarea' | 'prioridad';
}

const statusConfig: Record<string, Record<string, { label: string; className: string }>> = {
  activo: {
    activa: { label: 'Activo', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    inactiva: { label: 'Inactivo', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    // legacy
    operativo: { label: 'Operativo', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    en_reparacion: { label: 'En Reparación', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    fuera_servicio: { label: 'Fuera de Servicio', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    mantenimiento: { label: 'Mantenimiento', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  },
  ticket: {
    nuevo: { label: 'Nuevo', className: 'bg-blue-100 text-blue-700' },
    en_progreso: { label: 'En Progreso', className: 'bg-yellow-100 text-yellow-700' },
    resuelto: { label: 'Resuelto', className: 'bg-green-100 text-green-700' },
  },
  stock: {
    ok: { label: 'OK', className: 'bg-green-100 text-green-700' },
    bajo: { label: 'Bajo', className: 'bg-yellow-100 text-yellow-700' },
    critico: { label: 'Crítico', className: 'bg-red-100 text-red-700' },
  },
  tarea: {
    pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
    en_curso: { label: 'En Curso', className: 'bg-blue-100 text-blue-700' },
    finalizada: { label: 'Finalizada', className: 'bg-green-100 text-green-700' },
  },
  prioridad: {
    baja:    { label: 'Baja',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    media:   { label: 'Media',   className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    alta:    { label: 'Alta',    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  },
};

export default function StatusBadge({ status, type = 'activo' }: StatusBadgeProps) {
  // Prioridad sin asignar → texto "---" sin fondo de badge
  if (type === 'prioridad' && !status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-gray-400 dark:text-gray-500">
        ---
      </span>
    );
  }

  const config = statusConfig[type]?.[status || ''] || { label: status || '', className: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}