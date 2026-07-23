import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

// ── Usuarios ──────────────────────────────────────────────────────────────────

export async function getUsuariosService() {
  return prisma.usuario.findMany({ omit: { password: true }, orderBy: { nombre: 'asc' } });
}

// Listado liviano de staff (operaciones/admin) para selectores de asignación —
// accesible también para operaciones, no solo para administrador.
export async function getUsuariosStaffService() {
  return prisma.usuario.findMany({
    where: { rol: { in: [Rol.administrador, Rol.operaciones] }, bloqueado: false },
    select: { id: true, nombre: true, rol: true },
    orderBy: { nombre: 'asc' },
  });
}

export async function createUsuarioService(
  data: { nombre: string; email: string; password: string; rol: Rol; area?: string },
  adminNombre: string,
) {
  const hash = await bcrypt.hash(data.password, 12);
  const usuario = await prisma.usuario.create({
    data: { ...data, password: hash },
    omit: { password: true },
  });
  await addLogService(`Usuario "${usuario.nombre}" creado`, 'Administracion', adminNombre, 'administrador');
  return usuario;
}

export async function updateUsuarioService(
  id: string,
  data: { nombre?: string; email?: string; rol?: Rol; area?: string; password?: string },
  adminNombre: string,
) {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: updateData,
    omit: { password: true },
  });
  await addLogService(`Usuario "${usuario.nombre}" editado`, 'Administracion', adminNombre, 'administrador');
  return usuario;
}

export async function deleteUsuarioService(id: string, adminId: string, adminNombre: string) {
  if (id === adminId) throw new AppError(400, 'No podés eliminar tu propio usuario');
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  await prisma.usuario.delete({ where: { id } });
  await addLogService(`Usuario "${usuario.nombre}" eliminado`, 'Administracion', adminNombre, 'administrador');
}

export async function toggleBloqueoUsuarioService(id: string, adminId: string, adminNombre: string) {
  if (id === adminId) throw new AppError(400, 'No podés bloquear tu propio usuario');
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  const nuevo = !usuario.bloqueado;
  const actualizado = await prisma.usuario.update({
    where: { id },
    data: { bloqueado: nuevo, ...(nuevo ? {} : { intentosFallidos: 0 }) },
    omit: { password: true },
  });
  const accion = nuevo ? 'bloqueado' : 'desbloqueado';
  await addLogService(`Usuario "${usuario.nombre}" ${accion}`, 'Administracion', adminNombre, 'administrador');
  return actualizado;
}

// ── Ubicaciones ───────────────────────────────────────────────────────────────

export async function getUbicacionesService() {
  return prisma.ubicacion.findMany({ orderBy: { sector: 'asc' } });
}

export async function createUbicacionService(data: { sector: string; piso: string }, adminNombre: string) {
  const ubicacion = await prisma.ubicacion.create({ data });
  await addLogService(`Ubicación "${ubicacion.sector}" creada`, 'Administracion', adminNombre, 'administrador');
  return ubicacion;
}

export async function updateUbicacionService(id: string, data: { sector: string; piso: string }, adminNombre: string) {
  const ubicacion = await prisma.ubicacion.update({ where: { id }, data });
  await addLogService(`Ubicación "${ubicacion.sector}" editada`, 'Administracion', adminNombre, 'administrador');
  return ubicacion;
}

export async function deleteUbicacionService(id: string, adminNombre: string) {
  const u = await prisma.ubicacion.findUnique({ where: { id } });
  if (!u) throw new AppError(404, 'Ubicación no encontrada');
  await prisma.ubicacion.delete({ where: { id } });
  await addLogService(`Ubicación "${u.sector}" eliminada`, 'Administracion', adminNombre, 'administrador');
}

// ── Tipos de Componente ───────────────────────────────────────────────────────

