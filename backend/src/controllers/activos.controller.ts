import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/activos.service';

export async function getActivos(req: Request, res: Response, next: NextFunction) {
  try {
    const { sector, estado, search } = req.query as Record<string, string>;
    res.json(await svc.getActivosService({ sector, estado, search }));
  } catch (err) { next(err); }
}

export async function getActivosBasico(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getActivosBasicoService());
  } catch (err) { next(err); }
}

export async function getActivo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getActivoByIdService(req.params.id));
  } catch (err) { next(err); }
}

export async function createActivo(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createActivoService(req.body, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}

export async function updateActivo(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.updateActivoService(req.params.id, req.body, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}

export async function deleteActivo(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteActivoService(req.params.id, req.user!.nombre, req.user!.rol);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function checkNroPc(req: Request, res: Response, next: NextFunction) {
  try {
    const activo = await svc.buscarActivoPorNroPcService(req.params.nroPc);
    res.json(activo ?? null);
  } catch (err) { next(err); }
}

export async function getHistorialComponentes(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getHistorialComponentesByActivoService(req.params.id));
  } catch (err) { next(err); }
}

export async function getIntervenciones(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getIntervencionesService(req.params.id));
  } catch (err) { next(err); }
}

export async function createIntervencion(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createIntervencionService(req.params.id, req.body, req.user!.nombre, req.user!.rol, req.user!.id));
  } catch (err) { next(err); }
}

export async function addMantenimiento(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.addMantenimientoService(req.params.id, req.body, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}
