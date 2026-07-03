import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/adjuntos.service';

export async function uploadAdjunto(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) return next(new Error('No se recibió ningún archivo'));

    const { ticketId, tareaId, comentarioTicketId, comentarioTareaId } = req.body;

    const adjunto = await svc.uploadAdjuntoService(
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      { ticketId, tareaId, comentarioTicketId, comentarioTareaId },
      req.user!.id,
      req.user!.rol,
    );

    res.status(201).json(adjunto);
  } catch (err) { next(err); }
}

export async function deleteAdjunto(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteAdjuntoService(req.params.id, req.user!.id, req.user!.rol, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}
