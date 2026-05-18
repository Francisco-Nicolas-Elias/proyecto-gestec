import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/componentes.service';

export async function getComponentes(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getComponentesService()); } catch (err) { next(err); }
}

export async function getComponente(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getComponenteByIdService(req.params.id)); } catch (err) { next(err); }
}

export async function buscarPorSerie(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.buscarPorSerieService(req.params.serie)); } catch (err) { next(err); }
}

export async function createComponente(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createComponenteService(req.body, req.user!.nombre)); } catch (err) { next(err); }
}

export async function updateComponente(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateComponenteService(req.params.id, req.body, req.user!.nombre)); } catch (err) { next(err); }
}

export async function deleteComponente(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteComponenteService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getHistorial(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getHistorialComponenteService(req.params.id)); } catch (err) { next(err); }
}
