import * as http from './http';

// ── Auth: recuperación de contraseña ─────────────────────────────────────────
export async function solicitarRecuperacionPassword(email: string): Promise<{ message: string }> {
  return http.post('/auth/recuperar-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return http.post('/auth/reset-password', { token, password });
}

// ── Adjuntos: upload a Supabase Storage vía backend ──────────────────────────
export async function uploadAdjunto(
  fileOrBlob: File | Blob,
  nombre: string,
  context?: { ticketId?: string; tareaId?: string; comentarioTicketId?: string; comentarioTareaId?: string },
): Promise<import('../components/MultimediaUpload').Adjunto> {
  const formData = new FormData();
  formData.append('file', fileOrBlob, nombre);
  if (context?.ticketId) formData.append('ticketId', context.ticketId);
  if (context?.tareaId) formData.append('tareaId', context.tareaId);
  if (context?.comentarioTicketId) formData.append('comentarioTicketId', context.comentarioTicketId);
  if (context?.comentarioTareaId) formData.append('comentarioTareaId', context.comentarioTareaId);
  const raw = await http.uploadFile<any>('/adjuntos', formData);
  return { id: raw.id, nombre: raw.nombre, tipo: raw.tipo, url: raw.url, tamano: raw.tamano };
}

export async function deleteAdjunto(id: string): Promise<void> {
  return http.del(`/adjuntos/${id}`);
}

// ── Mappers: backend (relaciones anidadas) → frontend (campos planos) ─────

const toDateStr = (d: any): string => (d ? new Date(d).toISOString().split('T')[0] : '');

function mapComentario(c: any): any {
  return {
    id: c.id,
    autor: c.autor?.nombre ?? c.autor ?? '',
    fecha: c.fecha,
    texto: c.texto,
    esInterno: c.esInterno ?? false,
    adjuntos: (c.adjuntos ?? []).map((a: any) => ({ id: a.id, nombre: a.nombre, tipo: a.tipo, url: a.url, tamano: a.tamano })),
  };
}

function parseGB(str: string): number {
  if (!str) return 0;
  const m = str.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === 'MB') return v / 1024;
  if (u === 'TB') return v * 1024;
  return v;
}

function sumarCapacidad(modulos: any[]): string {
  const total = modulos.reduce((s, m) => s + parseGB(m.capacidad), 0);
  if (total === 0) return '';
  return `${total % 1 === 0 ? total : total.toFixed(1)} GB`;
}

const TIPOS_RAM         = ['RAM'];
const TIPOS_STORAGE     = ['SSD', 'HDD', 'M.2', 'SSHD'];
const TIPOS_PROCESADOR  = ['Procesador', 'CPU'];
const TIPOS_PLACA_VIDEO = ['Placa de video', 'GPU', 'Placa de Video'];
const TIPOS_PLACA_MADRE = ['Placa Madre', 'Placa madre', 'Motherboard'];

function mapActivo(a: any): any {
  const ub = a.ubicacion ?? {};
  const s = ub.sector ?? a.sector ?? '';
  const p = ub.piso ?? a.piso ?? '';
  const comps: any[] = a.componentes ?? [];

  const tipoNombre = (c: any) => c.tipoComponente?.nombre ?? '';

  const ramModulos = comps
    .filter(c => TIPOS_RAM.includes(tipoNombre(c)))
    .map(c => ({
      id: c.id, nroSerie: c.numeroSerie,
      marca: c.marca?.nombre ?? c.marca ?? '',
      modelo: c.modelo, capacidad: c.capacidad ?? '',
    }));

  const almacenamientoModulos = comps
    .filter(c => TIPOS_STORAGE.includes(tipoNombre(c)))
    .map(c => ({
      id: c.id, nroSerie: c.numeroSerie,
      tipo: tipoNombre(c),
      marca: c.marca?.nombre ?? c.marca ?? '',
      modelo: c.modelo, capacidad: c.capacidad ?? '',
    }));

  const procesador = comps.find(c => TIPOS_PROCESADOR.includes(tipoNombre(c)));
  const placaVideo  = comps.find(c => TIPOS_PLACA_VIDEO.includes(tipoNombre(c)));
  const placaMadre  = comps.find(c => TIPOS_PLACA_MADRE.includes(tipoNombre(c)));

  return {
    ...a,
    sector: s, piso: p,
    usuario: a.usuarioAsignado ?? a.usuario ?? '',
    fechaCambioPC: toDateStr(a.fechaCambioPC),
    fechaUltimoMantenimiento: toDateStr(a.fechaUltimoMantenimiento),
    codigo: a.nroPc, tipo: 'PC',
    ubicacion: s ? `${s} - ${p}` : '',
    responsable: a.usuarioAsignado ?? '', tags: [],
    microModelo:   procesador?.modelo       ?? a.microModelo   ?? '',
    microMarca:    procesador?.marca?.nombre ?? procesador?.marca ?? a.microMarca ?? '',
    microNroSerie: procesador?.numeroSerie  ?? a.microNroSerie ?? '',
    placaVideoModelo:    placaVideo?.modelo        ?? '',
    placaVideoMarca:     placaVideo?.marca?.nombre  ?? placaVideo?.marca ?? '',
    placaVideoNroSerie:  placaVideo?.numeroSerie    ?? '',
    placaVideoCapacidad: placaVideo?.capacidad      ?? '',
    placaMadreModelo:    placaMadre?.modelo        ?? '',
    placaMadreMarca:     placaMadre?.marca?.nombre  ?? placaMadre?.marca ?? '',
    placaMadreNroSerie:  placaMadre?.numeroSerie    ?? '',
    ramModulos,
    almacenamientoModulos,
    ramTotal: sumarCapacidad(ramModulos) || a.ramTotal || '',
    almacenamientoTotal: sumarCapacidad(almacenamientoModulos) || a.almacenamientoTotal || '',
    marca: procesador?.marca?.nombre ?? a.microMarca ?? '',
    modelo: procesador?.modelo ?? a.microModelo ?? '',
    historialMantenimiento: (a.mantenimientos ?? []).map((m: any) => ({
      id: m.id, fecha: toDateStr(m.fecha), tipo: m.tipo, descripcion: m.descripcion, tecnico: m.tecnico,
    })),
  };
}

