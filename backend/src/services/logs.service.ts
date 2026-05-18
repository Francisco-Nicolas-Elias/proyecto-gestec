import { ModuloLog } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function addLogService(
  accion: string,
  modulo: ModuloLog,
  usuarioNombre: string,
  usuarioRol: string,
  usuarioId?: string,
) {
  await prisma.logEntry.create({
    data: { accion, modulo, usuarioNombre, usuarioRol, usuarioId },
  });
}

export async function getLogsService() {
  return prisma.logEntry.findMany({ orderBy: { fechaHora: 'desc' }, take: 500 });
}

export async function clearLogsService() {
  await prisma.logEntry.deleteMany();
}
