import { Rol, TipoAdjunto } from '@prisma/client';
import path from 'path';
import { prisma } from '../lib/prisma';
import { supabase, BUCKET } from '../lib/supabaseStorage';
import { AppError } from '../middlewares/error.middleware';

interface AdjuntoContext {
  ticketId?: string;
  tareaId?: string;
  comentarioTicketId?: string;
  comentarioTareaId?: string;
}

function mimeToTipo(mimeType: string): TipoAdjunto {
  if (mimeType.startsWith('image/')) return TipoAdjunto.imagen;
  if (mimeType.startsWith('video/')) return TipoAdjunto.video;
  return TipoAdjunto.audio;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadAdjuntoService(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  size: number,
  context: AdjuntoContext,
  userId: string,
  userRol: Rol,
) {
  // docente_empleado solo puede adjuntar a sus propios tickets/comentarios
  if (userRol === Rol.docente_empleado) {
    if (context.tareaId || context.comentarioTareaId) {
      throw new AppError(403, 'No tenés permiso para adjuntar archivos a tareas');
    }
    if (context.ticketId) {
      const ticket = await prisma.ticket.findUnique({ where: { id: context.ticketId }, select: { creadorId: true } });
      if (!ticket || ticket.creadorId !== userId) throw new AppError(403, 'No podés adjuntar archivos a tickets ajenos');
    }
    if (context.comentarioTicketId) {
      const comentario = await prisma.comentarioTicket.findUnique({ where: { id: context.comentarioTicketId }, select: { autorId: true } });
      if (!comentario || comentario.autorId !== userId) throw new AppError(403, 'No podés adjuntar archivos a comentarios ajenos');
    }
  }
  const ext = path.extname(originalName) || '.bin';
  const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new AppError(500, `Error al subir archivo: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

  return prisma.adjunto.create({
    data: {
      nombre: originalName,
      tipo: mimeToTipo(mimeType),
      url: publicUrl,
      tamano: formatSize(size),
      ...context,
    },
  });
}

export async function deleteAdjuntoService(id: string, userId: string, userRol: Rol) {
  const adj = await prisma.adjunto.findUnique({
    where: { id },
    include: {
      ticket: { select: { creadorId: true } },
      comentarioTicket: { select: { autorId: true } },
    },
  });
  if (!adj) throw new AppError(404, 'Adjunto no encontrado');

  if (userRol === Rol.docente_empleado) {
    const esOwner =
      (adj.ticketId && adj.ticket?.creadorId === userId) ||
      (adj.comentarioTicketId && adj.comentarioTicket?.autorId === userId);
    if (!esOwner) throw new AppError(403, 'No tenés permiso para eliminar este adjunto');
  }

  const storageKey = adj.url.split(`/object/public/${BUCKET}/`)[1];
  if (storageKey) {
    await supabase.storage.from(BUCKET).remove([storageKey]);
  }

  await prisma.adjunto.delete({ where: { id } });
}
