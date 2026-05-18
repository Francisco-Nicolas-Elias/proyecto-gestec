import { Request, Response, NextFunction } from 'express';
import { EstadoTarea } from '@prisma/client';
import * as svc from '../services/tareas.service';

export async function getTareas(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado } = req.query as Record<string, string>;
    res.json(await svc.getTareasService({ estado }));
  } catch (err) { next(err); }
}

export async function getTarea(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getTareaByIdService(req.params.id)); } catch (err) { next(err); }
}

export async function createTarea(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createTareaService(req.body, req.user!.id, req.user!.nombre));
  } catch (err) { next(err); }
}

export async function updateTareaStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado, asignadosIds } = req.body;
    res.json(await svc.updateTaskStatusService(req.params.id, estado as EstadoTarea, req.user!.id, req.user!.nombre, asignadosIds));
  } catch (err) { next(err); }
}

export async function updateTarea(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateTareaService(req.params.id, req.body, req.user!.nombre)); } catch (err) { next(err); }
}

export async function deleteTarea(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTareaService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addComentario(req: Request, res: Response, next: NextFunction) {
  try {
    const { texto } = req.body;
    res.status(201).json(await svc.addComentarioTareaService(req.params.id, texto, req.user!.id, req.user!.nombre));
  } catch (err) { next(err); }
}

export async function updateComentario(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateComentarioTareaService(req.params.comentarioId, req.body.texto)); } catch (err) { next(err); }
}

export async function deleteComentario(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteComentarioTareaService(req.params.comentarioId);
    res.status(204).send();
  } catch (err) { next(err); }
}