function mapComponente(c: any): any {
  let ubicacion = 'Depósito IT';
  if (c.activo) {
    const sector = c.activo.ubicacion?.sector ?? '';
    ubicacion = sector ? `${c.activo.nroPc} — ${sector}` : c.activo.nroPc;
  }
  return {
    ...c,
    tipoComponente: c.tipoComponente?.nombre ?? c.tipoComponente ?? '',
    marca: c.marca?.nombre ?? c.marca ?? '',
    proveedor: c.proveedor?.nombre ?? c.proveedor ?? '',
    fecha: toDateStr(c.fechaIngreso ?? c.fecha),
    ubicacion,
  };
}

function mapTicket(t: any): any {
  return {
    ...t,
    creador: t.creador?.nombre ?? t.creador ?? '',
    creadorEmail: t.creador?.email ?? t.creadorEmail ?? '',
    asignado: t.asignado?.nombre ?? t.asignado,
    activo: t.activo?.nroPc ?? (typeof t.activo === 'string' ? t.activo : undefined),
    comentarios: (t.comentarios ?? []).map(mapComentario),
    adjuntos: (t.adjuntos ?? []).map((a: any) => ({
      id: a.id, nombre: a.nombre, tipo: a.tipo, url: a.url, tamano: a.tamano,
    })),
  };
}

const STOCK_MINIMOS: Record<string, number> = {
  'RAM': 2, 'SSD': 2, 'HDD': 1, 'M.2': 1,
  'Procesador': 1, 'Placa de video': 1, 'Fuente de alimentación': 1,
  'Cabezal de impresora': 1, 'Tóner': 2, 'Placa de red': 1, 'Batería': 1,
};

function mapStockItem(s: any): any {
  const cantidad = s.enDeposito ?? s.cantidad ?? 0;
  return {
    id: s.tipoComponenteId ?? s.id,
    nombre: s.nombre,
    categoria: 'Componentes',
    cantidad,
    minimo: STOCK_MINIMOS[s.nombre] ?? 1,
    ubicacion: 'Depósito IT',
    proveedor: undefined,
    estado: s.estado ?? calcularEstadoStock(cantidad),
    ultimaActualizacion: s.ultimaActualizacion ?? '',
    totalRegistrados: s.total ?? s.totalRegistrados ?? 0,
    instalados: s.instalados ?? 0,
  };
}

function mapTarea(t: any): any {
  return {
    ...t,
    ubicacion: t.ubicacionTexto ?? t.ubicacion,
    creadoPor: t.creadoPor?.nombre ?? t.creadoPor ?? '',
    finalizadoPor: t.finalizadoPor?.nombre ?? t.finalizadoPor,
    asignados: (t.asignados ?? []).map((a: any) => a.usuario?.nombre ?? a),
    comentarios: (t.comentarios ?? []).map(mapComentario),
    historial: (t.historial ?? []).map((h: any) => ({ fecha: h.fecha, accion: h.accion, usuario: h.usuario })),
    fechaLimite: t.fechaLimite ? toDateStr(t.fechaLimite) : undefined,
  };
}

// ── Write helpers: resuelven nombres de catálogo → IDs con caché ──────────

let _ubCache: any[] | null = null;
let _tiposIdCache: any[] | null = null;
let _marcasIdCache: any[] | null = null;
let _provIdCache: any[] | null = null;
let _usersIdCache: any[] | null = null;

