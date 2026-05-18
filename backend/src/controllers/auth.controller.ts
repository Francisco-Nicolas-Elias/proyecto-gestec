import { Request, Response, NextFunction } from 'express';
import { loginService, getMeService } from '../services/auth.service';

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
