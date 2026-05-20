import { Prisma, EstadoActivo } from '@prisma/client';
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

export async function createActivoService(data: Prisma.ActivoUncheckedCreateInput, usuarioNombre: string) {
  const activo = await prisma.activo.create({
    data,
    include: { ubicacion: true },
  });
  await addLogService(`Equipo "${activo.nroPc}" registrado`, 'Equipos', usuarioNombre, 'operaciones');
  return activo;
}

export async function updateActivoService(
  id: string,
  data: Prisma.ActivoUncheckedUpdateInput,
  usuarioNombre: string,
) {
  const activo = await prisma.activo.update({
    where: { id },
    data,
    include: { ubicacion: true },
  });
  await addLogService(`Equipo "${activo.nroPc}" editado`, 'Equipos', usuarioNombre, 'operaciones');
  return activo;
}

export async function deleteActivoService(id: string, usuarioNombre: string) {
  const activo = await prisma.activo.findUnique({ where: { id } });
  if (!activo) throw new AppError(404, 'Activo no encontrado');
  await prisma.activo.delete({ where: { id } });
  await addLogService(`Equipo "${activo.nroPc}" eliminado`, 'Equipos', usuarioNombre, 'administrador');
}

export async function addMantenimientoService(
  activoId: string,
  data: { fecha: string; tipo: string; descripcion: string; tecnico: string },
  usuarioNombre: string,
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
  await addLogService(`Mantenimiento registrado en activo`, 'Equipos', usuarioNombre, 'operaciones');
  return record;
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
    repuestos: { item: string; cantidad: number }[];
  },
  usuarioNombre: string,
) {
  const intervencion = await prisma.intervencion.create({
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
      repuestos: { create: data.repuestos },
    },
    include: { repuestos: true },
  });
  await addLogService(`Intervención técnica registrada en activo`, 'Equipos', usuarioNombre, 'operaciones');
  return intervencion;
}