const getUbCache = async () => { if (!_ubCache) _ubCache = await http.get<any[]>('/admin/ubicaciones'); return _ubCache!; };
const getTiposIdCache = async () => { if (!_tiposIdCache) _tiposIdCache = await http.get<any[]>('/admin/tipos-componente'); return _tiposIdCache!; };
const getMarcasIdCache = async () => { if (!_marcasIdCache) _marcasIdCache = await http.get<any[]>('/admin/marcas'); return _marcasIdCache!; };
const getProvIdCache = async () => { if (!_provIdCache) _provIdCache = await http.get<any[]>('/admin/proveedores'); return _provIdCache!; };
const getUsersIdCache = async () => { if (!_usersIdCache) _usersIdCache = await http.get<any[]>('/admin/usuarios'); return _usersIdCache!; };

async function activoPayload(a: any): Promise<any> {
  const { sector, piso, usuario, ubicacion: _ub, codigo, tipo, marca: _m, modelo: _mo,
    responsable, tags, historialMantenimiento, ramModulos, almacenamientoModulos,
    placaVideoNroSerie: _pvn, placaVideoMarca: _pvm, placaVideoModelo: _pvmo, placaVideoCapacidad: _pvca,
    placaMadreNroSerie: _pmn, placaMadreMarca: _pmm, placaMadreModelo: _pmmo,
    ...rest } = a;
  let ubicacionId = rest.ubicacionId;
  if (!ubicacionId && sector) {
    const ubs = await getUbCache();
    ubicacionId = ubs.find((u: any) => u.sector === sector)?.id;
  }
  const payload: any = { ...rest, ...(ubicacionId ? { ubicacionId } : {}), ...(usuario !== undefined ? { usuarioAsignado: usuario } : {}) };
  // Los inputs <type="date"> mandan "YYYY-MM-DD" — Prisma espera DateTime ISO completo
  if (payload.fechaCambioPC === '') payload.fechaCambioPC = null;
  else if (payload.fechaCambioPC) payload.fechaCambioPC = new Date(payload.fechaCambioPC).toISOString();
  if (payload.fechaUltimoMantenimiento === '') payload.fechaUltimoMantenimiento = null;
  else if (payload.fechaUltimoMantenimiento) payload.fechaUltimoMantenimiento = new Date(payload.fechaUltimoMantenimiento).toISOString();
  return payload;
}

async function componentePayload(c: any): Promise<any> {
  const { tipoComponente: tipoNombre, marca: marcaNombre, proveedor: provNombre, fecha, ubicacion: _ub, ...rest } = c;
  const [tipos, marcas, provs] = await Promise.all([getTiposIdCache(), getMarcasIdCache(), getProvIdCache()]);
  const tipoComponenteId = tipos.find((t: any) => t.nombre === tipoNombre)?.id;
  const marcaId = marcas.find((m: any) => m.nombre === marcaNombre)?.id;
  const proveedorId = provNombre ? provs.find((p: any) => p.nombre === provNombre)?.id : undefined;
  return { ...rest, ...(tipoComponenteId ? { tipoComponenteId } : {}), ...(marcaId ? { marcaId } : {}), ...(proveedorId ? { proveedorId } : {}) };
}

async function tareaPayload(t: any): Promise<any> {
  const { creadoPor, finalizadoPor, asignados, comentarios, historial, activoCodigo, adjuntos, ubicacion, ubicacionTexto: _ubt, ...rest } = t;
  return {
    ...rest,
    ...(ubicacion !== undefined ? { ubicacionTexto: ubicacion || null } : {}),
    ...(asignados !== undefined ? { asignadosNombres: asignados } : {}),
  };
}

// ============ TTL CACHE PARA LISTAS ============
// Evita refetches redundantes al navegar entre páginas. TTL: 60 s.
// Se invalida en cada mutación (create/update/delete) de la colección.
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000;

function cacheGet<T>(key: string): T | null {
  const e = _cache.get(key);
  return (e && Date.now() - e.ts < CACHE_TTL) ? (e.data as T) : null;
}
function cacheSet(key: string, data: unknown): void { _cache.set(key, { data, ts: Date.now() }); }
function cacheInvalidate(...keys: string[]): void { keys.forEach(k => _cache.delete(k)); }

// ============ EVENT BUS PARA ACTIVOS ============
type ActivosListener = () => void;
const activosListeners = new Set<ActivosListener>();
export const onActivosChange = (fn: ActivosListener) => { activosListeners.add(fn); };
export const offActivosChange = (fn: ActivosListener) => { activosListeners.delete(fn); };
const emitActivosChange = () => activosListeners.forEach(fn => fn());

// ============ AUTENTICACIÓN ============
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'operaciones' | 'docente_empleado';
  area?: string;
}

export const registrarse = async (nombre: string, email: string, password: string): Promise<{ message: string }> =>
  http.post<{ message: string }>('/auth/registro', { nombre, email, password });

