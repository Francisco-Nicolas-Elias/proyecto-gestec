import { EstadoTicket, Prisma, Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';
import { notificarTicketAsignadoService } from './notificaciones.service';

const TICKET_ASIGNADOS_INCLUDE = { asignados: { include: { usuario: { omit: { password: true } } } } };

export async function getTicketsService(
  userId: string,
  userRol: Rol,
  filters?: { estado?: string; prioridad?: string; asignadoId?: string },
) {
  const where: Prisma.TicketWhereInput = {};

  // docente_empleado solo ve sus propios tickets
  if (userRol === Rol.docente_empleado) where.creadorId = userId;

  if (filters?.estado) where.estado = filters.estado as EstadoTicket;
  if (filters?.prioridad) where.prioridad = filters.prioridad as any;
  if (filters?.asignadoId) where.asignados = { some: { usuarioId: filters.asignadoId } };

  return prisma.ticket.findMany({
    where,
    include: { creador: { omit: { password: true } }, activo: true, ...TICKET_ASIGNADOS_INCLUDE },
    orderBy: { fechaCreacion: 'desc' },
  });
}

export async function getTicketByIdService(id: string, userId: string, userRol: Rol) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      creador: { omit: { password: true } },
      activo: true,
      ...TICKET_ASIGNADOS_INCLUDE,
      comentarios: {
        where: userRol === Rol.docente_empleado ? { esInterno: false } : {},
        include: {
          autor: { omit: { password: true } },
          adjuntos: { include: { subidoPor: { select: { nombre: true, rol: true } } } },
        },
        orderBy: { fecha: 'asc' },
      },
      adjuntos: { include: { subidoPor: { select: { nombre: true, rol: true } } } },
    },
  });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');
  if (userRol === Rol.docente_empleado && ticket.creadorId !== userId) {
    throw new AppError(403, 'No tenés acceso a este ticket');
  }
  return ticket;
}

export async function createTicketService(
  data: Omit<Prisma.TicketUncheckedCreateInput, 'creadorId'> & { asignadosIds?: string[] },
  creadorId: string,
  usuarioNombre: string,
  usuarioRol: string,
) {
  const { asignadosIds, ...rest } = data;
  const ticket = await prisma.ticket.create({
    data: {
      ...rest,
      creadorId,
      estado: EstadoTicket.nuevo,
      asignados: { create: (asignadosIds ?? []).map((usuarioId) => ({ usuarioId })) },
    },
    include: { creador: { omit: { password: true } }, ...TICKET_ASIGNADOS_INCLUDE },
  });
  const desc = ticket.descripcion.length > 60 ? ticket.descripcion.slice(0, 57) + '…' : ticket.descripcion;
  await addLogService(`Ticket #${ticket.nro} creado — "${desc}"`, 'Tickets', usuarioNombre, usuarioRol);

  if (ticket.asignados.length > 0) {
    const asignadosUsuarios = await prisma.usuario.findMany({
      where: { id: { in: ticket.asignados.map((a) => a.usuarioId) } },
      select: { id: true, nombre: true, email: true },
    });
    await notificarTicketAsignadoService(asignadosUsuarios, ticket, usuarioNombre);
  }

  return ticket;
}

const ESTADO_LABELS: Record<string, string> = {
  nuevo: 'Nuevo', en_progreso: 'En progreso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};
const PRIORIDAD_LABELS: Record<string, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
};

