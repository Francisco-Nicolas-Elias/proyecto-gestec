// API Client con funciones mock para simular backend
// En producción, estas funciones harán fetch a endpoints REST reales

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const MOCK_USUARIOS: Usuario[] = [
  { id: '1', nombre: 'Admin Sistema', email: 'admin@institucion.edu', rol: 'administrador', area: 'IT' },
  { id: '2', nombre: 'Juan Pérez', email: 'jperez@institucion.edu', rol: 'operaciones', area: 'Soporte Técnico' },
  { id: '3', nombre: 'María García', email: 'mgarcia@institucion.edu', rol: 'docente_empleado', area: 'Matemáticas' },
  { id: '4', nombre: 'Carlos López', email: 'clopez@institucion.edu', rol: 'docente_empleado', area: 'Administración' },
];

export const login = async (email: string, password: string): Promise<Usuario> => {
  await delay(500);
  
  // Mock: acepta cualquier contraseña
  const usuario = MOCK_USUARIOS.find(u => u.email === email);
  if (!usuario) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return usuario;
};

export const logout = async (): Promise<void> => {
  await delay(200);
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

// Módulo de RAM individual
export interface ModuloRAM {
  id: string;
  nroSerie: string;
  marca: string;
  modelo: string;
  capacidad: string;
}

// Módulo de almacenamiento individual (HDD, SSD, M.2)
export interface ModuloAlmacenamiento {
  id: string;
  nroSerie: string;
  tipo: string;       // HDD | SSD | M.2 (tomado de tipoComponente en el catálogo)
  marca: string;
  modelo: string;
  capacidad: string;
}

export interface Activo {
  id: string;
  // Ubicación
  sector: string;
  piso: string;
  oficina: string;
  // Identificación
  nroPc: string;
  usuario: string;
  // Micro
  microModelo: string;
  microMarca: string;
  microNroSerie: string;
  // RAM - array de módulos
  ramModulos: ModuloRAM[];
  ramTotal: string;
  // Almacenamiento - array de dispositivos (HDD, SSD, M.2)
  almacenamientoModulos: ModuloAlmacenamiento[];
  almacenamientoTotal: string;
  // Disco (campos legacy para compatibilidad)
  discoModelo: string;
  discoMarca: string;
  discoNroSerie: string;
  discoTotal: string;
  // Placa de video
  placaVideoModelo: string;
  placaVideoMarca: string;
  placaVideoNroSerie: string;
  // Red
  ip: string;
  mac: string;
  idAD: string;
  pAD: string;
  // Sistema
  sistemaOperativo: string;
  // Impresora / Observaciones
  impresoraModelo: string;
  impresoraMarca: string;
  impresoraNroSerie: string;
  observaciones: string;
  // Gestión
  fechaCambioPC: string;
  fechaUltimoMantenimiento: string;
  estado: 'activa' | 'inactiva';
  historialMantenimiento: MantenimientoRecord[];
  // Campos de compatibilidad (derivados)
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

// Mapeo sector → piso
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

const MOCK_ACTIVOS: Activo[] = [
  {
    id: '1', nroPc: 'PC001', sector: 'Laboratorio 1', piso: '1° Piso', oficina: 'Lab Informática',
    usuario: 'Prof. Ana Martínez',
    microModelo: 'Core i5-10400', microMarca: 'Intel', microNroSerie: 'SN-CPU-001',
    ramModulos: [
      { id: 'ram-1-1', nroSerie: 'SN-RAM-001', marca: 'Kingston', modelo: 'ValueRAM DDR4', capacidad: '8GB' }
    ],
    ramTotal: '8GB',
    almacenamientoModulos: [
      { id: 'dsk-1-1', nroSerie: 'SN-DSK-001', tipo: 'SSD', marca: 'WD', modelo: 'Blue SSD', capacidad: '480GB' },
    ],
    almacenamientoTotal: '480 GB',
    discoModelo: 'Blue 480GB SSD', discoMarca: 'WD', discoNroSerie: 'SN-DSK-001', discoTotal: '480GB',
    placaVideoModelo: 'UHD 630', placaVideoMarca: 'Intel', placaVideoNroSerie: '',
    ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', idAD: 'lab1-pc01', pAD: '2090bcba',
    sistemaOperativo: '10 LTSC',
    impresoraModelo: 'LaserJet M15a', impresoraMarca: 'HP', impresoraNroSerie: 'SN-IMP-001',
    observaciones: 'PC de uso general. Monitor 21".',
    fechaCambioPC: '2022-03-15', fechaUltimoMantenimiento: '2025-01-10', estado: 'activa',
    historialMantenimiento: [
      { id: 'm1', fecha: '2025-01-10', tipo: 'Preventivo', descripcion: 'Limpieza interna, actualización SO', tecnico: 'Juan Pérez' },
      { id: 'm2', fecha: '2024-06-20', tipo: 'Preventivo', descripcion: 'Limpieza y verificación general', tecnico: 'Juan Pérez' },
      { id: 'm3', fecha: '2023-12-05', tipo: 'Correctivo', descripcion: 'Reemplazo pasta térmica CPU', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC001', ubicacion: 'Laboratorio 1 - 1° Piso', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Prof. Ana Martínez', tags: ['laboratorio', 'windows'],
  },
  {
    id: '2', nroPc: 'PC002', sector: 'Laboratorio 1', piso: '1° Piso', oficina: 'Lab Informática',
    usuario: 'Prof. Ana Martínez',
    microModelo: 'Core i5-10400', microMarca: 'Intel', microNroSerie: 'SN-CPU-002',
    ramModulos: [
      { id: 'ram-2-1', nroSerie: 'SN-RAM-002A', marca: 'Kingston', modelo: 'ValueRAM DDR4', capacidad: '4GB' },
      { id: 'ram-2-2', nroSerie: 'SN-RAM-002B', marca: 'Kingston', modelo: 'ValueRAM DDR4', capacidad: '4GB' }
    ],
    ramTotal: '8GB',
    almacenamientoModulos: [
      { id: 'dsk-2-1', nroSerie: 'SN-DSK-002', tipo: 'SSD', marca: 'WD', modelo: 'Blue SSD', capacidad: '480GB' },
    ],
    almacenamientoTotal: '480 GB',
    discoModelo: 'Blue 480GB SSD', discoMarca: 'WD', discoNroSerie: 'SN-DSK-002', discoTotal: '480GB',
    placaVideoModelo: 'UHD 630', placaVideoMarca: 'Intel', placaVideoNroSerie: '',
    ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:02', idAD: 'lab1-pc02', pAD: '1430defg',
    sistemaOperativo: '10 LTSC', impresoraModelo: '', impresoraMarca: '', impresoraNroSerie: '', observaciones: '',
    fechaCambioPC: '2022-03-15', fechaUltimoMantenimiento: '2025-01-10', estado: 'activa',
    historialMantenimiento: [
      { id: 'm4', fecha: '2025-01-10', tipo: 'Preventivo', descripcion: 'Limpieza interna, actualización SO', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC002', ubicacion: 'Laboratorio 1 - 1° Piso', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Prof. Ana Martínez', tags: ['laboratorio'],
  },
  {
    id: '3', nroPc: 'PC010', sector: 'Administración', piso: 'Planta Baja', oficina: 'Oficina 01',
    usuario: 'Carlos López',
    microModelo: 'Core i7-11700', microMarca: 'Intel', microNroSerie: 'SN-CPU-010',
    ramModulos: [
      { id: 'ram-3-1', nroSerie: 'SN-RAM-010A', marca: 'Corsair', modelo: 'Vengeance DDR4', capacidad: '8GB' },
      { id: 'ram-3-2', nroSerie: 'SN-RAM-010B', marca: 'Corsair', modelo: 'Vengeance DDR4', capacidad: '8GB' }
    ],
    ramTotal: '16GB',
    almacenamientoModulos: [
      { id: 'dsk-3-1', nroSerie: 'SN-DSK-010', tipo: 'SSD', marca: 'Samsung', modelo: '870 EVO', capacidad: '1TB' },
    ],
    almacenamientoTotal: '1 TB',
    discoModelo: '870 EVO 1TB', discoMarca: 'Samsung', discoNroSerie: 'SN-DSK-010', discoTotal: '1TB',
    placaVideoModelo: 'GTX 1650', placaVideoMarca: 'NVIDIA', placaVideoNroSerie: 'SN-GPU-010',
    ip: '192.168.2.10', mac: 'AA:BB:CC:DD:FF:10', idAD: 'adm-pc10', pAD: '7561caef',
    sistemaOperativo: '11 Pro',
    impresoraModelo: 'L3250', impresoraMarca: 'Epson', impresoraNroSerie: 'SN-IMP-010',
    observaciones: 'PC de gerencia. Requiere contraseña BIOS.',
    fechaCambioPC: '2023-08-01', fechaUltimoMantenimiento: '2024-11-15', estado: 'activa',
    historialMantenimiento: [
      { id: 'm5', fecha: '2024-11-15', tipo: 'Preventivo', descripcion: 'Actualización de drivers y limpieza', tecnico: 'Juan Pérez' },
      { id: 'm6', fecha: '2024-05-20', tipo: 'Correctivo', descripcion: 'Formateo y reinstalación Windows 11', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC010', ubicacion: 'Administración - Planta Baja', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Carlos López', tags: ['administración'],
  },
  {
    id: '4', nroPc: 'PC020', sector: 'Secretaría', piso: 'Planta Baja', oficina: 'Secretaría General',
    usuario: 'María García',
    microModelo: 'Core i3-10100', microMarca: 'Intel', microNroSerie: 'SN-CPU-020',
    ramModulos: [
      { id: 'ram-4-1', nroSerie: 'SN-RAM-020', marca: 'Kingston', modelo: 'ValueRAM DDR4', capacidad: '8GB' }
    ],
    ramTotal: '8GB',
    almacenamientoModulos: [
      { id: 'dsk-4-1', nroSerie: 'SN-DSK-020', tipo: 'HDD', marca: 'Seagate', modelo: 'Barracuda', capacidad: '500GB' },
    ],
    almacenamientoTotal: '500 GB',
    discoModelo: '500GB HDD', discoMarca: 'Seagate', discoNroSerie: 'SN-DSK-020', discoTotal: '500GB',
    placaVideoModelo: 'UHD 630', placaVideoMarca: 'Intel', placaVideoNroSerie: '',
    ip: '192.168.2.20', mac: 'AA:BB:CC:DD:FF:20', idAD: 'sec-pc20', pAD: '0123abcd',
    sistemaOperativo: '10 LTSC', impresoraModelo: 'DeskJet 2775', impresoraMarca: 'HP', impresoraNroSerie: 'SN-IMP-020',
    observaciones: 'PC con escáner HP integrado.',
    fechaCambioPC: '2021-05-10', fechaUltimoMantenimiento: '2024-09-08', estado: 'activa',
    historialMantenimiento: [
      { id: 'm7', fecha: '2024-09-08', tipo: 'Preventivo', descripcion: 'Limpieza y desfragmentación', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC020', ubicacion: 'Secretaría - Planta Baja', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'María García', tags: ['secretaría'],
  },
  {
    id: '5', nroPc: 'PC030', sector: 'Decanato', piso: '2° Piso', oficina: 'Oficina Decanato',
    usuario: 'Dr. Roberto Díaz',
    microModelo: 'Core i9-12900', microMarca: 'Intel', microNroSerie: 'SN-CPU-030',
    ramModulos: [
      { id: 'ram-5-1', nroSerie: 'SN-RAM-030A', marca: 'Corsair', modelo: 'Dominator DDR5', capacidad: '16GB' },
      { id: 'ram-5-2', nroSerie: 'SN-RAM-030B', marca: 'Corsair', modelo: 'Dominator DDR5', capacidad: '16GB' }
    ],
    ramTotal: '32GB',
    almacenamientoModulos: [
      { id: 'dsk-5-1', nroSerie: 'SN-DSK-030', tipo: 'M.2', marca: 'Samsung', modelo: '980 Pro NVMe', capacidad: '2TB' },
    ],
    almacenamientoTotal: '2 TB',
    discoModelo: '980 Pro 2TB NVMe', discoMarca: 'Samsung', discoNroSerie: 'SN-DSK-030', discoTotal: '2TB',
    placaVideoModelo: 'RTX 3060', placaVideoMarca: 'NVIDIA', placaVideoNroSerie: 'SN-GPU-030',
    ip: '192.168.3.30', mac: 'AA:BB:CC:EE:FF:30', idAD: 'dec-pc30', pAD: '4567fghi',
    sistemaOperativo: '11 Pro', impresoraModelo: 'MFC-L8900CDW', impresoraMarca: 'Brother', impresoraNroSerie: 'SN-IMP-030',
    observaciones: 'Equipo de alto rendimiento para Decanato.',
    fechaCambioPC: '2024-01-20', fechaUltimoMantenimiento: '2025-02-01', estado: 'activa',
    historialMantenimiento: [
      { id: 'm8', fecha: '2025-02-01', tipo: 'Preventivo', descripcion: 'Revisión general y actualización de BIOS', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC030', ubicacion: 'Decanato - 2° Piso', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Dr. Roberto Díaz', tags: ['decanato'],
  },
  {
    id: '6', nroPc: 'PC050', sector: 'Laboratorio 2', piso: '1° Piso', oficina: 'Lab Redes',
    usuario: 'Sin asignar',
    microModelo: 'Ryzen 5 5600G', microMarca: 'AMD', microNroSerie: 'SN-CPU-050',
    ramModulos: [
      { id: 'ram-6-1', nroSerie: 'SN-RAM-050', marca: 'Kingston', modelo: 'Fury Beast DDR4', capacidad: '16GB' }
    ],
    ramTotal: '16GB',
    almacenamientoModulos: [
      { id: 'dsk-6-1', nroSerie: 'SN-DSK-050', tipo: 'SSD', marca: 'WD', modelo: 'Blue SSD', capacidad: '1TB' },
    ],
    almacenamientoTotal: '1 TB',
    discoModelo: 'Blue 1TB SSD', discoMarca: 'WD', discoNroSerie: 'SN-DSK-050', discoTotal: '1TB',
    placaVideoModelo: 'Radeon Vega 7', placaVideoMarca: 'AMD', placaVideoNroSerie: '',
    ip: '192.168.1.150', mac: 'BB:CC:DD:EE:FF:50', idAD: 'lab2-pc50', pAD: '8901jabc',
    sistemaOperativo: 'WS 2022', impresoraModelo: '', impresoraMarca: '', impresoraNroSerie: '',
    observaciones: 'Servidor de laboratorio en modo servidor.',
    fechaCambioPC: '2023-03-10', fechaUltimoMantenimiento: '2024-12-01', estado: 'activa',
    historialMantenimiento: [
      { id: 'm9', fecha: '2024-12-01', tipo: 'Preventivo', descripcion: 'Actualización WS 2022, parches de seguridad', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC050', ubicacion: 'Laboratorio 2 - 1° Piso', tipo: 'PC', marca: 'AMD', modelo: 'Custom Build', responsable: 'Sin asignar', tags: ['laboratorio', 'servidor'],
  },
  {
    id: '7', nroPc: 'PC100', sector: 'Oficina Técnica', piso: '2° Piso', oficina: 'Soporte IT',
    usuario: 'Juan Pérez',
    microModelo: 'Core i7-12700K', microMarca: 'Intel', microNroSerie: 'SN-CPU-100',
    ramModulos: [
      { id: 'ram-7-1', nroSerie: 'SN-RAM-100A', marca: 'Corsair', modelo: 'Vengeance DDR4', capacidad: '16GB' },
      { id: 'ram-7-2', nroSerie: 'SN-RAM-100B', marca: 'Corsair', modelo: 'Vengeance DDR4', capacidad: '16GB' }
    ],
    ramTotal: '32GB',
    almacenamientoModulos: [
      { id: 'dsk-7-1', nroSerie: 'SN-DSK-100', tipo: 'SSD', marca: 'Samsung', modelo: '870 EVO', capacidad: '500GB' },
      { id: 'dsk-7-2', nroSerie: 'SN-DSK-100B', tipo: 'HDD', marca: 'Seagate', modelo: 'Barracuda', capacidad: '1TB' },
    ],
    almacenamientoTotal: '1.5 TB',
    discoModelo: '870 EVO 500GB', discoMarca: 'Samsung', discoNroSerie: 'SN-DSK-100', discoTotal: '500GB',
    placaVideoModelo: 'GTX 1660 Ti', placaVideoMarca: 'NVIDIA', placaVideoNroSerie: 'SN-GPU-100',
    ip: '192.168.3.100', mac: 'CC:DD:EE:FF:AA:00', idAD: 'it-pc100', pAD: '2431hija',
    sistemaOperativo: '11 Pro', impresoraModelo: 'imageCLASS MF743Cdw', impresoraMarca: 'Canon', impresoraNroSerie: 'SN-IMP-100',
    observaciones: 'PC del técnico principal. Tiene acceso admin de dominio.',
    fechaCambioPC: '2023-11-15', fechaUltimoMantenimiento: '2025-03-01', estado: 'activa',
    historialMantenimiento: [
      { id: 'm10', fecha: '2025-03-01', tipo: 'Preventivo', descripcion: 'Verificación completa, sin observaciones', tecnico: 'Admin Sistema' },
    ],
    codigo: 'PC100', ubicacion: 'Oficina Técnica - 2° Piso', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Juan Pérez', tags: ['it', 'soporte'],
  },
  {
    id: '8', nroPc: 'PC075', sector: 'Biblioteca', piso: 'Planta Baja', oficina: 'Sala de Consulta',
    usuario: 'Lic. Susana Vera',
    microModelo: 'Core i3-12100', microMarca: 'Intel', microNroSerie: 'SN-CPU-075',
    ramModulos: [
      { id: 'ram-8-1', nroSerie: 'SN-RAM-075', marca: 'Kingston', modelo: 'ValueRAM DDR4', capacidad: '8GB' }
    ],
    ramTotal: '8GB',
    almacenamientoModulos: [
      { id: 'dsk-8-1', nroSerie: 'SN-DSK-075', tipo: 'SSD', marca: 'WD', modelo: 'Blue SSD', capacidad: '240GB' },
    ],
    almacenamientoTotal: '240 GB',
    discoModelo: 'Blue 240GB SSD', discoMarca: 'WD', discoNroSerie: 'SN-DSK-075', discoTotal: '240GB',
    placaVideoModelo: 'UHD 730', placaVideoMarca: 'Intel', placaVideoNroSerie: '',
    ip: '192.168.2.75', mac: 'DD:EE:FF:00:11:75', idAD: 'bib-pc75', pAD: '1682efgh',
    sistemaOperativo: '10 LTSC', impresoraModelo: 'LaserJet M428fdw', impresoraMarca: 'HP', impresoraNroSerie: 'SN-IMP-075',
    observaciones: 'PC de consulta pública. Acceso restringido.',
    fechaCambioPC: '2022-09-05', fechaUltimoMantenimiento: '2024-10-20', estado: 'inactiva',
    historialMantenimiento: [
      { id: 'm11', fecha: '2024-10-20', tipo: 'Correctivo', descripcion: 'PC inactiva por falla en fuente. En espera de repuesto.', tecnico: 'Juan Pérez' },
      { id: 'm12', fecha: '2024-04-10', tipo: 'Preventivo', descripcion: 'Limpieza y verificación general', tecnico: 'Juan Pérez' },
    ],
    codigo: 'PC075', ubicacion: 'Biblioteca - Planta Baja', tipo: 'PC', marca: 'Intel', modelo: 'Custom Build', responsable: 'Lic. Susana Vera', tags: ['biblioteca'],
  },
];

const MOCK_INTERVENCIONES: Intervencion[] = [
  {
    id: '1',
    activoId: '1',
    fecha: '2024-01-15',
    tipo: 'Mantenimiento preventivo',
    diagnostico: 'Revisión general programada',
    accion: 'Limpieza interna, actualización de sistema operativo',
    repuestos: [],
    tecnico: 'Juan Pérez',
    tiempoEstimado: 60,
    tiempoReal: 55,
    resultado: 'Equipo funcionando correctamente',
  },
  {
    id: '2',
    activoId: '2',
    fecha: '2024-02-08',
    tipo: 'Reparación',
    diagnostico: 'Sistema de inyección de tinta obstruido',
    accion: 'Reemplazo de cabezal de impresión',
    repuestos: [{ item: 'Cabezal Epson L3250', cantidad: 1 }],
    tecnico: 'Juan Pérez',
    tiempoEstimado: 120,
    tiempoReal: 150,
    resultado: 'En proceso - esperando repuesto',
  },
];

export const getActivos = async (filters?: any): Promise<Activo[]> => {
  await delay(300);
  let activos = [...MOCK_ACTIVOS];
  if (filters?.sector) activos = activos.filter(a => a.sector === filters.sector);
  if (filters?.estado) activos = activos.filter(a => a.estado === filters.estado);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    activos = activos.filter(a =>
      a.nroPc.toLowerCase().includes(q) ||
      a.usuario.toLowerCase().includes(q) ||
      a.sector.toLowerCase().includes(q) ||
      a.ip.toLowerCase().includes(q) ||
      a.sistemaOperativo.toLowerCase().includes(q)
    );
  }
  return activos;
};

export const getActivoById = async (id: string): Promise<Activo | null> => {
  await delay(200);
  return MOCK_ACTIVOS.find(a => a.id === id) || null;
};

export const createActivo = async (activo: Partial<Activo>): Promise<Activo> => {
  await delay(400);
  const piso = activo.piso || SECTOR_PISO_MAP[activo.sector || ''] || '';
  const newActivo: Activo = {
    id: Date.now().toString(),
    nroPc: activo.nroPc || '', sector: activo.sector || '', piso, oficina: activo.oficina || '',
    usuario: activo.usuario || '',
    microModelo: activo.microModelo || '', microMarca: activo.microMarca || '', microNroSerie: activo.microNroSerie || '',
    ramModulos: activo.ramModulos || [], ramTotal: activo.ramTotal || '',
    almacenamientoModulos: activo.almacenamientoModulos || [], almacenamientoTotal: activo.almacenamientoTotal || '',
    discoModelo: activo.discoModelo || '', discoMarca: activo.discoMarca || '', discoNroSerie: activo.discoNroSerie || '', discoTotal: activo.discoTotal || '',
    placaVideoModelo: activo.placaVideoModelo || '', placaVideoMarca: activo.placaVideoMarca || '', placaVideoNroSerie: activo.placaVideoNroSerie || '',
    ip: activo.ip || '', mac: activo.mac || '', idAD: activo.idAD || '', pAD: activo.pAD || '',
    sistemaOperativo: activo.sistemaOperativo || '',
    impresoraModelo: activo.impresoraModelo || '', impresoraMarca: activo.impresoraMarca || '', impresoraNroSerie: activo.impresoraNroSerie || '',
    observaciones: activo.observaciones || '',
    fechaCambioPC: activo.fechaCambioPC || '', fechaUltimoMantenimiento: activo.fechaUltimoMantenimiento || '',
    estado: activo.estado || 'activa', historialMantenimiento: activo.historialMantenimiento || [],
    codigo: activo.nroPc || '', ubicacion: `${activo.sector || ''} - ${piso}`,
    tipo: 'PC', marca: activo.microMarca || '', modelo: activo.microModelo || '',
    responsable: activo.usuario || '', tags: [],
  };
  MOCK_ACTIVOS.push(newActivo);
  emitActivosChange();
  return newActivo;
};

export const updateActivo = async (id: string, data: Partial<Activo>): Promise<Activo> => {
  await delay(400);
  const index = MOCK_ACTIVOS.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Activo no encontrado');
  const base = MOCK_ACTIVOS[index];
  const piso = data.piso || (data.sector ? SECTOR_PISO_MAP[data.sector] : base.piso) || base.piso;
  MOCK_ACTIVOS[index] = {
    ...base, ...data, piso,
    codigo: data.nroPc || base.nroPc,
    ubicacion: `${data.sector || base.sector} - ${piso}`,
    marca: data.microMarca || base.microMarca,
    modelo: data.microModelo || base.microModelo,
    responsable: data.usuario || base.usuario,
  };
  emitActivosChange();
  return MOCK_ACTIVOS[index];
};

export const deleteActivo = async (id: string): Promise<void> => {
  await delay(300);
  const index = MOCK_ACTIVOS.findIndex(a => a.id === id);
  if (index === -1) throw new Error('Activo no encontrado');
  MOCK_ACTIVOS.splice(index, 1);
  emitActivosChange();
};

export const getIntervenciones = async (activoId: string): Promise<Intervencion[]> => {
  await delay(200);
  return MOCK_INTERVENCIONES.filter(i => i.activoId === activoId);
};

export const createIntervencion = async (intervencion: Partial<Intervencion>): Promise<Intervencion> => {
  await delay(400);
  const newIntervencion: Intervencion = {
    id: Date.now().toString(),
    activoId: intervencion.activoId || '',
    fecha: intervencion.fecha || new Date().toISOString().split('T')[0],
    tipo: intervencion.tipo || '',
    diagnostico: intervencion.diagnostico || '',
    accion: intervencion.accion || '',
    repuestos: intervencion.repuestos || [],
    tecnico: intervencion.tecnico || '',
    resultado: intervencion.resultado || '',
    ...intervencion,
  };
  MOCK_INTERVENCIONES.push(newIntervencion);
  return newIntervencion;
};

// ============ TICKETS ============
export interface Ticket {
  id: string;
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
  adjuntos?: Adjunto[]; // Soporte para adjuntos en comentarios de tareas
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'audio';
  url: string;
  tamano: string;
}

const MOCK_TICKETS: Ticket[] = [
  {
    id: '1',
    titulo: 'PC se reinicia sola',
    creador: 'María García',
    creadorEmail: 'mgarcia@institucion.edu',
    activoId: '1',
    activo: 'PC-LAB-001',
    ubicacion: 'Laboratorio 1 - Edificio A - Piso 2',
    descripcion: 'La computadora se reinicia sola durante las clases',
    prioridad: 'alta',
    estado: 'en_progreso',
    asignado: 'Juan Pérez',
    fechaCreacion: '2026-03-12T08:30:00',
    fechaActualizacion: '2026-03-12T14:20:00',
    tipo: 'Falla de hardware',
    comentarios: [
      {
        id: '1',
        autor: 'Juan Pérez',
        fecha: '2026-03-12T10:15:00',
        texto: 'Revisando el equipo. Probablemente sobrecalentamiento.',
        esInterno: true,
      },
      {
        id: '2',
        autor: 'Juan Pérez',
        fecha: '2026-03-12T14:20:00',
        texto: 'Limpieza realizada. Monitoreando estabilidad.',
        esInterno: false,
      },
    ],
  },
  {
    id: '2',
    titulo: 'Problema de conectividad WiFi',
    creador: 'Carlos López',
    creadorEmail: 'clopez@institucion.edu',
    ubicacion: 'Oficina 205 - Edificio B - Piso 2',
    descripcion: 'No puedo conectarme a la red wifi',
    prioridad: 'media',
    estado: 'resuelto',
    asignado: 'Juan Pérez',
    fechaCreacion: '2026-03-28T09:00:00',
    fechaActualizacion: '2026-03-29T11:00:00',
    tipo: 'Conectividad',
    comentarios: [],
  },
  {
    id: '3',
    titulo: 'Proyector no enciende',
    creador: 'Ana Martínez',
    creadorEmail: 'amartinez@institucion.edu',
    ubicacion: 'Aula 305 - Edificio A - Piso 3',
    descripcion: 'El proyector del aula no enciende, revisé los cables y están bien conectados',
    prioridad: 'alta',
    estado: 'en_progreso',
    asignado: 'Juan Pérez',
    fechaCreacion: '2026-04-05T10:30:00',
    fechaActualizacion: '2026-04-05T10:30:00',
    tipo: 'Falla de hardware',
    comentarios: [],
  },
  {
    id: '4',
    titulo: 'Teclado con teclas trabadas',
    creador: 'Carlos López',
    creadorEmail: 'clopez@institucion.edu',
    ubicacion: 'Administración - Planta Baja',
    descripcion: 'Varias teclas del teclado quedan trabadas al presionarlas',
    prioridad: 'baja',
    estado: 'nuevo',
    fechaCreacion: '2026-04-18T14:00:00',
    fechaActualizacion: '2026-04-18T14:00:00',
    tipo: 'Periféricos',
    comentarios: [],
  },
  {
    id: '5',
    titulo: 'Monitor con líneas horizontales',
    creador: 'María García',
    creadorEmail: 'mgarcia@institucion.edu',
    ubicacion: 'Secretaría - Planta Baja',
    descripcion: 'El monitor muestra líneas horizontales intermitentes',
    prioridad: 'urgente',
    estado: 'nuevo',
    fechaCreacion: '2026-05-02T09:15:00',
    fechaActualizacion: '2026-05-02T09:15:00',
    tipo: 'Falla de hardware',
    comentarios: [],
  },
  {
    id: '6',
    titulo: 'Impresora no imprime en color',
    creador: 'Ana Martínez',
    creadorEmail: 'amartinez@institucion.edu',
    ubicacion: 'Biblioteca - Planta Baja',
    descripcion: 'La impresora solo imprime en blanco y negro aunque está configurada para color',
    prioridad: 'media',
    estado: 'nuevo',
    fechaCreacion: '2026-05-08T11:00:00',
    fechaActualizacion: '2026-05-08T11:00:00',
    tipo: 'Periféricos',
    comentarios: [],
  },
];

export const getTickets = async (filters?: any): Promise<Ticket[]> => {
  await delay(300);
  let tickets = [...MOCK_TICKETS];
  
  const usuario = getCurrentUser();
  
  // Filtrar por rol
  if (usuario?.rol === 'docente_empleado') {
    tickets = tickets.filter(t => t.creadorEmail === usuario.email);
  }
  
  if (filters?.estado) {
    tickets = tickets.filter(t => t.estado === filters.estado);
  }
  if (filters?.prioridad) {
    tickets = tickets.filter(t => t.prioridad === filters.prioridad);
  }
  if (filters?.asignado) {
    tickets = tickets.filter(t => t.asignado === filters.asignado);
  }
  
  return tickets.sort((a, b) => parseInt(a.id) - parseInt(b.id));
};

export const getTicketById = async (id: string): Promise<Ticket | null> => {
  await delay(200);
  return MOCK_TICKETS.find(t => t.id === id) || null;
};

export const createTicket = async (ticket: Partial<Ticket>): Promise<Ticket> => {
  await delay(400);
  const usuario = getCurrentUser();
  const nextId = (Math.max(0, ...MOCK_TICKETS.map(t => parseInt(t.id) || 0)) + 1).toString();
  const newTicket: Ticket = {
    id: nextId,
    creador: usuario?.nombre || '',
    creadorEmail: usuario?.email || '',
    ubicacion: ticket.ubicacion || '',
    descripcion: ticket.descripcion || '',
    prioridad: ticket.prioridad ?? null,
    estado: 'nuevo',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    tipo: ticket.tipo || '',
    comentarios: [],
    adjuntos: ticket.adjuntos || [],
    ...ticket,
  };
  MOCK_TICKETS.push(newTicket);
  return newTicket;
};

export const updateTicketStatus = async (id: string, estado: Ticket['estado'], asignado?: string): Promise<Ticket> => {
  await delay(300);
  const index = MOCK_TICKETS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Ticket no encontrado');
  
  MOCK_TICKETS[index].estado = estado;
  MOCK_TICKETS[index].fechaActualizacion = new Date().toISOString();
  if (asignado) MOCK_TICKETS[index].asignado = asignado;
  
  return MOCK_TICKETS[index];
};

export const updateTicketAdjuntos = async (id: string, adjuntos: Adjunto[]): Promise<Ticket> => {
  await delay(250);
  const index = MOCK_TICKETS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Ticket no encontrado');
  MOCK_TICKETS[index].adjuntos = adjuntos;
  MOCK_TICKETS[index].fechaActualizacion = new Date().toISOString();
  return MOCK_TICKETS[index];
};

export const updateTicket = async (id: string, data: Partial<Ticket>): Promise<Ticket> => {
  await delay(400);
  const index = MOCK_TICKETS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Ticket no encontrado');
  MOCK_TICKETS[index] = {
    ...MOCK_TICKETS[index],
    ...data,
    fechaActualizacion: new Date().toISOString(),
  };
  return MOCK_TICKETS[index];
};

export const deleteTicket = async (id: string): Promise<void> => {
  await delay(300);
  const index = MOCK_TICKETS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Ticket no encontrado');
  MOCK_TICKETS.splice(index, 1);
};

export const addComentario = async (ticketId: string, texto: string, esInterno: boolean): Promise<Comentario> => {
  await delay(300);
  const usuario = getCurrentUser();
  const comentario: Comentario = {
    id: Date.now().toString(),
    autor: usuario?.nombre || '',
    fecha: new Date().toISOString(),
    texto,
    esInterno,
  };
  
  const ticket = MOCK_TICKETS.find(t => t.id === ticketId);
  if (ticket) {
    ticket.comentarios.push(comentario);
    ticket.fechaActualizacion = new Date().toISOString();
  }
  
  return comentario;
};

// ============ STOCK ============
export interface StockItem {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;      // Unidades disponibles en Depósito IT
  minimo: number;        // Mínimo de repuesto requerido
  ubicacion: string;
  proveedor?: string;
  estado: 'ok' | 'bajo' | 'critico';
  ultimaActualizacion: string;
  totalRegistrados?: number; // Total de componentes de este tipo (instalados + depósito)
  instalados?: number;       // Componentes instalados en activos
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

const MOCK_STOCK: StockItem[] = [
  {
    id: '1',
    nombre: 'Memoria RAM DDR4 8GB',
    categoria: 'Componentes',
    cantidad: 5,
    minimo: 3,
    ubicacion: 'Depósito IT',
    proveedor: 'TechSupply SA',
    estado: 'bajo',
    ultimaActualizacion: '2024-02-05',
  },
  {
    id: '2',
    nombre: 'Cabezal Epson L3250',
    categoria: 'Repuestos Impresoras',
    cantidad: 1,
    minimo: 2,
    ubicacion: 'Depósito IT',
    proveedor: 'Epson Argentina',
    estado: 'critico',
    ultimaActualizacion: '2024-02-08',
  },
  {
    id: '3',
    nombre: 'Teclado USB',
    categoria: 'Periféricos',
    cantidad: 0,
    minimo: 5,
    ubicacion: 'Depósito IT',
    proveedor: 'Logitech',
    estado: 'critico',
    ultimaActualizacion: '2024-02-01',
  },
];

const MOCK_MOVIMIENTOS: StockMovimiento[] = [
  {
    id: '1',
    itemId: '2',
    itemNombre: 'Cabezal Epson L3250',
    tipo: 'salida',
    cantidad: 1,
    motivo: 'Usado en reparación IMP-ADM-005',
    fecha: '2024-02-08T14:30:00',
    usuario: 'Juan Pérez',
    referenciaIntervencion: '2',
  },
];

// Mínimos de repuesto en depósito por tipo de componente
const STOCK_MINIMOS: Record<string, number> = {
  'RAM': 2, 'SSD': 2, 'HDD': 1, 'M.2': 1,
  'Procesador': 1, 'Placa de video': 1, 'Fuente de alimentación': 1,
  'Cabezal de impresora': 1, 'Tóner': 2, 'Placa de red': 1, 'Batería': 1,
};

// 0–3 → crítico | 4–10 → bajo | 11+ → ok
export const calcularEstadoStock = (cantidad: number): 'ok' | 'bajo' | 'critico' => {
  if (cantidad <= 3) return 'critico';
  if (cantidad <= 10) return 'bajo';
  return 'ok';
};

// getStock deriva automáticamente desde MOCK_COMPONENTES
export const getStock = async (filters?: any): Promise<StockItem[]> => {
  await delay(300);

  // Agregar por tipoComponente
  const groups: Record<string, { total: number; enDeposito: number; instalados: number; fecha: string }> = {};
  for (const c of MOCK_COMPONENTES) {
    if (!groups[c.tipoComponente]) {
      groups[c.tipoComponente] = { total: 0, enDeposito: 0, instalados: 0, fecha: c.fecha };
    }
    const g = groups[c.tipoComponente];
    g.total++;
    if (c.activoId) g.instalados++;
    else g.enDeposito++;
    if (c.fecha > g.fecha) g.fecha = c.fecha;
  }

  let items: StockItem[] = Object.entries(groups).map(([tipo, g]) => {
    const minimo = STOCK_MINIMOS[tipo] ?? 1;
    const cantidad = g.enDeposito; // "disponible" = lo que está en depósito
    const estado = calcularEstadoStock(cantidad);
    return {
      id: tipo,
      nombre: tipo,
      categoria: 'Componentes',
      cantidad,
      minimo,
      ubicacion: 'Depósito IT',
      proveedor: undefined,
      estado,
      ultimaActualizacion: g.fecha,
      totalRegistrados: g.total,
      instalados: g.instalados,
    };
  });

  if (filters?.estado) items = items.filter(i => i.estado === filters.estado);
  if (filters?.categoria) items = items.filter(i => i.categoria === filters.categoria);

  return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
};

export const getStockById = async (id: string): Promise<StockItem | null> => {
  await delay(200);
  return MOCK_STOCK.find(s => s.id === id) || null;
};

export const createStockMovimiento = async (movimiento: Partial<StockMovimiento>): Promise<StockMovimiento> => {
  await delay(400);
  const usuario = getCurrentUser();
  const newMovimiento: StockMovimiento = {
    id: Date.now().toString(),
    itemId: movimiento.itemId || '',
    itemNombre: movimiento.itemNombre || '',
    tipo: movimiento.tipo || 'ajuste',
    cantidad: movimiento.cantidad || 0,
    motivo: movimiento.motivo || '',
    fecha: new Date().toISOString(),
    usuario: usuario?.nombre || '',
    ...movimiento,
  };
  
  MOCK_MOVIMIENTOS.push(newMovimiento);
  return newMovimiento;
};

export const getStockMovimientos = async (itemId?: string): Promise<StockMovimiento[]> => {
  await delay(300);
  if (itemId) {
    return MOCK_MOVIMIENTOS.filter(m => m.itemId === itemId);
  }
  return [...MOCK_MOVIMIENTOS].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
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

export interface Componente {
  id: string;        // ID interno (autogenerado, nunca visible en UI)
  idManual: string;  // ID visible para el usuario
  ubicacion: string;
  tipoComponente: string;
  fecha: string;
  responsable: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  proveedor: string;
  capacidad?: string; // Ej: 8GB, 480GB — opcional para tipos sin capacidad
  activoId?: string;  // ID del activo al que está instalado (undefined = en Depósito IT)
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

let MOCK_TIPOS_COMPONENTE: TipoComponente[] = [
  { id: '1',  nombre: 'RAM' },
  { id: '2',  nombre: 'SSD' },
  { id: '3',  nombre: 'HDD' },
  { id: '4',  nombre: 'Procesador' },
  { id: '5',  nombre: 'Fuente de alimentación' },
  { id: '6',  nombre: 'Placa de red' },
  { id: '7',  nombre: 'Placa de video' },
  { id: '8',  nombre: 'Cabezal de impresora' },
  { id: '9',  nombre: 'M.2' },
  { id: '10', nombre: 'Tóner' },
  { id: '11', nombre: 'Batería' },
];

let MOCK_MARCAS: Marca[] = [
  { id: '1', nombre: 'Samsung' },
  { id: '2', nombre: 'Kingston' },
  { id: '3', nombre: 'Western Digital' },
  { id: '4', nombre: 'Seagate' },
  { id: '5', nombre: 'Intel' },
  { id: '6', nombre: 'AMD' },
  { id: '7', nombre: 'Crucial' },
  { id: '8', nombre: 'Corsair' },
  { id: '9', nombre: 'HP' },
  { id: '10', nombre: 'Epson' },
  { id: '11', nombre: 'Logitech' },
];

let MOCK_PROVEEDORES: Proveedor[] = [
  { id: '1', nombre: 'TechSupply SA',      contacto: 'ventas@techsupply.com.ar',  telefono: '011 4321-5678' },
  { id: '2', nombre: 'InfoTech Argentina', contacto: 'info@infotech.com.ar',      telefono: '011 5555-1234' },
  { id: '3', nombre: 'PC Market',          contacto: 'ventas@pcmarket.com.ar',    telefono: '0351 422-9900' },
  { id: '4', nombre: 'Epson Argentina',    contacto: 'soporte@epson.com.ar',      telefono: '0800-999-3776' },
  { id: '5', nombre: 'Logitech',           contacto: 'latam@logitech.com',        telefono: '' },
];

let MOCK_COMPONENTES: Componente[] = [
  // CPUs — todos instalados en activos
  { id: 'c-cpu-001', idManual: 'CPU-001', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-001', marca: 'Intel', modelo: 'Core i5-10400', proveedor: 'TechSupply SA', activoId: '1' },
  { id: 'c-cpu-002', idManual: 'CPU-002', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-002', marca: 'Intel', modelo: 'Core i5-10400', proveedor: 'TechSupply SA', activoId: '2' },
  { id: 'c-cpu-010', idManual: 'CPU-010', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-010', marca: 'Intel', modelo: 'Core i7-11700', proveedor: 'TechSupply SA', activoId: '3' },
  { id: 'c-cpu-020', idManual: 'CPU-020', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-020', marca: 'Intel', modelo: 'Core i3-10100', proveedor: 'TechSupply SA', activoId: '4' },
  { id: 'c-cpu-030', idManual: 'CPU-030', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-030', marca: 'Intel', modelo: 'Core i9-12900', proveedor: 'TechSupply SA', activoId: '5' },
  { id: 'c-cpu-050', idManual: 'CPU-050', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-050', marca: 'AMD', modelo: 'Ryzen 5 5600G', proveedor: 'TechSupply SA', activoId: '6' },
  { id: 'c-cpu-075', idManual: 'CPU-075', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-075', marca: 'Intel', modelo: 'Core i3-12100', proveedor: 'TechSupply SA', activoId: '8' },
  { id: 'c-cpu-100', idManual: 'CPU-100', ubicacion: 'Depósito IT', tipoComponente: 'Procesador', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-CPU-100', marca: 'Intel', modelo: 'Core i7-12700K', proveedor: 'TechSupply SA', activoId: '7' },

  // RAMs — instaladas en activos
  { id: 'c-ram-001', idManual: 'RAM-001', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-001', marca: 'Kingston', modelo: 'ValueRAM DDR4', proveedor: 'TechSupply SA', capacidad: '8GB', activoId: '1' },
  { id: 'c-ram-002a', idManual: 'RAM-002A', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-002A', marca: 'Kingston', modelo: 'ValueRAM DDR4', proveedor: 'TechSupply SA', capacidad: '4GB', activoId: '2' },
  { id: 'c-ram-002b', idManual: 'RAM-002B', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-002B', marca: 'Kingston', modelo: 'ValueRAM DDR4', proveedor: 'TechSupply SA', capacidad: '4GB', activoId: '2' },
  { id: 'c-ram-010a', idManual: 'RAM-010A', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-010A', marca: 'Corsair', modelo: 'Vengeance DDR4', proveedor: 'TechSupply SA', capacidad: '8GB', activoId: '3' },
  { id: 'c-ram-010b', idManual: 'RAM-010B', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-010B', marca: 'Corsair', modelo: 'Vengeance DDR4', proveedor: 'TechSupply SA', capacidad: '8GB', activoId: '3' },
  { id: 'c-ram-020', idManual: 'RAM-020', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-020', marca: 'Kingston', modelo: 'ValueRAM DDR4', proveedor: 'TechSupply SA', capacidad: '4GB', activoId: '4' },
  { id: 'c-ram-030a', idManual: 'RAM-030A', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-030A', marca: 'Corsair', modelo: 'Dominator DDR5', proveedor: 'TechSupply SA', capacidad: '16GB', activoId: '5' },
  { id: 'c-ram-030b', idManual: 'RAM-030B', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-030B', marca: 'Corsair', modelo: 'Dominator DDR5', proveedor: 'TechSupply SA', capacidad: '16GB', activoId: '5' },
  { id: 'c-ram-050', idManual: 'RAM-050', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-050', marca: 'Kingston', modelo: 'Fury Beast DDR4', proveedor: 'TechSupply SA', capacidad: '8GB', activoId: '6' },
  { id: 'c-ram-075', idManual: 'RAM-075', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-075', marca: 'Kingston', modelo: 'ValueRAM DDR4', proveedor: 'TechSupply SA', capacidad: '8GB', activoId: '8' },
  { id: 'c-ram-100a', idManual: 'RAM-100A', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-100A', marca: 'Corsair', modelo: 'Vengeance DDR4', proveedor: 'TechSupply SA', capacidad: '16GB', activoId: '7' },
  { id: 'c-ram-100b', idManual: 'RAM-100B', ubicacion: 'Depósito IT', tipoComponente: 'RAM', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-RAM-100B', marca: 'Corsair', modelo: 'Vengeance DDR4', proveedor: 'TechSupply SA', capacidad: '16GB', activoId: '7' },

  // Discos — instalados en activos; M.2 en depósito como repuesto
  { id: 'c-dsk-001', idManual: 'DSK-001', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-001', marca: 'WD', modelo: 'Blue SSD', proveedor: 'TechSupply SA', capacidad: '480GB', activoId: '1' },
  { id: 'c-dsk-002', idManual: 'DSK-002', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-002', marca: 'WD', modelo: 'Blue SSD', proveedor: 'TechSupply SA', capacidad: '480GB', activoId: '2' },
  { id: 'c-dsk-010', idManual: 'DSK-010', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-010', marca: 'Samsung', modelo: '870 EVO', proveedor: 'TechSupply SA', capacidad: '1TB', activoId: '3' },
  { id: 'c-dsk-020', idManual: 'DSK-020', ubicacion: 'Depósito IT', tipoComponente: 'HDD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-020', marca: 'Seagate', modelo: 'Barracuda', proveedor: 'TechSupply SA', capacidad: '500GB', activoId: '4' },
  { id: 'c-dsk-030', idManual: 'DSK-030', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-030', marca: 'Samsung', modelo: '980 Pro NVMe', proveedor: 'TechSupply SA', capacidad: '2TB', activoId: '5' },
  { id: 'c-dsk-050', idManual: 'DSK-050', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-050', marca: 'WD', modelo: 'Blue SSD', proveedor: 'TechSupply SA', capacidad: '1TB', activoId: '6' },
  { id: 'c-dsk-075', idManual: 'DSK-075', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-075', marca: 'WD', modelo: 'Blue SSD', proveedor: 'TechSupply SA', capacidad: '240GB', activoId: '8' },
  { id: 'c-dsk-100', idManual: 'DSK-100', ubicacion: 'Depósito IT', tipoComponente: 'SSD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-100', marca: 'Samsung', modelo: '870 EVO', proveedor: 'TechSupply SA', capacidad: '500GB', activoId: '7' },
  { id: 'c-dsk-100b', idManual: 'DSK-100B', ubicacion: 'Depósito IT', tipoComponente: 'HDD', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-DSK-100B', marca: 'Seagate', modelo: 'Barracuda', proveedor: 'TechSupply SA', capacidad: '1TB', activoId: '7' },
  { id: 'c-dsk-m2-001', idManual: 'M2-001', ubicacion: 'Depósito IT', tipoComponente: 'M.2', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-M2-001', marca: 'Samsung', modelo: '980 Pro NVMe', proveedor: 'TechSupply SA', capacidad: '512GB' },
  { id: 'c-dsk-m2-002', idManual: 'M2-002', ubicacion: 'Depósito IT', tipoComponente: 'M.2', fecha: '2024-03-15', responsable: 'Juan Pérez', numeroSerie: 'SN-M2-002', marca: 'WD', modelo: 'Black SN850X', proveedor: 'TechSupply SA', capacidad: '1TB' },

  // Placas de video — instaladas en activos
  { id: 'c-gpu-010', idManual: 'GPU-010', ubicacion: 'Depósito IT', tipoComponente: 'Placa de video', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-GPU-010', marca: 'NVIDIA', modelo: 'GTX 1650', proveedor: 'TechSupply SA', activoId: '3' },
  { id: 'c-gpu-030', idManual: 'GPU-030', ubicacion: 'Depósito IT', tipoComponente: 'Placa de video', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-GPU-030', marca: 'NVIDIA', modelo: 'RTX 3060', proveedor: 'TechSupply SA', activoId: '5' },
  { id: 'c-gpu-100', idManual: 'GPU-100', ubicacion: 'Depósito IT', tipoComponente: 'Placa de video', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-GPU-100', marca: 'NVIDIA', modelo: 'GTX 1660 Ti', proveedor: 'TechSupply SA', activoId: '7' },

  // Impresoras — instaladas en activos
  { id: 'c-imp-001', idManual: 'IMP-001', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-001', marca: 'HP', modelo: 'LaserJet M15a', proveedor: 'HP', activoId: '1' },
  { id: 'c-imp-010', idManual: 'IMP-010', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-010', marca: 'Epson', modelo: 'L3250', proveedor: 'Epson Argentina', activoId: '3' },
  { id: 'c-imp-020', idManual: 'IMP-020', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-020', marca: 'HP', modelo: 'DeskJet 2775', proveedor: 'HP', activoId: '4' },
  { id: 'c-imp-030', idManual: 'IMP-030', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-030', marca: 'Brother', modelo: 'MFC-L8900CDW', proveedor: 'TechSupply SA', activoId: '5' },
  { id: 'c-imp-075', idManual: 'IMP-075', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-075', marca: 'HP', modelo: 'LaserJet M428fdw', proveedor: 'HP', activoId: '8' },
  { id: 'c-imp-100', idManual: 'IMP-100', ubicacion: 'Depósito IT', tipoComponente: 'Cabezal de impresora', fecha: '2024-01-10', responsable: 'Juan Pérez', numeroSerie: 'SN-IMP-100', marca: 'Canon', modelo: 'imageCLASS MF743Cdw', proveedor: 'TechSupply SA', activoId: '7' },
];

let MOCK_HISTORIAL_COMPONENTES: HistorialMovimientoComponente[] = [
  // RAM-001
  {
    id: 'h-001', componenteId: 'c-001', accion: 'creado',
    ubicacionDestino: 'Depósito IT',
    fecha: '2024-01-05T10:00:00', responsable: 'Juan Pérez',
    observaciones: 'Componente registrado en el sistema',
  },
  {
    id: 'h-002', componenteId: 'c-001', activoId: '1',
    activoCodigo: 'PC-LAB-001', activoNombre: 'HP ProDesk 400 G6',
    accion: 'instalado',
    ubicacionOrigen: 'Depósito IT',
    ubicacionDestino: 'Laboratorio 1 - Edificio A - Piso 2',
    fecha: '2024-01-10T14:30:00', responsable: 'Juan Pérez',
    observaciones: 'Instalado como módulo principal de memoria',
  },
  // SSD-001
  {
    id: 'h-003', componenteId: 'c-002', accion: 'creado',
    ubicacionDestino: 'Depósito IT',
    fecha: '2024-01-05T10:00:00', responsable: 'Juan Pérez',
    observaciones: 'Componente registrado en el sistema',
  },
  {
    id: 'h-004', componenteId: 'c-002', activoId: '1',
    activoCodigo: 'PC-LAB-001', activoNombre: 'HP ProDesk 400 G6',
    accion: 'instalado',
    ubicacionOrigen: 'Depósito IT',
    ubicacionDestino: 'Laboratorio 1 - Edificio A - Piso 2',
    fecha: '2024-01-10T14:35:00', responsable: 'Juan Pérez',
    observaciones: 'Instalado junto con RAM-001',
  },
  // HDD-001 — pasó por 3 activos
  {
    id: 'h-005', componenteId: 'c-003', accion: 'creado',
    ubicacionDestino: 'Depósito IT',
    fecha: '2023-08-15T09:00:00', responsable: 'Admin Sistema',
    observaciones: 'Componente registrado en el sistema',
  },
  {
    id: 'h-006', componenteId: 'c-003', activoId: '1',
    activoCodigo: 'PC-LAB-001', activoNombre: 'HP ProDesk 400 G6',
    accion: 'instalado',
    ubicacionOrigen: 'Depósito IT',
    ubicacionDestino: 'Laboratorio 1 - Edificio A - Piso 2',
    fecha: '2023-09-01T11:00:00', responsable: 'Juan Pérez',
    observaciones: 'Instalado como almacenamiento secundario',
  },
  {
    id: 'h-007', componenteId: 'c-003', activoId: '1',
    activoCodigo: 'PC-LAB-001', activoNombre: 'HP ProDesk 400 G6',
    accion: 'removido',
    ubicacionOrigen: 'Laboratorio 1 - Edificio A - Piso 2',
    ubicacionDestino: 'Depósito IT',
    fecha: '2023-11-20T10:00:00', responsable: 'Juan Pérez',
    observaciones: 'Retirado — presentaba ruidos mecánicos',
  },
  {
    id: 'h-008', componenteId: 'c-003', activoId: '2',
    activoCodigo: 'IMP-ADM-005', activoNombre: 'Epson L3250',
    accion: 'instalado',
    ubicacionOrigen: 'Depósito IT',
    ubicacionDestino: 'Oficina Administración - Edificio B - Piso 1',
    fecha: '2023-12-05T09:30:00', responsable: 'Admin Sistema',
    observaciones: 'Reasignado tras revisión técnica',
  },
  {
    id: 'h-009', componenteId: 'c-003', activoId: '2',
    activoCodigo: 'IMP-ADM-005', activoNombre: 'Epson L3250',
    accion: 'removido',
    ubicacionOrigen: 'Oficina Administración - Edificio B - Piso 1',
    ubicacionDestino: 'Depósito IT',
    fecha: '2024-01-10T16:00:00', responsable: 'Juan Pérez',
    observaciones: 'Retirado para diagnóstico ampliado',
  },
  {
    id: 'h-010', componenteId: 'c-003', accion: 'transferido',
    ubicacionOrigen: 'Depósito IT',
    ubicacionDestino: 'Depósito IT',
    fecha: '2024-01-15T09:00:00', responsable: 'Juan Pérez',
    observaciones: 'En espera de reasignación — diagnóstico OK',
  },
];

// Devuelve la ubicación legible de un componente según su activoId
const computeUbicacionComponente = (activoId?: string): string => {
  if (!activoId) return 'Depósito IT';
  const activo = MOCK_ACTIVOS.find(a => a.id === activoId);
  if (!activo) return 'Depósito IT';
  return `${activo.nroPc} — ${activo.sector}`;
};

export const getComponentes = async (): Promise<Componente[]> => {
  await delay(300);
  return MOCK_COMPONENTES.map(c => ({
    ...c,
    ubicacion: computeUbicacionComponente(c.activoId),
  }));
};

// Buscar componente por número de serie
export const buscarComponentePorSerie = async (numeroSerie: string): Promise<Componente | null> => {
  await delay(100);
  const componente = MOCK_COMPONENTES.find(c => c.numeroSerie === numeroSerie);
  return componente || null;
};

export const createComponente = async (data: Omit<Componente, 'id'>): Promise<Componente> => {
  await delay(400);
  const newComp: Componente = { ...data, id: 'c-' + Date.now().toString() };
  MOCK_COMPONENTES.push(newComp);
  const ubicacionCalculada = computeUbicacionComponente(newComp.activoId);
  // Registrar evento "creado" en historial
  MOCK_HISTORIAL_COMPONENTES.push({
    id: 'h-' + Date.now().toString(),
    componenteId: newComp.id,
    accion: 'creado',
    ubicacionDestino: ubicacionCalculada,
    fecha: new Date().toISOString(),
    responsable: newComp.responsable,
    observaciones: 'Componente registrado en el sistema',
  });
  return { ...newComp, ubicacion: ubicacionCalculada };
};

export const updateComponente = async (id: string, data: Partial<Omit<Componente, 'id'>>): Promise<Componente> => {
  await delay(400);
  const index = MOCK_COMPONENTES.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Componente no encontrado');
  const prev = MOCK_COMPONENTES[index];
  MOCK_COMPONENTES[index] = { ...prev, ...data };
  const updated = MOCK_COMPONENTES[index];
  const ubicacionAnterior = computeUbicacionComponente(prev.activoId);
  const ubicacionNueva = computeUbicacionComponente(updated.activoId);
  // Si cambió la asignación, registrar movimiento en historial
  if (data.activoId !== undefined && data.activoId !== prev.activoId) {
    MOCK_HISTORIAL_COMPONENTES.push({
      id: 'h-' + Date.now().toString(),
      componenteId: id,
      accion: data.activoId ? 'instalado' : 'removido',
      ubicacionOrigen: ubicacionAnterior,
      ubicacionDestino: ubicacionNueva,
      fecha: new Date().toISOString(),
      responsable: data.responsable || prev.responsable,
      observaciones: 'Ubicación actualizada desde el formulario de edición',
    });
  }
  return { ...updated, ubicacion: ubicacionNueva };
};

export const deleteComponente = async (id: string): Promise<void> => {
  await delay(300);
  MOCK_COMPONENTES = MOCK_COMPONENTES.filter(c => c.id !== id);
  MOCK_HISTORIAL_COMPONENTES = MOCK_HISTORIAL_COMPONENTES.filter(h => h.componenteId !== id);
};

export const getHistorialComponente = async (componenteId: string): Promise<HistorialMovimientoComponente[]> => {
  await delay(200);
  return MOCK_HISTORIAL_COMPONENTES
    .filter(h => h.componenteId === componenteId)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
};

// — Tipos de Componente —
export const getTiposComponente = async (): Promise<TipoComponente[]> => {
  await delay(200);
  return [...MOCK_TIPOS_COMPONENTE];
};

export const createTipoComponente = async (nombre: string): Promise<TipoComponente> => {
  await delay(300);
  const t: TipoComponente = { id: Date.now().toString(), nombre };
  MOCK_TIPOS_COMPONENTE.push(t);
  return t;
};

export const updateTipoComponente = async (id: string, nombre: string): Promise<TipoComponente> => {
  await delay(300);
  const t = MOCK_TIPOS_COMPONENTE.find(x => x.id === id);
  if (t) t.nombre = nombre;
  return t!;
};

export const deleteTipoComponente = async (id: string): Promise<void> => {
  await delay(300);
  MOCK_TIPOS_COMPONENTE = MOCK_TIPOS_COMPONENTE.filter(x => x.id !== id);
};

// — Marcas —
export const getMarcas = async (): Promise<Marca[]> => {
  await delay(200);
  return [...MOCK_MARCAS];
};

export const createMarca = async (nombre: string): Promise<Marca> => {
  await delay(300);
  const m: Marca = { id: Date.now().toString(), nombre };
  MOCK_MARCAS.push(m);
  return m;
};

export const updateMarca = async (id: string, nombre: string): Promise<Marca> => {
  await delay(300);
  const m = MOCK_MARCAS.find(x => x.id === id);
  if (m) m.nombre = nombre;
  return m!;
};

export const deleteMarca = async (id: string): Promise<void> => {
  await delay(300);
  MOCK_MARCAS = MOCK_MARCAS.filter(x => x.id !== id);
};

// — Proveedores —
export const getProveedores = async (): Promise<Proveedor[]> => {
  await delay(200);
  return [...MOCK_PROVEEDORES];
};

export const createProveedor = async (data: Omit<Proveedor, 'id'>): Promise<Proveedor> => {
  await delay(300);
  const p: Proveedor = { ...data, id: Date.now().toString() };
  MOCK_PROVEEDORES.push(p);
  return p;
};

export const updateProveedor = async (id: string, data: Omit<Proveedor, 'id'>): Promise<Proveedor> => {
  await delay(300);
  const p = MOCK_PROVEEDORES.find(x => x.id === id);
  if (p) { p.nombre = data.nombre; p.contacto = data.contacto; p.telefono = data.telefono; }
  return p!;
};

export const deleteProveedor = async (id: string): Promise<void> => {
  await delay(300);
  MOCK_PROVEEDORES = MOCK_PROVEEDORES.filter(x => x.id !== id);
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

const MOCK_TAREAS: Tarea[] = [
  {
    id: '1',
    titulo: 'Instalar Windows en nuevas PCs',
    descripcion: 'Configurar e instalar sistema operativo en 5 equipos nuevos',
    prioridad: 'alta',
    estado: 'en_curso',
    fechaLimite: '2024-02-15',
    ubicacion: 'Laboratorio 2',
    creadoPor: 'Admin Sistema',
    asignados: ['Juan Pérez'],
    fechaCreacion: '2024-02-08T09:00:00',
    fechaInicio: '2024-02-09T08:00:00',
    historial: [
      { fecha: '2024-02-08T09:00:00', accion: 'Tarea creada', usuario: 'Admin Sistema' },
      { fecha: '2024-02-09T08:00:00', accion: 'Iniciada por Juan Pérez', usuario: 'Juan Pérez' },
    ],
    comentarios: [
      { id: '1', autor: 'Juan Pérez', fecha: '2024-02-09T10:00:00', texto: 'Ya instalé 3 de las 5 PCs, continúo mañana.', esInterno: false },
    ],
    adjuntos: [],
  },
  {
    id: '2',
    titulo: 'Revisar inventario de cables',
    descripcion: 'Hacer un conteo completo de cables HDMI, VGA y de red',
    prioridad: 'media',
    estado: 'pendiente',
    fechaLimite: '2024-02-20',
    ubicacion: 'Depósito IT',
    creadoPor: 'Admin Sistema',
    asignados: [],
    fechaCreacion: '2024-02-09T10:00:00',
    historial: [
      { fecha: '2024-02-09T10:00:00', accion: 'Tarea creada', usuario: 'Admin Sistema' },
    ],
    comentarios: [],
    adjuntos: [],
  },
  {
    id: '3',
    titulo: 'Actualizar antivirus en todas las estaciones',
    descripcion: 'Verificar y actualizar el software antivirus corporativo',
    prioridad: 'alta',
    estado: 'finalizada',
    fechaLimite: '2024-02-10',
    creadoPor: 'Admin Sistema',
    asignados: ['Juan Pérez', 'Admin Sistema'],
    finalizadoPor: 'Juan Pérez',
    fechaCreacion: '2024-02-05T09:00:00',
    fechaInicio: '2024-02-06T08:00:00',
    fechaFinalizacion: '2024-02-09T17:00:00',
    historial: [
      { fecha: '2024-02-05T09:00:00', accion: 'Tarea creada', usuario: 'Admin Sistema' },
      { fecha: '2024-02-06T08:00:00', accion: 'Iniciada por Juan Pérez', usuario: 'Juan Pérez' },
      { fecha: '2024-02-09T17:00:00', accion: 'Finalizada por Juan Pérez', usuario: 'Juan Pérez' },
    ],
    comentarios: [],
    adjuntos: [],
  },
];

export const getTareas = async (estado?: string): Promise<Tarea[]> => {
  await delay(300);
  let tareas = [...MOCK_TAREAS];
  
  if (estado) {
    tareas = tareas.filter(t => t.estado === estado);
  }
  
  return tareas;
};

export const getTareaById = async (id: string): Promise<Tarea | null> => {
  await delay(200);
  return MOCK_TAREAS.find(t => t.id === id) || null;
};

export const createTarea = async (tarea: Partial<Tarea>): Promise<Tarea> => {
  await delay(400);
  const usuario = getCurrentUser();
  const newTarea: Tarea = {
    id: Date.now().toString(),
    titulo: tarea.titulo || '',
    descripcion: tarea.descripcion || '',
    prioridad: tarea.prioridad || 'media',
    estado: 'pendiente',
    creadoPor: usuario?.nombre || '',
    asignados: tarea.asignados || [],
    fechaCreacion: new Date().toISOString(),
    comentarios: [],
    adjuntos: tarea.adjuntos || [],
    historial: [
      {
        fecha: new Date().toISOString(),
        accion: 'Tarea creada',
        usuario: usuario?.nombre || '',
      },
    ],
    ...tarea,
  };
  MOCK_TAREAS.push(newTarea);
  return newTarea;
};

export const updateTaskStatus = async (id: string, estado: Tarea['estado'], asignados?: string[]): Promise<Tarea> => {
  await delay(300);
  const usuario = getCurrentUser();
  const index = MOCK_TAREAS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Tarea no encontrada');
  
  const tarea = MOCK_TAREAS[index];
  const oldEstado = tarea.estado;
  tarea.estado = estado;
  
  if (asignados) tarea.asignados = asignados;
  
  if (estado === 'en_curso' && oldEstado === 'pendiente') {
    tarea.fechaInicio = new Date().toISOString();
    tarea.historial.push({
      fecha: new Date().toISOString(),
      accion: `Iniciada por ${usuario?.nombre}`,
      usuario: usuario?.nombre || '',
    });
  } else if (estado === 'finalizada' && oldEstado !== 'finalizada') {
    tarea.fechaFinalizacion = new Date().toISOString();
    tarea.finalizadoPor = usuario?.nombre;
    tarea.historial.push({
      fecha: new Date().toISOString(),
      accion: `Finalizada por ${usuario?.nombre}`,
      usuario: usuario?.nombre || '',
    });
  }
  
  return tarea;
};

export const addComentarioTarea = async (tareaId: string, texto: string, adjuntos?: Adjunto[]): Promise<Comentario> => {
  await delay(300);
  const usuario = getCurrentUser();
  const comentario: Comentario = {
    id: Date.now().toString(),
    autor: usuario?.nombre || 'Desconocido',
    fecha: new Date().toISOString(),
    texto,
    esInterno: false,
    adjuntos: adjuntos && adjuntos.length > 0 ? adjuntos : undefined,
  };

  const tarea = MOCK_TAREAS.find(t => t.id === tareaId);
  if (tarea) {
    tarea.comentarios = [...tarea.comentarios, comentario];
    tarea.historial.push({
      fecha: new Date().toISOString(),
      accion: `Comentario agregado por ${usuario?.nombre}`,
      usuario: usuario?.nombre || '',
    });
  }

  return comentario;
};

export const updateComentarioTarea = async (tareaId: string, comentarioId: string, nuevoTexto: string): Promise<Comentario> => {
  await delay(250);
  const tarea = MOCK_TAREAS.find(t => t.id === tareaId);
  if (!tarea) throw new Error('Tarea no encontrada');
  const comentario = tarea.comentarios.find(c => c.id === comentarioId);
  if (!comentario) throw new Error('Comentario no encontrado');
  comentario.texto = nuevoTexto;
  return { ...comentario };
};

export const deleteComentarioTarea = async (tareaId: string, comentarioId: string): Promise<void> => {
  await delay(250);
  const tarea = MOCK_TAREAS.find(t => t.id === tareaId);
  if (!tarea) throw new Error('Tarea no encontrada');
  const idx = tarea.comentarios.findIndex(c => c.id === comentarioId);
  if (idx === -1) throw new Error('Comentario no encontrado');
  tarea.comentarios = tarea.comentarios.filter(c => c.id !== comentarioId);
};

export const updateTarea = async (id: string, cambios: Partial<Tarea>): Promise<Tarea> => {
  await delay(350);
  const usuario = getCurrentUser();
  const index = MOCK_TAREAS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Tarea no encontrada');

  const tarea = MOCK_TAREAS[index];
  Object.assign(tarea, cambios);
  tarea.historial.push({
    fecha: new Date().toISOString(),
    accion: `Editada por ${usuario?.nombre}`,
    usuario: usuario?.nombre || '',
  });

  return { ...tarea };
};

export const deleteTarea = async (id: string): Promise<void> => {
  await delay(300);
  const index = MOCK_TAREAS.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Tarea no encontrada');
  MOCK_TAREAS.splice(index, 1);
};

// ============ INFORMACIÓN DE OPERACIONES ============
export interface InfoOperaciones {
  telefono: string;
  telefonoInterno: string;
  horariosAtencion: string;
  mailsContacto: string[];
}

let MOCK_INFO_OPERACIONES: InfoOperaciones = {
  telefono: '(011) 4523-0800',
  telefonoInterno: '203 / 204',
  horariosAtencion: 'Lunes a Viernes de 8:00 a 18:00 hs',
  mailsContacto: ['soporte.it@ies.edu.ar', 'operaciones@ies.edu.ar'],
};

export const getInfoOperaciones = async (): Promise<InfoOperaciones> => {
  await delay(200);
  return { ...MOCK_INFO_OPERACIONES, mailsContacto: [...MOCK_INFO_OPERACIONES.mailsContacto] };
};

export const updateInfoOperaciones = async (data: InfoOperaciones): Promise<InfoOperaciones> => {
  await delay(300);
  MOCK_INFO_OPERACIONES = { ...data, mailsContacto: [...data.mailsContacto] };
  return { ...MOCK_INFO_OPERACIONES, mailsContacto: [...MOCK_INFO_OPERACIONES.mailsContacto] };
};

// ============ ADMINISTRACIÓN ============
export const getUsuarios = async (): Promise<Usuario[]> => {
  await delay(300);
  return [...MOCK_USUARIOS];
};

export const updateUsuario = async (id: string, data: Partial<Usuario>): Promise<Usuario> => {
  await delay(300);
  const idx = MOCK_USUARIOS.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Usuario no encontrado');
  MOCK_USUARIOS[idx] = { ...MOCK_USUARIOS[idx], ...data };
  return MOCK_USUARIOS[idx];
};

// ── Ubicaciones estructuradas ──────────────────────────────────────────────
export interface UbicacionEntry {
  id: string;
  sector: string;
  piso: string;
}

let MOCK_UBICACIONES_STRUCT: UbicacionEntry[] = Object.entries(SECTOR_PISO_MAP).map(
  ([sector, piso], i) => ({ id: String(i + 1), sector, piso })
);

export const getPisoForSector = (sector: string): string =>
  MOCK_UBICACIONES_STRUCT.find(u => u.sector === sector)?.piso ?? '';

export const getUbicacionesStruct = async (): Promise<UbicacionEntry[]> => {
  await delay(200);
  return [...MOCK_UBICACIONES_STRUCT].sort((a, b) => a.sector.localeCompare(b.sector));
};

export const createUbicacionEntry = async (data: Omit<UbicacionEntry, 'id'>): Promise<UbicacionEntry> => {
  await delay(300);
  const entry: UbicacionEntry = { ...data, id: Date.now().toString() };
  MOCK_UBICACIONES_STRUCT.push(entry);
  (SECTOR_PISO_MAP as Record<string, string>)[data.sector] = data.piso;
  return entry;
};

export const updateUbicacionEntry = async (id: string, data: Omit<UbicacionEntry, 'id'>): Promise<UbicacionEntry> => {
  await delay(300);
  const idx = MOCK_UBICACIONES_STRUCT.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('Ubicación no encontrada');
  const old = MOCK_UBICACIONES_STRUCT[idx];
  delete (SECTOR_PISO_MAP as Record<string, string>)[old.sector];
  MOCK_UBICACIONES_STRUCT[idx] = { id, ...data };
  (SECTOR_PISO_MAP as Record<string, string>)[data.sector] = data.piso;
  return MOCK_UBICACIONES_STRUCT[idx];
};

export const deleteUbicacionEntry = async (id: string): Promise<void> => {
  await delay(300);
  const entry = MOCK_UBICACIONES_STRUCT.find(u => u.id === id);
  if (entry) {
    delete (SECTOR_PISO_MAP as Record<string, string>)[entry.sector];
    MOCK_UBICACIONES_STRUCT = MOCK_UBICACIONES_STRUCT.filter(u => u.id !== id);
  }
};

export const createUsuario = async (usuario: Partial<Usuario>): Promise<Usuario> => {
  await delay(400);
  const newUsuario: Usuario = {
    id: Date.now().toString(),
    nombre: usuario.nombre || '',
    email: usuario.email || '',
    rol: usuario.rol || 'docente_empleado',
    area: usuario.area,
  };
  MOCK_USUARIOS.push(newUsuario);
  return newUsuario;
};

// Catálogos
export const getTiposActivo = async (): Promise<string[]> => {
  await delay(200);
  return ['Computadora de escritorio', 'Laptop', 'Impresora', 'Escáner', 'Televisor', 'Proyector', 'Router', 'Switch'];
};

export const getUbicaciones = async (): Promise<string[]> => {
  await delay(200);
  // Fuente dinámica: misma lista que administra Admin → Ubicaciones
  return [...MOCK_UBICACIONES_STRUCT]
    .map(u => u.sector)
    .sort((a, b) => a.localeCompare(b, 'es'));
};

export const getEstados = async (): Promise<{ value: string; label: string }[]> => {
  await delay(200);
  return [
    { value: 'activa', label: 'Activa' },
    { value: 'inactiva', label: 'Inactiva' },
  ];
};

export const getSectores = async (): Promise<string[]> => {
  await delay(150);
  return [...MOCK_UBICACIONES_STRUCT]
    .map(u => u.sector)
    .sort((a, b) => a.localeCompare(b));
};

export const addMantenimientoRecord = async (
  activoId: string,
  record: Omit<MantenimientoRecord, 'id'>
): Promise<MantenimientoRecord> => {
  await delay(300);
  const activo = MOCK_ACTIVOS.find(a => a.id === activoId);
  if (!activo) throw new Error('Activo no encontrado');
  const newRecord: MantenimientoRecord = { ...record, id: Date.now().toString() };
  activo.historialMantenimiento = [newRecord, ...activo.historialMantenimiento];
  activo.fechaUltimoMantenimiento = record.fecha;
  return newRecord;
};

// ============ NOTIFICACIONES Y EMAILS ============
export interface NotificationEmailData {
  to: string;
  reportes: Ticket[];
  usuarioNombre: string;
}

export const sendNotificationEmail = async (data: NotificationEmailData): Promise<void> => {
  await delay(500);
  
  // MOCK: En producción, esto haría un POST al endpoint del backend
  // Ejemplo de integración con backend Node.js + Express:
  // 
  // const response = await fetch('http://tu-servidor.com/api/notifications/email', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  //   },
  //   body: JSON.stringify({
  //     to: data.to,
  //     subject: 'Nuevos reportes en GESTEC',
  //     templateData: {
  //       usuarioNombre: data.usuarioNombre,
  //       reportes: data.reportes,
  //       fechaEnvio: new Date().toLocaleString('es-ES'),
  //     },
  //   }),
  // });
  // 
  // if (!response.ok) throw new Error('Error al enviar email');
  // 
  // Backend (Node.js + Express + Nodemailer):
  // 
  // app.post('/api/notifications/email', authenticateToken, async (req, res) => {
  //   const { to, subject, templateData } = req.body;
  //   
  //   // Configurar Nodemailer con tu servicio de email (Gmail, SendGrid, etc.)
  //   const transporter = nodemailer.createTransport({
  //     service: 'gmail', // o tu servicio preferido
  //     auth: {
  //       user: process.env.EMAIL_USER,
  //       pass: process.env.EMAIL_PASSWORD,
  //     },
  //   });
  //   
  //   // Generar HTML del email con los reportes
  //   const htmlContent = `
  //     <h2>Hola ${templateData.usuarioNombre},</h2>
  //     <p>Tienes ${templateData.reportes.length} nuevo(s) reporte(s) en GESTEC:</p>
  //     <ul>
  //       ${templateData.reportes.map(r => `
  //         <li>
  //           <strong>${r.titulo}</strong><br>
  //           Prioridad: ${r.prioridad} | Ubicación: ${r.ubicacion}<br>
  //           Creado por: ${r.creador} - ${new Date(r.fechaCreacion).toLocaleString('es-ES')}
  //         </li>
  //       `).join('')}
  //     </ul>
  //     <p>Accede al sistema para más detalles: <a href="https://tu-dominio.com/tickets">Ver reportes</a></p>
  //   `;
  //   
  //   await transporter.sendMail({
  //     from: process.env.EMAIL_USER,
  //     to: to,
  //     subject: subject,
  //     html: htmlContent,
  //   });
  //   
  //   res.json({ success: true });
  // });
  
  console.log('📧 [MOCK EMAIL] Enviando notificación a:', data.to);
  console.log('📧 Reportes nuevos:', data.reportes.length);
  console.log('📧 Contenido:', {
    destinatario: data.to,
    usuario: data.usuarioNombre,
    reportes: data.reportes.map(r => ({
      titulo: r.titulo || r.descripcion.substring(0, 50),
      prioridad: r.prioridad,
      creador: r.creador,
      fecha: new Date(r.fechaCreacion).toLocaleString('es-ES'),
    })),
  });
  
  // Simular email enviado exitosamente
  return Promise.resolve();
};