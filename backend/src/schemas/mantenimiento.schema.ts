import { z } from 'zod';

export const createMantenimientoSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  tecnico: z.string().min(1, 'El técnico es requerido'),
});
