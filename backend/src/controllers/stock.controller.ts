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