export const verificarEmail = async (token: string): Promise<{ message: string }> =>
  http.get<{ message: string }>(`/auth/verificar/${token}`);

export const login = async (email: string, password: string): Promise<Usuario> => {
  const data = await http.post<{ token: string; usuario: Usuario }>('/auth/login', { email, password });
  localStorage.setItem('gestec_token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  return data.usuario;
};

export const logout = async (): Promise<void> => {
  localStorage.removeItem('gestec_token');
  localStorage.removeItem('usuario');
};

export const getCurrentUser = (): Usuario | null => {
  const userData = localStorage.getItem('usuario');
  return userData ? JSON.parse(userData) : null;
};

// ============ ACTIVOS ============
export interface MantenimientoRecord {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  tecnico: string;
}

export interface ModuloRAM {
  id: string;
  nroSerie: string;
  marca: string;
  modelo: string;
  capacidad: string;
}

export interface ModuloAlmacenamiento {
  id: string;
  nroSerie: string;
  tipo: string;
  marca: string;
  modelo: string;
  capacidad: string;
}

export interface Activo {
  id: string;
  sector: string;
  piso: string;
  oficina: string;
  nroPc: string;
  usuario: string;
  microModelo: string;
  microMarca: string;
  microNroSerie: string;
  ramModulos: ModuloRAM[];
  ramTotal: string;
  almacenamientoModulos: ModuloAlmacenamiento[];
  almacenamientoTotal: string;
  discoModelo: string;
  discoMarca: string;
  discoNroSerie: string;
  discoTotal: string;
  placaVideoModelo: string;
  placaVideoMarca: string;
  placaVideoNroSerie: string;
  placaVideoCapacidad: string;
  placaMadreModelo: string;
  placaMadreMarca: string;
  placaMadreNroSerie: string;
  ip: string;
  mac: string;
  idAD: string;
  pAD: string;
  sistemaOperativo: string;
  impresoraModelo: string;
  impresoraMarca: string;
  impresoraNroSerie: string;
  observaciones: string;
  fechaCambioPC: string;
  fechaUltimoMantenimiento: string;
  estado: 'activa' | 'inactiva';
  historialMantenimiento: MantenimientoRecord[];
  codigo: string;
  ubicacion: string;
  tipo: string;
  marca: string;
  modelo: string;
  responsable: string;
  tags: string[];
  ultimaIntervencion?: string;
  numeroSerie?: string;
  anioCompra?: number;
  caracteristicas?: Record<string, any>;
  perifericos?: string[];
}

export const SECTOR_PISO_MAP: Record<string, string> = {
  'Administración': 'Planta Baja',
  'Secretaría': 'Planta Baja',
  'Biblioteca': 'Planta Baja',
  'Recepción': 'Planta Baja',
  'Laboratorio 1': '1° Piso',
  'Laboratorio 2': '1° Piso',
  'Laboratorio 3': '1° Piso',
  'Aula 101': '1° Piso',
  'Aula 102': '1° Piso',
  'Decanato': '2° Piso',
  'Oficina Técnica': '2° Piso',
  'Sala de Reuniones': '2° Piso',
  'Aula 201': '2° Piso',
  'Aula 202': '2° Piso',
  'Depósito IT': 'Subsuelo',
};

export interface Intervencion {
  id: string;
  activoId: string;
  fecha: string;
  tipo: string;
  diagnostico: string;
  accion: string;
  repuestos: { item: string; cantidad: number }[];
  tecnico: string;
  tiempoEstimado?: number;
  tiempoReal?: number;
  resultado: string;
  comentarios?: string;
}

export const getActivos = async (filters?: any): Promise<Activo[]> => {
  if (!filters) {
    const hit = cacheGet<Activo[]>('activos');
    if (hit) return hit;
  }
  const params = new URLSearchParams();
  if (filters?.sector) params.set('sector', filters.sector);
  if (filters?.estado) params.set('estado', filters.estado);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  const result = await http.get<any[]>(`/activos${qs ? `?${qs}` : ''}`).then(arr => arr.map(mapActivo));
  if (!filters) cacheSet('activos', result);
  return result;
};

export const getActivoById = async (id: string): Promise<Activo | null> => {
  return http.get<any>(`/activos/${id}`).then(mapActivo);
};

export const createActivo = async (activo: Partial<Activo>): Promise<Activo> => {
  const payload = await activoPayload(activo);
  const result = await http.post<any>('/activos', payload).then(mapActivo);
  cacheInvalidate('activos');
  emitActivosChange();
  return result;
};

export const updateActivo = async (id: string, data: Partial<Activo>): Promise<Activo> => {
  const payload = await activoPayload(data);
  const result = await http.put<any>(`/activos/${id}`, payload).then(mapActivo);
  cacheInvalidate('activos');
  emitActivosChange();
  return result;
};

export const deleteActivo = async (id: string): Promise<void> => {
  await http.del(`/activos/${id}`);
  cacheInvalidate('activos');
  emitActivosChange();
};

export const getIntervenciones = async (activoId: string): Promise<Intervencion[]> => {
  return http.get<Intervencion[]>(`/activos/${activoId}/intervenciones`);
};

export const createIntervencion = async (intervencion: Partial<Intervencion>): Promise<Intervencion> => {
  const { activoId, ...rest } = intervencion;
  return http.post<Intervencion>(`/activos/${activoId}/intervenciones`, rest);
};

export const addMantenimientoRecord = async (activoId: string, data: Partial<MantenimientoRecord>): Promise<MantenimientoRecord> => {
  return http.post<MantenimientoRecord>(`/activos/${activoId}/mantenimiento`, data);
};

// ============ TICKETS ============
export interface Ticket {
  id: string;
  nro: number;
  titulo?: string;
  creador: string;
  creadorEmail: string;
  activo?: string;
  activoId?: string;
  ubicacion: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente' | null;
  estado: 'nuevo' | 'en_progreso' | 'resuelto';
  asignado?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  tipo: string;
  comentarios: Comentario[];
  adjuntos?: Adjunto[];
}

export interface Comentario {
  id: string;
  autor: string;
  fecha: string;
  texto: string;
  esInterno: boolean;
  adjuntos?: Adjunto[];
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'audio';
  url: string;
  tamano: string;
}

export const getTickets = async (filters?: any): Promise<Ticket[]> => {
  if (!filters) {
    const hit = cacheGet<Ticket[]>('tickets');
    if (hit) return hit;
  }
  const params = new URLSearchParams();
  if (filters?.estado) params.set('estado', filters.estado);
  if (filters?.prioridad) params.set('prioridad', filters.prioridad);
  if (filters?.asignado) params.set('asignado', filters.asignado);
  const qs = params.toString();
  const result = await http.get<any[]>(`/tickets${qs ? `?${qs}` : ''}`).then(arr => arr.map(mapTicket));
  if (!filters) cacheSet('tickets', result);
  return result;
};

export const getTicketById = async (id: string): Promise<Ticket | null> => {
  return http.get<any>(`/tickets/${id}`).then(mapTicket);
};

export const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
  const { activo: _a, adjuntos: localAdjuntos, creador: _c, creadorEmail: _ce, comentarios: _co, nro: _n, ...ticketPayload } = ticket as any;
  const created = await http.post<any>('/tickets', ticketPayload).then(mapTicket);
  if (localAdjuntos?.length) {
    await Promise.all((localAdjuntos as Adjunto[]).map(async (adj) => {
      const res = await fetch(adj.url);
      const blob = await res.blob();
      await uploadAdjunto(blob, adj.nombre, { ticketId: created.id });
    }));
  }
  cacheInvalidate('tickets');
  return http.get<any>(`/tickets/${created.id}`).then(mapTicket);
};

