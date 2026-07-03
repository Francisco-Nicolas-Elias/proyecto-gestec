import { Prisma, EstadoActivo, TipoMovimientoStock } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

export async function getActivosService(filters?: {
  sector?: string;
  estado?: string;
  search?: string;
}) {
  const where: Prisma.ActivoWhereInput = {};

  if (filters?.estado) where.estado = filters.estado as EstadoActivo;
  if (filters?.sector) {
    where.ubicacion = { sector: { contains: filters.sector, mode: 'insensitive' } };
  }
  if (filters?.search) {
    const q = filters.search;
    where.OR = [
      { nroPc: { contains: q, mode: 'insensitive' } },
      { usuarioAsignado: { contains: q, mode: 'insensitive' } },
      { ip: { contains: q, mode: 'insensitive' } },
      { sistemaOperativo: { contains: q, mode: 'insensitive' } },
      { ubicacion: { sector: { contains: q, mode: 'insensitive' } } },
    ];
  }

  return prisma.activo.findMany({
    where,
    include: { ubicacion: true, componentes: { include: { tipoComponente: true, marca: true } } },
    orderBy: { nroPc: 'asc' },
  });
}

// Listado liviano para selectores (ej. crear ticket) — accesible a cualquier rol autenticado
export async function getActivosBasicoService() {
  return prisma.activo.findMany({
    select: {
      id: true,
      nroPc: true,
      microMarca: true,
      microModelo: true,
      ubicacion: { select: { sector: true } },
    },
    orderBy: { nroPc: 'asc' },
  });
}

export async function getActivoByIdService(id: string) {
  const activo = await prisma.activo.findUnique({
    where: { id },
    include: {
      ubicacion: true,
      componentes: { include: { tipoComponente: true, marca: true } },
      mantenimientos: { orderBy: { fecha: 'desc' } },
      intervenciones: { include: { repuestos: true }, orderBy: { fecha: 'desc' } },
    },
  });
  if (!activo) throw new AppError(404, 'Activo no encontrado');
  return activo;
}

export async function buscarActivoPorNroPcService(nroPc: string) {
  return prisma.activo.findFirst({
    where: { nroPc: { equals: nroPc, mode: 'insensitive' } },
    select: { id: true, nroPc: true },
  });
}

export async function createActivoService(data: Prisma.ActivoUncheckedCreateInput, usuarioNombre: string, usuarioRol: string) {
  const activo = await prisma.activo.create({
    data,
    include: { ubicacion: true },
  });
  await addLogService(`Equipo "${activo.nroPc}" registrado`, 'Equipos', usuarioNombre, usuarioRol);
  return activo;
}

export async function updateActivoService(
  id: string,
  data: Prisma.ActivoUncheckedUpdateInput,
  usuarioNombre: string,
  usuarioRol: string,
) {
  const activo = await prisma.activo.update({
    where: { id },
    data,
    include: { ubicacion: true },
  });
  await addLogService(`Equipo "${activo.nroPc}" editado`, 'Equipos', usuarioNombre, usuarioRol);
  return activo;
}

export async function deleteActivoService(id: string, usuarioNombre: string, usuarioRol: string) {
  const activo = await prisma.activo.findUnique({ where: { id } });
  if (!activo) throw new AppError(404, 'Activo no encontrado');
  await prisma.activo.delete({ where: { id } });
  await addLogService(`Equipo "${activo.nroPc}" eliminado`, 'Equipos', usuarioNombre, usuarioRol);
}

export async function addMantenimientoService(
  activoId: string,
  data: { fecha: string; tipo: string; descripcion: string; tecnico: string },
  usuarioNombre: string,
  usuarioRol: string,
) {
  const [record] = await prisma.$transaction([
    prisma.mantenimientoRecord.create({
      data: { activoId, fecha: new Date(data.fecha), tipo: data.tipo, descripcion: data.descripcion, tecnico: data.tecnico },
    }),
    prisma.activo.update({
      where: { id: activoId },
      data: { fechaUltimoMantenimiento: new Date(data.fecha) },
    }),
  ]);
  await addLogService(`Mantenimiento registrado en activo`, 'Equipos', usuarioNombre, usuarioRol);
  return record;
}

export async function getHistorialComponentesByActivoService(activoId: string) {
  return prisma.historialMovimientoComponente.findMany({
    where: { activoId },
    include: {
      componente: {
        select: {
          idManual: true,
          modelo: true,
          numeroSerie: true,
          tipoComponente: { select: { nombre: true } },
          marca: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha: 'desc' },
  });
}

export async function getIntervencionesService(activoId: string) {
  return prisma.intervencion.findMany({
    where: { activoId },
    include: { repuestos: true },
    orderBy: { fecha: 'desc' },
  });
}

export async function createIntervencionService(
  activoId: string,
  data: {
    fecha: string;
    tipo: string;
    diagnostico: string;
    accion: string;
    tecnico: string;
    tiempoEstimado?: number;
    tiempoReal?: number;
    resultado: string;
    comentarios?: string;
    repuestos: { item: string; cantidad: number; stockItemId?: string }[];
  },
  usuarioNombre: string,
  usuarioRol: string,
  usuarioId: string,
) {
  const intervencion = await prisma.$transaction(async (tx) => {
    const inv = await tx.intervencion.create({
      data: {
        activoId,
        fecha: new Date(data.fecha),
        tipo: data.tipo,
        diagnostico: data.diagnostico,
        accion: data.accion,
        tecnico: data.tecnico,
        tiempoEstimado: data.tiempoEstimado,
        tiempoReal: data.tiempoReal,
        resultado: data.resultado,
        comentarios: data.comentarios,
        repuestos: { create: data.repuestos.map(({ item, cantidad }) => ({ item, cantidad })) },
      },
      include: { repuestos: true },
    });

    for (const rep of data.repuestos.filter((r) => r.stockItemId)) {
      const item = await tx.stockItem.findUnique({ where: { id: rep.stockItemId! } });
      if (!item) throw new AppError(404, `Item de stock "${rep.item}" no encontrado`);
      await tx.stockMovimiento.create({
        data: {
          stockItemId: rep.stockItemId!,
          tipo: TipoMovimientoStock.salida,
          cantidad: rep.cantidad,
          motivo: `Intervención: ${data.tipo}`,
          referenciaIntervencion: inv.id,
          usuarioId,
        },
      });
      await tx.stockItem.update({
        where: { id: rep.stockItemId! },
        data: { cantidad: { decrement: rep.cantidad }, ultimaActualizacion: new Date() },
      });
    }

    return inv;
  });

  await addLogService(`Intervención técnica registrada en activo`, 'Equipos', usuarioNombre, usuarioRol);
  return intervencion;
}
