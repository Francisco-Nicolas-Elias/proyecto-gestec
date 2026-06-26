import { z } from 'zod';

export const createTareaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  asignadoIds: z.array(z.string()).optional(),
  ticketId: z.string().optional().nullable(),
}).passthrough();

export const updateTareaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  asignadoIds: z.array(z.string()).optional(),
}).passthrough();

export const updateTareaEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']),
});

export const createComentarioTareaSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío'),
});
