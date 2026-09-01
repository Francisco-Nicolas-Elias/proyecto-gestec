import { Prisma, EstadoActivo, AccionComponente } from '@prisma/client';
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
      historial: { include: { repuestos: true }, orderBy: { fecha: 'desc' } },
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
  data: Prisma.ActivoUncheckedUpdateInput & {
    cambios?: string[];
    repuestos?: { item: string; cantidad: number; tipoComponenteId?: string }[];
  },
  usuarioNombre: string,
  usuarioRol: string,
) {
  const { cambios, repuestos, ...activoData } = data;

  const activo = await prisma.$transaction(async (tx) => {
    const updated = await tx.activo.update({
      where: { id },
      data: activoData,
      include: { ubicacion: true },
    });

    if ((cambios?.length ?? 0) > 0 || (repuestos?.length ?? 0) > 0) {
      await tx.historialEquipo.create({
        data: {
          activoId: id,
          tecnico: usuarioNombre,
          cambios: cambios ?? [],
          repuestos: { create: (repuestos ?? []).map(({ item, cantidad }) => ({ item, cantidad })) },
        },
      });
    }

    // Consumir del depósito real: toma N componentes disponibles (sin equipo asignado) del
    // tipo elegido y los vincula a este equipo — es la misma acción que "instalar" un componente.
    for (const rep of (repuestos ?? []).filter((r) => r.tipoComponenteId)) {
      const disponibles = await tx.componente.findMany({
        where: { tipoComponenteId: rep.tipoComponenteId!, activoId: null },
        take: rep.cantidad,
        orderBy: { fechaIngreso: 'asc' },
      });
      if (disponibles.length < rep.cantidad) {
        throw new AppError(400, `Stock insuficiente para "${rep.item}" (disponible: ${disponibles.length}, solicitado: ${rep.cantidad})`);
      }
      for (const comp of disponibles) {
        await tx.componente.update({ where: { id: comp.id }, data: { activoId: id } });
        await tx.historialMovimientoComponente.create({
          data: {
            componenteId: comp.id,
            activoId: id,
            activoCodigo: updated.nroPc,
            accion: AccionComponente.instalado,
            ubicacionOrigen: 'Depósito IT',
            ubicacionDestino: updated.nroPc,
            fecha: new Date(),
            responsable: usuarioNombre,
            observaciones: 'Repuesto usado en edición de equipo',
          },
        });
      }
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

