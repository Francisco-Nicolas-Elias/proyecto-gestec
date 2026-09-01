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
      historial: { orderBy: { fecha: 'desc' } },
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
  data: Prisma.ActivoUncheckedUpdateInput & { cambios?: string[] },
  usuarioNombre: string,
  usuarioRol: string,
) {
  const { cambios, ...activoData } = data;

  const activo = await prisma.$transaction(async (tx) => {
    const updated = await tx.activo.update({
      where: { id },
      data: activoData,
      include: { ubicacion: true },
    });

    if ((cambios?.length ?? 0) > 0) {
      await tx.historialEquipo.create({
        data: { activoId: id, tecnico: usuarioNombre, cambios: cambios ?? [] },
      });
    }

    return updated;
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

