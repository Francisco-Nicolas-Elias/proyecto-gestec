import { Router } from 'express';
import { login, logout, me, registro, verificarEmail, solicitarRecuperacion, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginRateLimiter, authActionsRateLimiter } from '../middlewares/rateLimit.middleware';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const registroSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').endsWith('@ies21.edu.ar', 'Solo se permiten emails @ies21.edu.ar'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((v) => /[A-Z]/.test(v), 'La contraseña debe contener al menos una mayúscula')
    .refine((v) => /[0-9]/.test(v), 'La contraseña debe contener al menos un número')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'La contraseña debe contener al menos un carácter especial'),
});

const router = Router();

const recuperarSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((v) => /[A-Z]/.test(v), 'La contraseña debe contener al menos una mayúscula')
    .refine((v) => /[0-9]/.test(v), 'La contraseña debe contener al menos un número')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'La contraseña debe contener al menos un carácter especial'),
});

router.post('/login', loginRateLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/registro', authActionsRateLimiter, validate(registroSchema), registro);
router.get('/verificar/:token', authActionsRateLimiter, verificarEmail);
router.post('/recuperar-password', authActionsRateLimiter, validate(recuperarSchema), solicitarRecuperacion);
router.post('/reset-password', authActionsRateLimiter, validate(resetSchema), resetPassword);

export default router;
