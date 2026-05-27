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
  const desc = ticket.descripcion.length > 60 ? ticket.descripcion.slice(0, 57) + '…' : ticket.descripcion;
  await addLogService(`Ticket #${ticket.nro} creado — "${desc}"`, 'Tickets', usuarioNombre, 'docente_empleado');
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
  data: Prisma.TicketUncheckedUpdateInput,
  usuarioNombre: string,
  usuarioRol: string,
) {
  // Capturar estado anterior para el diff
  const anterior = await prisma.ticket.findUnique({
    where: { id },
    include: { asignado: { omit: { password: true } } },
  });

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
    include: { creador: { omit: { password: true } }, asignado: { omit: { password: true } } },
  });

  // Calcular diff de campos relevantes
  const campos: Record<string, [string, string]> = {};
  if (anterior) {
    const fmt = (v: any, tipo: string) => {
      if (v == null || v === '') return 'Sin asignar';
      if (tipo === 'estado') return ESTADO_LABELS[v] ?? v;
      if (tipo === 'prioridad') return PRIORIDAD_LABELS[v] ?? v;
      return String(v);
    };
    const checks: { key: keyof typeof anterior; label: string; tipo?: string }[] = [
      { key: 'estado', label: 'Estado', tipo: 'estado' },
      { key: 'prioridad', label: 'Prioridad', tipo: 'prioridad' },
      { key: 'asignadoId', label: 'Asignado', tipo: 'texto' },
      { key: 'ubicacion', label: 'Ubicación' },
      { key: 'tipo', label: 'Tipo' },
    ];
    for (const { key, label, tipo } of checks) {
      const antes = anterior[key];
      const despues = (ticket as any)[key];
      if (String(antes ?? '') !== String(despues ?? '')) {
        // Para asignadoId mostramos el nombre del usuario, no el ID
        if (key === 'asignadoId') {
          const nombreAntes = anterior.asignado?.nombre ?? 'Sin asignar';
          const nombreDespues = ticket.asignado?.nombre ?? 'Sin asignar';
          if (nombreAntes !== nombreDespues) campos[label] = [nombreAntes, nombreDespues];
        } else {
          campos[label] = [fmt(antes, tipo ?? 'texto'), fmt(despues, tipo ?? 'texto')];
        }
      }
    }
  }

  const desc = ticket.descripcion.length > 60 ? ticket.descripcion.slice(0, 57) + '…' : ticket.descripcion;
  const detalle = Object.keys(campos).length > 0 ? JSON.stringify({ campos }) : undefined;
  await addLogService(`Ticket #${ticket.nro} actualizado — "${desc}"`, 'Tickets', usuarioNombre, usuarioRol, undefined, detalle);
  return ticket;
}

export async function deleteTicketService(id: string, usuarioNombre: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, 'Ticket no encontrado');
  await prisma.ticket.delete({ where: { id } });
  const desc = ticket.descripcion.length > 60 ? ticket.descripcion.slice(0, 57) + '…' : ticket.descripcion;
  await addLogService(`Ticket #${ticket.nro} eliminado — "${desc}"`, 'Tickets', usuarioNombre, 'administrador');
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