export const updateTicketStatus = async (id: string, estado: Ticket['estado'], asignado?: string): Promise<Ticket> => {
  cacheInvalidate('tickets');
  return http.put<any>(`/tickets/${id}`, { estado, asignado }).then(mapTicket);
};

export const updateTicketAdjuntos = async (
  id: string,
  nuevos: Adjunto[],
  previos: Adjunto[],
): Promise<void> => {
  const eliminados = previos.filter(p => !nuevos.some(n => n.id === p.id));
  const agregados = nuevos.filter(n => n.url.startsWith('data:') || n.url.startsWith('blob:'));
  await Promise.all([
    ...eliminados.map(a => deleteAdjunto(a.id)),
    ...agregados.map(async (adj) => {
      const res = await fetch(adj.url);
      const blob = await res.blob();
      await uploadAdjunto(blob, adj.nombre, { ticketId: id });
    }),
  ]);
};

export const updateTicket = async (id: string, data: Partial<Ticket>): Promise<Ticket> => {
  const { activo: _activo, creador: _creador, creadorEmail: _ce, comentarios: _com, adjuntos: _adj, ...payload } = data as any;
  cacheInvalidate('tickets');
  return http.put<any>(`/tickets/${id}`, payload).then(mapTicket);
};

export const deleteTicket = async (id: string): Promise<void> => {
  cacheInvalidate('tickets');
  return http.del(`/tickets/${id}`);
};

export const addComentario = async (ticketId: string, texto: string, esInterno: boolean): Promise<Comentario> => {
  return http.post<any>(`/tickets/${ticketId}/comentarios`, { texto, esInterno }).then(mapComentario);
};

// ============ STOCK ============
export interface StockItem {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  minimo: number;
  ubicacion: string;
  proveedor?: string;
  estado: 'ok' | 'bajo' | 'critico';
  ultimaActualizacion: string;
  totalRegistrados?: number;
  instalados?: number;
}

