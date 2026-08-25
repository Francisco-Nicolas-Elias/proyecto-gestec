import { z } from 'zod';

export const ubicacionSchema = z.object({
  sector: z.string().min(1, 'El sector es requerido'),
  piso: z.string().min(1, 'El piso es requerido'),
});

export const tipoComponenteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});

export const marcaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
});

export const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});
