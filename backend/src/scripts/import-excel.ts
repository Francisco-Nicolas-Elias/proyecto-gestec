// Importación de datos históricos desde el Excel de inventario del área de Operaciones.
// Uso: pnpm import-excel <ruta-archivo.xlsx>
//
// Hojas esperadas:
//   "1- Pc por area"  → Activos (equipos)
//   "2- Inventario"   → Componentes (hardware serializado)
//
// El script es idempotente: correrlo varias veces no duplica registros.

import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { PrismaClient, EstadoActivo, AccionComponente } from '@prisma/client';

const prisma = new PrismaClient();

// ─── CONFIGURACIÓN DE HOJAS Y COLUMNAS ──────────────────────────────────────
const SHEETS = {
  activos: '1- Pc por area',
  componentes: '2- Inventario',
};

const COL_ACTIVO = {
  piso: 'PISO',
  oficina: 'OFI.',
  sector: 'SECTOR',
  nroPc: 'Nº DE PC',
  usuarioAsignado: 'USUARIO',
  micro: 'MICRO / PM',
  ram: 'RAM',
  disco: 'DISCO',
  ip: 'IP',
  mac: 'MAC',
  idAD: 'ID AD',
  pAD: 'P AD',
  cbioPC: 'Cbio.PC',
  manten: 'Manten.',
  so: 'S.O.',
  impresoraObs: 'IMPRESORA / Observaciones',
  estado: '109', // header corrido del Excel original — representa "Estado"
  placaVideo: 'PLACA DE VIDEO',
};

const COL_COMPONENTE = {
  id: 'ID',
  ubicacion: 'Ubicación',
  hardware: 'Hardware',
  fecha: 'Fecha',
  responsable: 'Responsable',
  numeroSerie: 'Numero de Serie',
  marca: 'Marca',
  modelo: 'Modelo',
  proveedor: 'Proveedor ', // ojo: la columna del Excel tiene un espacio al final
  observacion: 'observacion',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function excelDateToJSDate(v: unknown): Date | null {
  const n = Number(v);
  if (!n || Number.isNaN(n)) return null;
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

// "kingston" → "Kingston" · "ssd" → "SSD" · "western digital" → "Western Digital"
function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function resolveEstado(raw: string): EstadoActivo {
  return raw.trim().toLowerCase() === 'inactiva' ? EstadoActivo.inactiva : EstadoActivo.activa;
}

// ─── RESOLVERS DE CATÁLOGO (case-insensitive, con cache en memoria) ─────────

const ubicacionCache = new Map<string, string>();
async function resolveUbicacion(sectorRaw: string, pisoRaw: string): Promise<{ id: string; created: boolean }> {
  const sector = sectorRaw || 'Sin sector';
  const key = sector.toLowerCase();
  if (ubicacionCache.has(key)) return { id: ubicacionCache.get(key)!, created: false };

  const existing = await prisma.ubicacion.findFirst({ where: { sector: { equals: sector, mode: 'insensitive' } } });
  if (existing) {
    ubicacionCache.set(key, existing.id);
    return { id: existing.id, created: false };
  }
  const created = await prisma.ubicacion.create({ data: { sector, piso: pisoRaw || '' } });
  ubicacionCache.set(key, created.id);
  return { id: created.id, created: true };
}

function makeNombreResolver(
  cache: Map<string, string>,
  findFn: (nombre: string) => Promise<{ id: string } | null>,
  createFn: (nombre: string) => Promise<{ id: string }>,
) {
  return async (rawNombre: string): Promise<{ id: string; created: boolean }> => {
    const nombre = rawNombre.trim();
    const key = nombre.toLowerCase();
    if (cache.has(key)) return { id: cache.get(key)!, created: false };

    const existing = await findFn(nombre);
    if (existing) {
      cache.set(key, existing.id);
      return { id: existing.id, created: false };
    }
    const created = await createFn(titleCase(nombre));
    cache.set(key, created.id);
    return { id: created.id, created: true };
  };
}

const tipoCache = new Map<string, string>();
const resolveTipoComponente = makeNombreResolver(
  tipoCache,
  (nombre) => prisma.tipoComponente.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } }),
  (nombre) => prisma.tipoComponente.create({ data: { nombre } }),
);

const marcaCache = new Map<string, string>();
const resolveMarca = makeNombreResolver(
  marcaCache,
  (nombre) => prisma.marca.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } }),
  (nombre) => prisma.marca.create({ data: { nombre } }),
);

const proveedorCache = new Map<string, string>();
const resolveProveedor = makeNombreResolver(
  proveedorCache,
  (nombre) => prisma.proveedor.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' } } }),
  (nombre) => prisma.proveedor.create({ data: { nombre } }),
);

// ─── REPORTE ─────────────────────────────────────────────────────────────

interface ImportError {
  fila: number;
  dato: string;
  motivo: string;
}

const counts = {
  ubicaciones: { creados: 0, existentes: 0 },
  tipos: { creados: 0, existentes: 0 },
  marcas: { creados: 0, existentes: 0 },
  proveedores: { creados: 0, existentes: 0 },
  activos: { creados: 0, existentes: 0 },
  componentes: { creados: 0, existentes: 0 },
};

