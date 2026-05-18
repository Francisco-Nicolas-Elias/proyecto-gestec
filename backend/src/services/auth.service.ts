import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

export async function loginService(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) throw new AppError(401, 'Usuario o contraseña incorrectos');

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) throw new AppError(401, 'Usuario o contraseña incorrectos');

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');

  const token = jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as any },
  );

  const { password: _, ...usuarioSinPassword } = usuario;
  return { token, usuario: usuarioSinPassword };
}

export async function getMeService(userId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    omit: { password: true },
  });
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  return usuario;
}
