import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/stock.service';

export async function getStockComponentes(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getStockComponentesService()); } catch (err) { next(err); }
}

export async function getStockItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado } = req.query as Record<string, string>;
    res.json(await svc.getStockItemsService({ estado }));
  } catch (err) { next(err); }
}

export async function createMovimiento(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId, ...rest } = req.body;
    res.status(201).json(await svc.createStockMovimientoService({ stockItemId: itemId, ...rest }, req.user!.id, req.user!.nombre, req.user!.rol));
  } catch (err) { next(err); }
}

export async function getMovimientos(req: Request, res: Response, next: NextFunction) {
  try {
    const { stockItemId } = req.query as Record<string, string>;
    res.json(await svc.getStockMovimientosService(stockItemId));
  } catch (err) { next(err); }
}
