import { EstadoTarea, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';
import { notificarTareaAsignadaService } from './notificaciones.service';

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', en_curso: 'En curso', finalizada: 'Finalizada',
};
const PRIORIDAD_LABELS: Record<string, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
};

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
  data: { titulo: string; descripcion: string; prioridad: any; fechaLimite?: string; ubicacionTexto?: string; activoId?: string; asignadosIds?: string[]; asignadosNombres?: string[] },
  creadoPorId: string,
  usuarioNombre: string,
) {
  const { asignadosIds, asignadosNombres, ...rest } = data;

  let resolvedIds: string[] = asignadosIds ?? [];
  if (!resolvedIds.length && asignadosNombres?.length) {
    const users = await prisma.usuario.findMany({
      where: { nombre: { in: asignadosNombres } },
      select: { id: true },
    });
    resolvedIds = users.map((u) => u.id);
  }

  const tarea = await prisma.tarea.create({
    data: {
      ...rest,
      creadoPorId,
      fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : undefined,
      historial: {
        create: [{ accion: 'Tarea creada', usuario: usuarioNombre }],
      },
      asignados: {
        create: resolvedIds.map((usuarioId) => ({ usuarioId })),
      },
    },
    include: { asignados: { include: { usuario: { omit: { password: true } } } } },
  });

  await addLogService(`Tarea "${tarea.titulo}" creada`, 'Tareas', usuarioNombre, 'operaciones');

  if (tarea.asignados.length > 0) {
    await notificarTareaAsignadaService(
      tarea.asignados.map((a) => ({ id: a.usuario.id, nombre: a.usuario.nombre, email: a.usuario.email })),
      { id: tarea.id, titulo: tarea.titulo },
      usuarioNombre,
    );
  }

  return tarea;
}

export async function updateTaskStatusService(
  id: string,
  estado: EstadoTarea,
  usuarioId: string,
  usuarioNombre: string,
  asignadosIds?: string[],
) {
  const prev = await prisma.tarea.findUnique({ where: { id }, include: { asignados: true } });
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

  if (asignadosIds) {
    const idsAntes = new Set(prev.asignados.map((a) => a.usuarioId));
    const nuevosIds = asignadosIds.filter((uid) => !idsAntes.has(uid));
    if (nuevosIds.length > 0) {
      const nuevosUsuarios = await prisma.usuario.findMany({
        where: { id: { in: nuevosIds } },
        select: { id: true, nombre: true, email: true },
      });
      await notificarTareaAsignadaService(nuevosUsuarios, { id: tarea.id, titulo: tarea.titulo }, usuarioNombre);
    }
  }

  return tarea;
}

export async function updateTareaService(id: string, data: any, usuarioNombre: string, usuarioRol: string) {
  const { asignadosIds: _ids, asignadosNombres, fechaLimite, ...rest } = data;

  const updateData: Prisma.TareaUncheckedUpdateInput = {
    ...rest,
    ...(fechaLimite !== undefined
      ? { fechaLimite: fechaLimite ? new Date(fechaLimite) : null }
      : {}),
  };

  let resolvedIds: string[] | undefined;
  if (asignadosNombres !== undefined) {
    if (asignadosNombres.length > 0) {
      const users = await prisma.usuario.findMany({
        where: { nombre: { in: asignadosNombres } },
        select: { id: true },
      });
      resolvedIds = users.map((u) => u.id);
    } else {
      resolvedIds = [];
    }
  }

  const anterior = await prisma.tarea.findUnique({
    where: { id },
    include: { asignados: { include: { usuario: { select: { nombre: true } } } } },
  });

  const tarea = await prisma.$transaction(async (tx) => {
    const t = await tx.tarea.update({ where: { id }, data: updateData });
    if (resolvedIds !== undefined) {
      await tx.tareaAsignado.deleteMany({ where: { tareaId: id } });
      if (resolvedIds.length > 0) {
        await tx.tareaAsignado.createMany({
          data: resolvedIds.map((uid) => ({ tareaId: id, usuarioId: uid })),
          skipDuplicates: true,
        });
      }
    }
    return t;
  });

  if (resolvedIds !== undefined && anterior) {
    const idsAntes = new Set(anterior.asignados.map((a) => a.usuarioId));
    const nuevosIds = resolvedIds.filter((uid) => !idsAntes.has(uid));
    if (nuevosIds.length > 0) {
      const nuevosUsuarios = await prisma.usuario.findMany({
        where: { id: { in: nuevosIds } },
        select: { id: true, nombre: true, email: true },
      });
      await notificarTareaAsignadaService(nuevosUsuarios, { id: tarea.id, titulo: tarea.titulo }, usuarioNombre);
    }
  }

  const campos: Record<string, [string, string]> = {};
  if (anterior) {
    const fmt = (v: any, tipo?: string) => {
      if (v == null || v === '') return '—';
      if (tipo === 'estado') return ESTADO_LABELS[v] ?? v;
      if (tipo === 'prioridad') return PRIORIDAD_LABELS[v] ?? v;
      if (v instanceof Date) return v.toLocaleDateString('es-AR');
      return String(v);
    };
    const checks: { key: string; label: string; tipo?: string }[] = [
      { key: 'prioridad', label: 'Prioridad', tipo: 'prioridad' },
      { key: 'estado', label: 'Estado', tipo: 'estado' },
      { key: 'titulo', label: 'Título' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'fechaLimite', label: 'Fecha límite' },
      { key: 'ubicacionTexto', label: 'Ubicación' },
    ];
    for (const { key, label, tipo } of checks) {
      const antes = (anterior as any)[key];
      const despues = (tarea as any)[key];
      if (String(antes ?? '') !== String(despues ?? '')) {
        campos[label] = [fmt(antes, tipo), fmt(despues, tipo)];
      }
    }
    if (asignadosNombres !== undefined) {
      const nombresAntes = anterior.asignados.map((a) => a.usuario.nombre).sort().join(', ') || '—';
      const nombresDespues = (asignadosNombres as string[]).slice().sort().join(', ') || '—';
      if (nombresAntes !== nombresDespues) {
        campos['Asignados'] = [nombresAntes, nombresDespues];
      }
    }
  }

  const detalle = Object.keys(campos).length > 0 ? JSON.stringify({ campos }) : undefined;
  await addLogService(`Tarea "${tarea.titulo}" editada`, 'Tareas', usuarioNombre, usuarioRol, undefined, detalle);
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
      include: { autor: { omit: { password: true } }, adjuntos: true },
    }),
    prisma.tareaHistorial.create({
      data: { tareaId, accion: `Comentario agregado`, usuario: usuarioNombre },
    }),
  ]);
  return comentario;
}

export async function updateComentarioTareaService(comentarioId: string, texto: string) {
  return prisma.comentarioTarea.update({
    where: { id: comentarioId },
    data: { texto },
    include: { autor: { omit: { password: true } }, adjuntos: true },
  });
}

export async function deleteComentarioTareaService(comentarioId: string) {
  await prisma.comentarioTarea.delete({ where: { id: comentarioId } });
}
