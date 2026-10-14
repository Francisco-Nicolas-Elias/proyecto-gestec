import { z } from 'zod';

export const createTareaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  ubicacionTexto: z.string().optional().nullable(),
  activoId: z.string().optional().nullable(),
  asignadosNombres: z.array(z.string()).optional(),
  asignadosIds: z.array(z.string()).optional(),
});

export const updateTareaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_curso', 'finalizada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  ubicacionTexto: z.string().optional().nullable(),
  activoId: z.string().optional().nullable(),
  asignadosNombres: z.array(z.string()).optional(),
});

export const updateTareaEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'en_curso', 'finalizada']),
  asignadosIds: z.array(z.string()).optional(),
});

// Al crear, el texto puede ir vacío: el comentario puede llevar solo archivos adjuntos
// (el frontend valida que haya texto o adjuntos antes de enviar).
export const createComentarioTareaSchema = z.object({
  texto: z.string(),
});

// Al editar sí se exige texto: un comentario editado no puede quedar en blanco.
export const updateComentarioTareaSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío'),
});