export interface StockMovimiento {
  id: string;
  itemId: string;
  itemNombre: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  fecha: string;
  usuario: string;
  referenciaIntervencion?: string;
}

export const calcularEstadoStock = (cantidad: number): 'ok' | 'bajo' | 'critico' => {
  if (cantidad <= 3) return 'critico';
  if (cantidad <= 10) return 'bajo';
  return 'ok';
};

export const getStock = async (filters?: any): Promise<StockItem[]> => {
  if (!filters) {
    const hit = cacheGet<StockItem[]>('stock');
    if (hit) return hit;
  }
  const params = new URLSearchParams();
  if (filters?.estado) params.set('estado', filters.estado);
  const qs = params.toString();
  const result = await http.get<any[]>(`/stock/componentes${qs ? `?${qs}` : ''}`).then(arr => arr.map(mapStockItem));
  if (!filters) cacheSet('stock', result);
  return result;
};

export const getStockById = async (id: string): Promise<StockItem | null> => {
  return http.get<StockItem>(`/stock/items/${id}`);
};

export const createStockMovimiento = async (movimiento: Partial<StockMovimiento>): Promise<StockMovimiento> => {
  cacheInvalidate('stock');
  return http.post<StockMovimiento>('/stock/movimientos', movimiento);
};

export const getStockMovimientos = async (itemId?: string): Promise<StockMovimiento[]> => {
  const qs = itemId ? `?itemId=${itemId}` : '';
  return http.get<StockMovimiento[]>(`/stock/movimientos${qs}`);
};

// ============ COMPONENTES ============
export interface TipoComponente {
  id: string;
  nombre: string;
}

export interface Marca {
  id: string;
  nombre: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
}

export interface Area {
  id: string;
  nombre: string;
}

export interface Componente {
  id: string;
  idManual: string;
  codigoExcel?: string;
  ubicacion: string;
  tipoComponente: string;
  fecha: string;
  responsable: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  proveedor: string;
  capacidad?: string;
  activoId?: string;
}

export interface HistorialMovimientoComponente {
  id: string;
  componenteId: string;
  activoId?: string;
  activoCodigo?: string;
  activoNombre?: string;
  accion: 'creado' | 'instalado' | 'removido' | 'transferido';
  ubicacionOrigen?: string;
  ubicacionDestino?: string;
  fecha: string;
  responsable: string;
  observaciones?: string;
}

export const getComponentes = async (): Promise<Componente[]> => {
  const hit = cacheGet<Componente[]>('componentes');
  if (hit) return hit;
  const result = await http.get<any[]>('/componentes').then(arr => arr.map(mapComponente));
  cacheSet('componentes', result);
  return result;
};

export const buscarComponentePorSerie = async (numeroSerie: string): Promise<Componente | null> => {
  return http.get<any>(`/componentes/serie/${encodeURIComponent(numeroSerie)}`).then(c => c ? mapComponente(c) : null);
};

export const buscarActivoPorNroPc = async (nroPc: string): Promise<{ id: string; nroPc: string } | null> => {
  return http.get<any>(`/activos/check/${encodeURIComponent(nroPc)}`);
};

export const createComponente = async (data: Omit<Componente, 'id'>): Promise<Componente> => {
  cacheInvalidate('componentes', 'stock');
  return componentePayload(data).then(p => http.post<any>('/componentes', p)).then(mapComponente);
};

export const updateComponente = async (id: string, data: Partial<Omit<Componente, 'id'>>): Promise<Componente> => {
  cacheInvalidate('componentes', 'stock');
  return componentePayload(data).then(p => http.put<any>(`/componentes/${id}`, p)).then(mapComponente);
};

export const deleteComponente = async (id: string): Promise<void> => {
  cacheInvalidate('componentes', 'stock');
  return http.del(`/componentes/${id}`);
};

export const getHistorialComponente = async (componenteId: string): Promise<HistorialMovimientoComponente[]> => {
  return http.get<HistorialMovimientoComponente[]>(`/componentes/${componenteId}/historial`);
};

// — Tipos de Componente —
export const getTiposComponente = async (): Promise<TipoComponente[]> => {
  return http.get<TipoComponente[]>('/admin/tipos-componente');
};

export const createTipoComponente = async (nombre: string): Promise<TipoComponente> => {
  return http.post<TipoComponente>('/admin/tipos-componente', { nombre });
};

export const updateTipoComponente = async (id: string, nombre: string): Promise<TipoComponente> => {
  return http.put<TipoComponente>(`/admin/tipos-componente/${id}`, { nombre });
};

export const deleteTipoComponente = async (id: string): Promise<void> => {
  return http.del(`/admin/tipos-componente/${id}`);
};

// — Marcas —
export const getMarcas = async (): Promise<Marca[]> => {
  return http.get<Marca[]>('/admin/marcas');
};

export const createMarca = async (nombre: string): Promise<Marca> => {
  return http.post<Marca>('/admin/marcas', { nombre });
};