export async function updateTicketService(
  id: string,
  rawData: Prisma.TicketUncheckedUpdateInput & { asignadosIds?: string[] },
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
) {
  const { titulo, descripcion, estado, prioridad, tipo, ubicacion, activoId, asignadosIds } = rawData as any;

  if (usuarioRol === Rol.docente_empleado) {
    const ticketExistente = await prisma.ticket.findUnique({ where: { id }, select: { creadorId: true } });
    if (!ticketExistente) throw new AppError(404, 'Ticket no encontrado');
    if (ticketExistente.creadorId !== usuarioId) throw new AppError(403, 'No podés modificar tickets ajenos');
    if (estado !== undefined || asignadosIds !== undefined) {
      throw new AppError(403, 'No tenés permiso para cambiar el estado o el asignado del ticket');
    }
  }

  const data: Prisma.TicketUncheckedUpdateInput = {};
  if (titulo !== undefined) data.titulo = titulo;
  if (descripcion !== undefined) data.descripcion = descripcion;
  if (estado !== undefined) data.estado = estado;
  if (prioridad !== undefined) data.prioridad = prioridad;
  if (tipo !== undefined) data.tipo = tipo;
  if (ubicacion !== undefined) data.ubicacion = ubicacion;
  if (activoId !== undefined) data.activoId = activoId;

  // Capturar estado anterior para el diff
  const anterior = await prisma.ticket.findUnique({
    where: { id },
    include: TICKET_ASIGNADOS_INCLUDE,
  });
  if (!anterior) throw new AppError(404, 'Ticket no encontrado');

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id }, data });
    if (asignadosIds !== undefined) {
      await tx.ticketAsignado.deleteMany({ where: { ticketId: id } });
      if (asignadosIds.length > 0) {
        await tx.ticketAsignado.createMany({
          data: (asignadosIds as string[]).map((usuarioId: string) => ({ ticketId: id, usuarioId })),
          skipDuplicates: true,
        });
      }
    }
    return t;
  });

  const ticketConAsignados = await prisma.ticket.findUniqueOrThrow({
    where: { id },
    include: { creador: { omit: { password: true } }, ...TICKET_ASIGNADOS_INCLUDE },
  });

  // Calcular diff de campos relevantes
  const campos: Record<string, [string, string]> = {};
  const fmt = (v: any, tipo: string) => {
    if (v == null || v === '') return 'Sin asignar';
    if (tipo === 'estado') return ESTADO_LABELS[v] ?? v;
    if (tipo === 'prioridad') return PRIORIDAD_LABELS[v] ?? v;
    return String(v);
  };
  const checks: { key: keyof typeof anterior; label: string; tipo?: string }[] = [
    { key: 'estado', label: 'Estado', tipo: 'estado' },
    { key: 'prioridad', label: 'Prioridad', tipo: 'prioridad' },
    { key: 'ubicacion', label: 'Ubicación' },
    { key: 'tipo', label: 'Tipo' },
  ];
  for (const { key, label, tipo } of checks) {
    const antes = anterior[key];
    const despues = (ticket as any)[key];
    if (String(antes ?? '') !== String(despues ?? '')) {
      campos[label] = [fmt(antes, tipo ?? 'texto'), fmt(despues, tipo ?? 'texto')];
    }
  }
  if (asignadosIds !== undefined) {
    const nombresAntes = anterior.asignados.map((a) => a.usuario.nombre).sort().join(', ') || 'Sin asignar';
    const nombresDespues = ticketConAsignados.asignados.map((a) => a.usuario.nombre).sort().join(', ') || 'Sin asignar';
    if (nombresAntes !== nombresDespues) campos['Asignado'] = [nombresAntes, nombresDespues];
  }

  const desc = ticketConAsignados.descripcion.length > 60 ? ticketConAsignados.descripcion.slice(0, 57) + '…' : ticketConAsignados.descripcion;
  const detalle = Object.keys(campos).length > 0 ? JSON.stringify({ campos }) : undefined;
  await addLogService(`Ticket #${ticketConAsignados.nro} actualizado — "${desc}"`, 'Tickets', usuarioNombre, usuarioRol, undefined, detalle);

  if (asignadosIds !== undefined) {
    const idsAntes = new Set(anterior.asignados.map((a) => a.usuarioId));
    const nuevosIds = (asignadosIds as string[]).filter((uid) => !idsAntes.has(uid));
    if (nuevosIds.length > 0) {
      const nuevosUsuarios = await prisma.usuario.findMany({
        where: { id: { in: nuevosIds } },
        select: { id: true, nombre: true, email: true },
      });
      await notificarTicketAsignadoService(nuevosUsuarios, ticketConAsignados, usuarioNombre);
    }
  }

  return ticketConAsignados;
}

export async function deleteTicketService(id: string, usuarioNombre: string, usuarioRol: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');
  await prisma.ticket.delete({ where: { id } });
  const desc = ticket.descripcion.length > 60 ? ticket.descripcion.slice(0, 57) + '…' : ticket.descripcion;
  await addLogService(`Ticket #${ticket.nro} eliminado — "${desc}"`, 'Tickets', usuarioNombre, usuarioRol);
}

export async function addComentarioTicketService(
  ticketId: string,
  texto: string,
  esInterno: boolean,
  autorId: string,
  userRol: Rol,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { creadorId: true } });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');

  if (userRol === Rol.docente_empleado) {
    if (ticket.creadorId !== autorId) throw new AppError(403, 'No podés comentar en tickets ajenos');
    esInterno = false;
  }

  return prisma.comentarioTicket.create({
    data: { ticketId, texto, esInterno, autorId },
    include: { autor: { omit: { password: true } } },
  });
}

export async function updateComentarioTicketService(comentarioId: string, texto: string, userId: string) {
  const comentario = await prisma.comentarioTicket.findUnique({ where: { id: comentarioId }, select: { autorId: true } });
  if (!comentario) throw new AppError(404, 'Comentario no encontrado');
  if (comentario.autorId !== userId) throw new AppError(403, 'Solo podés editar tus propios comentarios');

  return prisma.comentarioTicket.update({
    where: { id: comentarioId },
    data: { texto },
    include: { autor: { omit: { password: true } } },
  });
}

export async function deleteComentarioTicketService(
  comentarioId: string,
  userId: string,
  userRol: Rol,
  usuarioNombre: string,
) {
  const comentario = await prisma.comentarioTicket.findUnique({
    where: { id: comentarioId },
    select: { autorId: true },
  });
  if (!comentario) throw new AppError(404, 'Comentario no encontrado');

  if (userRol === Rol.docente_empleado && comentario.autorId !== userId) {
    throw new AppError(403, 'No podés eliminar comentarios ajenos');
  }

  await prisma.comentarioTicket.delete({ where: { id: comentarioId } });
  await addLogService(`Comentario de ticket eliminado`, 'Tickets', usuarioNombre, userRol);
}
