import { AccionComponente, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

export async function getComponentesService() {
  return prisma.componente.findMany({
    include: { tipoComponente: true, marca: true, proveedor: true, activo: true },
    orderBy: { idManual: 'asc' },
  });
}

export async function getComponenteByIdService(id: string) {
  const c = await prisma.componente.findUnique({
    where: { id },
    include: { tipoComponente: true, marca: true, proveedor: true, activo: true },
  });
  if (!c) throw new AppError(404, 'Componente no encontrado');
  return c;
}

export async function buscarPorSerieService(numeroSerie: string) {
  return prisma.componente.findUnique({
    where: { numeroSerie },
    include: { tipoComponente: true, marca: true },
  });
}

export async function createComponenteService(
  data: Prisma.ComponenteUncheckedCreateInput,
  usuarioNombre: string,
) {
  const componente = await prisma.$transaction(async (tx) => {
    const c = await tx.componente.create({ data, include: { tipoComponente: true } });
    await tx.historialMovimientoComponente.create({
      data: {
        componenteId: c.id,
        accion: AccionComponente.creado,
        ubicacionDestino: c.activoId ? undefined : 'Depósito IT',
        fecha: new Date(),
        responsable: usuarioNombre,
        observaciones: 'Componente registrado en el sistema',
      },
    });
    return c;
  });
  await addLogService(`Componente "${componente.idManual}" registrado`, 'Stock', usuarioNombre, 'operaciones');
  return componente;
}

export async function updateComponenteService(
  id: string,
  data: Prisma.ComponenteUncheckedUpdateInput,
  usuarioNombre: string,
) {
  const prev = await prisma.componente.findUnique({ where: { id }, include: { activo: true } });
  if (!prev) throw new AppError(404, 'Componente no encontrado');

  const activoIdChanged =
    data.activoId !== undefined && data.activoId !== prev.activoId;

  const componente = await prisma.$transaction(async (tx) => {
    const c = await tx.componente.update({ where: { id }, data, include: { tipoComponente: true, activo: true } });

    if (activoIdChanged) {
      const esInstalacion = !!data.activoId;
      await tx.historialMovimientoComponente.create({
        data: {
          componenteId: id,
          activoId: esInstalacion ? (data.activoId as string) : undefined,
          activoCodigo: c.activo?.nroPc,
          accion: esInstalacion ? AccionComponente.instalado : AccionComponente.removido,
          ubicacionOrigen: prev.activoId ? `${prev.activo?.nroPc} — ${prev.activo?.usuarioAsignado}` : 'Depósito IT',
          ubicacionDestino: esInstalacion ? `${c.activo?.nroPc}` : 'Depósito IT',
          fecha: new Date(),
          responsable: usuarioNombre,
          observaciones: 'Actualizado desde formulario de edición',
        },
      });
    }
    return c;
  });

  await addLogService(`Componente "${componente.idManual}" editado`, 'Stock', usuarioNombre, 'operaciones');
  return componente;
}

export async function deleteComponenteService(id: string, usuarioNombre: string) {
  const c = await prisma.componente.findUnique({ where: { id } });
  if (!c) throw new AppError(404, 'Componente no encontrado');
  await prisma.$transaction([
    prisma.historialMovimientoComponente.deleteMany({ where: { componenteId: id } }),
    prisma.componente.delete({ where: { id } }),
  ]);
  await addLogService(`Componente "${c.idManual}" eliminado`, 'Stock', usuarioNombre, 'administrador');
}

export async function getHistorialComponenteService(componenteId: string) {
  return prisma.historialMovimientoComponente.findMany({
    where: { componenteId },
    orderBy: { fecha: 'desc' },
  });
}
