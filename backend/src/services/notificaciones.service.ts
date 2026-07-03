import { prisma } from '../lib/prisma';
import { sendTaskAssignedEmail, sendTicketAssignedEmail } from '../lib/email';

export async function getNotificacionesService(usuarioId: string) {
  return prisma.notificacion.findMany({
    where: { usuarioId },
    orderBy: { fecha: 'desc' },
    take: 50,
  });
}

export async function marcarNotificacionLeidaService(id: string, usuarioId: string) {
  await prisma.notificacion.updateMany({
    where: { id, usuarioId },
    data: { leida: true },
  });
}

export async function marcarTodasNotificacionesLeidasService(usuarioId: string) {
  await prisma.notificacion.updateMany({
    where: { usuarioId, leida: false },
    data: { leida: true },
  });
}

/** Crea la notificación in-app y dispara el email para cada usuario recién asignado a una tarea. */
export async function notificarTareaAsignadaService(
  usuarios: { id: string; nombre: string; email: string }[],
  tarea: { id: string; titulo: string },
  asignadoPor: string,
) {
  for (const u of usuarios) {
    await prisma.notificacion.create({
      data: {
        usuarioId: u.id,
        tipo: 'tarea_asignada',
        mensaje: `${asignadoPor} te asignó la tarea "${tarea.titulo}"`,
        tareaId: tarea.id,
      },
    });
    await sendTaskAssignedEmail(u.email, u.nombre, tarea, asignadoPor);
  }
}

/** Crea la notificación in-app y dispara el email para cada usuario recién asignado a un ticket. */
export async function notificarTicketAsignadoService(
  usuarios: { id: string; nombre: string; email: string }[],
  ticket: { id: string; nro: number; descripcion: string },
  asignadoPor: string,
) {
  for (const u of usuarios) {
    await prisma.notificacion.create({
      data: {
        usuarioId: u.id,
        tipo: 'ticket_asignado',
        mensaje: `${asignadoPor} te asignó el ticket #${ticket.nro}`,
        ticketId: ticket.id,
      },
    });
    await sendTicketAssignedEmail(u.email, u.nombre, ticket, asignadoPor);
  }
}
