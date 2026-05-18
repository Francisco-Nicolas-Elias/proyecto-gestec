import { Request, Response, NextFunction } from 'express';
import { getInfoService, updateInfoService } from '../services/info.service';

export async function getInfo(req: Request, res: Response, next: NextFunction) {
  try { res.json(await getInfoService()); } catch (err) { next(err); }
}

export async function updateInfo(req: Request, res: Response, next: NextFunction) {
  try { res.json(await updateInfoService(req.body)); } catch (err) { next(err); }
}
