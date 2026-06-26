import { z } from 'zod';

const activoBase = z.object({
  nroPc: z.string().regex(/^PC\d{2,4}$/, 'Formato inválido — Ej: PC001'),
  estado: z.enum(['activa', 'inactiva']).optional(),
}).passthrough();

export const createActivoSchema = activoBase;
export const updateActivoSchema = activoBase.partial();
