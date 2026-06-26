import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/tickets.service';

export async function getTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado, prioridad, asignadoId } = req.query as Record<string, string>;
    res.json(await svc.getTicketsService(req.user!.id, req.user!.rol, { estado, prioridad, asignadoId }));
  } catch (err) { next(err); }
}

export async function getTicket(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getTicketByIdService(req.params.id, req.user!.id, req.user!.rol));
  } catch (err) { next(err); }
}

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await svc.createTicketService(req.body, req.user!.id, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.updateTicketService(req.params.id, req.body, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}

export async function deleteTicket(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTicketService(req.params.id, req.user!.nombre, req.user!.rol);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addComentario(req: Request, res: Response, next: NextFunction) {
  try {
    const { texto, esInterno } = req.body;
    res.status(201).json(
      await svc.addComentarioTicketService(req.params.id, texto, !!esInterno, req.user!.id, req.user!.rol),
    );
  } catch (err) { next(err); }
}
