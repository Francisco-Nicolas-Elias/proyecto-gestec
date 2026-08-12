import { z } from 'zod';

export const createIntervencionSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  diagnostico: z.string().min(1, 'El diagnóstico es requerido'),
  accion: z.string().min(1, 'La acción es requerida'),
  tecnico: z.string().min(1, 'El técnico es requerido'),
  tiempoEstimado: z.number().optional(),
  tiempoReal: z.number().optional(),
  resultado: z.string().min(1, 'El resultado es requerido'),
  comentarios: z.string().optional(),
  repuestos: z.array(z.object({
    item: z.string().min(1),
    cantidad: z.number(),
    stockItemId: z.string().optional(),
  })).default([]),
});
