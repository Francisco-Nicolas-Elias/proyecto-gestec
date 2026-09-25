import { z } from 'zod';

const activoBase = z.object({
  nroPc: z.string().trim().min(1, 'El N° de PC es obligatorio'),
  ubicacionId: z.string().optional(),
  oficina: z.string().optional(),
  usuarioAsignado: z.string().optional(),
  microModelo: z.string().optional(),
  microMarca: z.string().optional(),
  microNroSerie: z.string().optional(),
  ramTotal: z.string().optional(),
  almacenamientoTotal: z.string().optional(),
  ip: z.string().optional(),
  mac: z.string().optional(),
  idAD: z.string().optional(),
  pAD: z.string().optional(),
  sistemaOperativo: z.string().optional(),
  impresoraModelo: z.string().optional(),
  impresoraMarca: z.string().optional(),
  impresoraNroSerie: z.string().optional(),
  observaciones: z.string().optional(),
  fechaCambioPC: z.string().optional().nullable(),
  fechaUltimoMantenimiento: z.string().optional().nullable(),
  estado: z.enum(['activa', 'inactiva']).optional(),
});

export const createActivoSchema = activoBase;
export const updateActivoSchema = activoBase.partial().extend({
  cambios: z.array(z.string()).optional(),
});
