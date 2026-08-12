import { z } from 'zod';

const activoBase = z.object({
  nroPc: z.string().regex(/^PC\d{2,4}$/, 'Formato inválido — Ej: PC001'),
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
export const updateActivoSchema = activoBase.partial();
