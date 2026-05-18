import { EstadoTicket, Prisma, Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

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
  if (filters?.asignadoId) where.asignadoId = filters.asignadoId;

  return prisma.ticket.findMany({
    where,
    include: { creador: { omit: { password: true } }, asignado: { omit: { password: true } }, activo: true },
    orderBy: { fechaCreacion: 'desc' },
  });
}

export async function getTicketByIdService(id: string, userId: string, userRol: Rol) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      creador: { omit: { password: true } },
      asignado: { omit: { password: true } },
      activo: true,
      comentarios: { include: { autor: { omit: { password: true } }, adjuntos: true }, orderBy: { fecha: 'asc' } },
      adjuntos: true,
    },
  });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');
  if (userRol === Rol.docente_empleado && ticket.creadorId !== userId) {
    throw new AppError(403, 'No tenés acceso a este ticket');
  }
  return ticket;
}

export async function createTicketService(
  data: Omit<Prisma.TicketUncheckedCreateInput, 'creadorId'>,
  creadorId: string,
  usuarioNombre: string,
) {
  const ticket = await prisma.ticket.create({
    data: { ...data, creadorId, estado: EstadoTicket.nuevo },
    include: { creador: { omit: { password: true } } },
  });
  await addLogService(`Ticket "${ticket.titulo ?? ticket.id}" creado`, 'Tickets', usuarioNombre, 'docente_empleado');
  return ticket;
}

export async function updateTicketService(
  id: string,
  data: Prisma.TicketUncheckedUpdateInput,
  usuarioNombre: string,
  usuarioRol: string,
) {
  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { creador: { omit: { password: true } }, asignado: { omit: { password: true } } },
  });
  await addLogService(`Ticket "${ticket.titulo ?? id}" actualizado`, 'Tickets', usuarioNombre, usuarioRol);
  return ticket;
}

export async function deleteTicketService(id: string, usuarioNombre: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');
  await prisma.ticket.delete({ where: { id } });
  await addLogService(`Ticket "${ticket.titulo ?? id}" eliminado`, 'Tickets', usuarioNombre, 'administrador');
}

export async function addComentarioTicketService(
  ticketId: string,
  texto: string,
  esInterno: boolean,
  autorId: string,
) {
  return prisma.comentarioTicket.create({
    data: { ticketId, texto, esInterno, autorId },
    include: { autor: { omit: { password: true } } },
  });
}
