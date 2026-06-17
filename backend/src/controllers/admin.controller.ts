import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/admin.service';
import { getLogsService, clearLogsService } from '../services/logs.service';

// Usuarios
export async function getUsuarios(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getUsuariosService()); } catch (err) { next(err); }
}
export async function createUsuario(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createUsuarioService(req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateUsuario(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateUsuarioService(req.params.id, req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteUsuarioService(req.params.id, req.user!.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}
export async function toggleBloqueoUsuario(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.toggleBloqueoUsuarioService(req.params.id, req.user!.id, req.user!.nombre)); } catch (err) { next(err); }
}

// Ubicaciones
export async function getUbicaciones(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getUbicacionesService()); } catch (err) { next(err); }
}
export async function createUbicacion(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createUbicacionService(req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateUbicacion(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateUbicacionService(req.params.id, req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteUbicacion(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteUbicacionService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Tipos Componente
export async function getTiposComponente(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getTiposComponenteService()); } catch (err) { next(err); }
}
export async function createTipoComponente(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createTipoComponenteService(req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateTipoComponente(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateTipoComponenteService(req.params.id, req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteTipoComponente(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTipoComponenteService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Marcas
export async function getMarcas(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getMarcasService()); } catch (err) { next(err); }
}
export async function createMarca(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createMarcaService(req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateMarca(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateMarcaService(req.params.id, req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteMarca(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteMarcaService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Proveedores
export async function getProveedores(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getProveedoresService()); } catch (err) { next(err); }
}
export async function createProveedor(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createProveedorService(req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateProveedor(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateProveedorService(req.params.id, req.body, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteProveedor(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteProveedorService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Áreas
export async function getAreas(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.getAreasService()); } catch (err) { next(err); }
}
export async function createArea(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await svc.createAreaService(req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function updateArea(req: Request, res: Response, next: NextFunction) {
  try { res.json(await svc.updateAreaService(req.params.id, req.body.nombre, req.user!.nombre)); } catch (err) { next(err); }
}
export async function deleteArea(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteAreaService(req.params.id, req.user!.nombre);
    res.status(204).send();
  } catch (err) { next(err); }
}

// Logs
export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try { res.json(await getLogsService()); } catch (err) { next(err); }
}
export async function clearLogs(req: Request, res: Response, next: NextFunction) {
  try {
    await clearLogsService();
    res.status(204).send();
  } catch (err) { next(err); }
}
