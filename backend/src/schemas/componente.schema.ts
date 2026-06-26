import { z } from 'zod';

const componenteBase = z.object({
  idManual: z.string().min(1, 'El ID Manual es requerido'),
  tipoComponenteId: z.string().min(1, 'El tipo de componente es requerido'),
  numeroSerie: z.string().optional(),
  marcaId: z.string().optional(),
  modelo: z.string().optional(),
  proveedorId: z.string().optional(),
  capacidad: z.string().optional().nullable(),
  activoId: z.string().optional().nullable(),
  responsable: z.string().optional(),
  codigoExcel: z.string().optional().nullable(),
}).passthrough();

export const createComponenteSchema = componenteBase;
export const updateComponenteSchema = componenteBase.partial();
