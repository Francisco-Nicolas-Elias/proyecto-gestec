import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine(v => /[A-Z]/.test(v), 'Debe contener al menos una mayúscula')
  .refine(v => /[^A-Za-z0-9]/.test(v), 'Debe contener al menos un carácter especial');

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').endsWith('@ies21.edu.ar', 'Solo se permiten emails @ies21.edu.ar'),
  password: passwordSchema,
  rol: z.enum(['administrador', 'operaciones', 'docente_empleado'], { errorMap: () => ({ message: 'Rol inválido' }) }),
  area: z.string().optional(),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).optional(),
  email: z.string().email().endsWith('@ies21.edu.ar').optional(),
  password: passwordSchema.optional(),
  rol: z.enum(['administrador', 'operaciones', 'docente_empleado']).optional(),
  area: z.string().optional(),
});
