import bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { addLogService } from './logs.service';

// ── Usuarios ──────────────────────────────────────────────────────────────────

export async function getUsuariosService() {
  return prisma.usuario.findMany({ omit: { password: true }, orderBy: { nombre: 'asc' } });
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
  const t = await prisma.tipoComponente.findUnique({ where: { id } });
  if (!t) throw new AppError(404, 'Tipo de componente no encontrado');
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
  return prisma.marca.update({ where: { id }, data: { nombre } });
}

export async function deleteMarcaService(id: string, adminNombre: string) {
  const m = await prisma.marca.findUnique({ where: { id } });
  if (!m) throw new AppError(404, 'Marca no encontrada');
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
  return prisma.proveedor.update({ where: { id }, data });
}

export async function deleteProveedorService(id: string, adminNombre: string) {
  const p = await prisma.proveedor.findUnique({ where: { id } });
  if (!p) throw new AppError(404, 'Proveedor no encontrado');
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