export async function getTiposComponenteService() {
  return prisma.tipoComponente.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createTipoComponenteService(nombre: string, adminNombre: string) {
  const t = await prisma.tipoComponente.create({ data: { nombre } });
  await addLogService(`Tipo de componente "${t.nombre}" creado`, 'Administracion', adminNombre, 'administrador');
  return t;
}

export async function updateTipoComponenteService(id: string, nombre: string, adminNombre: string) {
  const t = await prisma.tipoComponente.update({ where: { id }, data: { nombre } });
  await addLogService(`Tipo de componente "${t.nombre}" editado`, 'Administracion', adminNombre, 'administrador');
  return t;
}

export async function deleteTipoComponenteService(id: string, adminNombre: string) {
  const t = await prisma.tipoComponente.findUnique({ where: { id }, include: { _count: { select: { componentes: true, stockItems: true } } } });
  if (!t) throw new AppError(404, 'Tipo de componente no encontrado');
  const partes: string[] = [];
  if (t._count.componentes > 0) partes.push(`${t._count.componentes} componente${t._count.componentes !== 1 ? 's' : ''}`);
  if (t._count.stockItems > 0) partes.push(`${t._count.stockItems} ítem${t._count.stockItems !== 1 ? 's' : ''} de stock`);
  if (partes.length > 0)
    throw new AppError(409, `No se puede eliminar "${t.nombre}" porque tiene ${partes.join(' y ')} asociado${partes.length > 1 ? 's' : ''}`);
  await prisma.tipoComponente.delete({ where: { id } });
  await addLogService(`Tipo de componente "${t.nombre}" eliminado`, 'Administracion', adminNombre, 'administrador');
}

// ── Marcas ────────────────────────────────────────────────────────────────────

export async function getMarcasService() {
  return prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createMarcaService(nombre: string, adminNombre: string) {
  const m = await prisma.marca.create({ data: { nombre } });
  await addLogService(`Marca "${m.nombre}" creada`, 'Administracion', adminNombre, 'administrador');
  return m;
}

export async function updateMarcaService(id: string, nombre: string, adminNombre: string) {
  const m = await prisma.marca.update({ where: { id }, data: { nombre } });
  await addLogService(`Marca "${m.nombre}" editada`, 'Administracion', adminNombre, 'administrador');
  return m;
}

export async function deleteMarcaService(id: string, adminNombre: string) {
  const m = await prisma.marca.findUnique({ where: { id }, include: { _count: { select: { componentes: true } } } });
  if (!m) throw new AppError(404, 'Marca no encontrada');
  if (m._count.componentes > 0)
    throw new AppError(409, `No se puede eliminar "${m.nombre}" porque tiene ${m._count.componentes} componente${m._count.componentes !== 1 ? 's' : ''} asociado${m._count.componentes !== 1 ? 's' : ''}`);
  await prisma.marca.delete({ where: { id } });
  await addLogService(`Marca "${m.nombre}" eliminada`, 'Administracion', adminNombre, 'administrador');
}

// ── Proveedores ───────────────────────────────────────────────────────────────

export async function getProveedoresService() {
  return prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createProveedorService(
  data: { nombre: string; contacto?: string; telefono?: string },
  adminNombre: string,
) {
  const p = await prisma.proveedor.create({ data });
  await addLogService(`Proveedor "${p.nombre}" creado`, 'Administracion', adminNombre, 'administrador');
  return p;
}

export async function updateProveedorService(id: string, data: { nombre: string; contacto?: string; telefono?: string }, adminNombre: string) {
  const p = await prisma.proveedor.update({ where: { id }, data });
  await addLogService(`Proveedor "${p.nombre}" editado`, 'Administracion', adminNombre, 'administrador');
  return p;
}

export async function deleteProveedorService(id: string, adminNombre: string) {
  const p = await prisma.proveedor.findUnique({ where: { id }, include: { _count: { select: { componentes: true, stockItems: true } } } });
  if (!p) throw new AppError(404, 'Proveedor no encontrado');
  const partes: string[] = [];
  if (p._count.componentes > 0) partes.push(`${p._count.componentes} componente${p._count.componentes !== 1 ? 's' : ''}`);
  if (p._count.stockItems > 0) partes.push(`${p._count.stockItems} ítem${p._count.stockItems !== 1 ? 's' : ''} de stock`);
  if (partes.length > 0)
    throw new AppError(409, `No se puede eliminar "${p.nombre}" porque tiene ${partes.join(' y ')} asociado${partes.length > 1 ? 's' : ''}`);
  await prisma.proveedor.delete({ where: { id } });
  await addLogService(`Proveedor "${p.nombre}" eliminado`, 'Administracion', adminNombre, 'administrador');
}

// ── Áreas ──────────────────────────────────────────────────────────────────────

export async function getAreasService() {
  return prisma.area.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createAreaService(nombre: string, adminNombre: string) {
  const a = await prisma.area.create({ data: { nombre } });
  await addLogService(`Área "${a.nombre}" creada`, 'Administracion', adminNombre, 'administrador');
  return a;
}

export async function updateAreaService(id: string, nombre: string, adminNombre: string) {
  const a = await prisma.area.update({ where: { id }, data: { nombre } });
  await addLogService(`Área "${a.nombre}" editada`, 'Administracion', adminNombre, 'administrador');
  return a;
}

export async function deleteAreaService(id: string, adminNombre: string) {
  const a = await prisma.area.findUnique({ where: { id } });
  if (!a) throw new AppError(404, 'Área no encontrada');
  await prisma.area.delete({ where: { id } });
  await addLogService(`Área "${a.nombre}" eliminada`, 'Administracion', adminNombre, 'administrador');
}