export const updateMarca = async (id: string, nombre: string): Promise<Marca> => {
  return http.put<Marca>(`/admin/marcas/${id}`, { nombre });
};

export const deleteMarca = async (id: string): Promise<void> => {
  return http.del(`/admin/marcas/${id}`);
};

// — Proveedores —
export const getProveedores = async (): Promise<Proveedor[]> => {
  return http.get<Proveedor[]>('/admin/proveedores');
};

export const createProveedor = async (data: Omit<Proveedor, 'id'>): Promise<Proveedor> => {
  return http.post<Proveedor>('/admin/proveedores', data);
};

export const updateProveedor = async (id: string, data: Omit<Proveedor, 'id'>): Promise<Proveedor> => {
  return http.put<Proveedor>(`/admin/proveedores/${id}`, data);
};

export const deleteProveedor = async (id: string): Promise<void> => {
  return http.del(`/admin/proveedores/${id}`);
};

// — Áreas —
export const getAreas = async (): Promise<Area[]> => {
  return http.get<Area[]>('/admin/areas');
};

export const createArea = async (nombre: string): Promise<Area> => {
  return http.post<Area>('/admin/areas', { nombre });
};

export const updateArea = async (id: string, nombre: string): Promise<Area> => {
  return http.put<Area>(`/admin/areas/${id}`, { nombre });
};

export const deleteArea = async (id: string): Promise<void> => {
  return http.del(`/admin/areas/${id}`);
};

// ============ TAREAS ============
export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_curso' | 'finalizada';
  fechaLimite?: string;
  ubicacion?: string;
  activoId?: string;
  activoCodigo?: string;
  creadoPor: string;
  asignados?: string[];
  finalizadoPor?: string;
  fechaCreacion: string;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  historial: { fecha: string; accion: string; usuario: string }[];
  comentarios: Comentario[];
  adjuntos?: Adjunto[];
}

export const getTareas = async (estado?: string): Promise<Tarea[]> => {
  if (!estado) {
    const hit = cacheGet<Tarea[]>('tareas');
    if (hit) return hit;
  }
  const qs = estado ? `?estado=${estado}` : '';
  const result = await http.get<any[]>(`/tareas${qs}`).then(arr => arr.map(mapTarea));
  if (!estado) cacheSet('tareas', result);
  return result;
};

export const getTareaById = async (id: string): Promise<Tarea | null> => {
  return http.get<any>(`/tareas/${id}`).then(mapTarea);
};

export const createTarea = async (tarea: Partial<Tarea>): Promise<Tarea> => {
  const localAdjuntos = tarea.adjuntos;
  const payload = await tareaPayload(tarea);
  const created = await http.post<any>('/tareas', payload).then(mapTarea);
  if (localAdjuntos?.length) {
    await Promise.all((localAdjuntos as Adjunto[]).map(async (adj) => {
      const blob = await fetch(adj.url).then(r => r.blob());
      await uploadAdjunto(blob, adj.nombre, { tareaId: created.id });
    }));
  }
  return getTareaById(created.id).then(t => t ?? created);
};

export const updateTaskStatus = async (id: string, estado: Tarea['estado'], asignados?: string[]): Promise<Tarea> => {
  let asignadosIds: string[] | undefined;
  if (asignados?.length) {
    const users = await getUsersIdCache();
    asignadosIds = asignados.map(n => users.find((u: any) => u.nombre === n)?.id).filter(Boolean);
  }
  cacheInvalidate('tareas');
  return http.patch<any>(`/tareas/${id}/estado`, { estado, asignadosIds }).then(mapTarea);
};

export const addComentarioTarea = async (tareaId: string, texto: string, adjuntos?: Adjunto[]): Promise<Comentario> => {
  const comentario = await http.post<any>(`/tareas/${tareaId}/comentarios`, { texto }).then(mapComentario);
  if (adjuntos?.length) {
    const uploaded = await Promise.all(adjuntos.map(async (adj) => {
      const blob = await fetch(adj.url).then(r => r.blob());
      return uploadAdjunto(blob, adj.nombre, { comentarioTareaId: comentario.id });
    }));
    comentario.adjuntos = uploaded;
  }
  return comentario;
};

export const updateComentarioTarea = async (tareaId: string, comentarioId: string, nuevoTexto: string): Promise<Comentario> => {
  return http.put<any>(`/tareas/${tareaId}/comentarios/${comentarioId}`, { texto: nuevoTexto }).then(mapComentario);
};

export const deleteComentarioTarea = async (tareaId: string, comentarioId: string): Promise<void> => {
  return http.del(`/tareas/${tareaId}/comentarios/${comentarioId}`);
};

export const updateTarea = async (id: string, cambios: Partial<Tarea>): Promise<Tarea> => {
  cacheInvalidate('tareas');
  return tareaPayload(cambios).then(p => http.put<any>(`/tareas/${id}`, p)).then(mapTarea);
};

