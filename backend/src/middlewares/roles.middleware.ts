import { Request, Response, NextFunction } from 'express';
import { Rol } from '@prisma/client';

export function requireRoles(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
      return;
    }

    next();
  };
}

// Atajos para los roles más usados
export const isAdmin = requireRoles(Rol.administrador);
export const isOperaciones = requireRoles(Rol.administrador, Rol.operaciones);
export const isAnyUser = requireRoles(Rol.administrador, Rol.operaciones, Rol.docente_empleado);
