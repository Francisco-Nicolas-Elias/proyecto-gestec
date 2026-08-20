import { Request, Response, NextFunction } from 'express';
import { loginService, getMeService, registroService, verificarEmailService, solicitarRecuperacionService, resetPasswordService } from '../services/auth.service';

const COOKIE_NAME = 'gestec_token';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8h

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const { token, usuario } = await loginService(email, password);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: COOKIE_MAX_AGE });
    res.json({ usuario });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.json({ message: 'Sesión cerrada' });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = await getMeService(req.user!.id);
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

export async function registro(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, email, password } = req.body;
    const result = await registroService(nombre, email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verificarEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await verificarEmailService(req.params.token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function solicitarRecuperacion(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const result = await solicitarRecuperacionService(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const result = await resetPasswordService(token, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
