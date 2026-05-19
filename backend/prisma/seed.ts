import { PrismaClient, Rol, EstadoActivo, EstadoTicket, PrioridadTicket, EstadoTarea, PrioridadTarea, AccionComponente, TipoMovimientoStock } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Ubicaciones ─────────────────────────────────────────────────────────────
  const ubicaciones = await Promise.all([
    prisma.ubicacion.upsert({ where: { sector: 'Administración' },   update: {}, create: { sector: 'Administración',   piso: 'Planta Baja' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Secretaría' },       update: {}, create: { sector: 'Secretaría',       piso: 'Planta Baja' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Biblioteca' },       update: {}, create: { sector: 'Biblioteca',       piso: 'Planta Baja' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Recepción' },        update: {}, create: { sector: 'Recepción',        piso: 'Planta Baja' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Laboratorio 1' },    update: {}, create: { sector: 'Laboratorio 1',    piso: '1° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Laboratorio 2' },    update: {}, create: { sector: 'Laboratorio 2',    piso: '1° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Laboratorio 3' },    update: {}, create: { sector: 'Laboratorio 3',    piso: '1° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Aula 101' },         update: {}, create: { sector: 'Aula 101',         piso: '1° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Aula 102' },         update: {}, create: { sector: 'Aula 102',         piso: '1° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Decanato' },         update: {}, create: { sector: 'Decanato',         piso: '2° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Oficina Técnica' },  update: {}, create: { sector: 'Oficina Técnica',  piso: '2° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Sala de Reuniones' }, update: {}, create: { sector: 'Sala de Reuniones', piso: '2° Piso' } }),
    prisma.ubicacion.upsert({ where: { sector: 'Depósito IT' },      update: {}, create: { sector: 'Depósito IT',      piso: 'Subsuelo' } }),
  ]);
  const ubMap = Object.fromEntries(ubicaciones.map((u) => [u.sector, u.id]));
  console.log(`  ✓ ${ubicaciones.length} ubicaciones`);

  // ── Usuarios ─────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  const [admin, operador, docente1, docente2] = await Promise.all([
    prisma.usuario.upsert({
      where: { email: 'admin@institucion.edu' },
      update: {},
      create: { nombre: 'Admin Sistema', email: 'admin@institucion.edu', password: await hash('Admin123!'), rol: Rol.administrador, area: 'IT' },
    }),
    prisma.usuario.upsert({
      where: { email: 'jperez@institucion.edu' },
      update: {},
      create: { nombre: 'Juan Pérez', email: 'jperez@institucion.edu', password: await hash('Oper123!'), rol: Rol.operaciones, area: 'Soporte Técnico' },
    }),
    prisma.usuario.upsert({
      where: { email: 'mgarcia@institucion.edu' },
      update: {},
      create: { nombre: 'María García', email: 'mgarcia@institucion.edu', password: await hash('Doc123!'), rol: Rol.docente_empleado, area: 'Matemáticas' },
    }),
    prisma.usuario.upsert({
      where: { email: 'clopez@institucion.edu' },
      update: {},
      create: { nombre: 'Carlos López', email: 'clopez@institucion.edu', password: await hash('Doc123!'), rol: Rol.docente_empleado, area: 'Administración' },
    }),
  ]);
  console.log('  ✓ 4 usuarios');

  // ── Catálogo: Tipos, Marcas, Proveedores ─────────────────────────────────────
  const tipos = await Promise.all([
    'RAM', 'SSD', 'HDD', 'Procesador', 'Fuente de alimentación',
    'Placa de red', 'Placa de video', 'Cabezal de impresora', 'M.2', 'Tóner', 'Batería',
  ].map((nombre) => prisma.tipoComponente.upsert({ where: { nombre }, update: {}, create: { nombre } })));
  const tipoMap = Object.fromEntries(tipos.map((t) => [t.nombre, t.id]));

  const marcas = await Promise.all([
    'Samsung', 'Kingston', 'Western Digital', 'Seagate', 'Intel', 'AMD',
    'Crucial', 'Corsair', 'HP', 'Epson', 'Logitech', 'NVIDIA', 'Brother', 'Canon', 'WD',
  ].map((nombre) => prisma.marca.upsert({ where: { nombre }, update: {}, create: { nombre } })));
  const marcaMap = Object.fromEntries(marcas.map((m) => [m.nombre, m.id]));

  const [provTech, provInfo, provEpson, provHP] = await Promise.all([
    prisma.proveedor.upsert({ where: { id: 'prov-techsupply' }, update: {}, create: { id: 'prov-techsupply', nombre: 'TechSupply SA', contacto: 'ventas@techsupply.com.ar', telefono: '011 4321-5678' } }),
    prisma.proveedor.upsert({ where: { id: 'prov-infotech' }, update: {}, create: { id: 'prov-infotech', nombre: 'InfoTech Argentina', contacto: 'info@infotech.com.ar', telefono: '011 5555-1234' } }),
    prisma.proveedor.upsert({ where: { id: 'prov-epson' }, update: {}, create: { id: 'prov-epson', nombre: 'Epson Argentina', contacto: 'soporte@epson.com.ar', telefono: '0800-999-3776' } }),
    prisma.proveedor.upsert({ where: { id: 'prov-hp' }, update: {}, create: { id: 'prov-hp', nombre: 'HP', contacto: 'latam@hp.com', telefono: '' } }),
  ]);
  console.log('  ✓ Catálogo (tipos, marcas, proveedores)');

  // ── Activos ───────────────────────────────────────────────────────────────────
  const activosData = [
    { nroPc: 'PC001', ubicacion: 'Laboratorio 1', oficina: 'Lab Informática', usuarioAsignado: 'Prof. Ana Martínez', microModelo: 'Core i5-10400', microMarca: 'Intel', microNroSerie: 'SN-CPU-001', ramTotal: '8GB', almacenamientoTotal: '480 GB', ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:01', idAD: 'lab1-pc01', pAD: '2090bcba', sistemaOperativo: '10 LTSC', impresoraModelo: 'LaserJet M15a', impresoraMarca: 'HP', impresoraNroSerie: 'SN-IMP-001', observaciones: 'PC de uso general. Monitor 21".' },
    { nroPc: 'PC002', ubicacion: 'Laboratorio 1', oficina: 'Lab Informática', usuarioAsignado: 'Prof. Ana Martínez', microModelo: 'Core i5-10400', microMarca: 'Intel', microNroSerie: 'SN-CPU-002', ramTotal: '8GB', almacenamientoTotal: '480 GB', ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:02', idAD: 'lab1-pc02', pAD: '1430defg', sistemaOperativo: '10 LTSC', impresoraModelo: '', impresoraMarca: '', impresoraNroSerie: '', observaciones: '' },
    { nroPc: 'PC010', ubicacion: 'Administración', oficina: 'Oficina 01', usuarioAsignado: 'Carlos López', microModelo: 'Core i7-11700', microMarca: 'Intel', microNroSerie: 'SN-CPU-010', ramTotal: '16GB', almacenamientoTotal: '1TB', ip: '192.168.1.110', mac: 'AA:BB:CC:DD:EE:10', idAD: 'adm-pc10', pAD: '2090bcba', sistemaOperativo: '11 Pro', impresoraModelo: 'L3250', impresoraMarca: 'Epson', impresoraNroSerie: 'SN-IMP-010', observaciones: 'PC principal de administración.' },
  ];

  const activosCreados: Record<string, string> = {};
  for (const a of activosData) {
    const { ubicacion: ubicacionNombre, ...rest } = a;
    const activo = await prisma.activo.upsert({
      where: { nroPc: rest.nroPc },
      update: {},
      create: { ...rest, ubicacionId: ubMap[ubicacionNombre], estado: EstadoActivo.activa },
    });
    activosCreados[a.nroPc] = activo.id;
  }
  console.log(`  ✓ ${activosData.length} activos`);

  // ── Componentes ───────────────────────────────────────────────────────────────
  const componentesData = [
    { idManual: 'CPU-001', tipoComponente: 'Procesador', marca: 'Intel', modelo: 'Core i5-10400', numeroSerie: 'SN-CPU-001', proveedorId: provTech.id, activoNroPc: 'PC001' },
    { idManual: 'CPU-002', tipoComponente: 'Procesador', marca: 'Intel', modelo: 'Core i5-10400', numeroSerie: 'SN-CPU-002', proveedorId: provTech.id, activoNroPc: 'PC002' },
    { idManual: 'CPU-010', tipoComponente: 'Procesador', marca: 'Intel', modelo: 'Core i7-11700', numeroSerie: 'SN-CPU-010', proveedorId: provTech.id, activoNroPc: 'PC010' },
    { idManual: 'RAM-001', tipoComponente: 'RAM', marca: 'Kingston', modelo: 'ValueRAM DDR4', numeroSerie: 'SN-RAM-001', capacidad: '8GB', proveedorId: provTech.id, activoNroPc: 'PC001' },
    { idManual: 'RAM-002A', tipoComponente: 'RAM', marca: 'Kingston', modelo: 'ValueRAM DDR4', numeroSerie: 'SN-RAM-002A', capacidad: '4GB', proveedorId: provTech.id, activoNroPc: 'PC002' },
    { idManual: 'RAM-002B', tipoComponente: 'RAM', marca: 'Kingston', modelo: 'ValueRAM DDR4', numeroSerie: 'SN-RAM-002B', capacidad: '4GB', proveedorId: provTech.id, activoNroPc: 'PC002' },
    { idManual: 'RAM-010A', tipoComponente: 'RAM', marca: 'Corsair', modelo: 'Vengeance DDR4', numeroSerie: 'SN-RAM-010A', capacidad: '8GB', proveedorId: provTech.id, activoNroPc: 'PC010' },
    { idManual: 'RAM-010B', tipoComponente: 'RAM', marca: 'Corsair', modelo: 'Vengeance DDR4', numeroSerie: 'SN-RAM-010B', capacidad: '8GB', proveedorId: provTech.id, activoNroPc: 'PC010' },
    { idManual: 'DSK-001', tipoComponente: 'SSD', marca: 'WD', modelo: 'Blue SSD', numeroSerie: 'SN-DSK-001', capacidad: '480GB', proveedorId: provTech.id, activoNroPc: 'PC001' },
    { idManual: 'DSK-002', tipoComponente: 'SSD', marca: 'WD', modelo: 'Blue SSD', numeroSerie: 'SN-DSK-002', capacidad: '480GB', proveedorId: provTech.id, activoNroPc: 'PC002' },
    { idManual: 'DSK-010', tipoComponente: 'SSD', marca: 'Samsung', modelo: '870 EVO', numeroSerie: 'SN-DSK-010', capacidad: '1TB', proveedorId: provTech.id, activoNroPc: 'PC010' },
    { idManual: 'M2-001', tipoComponente: 'M.2', marca: 'Samsung', modelo: '980 Pro NVMe', numeroSerie: 'SN-M2-001', capacidad: '512GB', proveedorId: provTech.id, activoNroPc: null },
    { idManual: 'M2-002', tipoComponente: 'M.2', marca: 'WD', modelo: 'Black SN850X', numeroSerie: 'SN-M2-002', capacidad: '1TB', proveedorId: provTech.id, activoNroPc: null },
  ];

  for (const c of componentesData) {
    await prisma.componente.upsert({
      where: { numeroSerie: c.numeroSerie },
      update: {},
      create: {
        idManual: c.idManual,
        tipoComponenteId: tipoMap[c.tipoComponente],
        marcaId: marcaMap[c.marca] ?? marcaMap['WD'],
        modelo: c.modelo,
        numeroSerie: c.numeroSerie,
        capacidad: c.capacidad,
        proveedorId: c.proveedorId,
        activoId: c.activoNroPc ? activosCreados[c.activoNroPc] : null,
        responsable: operador.nombre,
      },
    });
  }
  console.log(`  ✓ ${componentesData.length} componentes`);

  // ── Tickets ───────────────────────────────────────────────────────────────────
  const ticketsData = [
    { titulo: 'PC se reinicia sola', creadorId: docente1.id, ubicacion: 'Laboratorio 1', descripcion: 'La computadora se reinicia sola durante las clases', prioridad: PrioridadTicket.alta, estado: EstadoTicket.en_progreso, asignadoId: operador.id, tipo: 'Falla de hardware' },
    { titulo: 'Problema de conectividad WiFi', creadorId: docente2.id, ubicacion: 'Oficina 205', descripcion: 'No puedo conectarme a la red wifi', prioridad: PrioridadTicket.media, estado: EstadoTicket.resuelto, asignadoId: operador.id, tipo: 'Conectividad' },
    { titulo: 'Proyector no enciende', creadorId: docente1.id, ubicacion: 'Aula 305', descripcion: 'El proyector del aula no enciende', prioridad: PrioridadTicket.alta, estado: EstadoTicket.en_progreso, asignadoId: operador.id, tipo: 'Falla de hardware' },
    { titulo: 'Teclado con teclas trabadas', creadorId: docente2.id, ubicacion: 'Administración', descripcion: 'Varias teclas del teclado quedan trabadas al presionarlas', prioridad: PrioridadTicket.baja, estado: EstadoTicket.nuevo, tipo: 'Periféricos' },
    { titulo: 'Monitor con líneas horizontales', creadorId: docente1.id, ubicacion: 'Secretaría', descripcion: 'El monitor muestra líneas horizontales intermitentes', prioridad: PrioridadTicket.urgente, estado: EstadoTicket.nuevo, tipo: 'Falla de hardware' },
  ];

  for (const t of ticketsData) {
    await prisma.ticket.create({ data: t });
  }
  console.log(`  ✓ ${ticketsData.length} tickets`);

  // ── Tareas ────────────────────────────────────────────────────────────────────
  await prisma.tarea.create({
    data: {
      titulo: 'Instalar Windows en nuevas PCs',
      descripcion: 'Configurar e instalar sistema operativo en 5 equipos nuevos',
      prioridad: PrioridadTarea.alta,
      estado: EstadoTarea.en_curso,
      fechaLimite: new Date('2024-02-15'),
      ubicacionTexto: 'Laboratorio 2',
      creadoPorId: admin.id,
      asignados: { create: [{ usuarioId: operador.id }] },
      historial: { create: [{ accion: 'Tarea creada', usuario: admin.nombre }, { accion: 'Iniciada por Juan Pérez', usuario: operador.nombre }] },
    },
  });

  await prisma.tarea.create({
    data: {
      titulo: 'Revisar inventario de cables',
      descripcion: 'Hacer un conteo completo de cables HDMI, VGA y de red',
      prioridad: PrioridadTarea.media,
      estado: EstadoTarea.pendiente,
      fechaLimite: new Date('2024-02-20'),
      ubicacionTexto: 'Depósito IT',
      creadoPorId: admin.id,
      historial: { create: [{ accion: 'Tarea creada', usuario: admin.nombre }] },
    },
  });
  console.log('  ✓ 2 tareas');

  // ── Info Operaciones ──────────────────────────────────────────────────────────
  await prisma.infoOperaciones.upsert({
    where: { id: 'config' },
    update: {},
    create: {
      id: 'config',
      telefono: '(011) 4523-0800',
      telefonoInterno: '203 / 204',
      horariosAtencion: 'Lunes a Viernes de 8:00 a 18:00 hs',
      emails: { create: [{ email: 'soporte.it@ies.edu.ar' }, { email: 'operaciones@ies.edu.ar' }] },
    },
  });
  console.log('  ✓ Info operaciones');

  console.log('\n✅ Seed completado exitosamente');
  console.log('\n📋 Credenciales de acceso:');
  console.log('  Admin:    admin@institucion.edu   / Admin123!');
  console.log('  Operador: jperez@institucion.edu  / Oper123!');
  console.log('  Docente:  mgarcia@institucion.edu / Doc123!');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
