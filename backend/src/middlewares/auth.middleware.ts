import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  nombre: string;
}

interface UsuarioVigente {
  email: string;
  nombre: string;
  rol: string;
  bloqueado: boolean;
}

// El token solo prueba quién era el usuario al iniciar sesión: antes de cada pedido se confirma en la
// base que la cuenta sigue existiendo, no está bloqueada y qué rol tiene hoy. Para no consultar la base
// en cada click se guarda el resultado unos segundos; admin.service lo invalida al bloquear, eliminar o
// cambiar el rol de alguien, así que esos cambios se aplican al instante.
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { vence: number; usuario: UsuarioVigente | null }>();

export function invalidarCacheUsuario(userId: string): void {
  cache.delete(userId);
}

async function getUsuarioVigente(id: string): Promise<UsuarioVigente | null> {
  const enCache = cache.get(id);
  if (enCache && enCache.vence > Date.now()) return enCache.usuario;

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { email: true, nombre: true, rol: true, bloqueado: true },
  });
  cache.set(id, { vence: Date.now() + CACHE_TTL_MS, usuario });
  return usuario;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.gestec_token;

  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  let payload: JwtPayload;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  try {
    const usuario = await getUsuarioVigente(payload.sub);
    if (!usuario || usuario.bloqueado) {
      res.status(401).json({ error: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' });
      return;
    }

    req.user = {
      id: payload.sub,
      email: usuario.email,
      rol: usuario.rol as any,
      nombre: usuario.nombre,
    };

    next();
  } catch (err) {
    next(err);
  }
}
