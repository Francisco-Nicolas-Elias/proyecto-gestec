import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/notificaciones.service';

export async function getNotificaciones(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getNotificacionesService(req.user!.id)); } catch (err) { next(err); }
}

export async function marcarLeida(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.marcarNotificacionLeidaService(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function marcarTodasLeidas(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.marcarTodasNotificacionesLeidasService(req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
}
