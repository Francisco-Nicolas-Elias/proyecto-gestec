import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
