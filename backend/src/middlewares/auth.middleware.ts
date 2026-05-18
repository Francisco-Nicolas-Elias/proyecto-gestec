import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  nombre: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');

    const payload = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol as any,
      nombre: payload.nombre,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
