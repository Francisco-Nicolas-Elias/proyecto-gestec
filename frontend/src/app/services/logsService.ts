import * as http from './http';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

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
  detalle?: string; // JSON: { campos: { "Campo": ["antes", "después"] } }
  modulo: LogModulo;
  usuario: string;
  usuarioRol: string;
  fechaHora: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gestec_logs';
const MAX_LOGS = 500;

const MOCK_LOGS: LogEntry[] = [
  { id: 'ml-001', accion: 'Sesión iniciada', modulo: 'Sistema', usuario: 'Admin Sistema', usuarioRol: 'administrador', fechaHora: '2026-04-10T08:01:00.000Z' },
  { id: 'ml-002', accion: 'Usuario "Laura Sánchez" creado con rol Docente/Empleado', modulo: 'Administración', usuario: 'Admin Sistema', usuarioRol: 'administrador', fechaHora: '2026-04-10T08:15:22.000Z' },
  { id: 'ml-003', accion: 'Ubicación "Laboratorio de Informática 3 — 2° Piso" creada', modulo: 'Administración', usuario: 'Admin Sistema', usuarioRol: 'administrador', fechaHora: '2026-04-10T08:47:05.000Z' },
  { id: 'ml-004', accion: 'Equipo "PC-LAB-042" registrado en Laboratorio 2, Planta Baja', modulo: 'Equipos', usuario: 'Juan Pérez', usuarioRol: 'operaciones', fechaHora: '2026-04-09T16:30:11.000Z' },
  { id: 'ml-005', accion: 'Ticket #TK-2024-089 resuelto — "Pantalla sin señal en aula 204"', modulo: 'Tickets', usuario: 'Juan Pérez', usuarioRol: 'operaciones', fechaHora: '2026-04-09T15:10:44.000Z' },
  { id: 'ml-006', accion: 'Entrada de stock: 10 unidades de "Mouse Inalámbrico Logitech M185"', modulo: 'Stock', usuario: 'Admin Sistema', usuarioRol: 'administrador', fechaHora: '2026-04-09T11:20:33.000Z' },
  { id: 'ml-007', accion: 'Equipo "NB-ADM-015" editado — actualización de procesador y RAM', modulo: 'Equipos', usuario: 'Juan Pérez', usuarioRol: 'operaciones', fechaHora: '2026-04-08T17:00:57.000Z' },
  { id: 'ml-008', accion: 'Tarea "Revisión sala de servidores — piso 3" marcada como completada', modulo: 'Tareas', usuario: 'Juan Pérez', usuarioRol: 'operaciones', fechaHora: '2026-04-08T14:30:18.000Z' },
  { id: 'ml-009', accion: 'Ticket #TK-2024-088 asignado a Juan Pérez', modulo: 'Tickets', usuario: 'Admin Sistema', usuarioRol: 'administrador', fechaHora: '2026-04-07T09:30:00.000Z' },
  { id: 'ml-010', accion: 'Salida de stock: 3 unidades de "Teclado USB HP"', modulo: 'Stock', usuario: 'Juan Pérez', usuarioRol: 'operaciones', fechaHora: '2026-04-04T16:00:22.000Z' },
];

const initLogs = (): LogEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored) as LogEntry[]; } catch { /* corrupted */ }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_LOGS));
  return MOCK_LOGS;
};

// ── API pública ───────────────────────────────────────────────────────────────

export const getLogs = async (): Promise<LogEntry[]> => {
  if (USE_MOCK) {
    const logs = initLogs();
    return [...logs].sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
  }
  return http.get<any[]>('/admin/logs').then(rows =>
    rows.map(r => ({
      ...r,
      usuario: r.usuarioNombre ?? r.usuario ?? '',
    }))
  );
};

export const clearLogs = async (): Promise<void> => {
  if (USE_MOCK) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return;
  }
  return http.del('/admin/logs');
};

/** En modo real los logs los escribe el backend; en mock escribe en localStorage. */
export const addLog = (accion: string, modulo: LogModulo, usuario: string, usuarioRol: string): void => {
  if (!USE_MOCK) return;
  const logs = initLogs();
  const newEntry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accion, modulo, usuario, usuarioRol,
    fechaHora: new Date().toISOString(),
  };
  const updated = [newEntry, ...logs].slice(0, MAX_LOGS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
