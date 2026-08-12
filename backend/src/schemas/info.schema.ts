import { z } from 'zod';

export const updateInfoSchema = z.object({
  telefono: z.string(),
  telefonoInterno: z.string(),
  horariosAtencion: z.string(),
  emails: z.array(z.string().email()),
});
