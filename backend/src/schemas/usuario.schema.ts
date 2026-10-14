import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine(v => /[A-Z]/.test(v), 'Debe contener al menos una mayúscula')
  .refine(v => /[0-9]/.test(v), 'Debe contener al menos un número')
  .refine(v => /[^A-Za-z0-9]/.test(v), 'Debe contener al menos un carácter especial');

// Los usuarios se crean solos desde el registro (con verificación de email); el administrador
// solo puede editar nombre/rol/área. El email NO se incluye a propósito: Zod descarta campos
// no declarados, así que un `email` enviado en el body se ignora.
export const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).optional(),
  password: passwordSchema.optional(),
  rol: z.enum(['administrador', 'operaciones', 'docente_empleado']).optional(),
  area: z.string().optional(),
});
