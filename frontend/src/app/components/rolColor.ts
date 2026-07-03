const ROL_AVATAR_CLASSES: Record<string, { bg: string; text: string }> = {
  administrador:    { bg: 'bg-violet-100 dark:bg-violet-900/30',   text: 'text-violet-600 dark:text-violet-400' },
  operaciones:      { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-600 dark:text-blue-400' },
  docente_empleado: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
};

const DEFAULT_AVATAR_CLASSES = { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' };

/** Color de avatar determinado por rol — mismo rol, mismo color, en toda la app. */
export function getRolAvatarClasses(rol?: string | null): { bg: string; text: string } {
  return ROL_AVATAR_CLASSES[rol ?? ''] ?? DEFAULT_AVATAR_CLASSES;
}

const ROL_AVATAR_SOLID_CLASSES: Record<string, string> = {
  administrador:    'bg-gradient-to-br from-violet-400 to-violet-600',
  operaciones:      'bg-gradient-to-br from-blue-400 to-blue-600',
  docente_empleado: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
};

const DEFAULT_AVATAR_SOLID_CLASSES = 'bg-gradient-to-br from-gray-400 to-gray-500';

/** Variante para avatares circulares de fondo sólido + texto blanco. */
export function getRolAvatarSolidClasses(rol?: string | null): string {
  return ROL_AVATAR_SOLID_CLASSES[rol ?? ''] ?? DEFAULT_AVATAR_SOLID_CLASSES;
}
