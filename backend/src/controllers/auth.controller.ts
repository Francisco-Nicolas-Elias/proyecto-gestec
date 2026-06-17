import { Request, Response, NextFunction } from 'express';
import { loginService, getMeService, registroService, verificarEmailService, solicitarRecuperacionService, resetPasswordService } from '../services/auth.service';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
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