const errors: { activos: ImportError[]; componentes: ImportError[] } = { activos: [], componentes: [] };

function printReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 REPORTE DE IMPORTACIÓN');
  console.log('═'.repeat(60));
  console.log('Catálogo:');
  console.log(`  Ubicaciones:      ${counts.ubicaciones.creados} creadas,  ${counts.ubicaciones.existentes} ya existentes`);
  console.log(`  Tipos componente: ${counts.tipos.creados} creados,  ${counts.tipos.existentes} ya existentes`);
  console.log(`  Marcas:           ${counts.marcas.creados} creadas,  ${counts.marcas.existentes} ya existentes`);
  console.log(`  Proveedores:      ${counts.proveedores.creados} creados,  ${counts.proveedores.existentes} ya existentes`);
  console.log('');
  console.log(`Activos:      ${counts.activos.creados} creados,  ${counts.activos.existentes} ya existentes,  ${errors.activos.length} errores`);
  console.log(`Componentes:  ${counts.componentes.creados} creados,  ${counts.componentes.existentes} ya existentes,  ${errors.componentes.length} advertencias/errores`);

  if (errors.activos.length > 0) {
    console.log('\n⚠️  Activos — filas con error:');
    for (const e of errors.activos.slice(0, 50)) console.log(`  Fila ${e.fila} (${e.dato}): ${e.motivo}`);
    if (errors.activos.length > 50) console.log(`  ... y ${errors.activos.length - 50} más`);
  }
  if (errors.componentes.length > 0) {
    console.log('\n⚠️  Componentes — filas con advertencia/error:');
    for (const e of errors.componentes.slice(0, 50)) console.log(`  Fila ${e.fila} (${e.dato}): ${e.motivo}`);
    if (errors.componentes.length > 50) console.log(`  ... y ${errors.componentes.length - 50} más`);
  }

  const total = errors.activos.length + errors.componentes.length;
  console.log('\n' + (total > 0 ? '⚠️  Importación completada con advertencias' : '✅ Importación completada sin errores'));
}

