import { z } from 'zod';

export const createTicketSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  tipo: z.string().optional(),
  ubicacion: z.string().optional(),
  activoId: z.string().optional().nullable(),
  asignadoId: z.string().optional().nullable(),
});

export const updateTicketSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().min(1).optional(),
  estado: z.enum(['nuevo', 'en_progreso', 'resuelto', 'cerrado']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  tipo: z.string().optional(),
  ubicacion: z.string().optional(),
  activoId: z.string().optional().nullable(),
  asignadoId: z.string().optional().nullable(),
});

export const createComentarioSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío'),
  esInterno: z.boolean().optional().default(false),
});