export const deleteTarea = async (id: string): Promise<void> => {
  cacheInvalidate('tareas');
  return http.del(`/tareas/${id}`);
};

// ============ INFORMACIÓN DE OPERACIONES ============
export interface InfoOperaciones {
  telefono: string;
  telefonoInterno: string;
  horariosAtencion: string;
  mailsContacto: string[];
}

const mapInfo = (r: any): InfoOperaciones => ({
  telefono: r.telefono ?? '',
  telefonoInterno: r.telefonoInterno ?? '',
  horariosAtencion: r.horariosAtencion ?? '',
  mailsContacto: (r.emails ?? []).map((e: any) => e.email ?? e),
});

export const getInfoOperaciones = async (): Promise<InfoOperaciones> => {
  return http.get<any>('/info').then(mapInfo);
};

export const updateInfoOperaciones = async (data: InfoOperaciones): Promise<InfoOperaciones> => {
  return http.put<any>('/info', {
    telefono: data.telefono,
    telefonoInterno: data.telefonoInterno,
    horariosAtencion: data.horariosAtencion,
    emails: data.mailsContacto,
  }).then(mapInfo);
};

// ============ ADMINISTRACIÓN ============
export const getUsuarios = async (): Promise<Usuario[]> => {
  return http.get<Usuario[]>('/admin/usuarios');
};

export const updateUsuario = async (id: string, data: Partial<Usuario>): Promise<Usuario> => {
  return http.put<Usuario>(`/admin/usuarios/${id}`, data);
};

export const toggleBloqueoUsuario = async (id: string): Promise<Usuario> => {
  return http.patch<Usuario>(`/admin/usuarios/${id}/bloquear`, {});
};

export const deleteUsuario = async (id: string): Promise<void> => {
  return http.del(`/admin/usuarios/${id}`);
};

export const createUsuario = async (usuario: Partial<Usuario> & { password?: string }): Promise<Usuario> => {
  return http.post<Usuario>('/admin/usuarios', usuario);
};

// ── Ubicaciones estructuradas ──────────────────────────────────────────────
export interface UbicacionEntry {
  id: string;
  sector: string;
  piso: string;
}

export const getPisoForSector = (sector: string): string =>
  SECTOR_PISO_MAP[sector] ?? '';

export const getUbicacionesStruct = async (): Promise<UbicacionEntry[]> => {
  return http.get<UbicacionEntry[]>('/admin/ubicaciones');
};

export const createUbicacionEntry = async (data: Omit<UbicacionEntry, 'id'>): Promise<UbicacionEntry> => {
  return http.post<UbicacionEntry>('/admin/ubicaciones', data);
};

export const updateUbicacionEntry = async (id: string, data: Omit<UbicacionEntry, 'id'>): Promise<UbicacionEntry> => {
  return http.put<UbicacionEntry>(`/admin/ubicaciones/${id}`, data);
};

export const deleteUbicacionEntry = async (id: string): Promise<void> => {
  return http.del(`/admin/ubicaciones/${id}`);
};

// Catálogos estáticos
export const getTiposActivo = async (): Promise<string[]> => {
  return ['Computadora de escritorio', 'Laptop', 'Impresora', 'Escáner', 'Televisor', 'Proyector', 'Router', 'Switch'];
};

export const getUbicaciones = async (): Promise<string[]> => {
  return http.get<UbicacionEntry[]>('/admin/ubicaciones').then(arr =>
    arr.map(u => u.sector).sort((a, b) => a.localeCompare(b, 'es'))
  );
};

export const getEstados = async (): Promise<{ value: string; label: string }[]> => {
  return [
    { value: 'activa', label: 'Activa' },
    { value: 'inactiva', label: 'Inactiva' },
  ];
};

export const getSectores = async (): Promise<string[]> => {
  return http.get<UbicacionEntry[]>('/admin/ubicaciones').then(arr =>
    arr.map(u => u.sector).sort((a, b) => a.localeCompare(b))
  );
};

// ============ NOTIFICACIONES Y EMAILS ============
export interface NotificationEmailData {
  to: string;
  reportes: Ticket[];
  usuarioNombre: string;
}

export const sendNotificationEmail = async (_data: NotificationEmailData): Promise<void> => {
  // Sin implementación de backend
};

export interface Notificacion {
  id: string;
  tipo: string;
  mensaje: string;
  tareaId?: string | null;
  leida: boolean;
  fecha: string;
}

export const getNotificaciones = async (): Promise<Notificacion[]> => {
  return http.get<Notificacion[]>('/notificaciones');
};

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  return http.patch<void>(`/notificaciones/${id}/leida`, {});
};

export const marcarTodasNotificacionesLeidas = async (): Promise<void> => {
  return http.patch<void>('/notificaciones/leidas', {});
};