// ─── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: pnpm import-excel <ruta-archivo.xlsx>');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(resolved);
  const sheetActivos = workbook.Sheets[SHEETS.activos];
  const sheetComponentes = workbook.Sheets[SHEETS.componentes];
  if (!sheetActivos || !sheetComponentes) {
    console.error(`No se encontraron las hojas esperadas. Hojas requeridas: ${JSON.stringify(SHEETS)}`);
    console.error(`Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const filasActivos = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheetActivos, { defval: '' });
  const filasComponentes = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheetComponentes, { defval: '' });

  console.log(`📄 ${filasActivos.length} filas en "${SHEETS.activos}"`);
  console.log(`📄 ${filasComponentes.length} filas en "${SHEETS.componentes}"\n`);

  // ── Fase: Activos ─────────────────────────────────────────────────────
  const activoByPcNumber = new Map<number, { id: string; nroPc: string }>();
  let sinAsignarCounter = 0;

  console.log('▶ Importando activos...');
  for (let i = 0; i < filasActivos.length; i++) {
    const fila = filasActivos[i];
    const filaNum = i + 2; // fila 1 = encabezado
    let nroPc = str(fila[COL_ACTIVO.nroPc]);
    try {
      if (!nroPc) {
        sinAsignarCounter++;
        nroPc = `SIN-ASIG-${String(sinAsignarCounter).padStart(3, '0')}`;
      }

      const sector = str(fila[COL_ACTIVO.sector]) || 'Sin sector';
      const piso = str(fila[COL_ACTIVO.piso]);
      const ub = await resolveUbicacion(sector, piso);
      if (ub.created) counts.ubicaciones.creados++;
      else counts.ubicaciones.existentes++;

      const impresoraObs = str(fila[COL_ACTIVO.impresoraObs]);
      const placaVideo = str(fila[COL_ACTIVO.placaVideo]);
      const observaciones = [impresoraObs, placaVideo ? `Placa de video: ${placaVideo}` : '']
        .filter(Boolean)
        .join(' | ');

      const existing = await prisma.activo.findUnique({ where: { nroPc } });

      const activo = await prisma.activo.upsert({
        where: { nroPc },
        update: {},
        create: {
          nroPc,
          ubicacionId: ub.id,
          oficina: str(fila[COL_ACTIVO.oficina]),
          usuarioAsignado: str(fila[COL_ACTIVO.usuarioAsignado]),
          microModelo: str(fila[COL_ACTIVO.micro]),
          ramTotal: str(fila[COL_ACTIVO.ram]),
          almacenamientoTotal: str(fila[COL_ACTIVO.disco]),
          ip: str(fila[COL_ACTIVO.ip]),
          mac: str(fila[COL_ACTIVO.mac]),
          idAD: str(fila[COL_ACTIVO.idAD]),
          pAD: str(fila[COL_ACTIVO.pAD]),
          sistemaOperativo: str(fila[COL_ACTIVO.so]),
          observaciones,
          fechaCambioPC: excelDateToJSDate(fila[COL_ACTIVO.cbioPC]),
          fechaUltimoMantenimiento: excelDateToJSDate(fila[COL_ACTIVO.manten]),
          estado: resolveEstado(str(fila[COL_ACTIVO.estado])),
        },
      });

      if (existing) counts.activos.existentes++;
      else counts.activos.creados++;

      const m = nroPc.match(/(\d+)/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!activoByPcNumber.has(num)) activoByPcNumber.set(num, { id: activo.id, nroPc: activo.nroPc });
      }
    } catch (e: any) {
      errors.activos.push({ fila: filaNum, dato: nroPc || '(sin nroPc)', motivo: e?.message ?? String(e) });
    }
  }
  console.log(`  ✓ ${counts.activos.creados} creados, ${counts.activos.existentes} ya existentes, ${errors.activos.length} errores`);

  // ── Fase: Componentes ─────────────────────────────────────────────────
  console.log('\n▶ Importando componentes...');
  const usedSerials = new Set<string>();

  for (let i = 0; i < filasComponentes.length; i++) {
    const fila = filasComponentes[i];
    const filaNum = i + 2;
    const rawId = str(fila[COL_COMPONENTE.id]);
    const idManual = `IMP-${String(i + 1).padStart(4, '0')}`;

    try {
      const rawSerie = str(fila[COL_COMPONENTE.numeroSerie]);
      const isPlaceholder = ['', 's/s', 's/n'].includes(rawSerie.toLowerCase());
      let numeroSerie: string;
      if (!isPlaceholder && !usedSerials.has(rawSerie.toLowerCase())) {
        numeroSerie = rawSerie;
        usedSerials.add(rawSerie.toLowerCase());
      } else {
        numeroSerie = `SN-${idManual}`;
      }

      const tipo = await resolveTipoComponente(str(fila[COL_COMPONENTE.hardware]) || 'Otro');
      if (tipo.created) counts.tipos.creados++;
      else counts.tipos.existentes++;

      const marca = await resolveMarca(str(fila[COL_COMPONENTE.marca]) || 'Sin marca');
      if (marca.created) counts.marcas.creados++;
      else counts.marcas.existentes++;

      const proveedorRaw = str(fila[COL_COMPONENTE.proveedor]);
      let proveedorId: string | null = null;
      if (proveedorRaw) {
        const prov = await resolveProveedor(proveedorRaw);
        if (prov.created) counts.proveedores.creados++;
        else counts.proveedores.existentes++;
        proveedorId = prov.id;
      }

      const ubicacionRaw = str(fila[COL_COMPONENTE.ubicacion]);
      let activoId: string | null = null;
      let activoCodigo: string | undefined;
      const pcMatch = ubicacionRaw.match(/^pc\s*0*(\d+)\s*$/i);
      if (pcMatch) {
        const num = parseInt(pcMatch[1], 10);
        const found = activoByPcNumber.get(num);
        if (found) {
          activoId = found.id;
          activoCodigo = found.nroPc;
        } else {
          errors.componentes.push({
            fila: filaNum,
            dato: rawId || numeroSerie,
            motivo: `Ubicación "${ubicacionRaw}" no coincide con ningún activo importado — se dejó en Depósito`,
          });
        }
      }

      const responsable = str(fila[COL_COMPONENTE.responsable]) || 'Importación Excel';
      const fechaIngreso = excelDateToJSDate(fila[COL_COMPONENTE.fecha]) ?? new Date();
      const modelo = str(fila[COL_COMPONENTE.modelo]);

      const existing = await prisma.componente.findUnique({ where: { idManual } });

      await prisma.$transaction(async (tx) => {
        const c = await tx.componente.upsert({
          where: { idManual },
          update: {},
          create: {
            idManual,
            tipoComponenteId: tipo.id,
            marcaId: marca.id,
            modelo,
            numeroSerie,
            proveedorId,
            activoId,
            responsable,
            fechaIngreso,
          },
        });

        if (!existing) {
          const obs = str(fila[COL_COMPONENTE.observacion]);
          const partes = [`Importado desde Excel histórico (ID original: ${rawId || 's/d'}, fila ${filaNum})`];
          if (ubicacionRaw.trim().toUpperCase() === 'BAJA') partes.push('Dado de baja');
          if (obs) partes.push(obs);

          await tx.historialMovimientoComponente.create({
            data: {
              componenteId: c.id,
              activoId: activoId ?? undefined,
              activoCodigo,
              accion: AccionComponente.creado,
              ubicacionDestino: activoCodigo ?? 'Depósito IT',
              fecha: fechaIngreso,
              responsable,
              observaciones: partes.join(' | '),
            },
          });
        }
      });

      if (existing) counts.componentes.existentes++;
      else counts.componentes.creados++;
    } catch (e: any) {
      errors.componentes.push({ fila: filaNum, dato: rawId || idManual, motivo: e?.message ?? String(e) });
    }
  }
  console.log(`  ✓ ${counts.componentes.creados} creados, ${counts.componentes.existentes} ya existentes, ${errors.componentes.length} advertencias/errores`);

  printReport();
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
