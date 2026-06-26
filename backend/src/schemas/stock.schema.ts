import { z } from 'zod';

export const createMovimientoSchema = z.object({
  itemId: z.string().min(1, 'El ítem de stock es requerido'),
  tipo: z.enum(['entrada', 'salida', 'ajuste'], { errorMap: () => ({ message: "Tipo debe ser 'entrada', 'salida' o 'ajuste'" }) }),
  cantidad: z.number({ invalid_type_error: 'La cantidad debe ser un número' }).int().positive('La cantidad debe ser mayor a 0'),
  motivo: z.string().optional(),
  usuarioNombre: z.string().optional(),
});
