// ============ LOGS SERVICE ============
// Registra y recupera el historial de acciones del sistema.
// Persiste en localStorage; listo para migrar a API REST.

export type LogModulo =
  | 'Equipos'
  | 'Tickets'
  | 'Stock'
  | 'Tareas'
  | 'Administración'
  | 'Sistema';

export interface LogEntry {
  id: string;
  accion: string;
  modulo: LogModulo;
  usuario: string;
  usuarioRol: string;
  fechaHora: string; // ISO 8601
}

const STORAGE_KEY = 'gestec_logs';
const MAX_LOGS = 500;

// ── Datos mock iniciales ───────────────────────────────────────────────────────
const MOCK_LOGS: LogEntry[] = [
  {
    id: 'ml-001',
    accion: 'Sesión iniciada',
    modulo: 'Sistema',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-10T08:01:00.000Z',
  },
  {
    id: 'ml-002',
    accion: 'Usuario "Laura Sánchez" creado con rol Docente/Empleado',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-10T08:15:22.000Z',
  },
  {
    id: 'ml-003',
    accion: 'Ubicación "Laboratorio de Informática 3 — 2° Piso" creada',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-10T08:47:05.000Z',
  },
  {
    id: 'ml-004',
    accion: 'Equipo "PC-LAB-042" registrado en Laboratorio 2, Planta Baja',
    modulo: 'Equipos',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-09T16:30:11.000Z',
  },
  {
    id: 'ml-005',
    accion: 'Ticket #TK-2024-089 resuelto — "Pantalla sin señal en aula 204"',
    modulo: 'Tickets',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-09T15:10:44.000Z',
  },
  {
    id: 'ml-006',
    accion: 'Entrada de stock: 10 unidades de "Mouse Inalámbrico Logitech M185"',
    modulo: 'Stock',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-09T11:20:33.000Z',
  },
  {
    id: 'ml-007',
    accion: 'Equipo "NB-ADM-015" editado — actualización de procesador y RAM',
    modulo: 'Equipos',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-08T17:00:57.000Z',
  },
  {
    id: 'ml-008',
    accion: 'Tarea "Revisión sala de servidores — piso 3" marcada como completada',
    modulo: 'Tareas',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-08T14:30:18.000Z',
  },
  {
    id: 'ml-009',
    accion: 'Ticket #TK-2024-088 asignado a Juan Pérez — "Impresora no imprime en secretaría"',
    modulo: 'Tickets',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-07T09:30:00.000Z',
  },
  {
    id: 'ml-010',
    accion: 'Salida de stock: 3 unidades de "Teclado USB HP"',
    modulo: 'Stock',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-04T16:00:22.000Z',
  },
  {
    id: 'ml-011',
    accion: 'Ticket #TK-2024-087 creado — "PC no enciende en aula 108"',
    modulo: 'Tickets',
    usuario: 'María García',
    usuarioRol: 'docente_empleado',
    fechaHora: '2026-04-04T10:15:39.000Z',
  },
  {
    id: 'ml-012',
    accion: 'Proveedor "TechSupply SA" creado',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-03T13:45:00.000Z',
  },
  {
    id: 'ml-013',
    accion: 'Marca "Samsung" creada',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-03T13:40:12.000Z',
  },
  {
    id: 'ml-014',
    accion: 'Equipo "PC-SEC-007" dado de baja (estado: Inactivo)',
    modulo: 'Equipos',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-04-02T11:00:05.000Z',
  },
  {
    id: 'ml-015',
    accion: 'Tarea "Instalación de software en aula 301" creada y asignada a Juan Pérez',
    modulo: 'Tareas',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'ml-016',
    accion: 'Tipo de componente "Placa de Red" creado',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-03-31T16:20:44.000Z',
  },
  {
    id: 'ml-017',
    accion: 'Entrada de stock: 5 unidades de "Disco SSD 480GB Kingston"',
    modulo: 'Stock',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-03-28T10:30:00.000Z',
  },
  {
    id: 'ml-018',
    accion: 'Usuario "Carlos López" editado — área actualizada a "Rectorado"',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-03-25T14:10:33.000Z',
  },
  {
    id: 'ml-019',
    accion: 'Ticket #TK-2024-085 resuelto — "Error al iniciar sesión en sistema académico"',
    modulo: 'Tickets',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-03-22T17:55:00.000Z',
  },
  {
    id: 'ml-020',
    accion: 'Ticket #TK-2024-084 creado — "Mouse roto en dirección"',
    modulo: 'Tickets',
    usuario: 'Carlos López',
    usuarioRol: 'docente_empleado',
    fechaHora: '2026-03-20T08:40:00.000Z',
  },
  {
    id: 'ml-021',
    accion: 'Equipo "PC-LAB-031" registrado con mantenimiento inicial',
    modulo: 'Equipos',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-03-18T11:25:17.000Z',
  },
  {
    id: 'ml-022',
    accion: 'Proveedor "InforComputer Ltda." editado — contacto actualizado',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-03-15T13:00:00.000Z',
  },
  {
    id: 'ml-023',
    accion: 'Salida de stock: 2 unidades de "Memoria RAM 8GB DDR4"',
    modulo: 'Stock',
    usuario: 'Juan Pérez',
    usuarioRol: 'operaciones',
    fechaHora: '2026-03-12T09:50:00.000Z',
  },
  {
    id: 'ml-024',
    accion: 'Ubicación "Decanato — 4° Piso" eliminada',
    modulo: 'Administración',
    usuario: 'Admin Sistema',
    usuarioRol: 'administrador',
    fechaHora: '2026-03-10T15:30:00.000Z',
  },
  {
    id: 'ml-025',
    accion: 'Sistema GESTEC iniciado — carga de datos inicial completada',
    modulo: 'Sistema',
    usuario: 'Sistema',
    usuarioRol: 'sistema',
    fechaHora: '2026-03-01T08:00:00.000Z',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const initLogs = (): LogEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as LogEntry[];
    } catch {
      // si el JSON está corrupto, reinicializar
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_LOGS));
  return MOCK_LOGS;
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Retorna todos los logs ordenados del más reciente al más antiguo. */
export const getLogs = (): LogEntry[] => {
  const logs = initLogs();
  return [...logs].sort(
    (a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime(),
  );
};

/** Agrega una nueva entrada al historial. */
export const addLog = (
  accion: string,
  modulo: LogModulo,
  usuario: string,
  usuarioRol: string,
): void => {
  const logs = initLogs();
  const newEntry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accion,
    modulo,
    usuario,
    usuarioRol,
    fechaHora: new Date().toISOString(),
  };
  const updated = [newEntry, ...logs].slice(0, MAX_LOGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

/** Elimina todo el historial y vuelve al estado vacío. */
export const clearLogs = (): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
};
