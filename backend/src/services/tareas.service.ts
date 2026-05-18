import { EstadoTarea, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

export async function getTareasService(filters?: { estado?: string }) {
  const where: Prisma.TareaWhereInput = {};
  if (filters?.estado) where.estado = filters.estado as EstadoTarea;

  return prisma.tarea.findMany({
    where,
    include: {
      creadoPor: { omit: { password: true } },
      finalizadoPor: { omit: { password: true } },
      asignados: { include: { usuario: { omit: { password: true } } } },
      activo: true,
    },
    orderBy: { fechaCreacion: 'desc' },
  });
}

export async function getTareaByIdService(id: string) {
  const tarea = await prisma.tarea.findUnique({
    where: { id },
    include: {
      creadoPor: { omit: { password: true } },
      finalizadoPor: { omit: { password: true } },
      asignados: { include: { usuario: { omit: { password: true } } } },
      activo: true,
      historial: { orderBy: { fecha: 'asc' } },
      comentarios: { include: { autor: { omit: { password: true } }, adjuntos: true }, orderBy: { fecha: 'asc' } },
      adjuntos: true,
    },
  });
  if (!tarea) throw new AppError(404, 'Tarea no encontrada');
  return tarea;
}

export async function createTareaService(
  data: { titulo: string; descripcion: string; prioridad: any; fechaLimite?: string; ubicacionTexto?: string; activoId?: string; asignadosIds?: string[] },
  creadoPorId: string,
  usuarioNombre: string,
) {
  const { asignadosIds = [], ...rest } = data;

  const tarea = await prisma.tarea.create({
    data: {
      ...rest,
      creadoPorId,
      fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : undefined,
      historial: {
        create: [{ accion: 'Tarea creada', usuario: usuarioNombre }],
      },
      asignados: {
        create: asignadosIds.map((usuarioId) => ({ usuarioId })),
      },
    },
    include: { asignados: { include: { usuario: { omit: { password: true } } } } },
  });

  await addLogService(`Tarea "${tarea.titulo}" creada`, 'Tareas', usuarioNombre, 'operaciones');
  return tarea;
}

export async function updateTaskStatusService(
  id: string,
  estado: EstadoTarea,
  usuarioId: string,
  usuarioNombre: string,
  asignadosIds?: string[],
) {
  const prev = await prisma.tarea.findUnique({ where: { id } });
  if (!prev) throw new AppError(404, 'Tarea no encontrada');

  const now = new Date();
  const updateData: Prisma.TareaUncheckedUpdateInput = { estado };

  if (estado === EstadoTarea.en_curso && prev.estado === EstadoTarea.pendiente) {
    updateData.fechaInicio = now;
  }
  if (estado === EstadoTarea.finalizada && prev.estado !== EstadoTarea.finalizada) {
    updateData.fechaFinalizacion = now;
    updateData.finalizadoPorId = usuarioId;
  }

  const tarea = await prisma.$transaction(async (tx) => {
    const t = await tx.tarea.update({ where: { id }, data: updateData });
    await tx.tareaHistorial.create({
      data: { tareaId: id, accion: `Estado cambiado a ${estado}`, usuario: usuarioNombre },
    });
    if (asignadosIds) {
      await tx.tareaAsignado.deleteMany({ where: { tareaId: id } });
      if (asignadosIds.length > 0) {
        await tx.tareaAsignado.createMany({
          data: asignadosIds.map((uid) => ({ tareaId: id, usuarioId: uid })),
        });
      }
    }
    return t;
  });

  return tarea;
}

export async function updateTareaService(id: string, data: Prisma.TareaUncheckedUpdateInput, usuarioNombre: string) {
  const tarea = await prisma.tarea.update({ where: { id }, data });
  await addLogService(`Tarea "${tarea.titulo}" editada`, 'Tareas', usuarioNombre, 'operaciones');
  return tarea;
}

export async function deleteTareaService(id: string, usuarioNombre: string) {
  const tarea = await prisma.tarea.findUnique({ where: { id } });
  if (!tarea) throw new AppError(404, 'Tarea no encontrada');
  await prisma.tarea.delete({ where: { id } });
  await addLogService(`Tarea "${tarea.titulo}" eliminada`, 'Tareas', usuarioNombre, 'administrador');
}

export async function addComentarioTareaService(tareaId: string, texto: string, autorId: string, usuarioNombre: string) {
  const [comentario] = await prisma.$transaction([
    prisma.comentarioTarea.create({
      data: { tareaId, texto, autorId },
      include: { autor: { omit: { password: true } } },
    }),
    prisma.tareaHistorial.create({
      data: { tareaId, accion: `Comentario agregado`, usuario: usuarioNombre },
    }),
  ]);
  return comentario;
}

export async function updateComentarioTareaService(comentarioId: string, texto: string) {
  return prisma.comentarioTarea.update({ where: { id: comentarioId }, data: { texto } });
}

export async function deleteComentarioTareaService(comentarioId: string) {
  await prisma.comentarioTarea.delete({ where: { id: comentarioId } });
}
