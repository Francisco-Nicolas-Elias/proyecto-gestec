import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { sendVerificationEmail } from '../lib/email';
import { addLogService } from './logs.service';

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

export async function registroService(nombre: string, email: string, password: string) {
  const emailExistenteUsuario = await prisma.usuario.findUnique({ where: { email } });
  if (emailExistenteUsuario) throw new AppError(409, 'El email ya está registrado');

  const emailExistentePendiente = await prisma.registroPendiente.findUnique({ where: { email } });
  if (emailExistentePendiente) throw new AppError(409, 'Ya existe un registro pendiente de verificación para ese email');

  const passwordHash = await bcrypt.hash(password, 12);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.registroPendiente.create({
    data: { nombre, email, passwordHash, token, expiresAt },
  });

  await sendVerificationEmail(email, nombre, token);

  return { message: 'Registro exitoso. Revisá tu email para verificar tu cuenta.' };
}

export async function verificarEmailService(token: string) {
  const registro = await prisma.registroPendiente.findUnique({ where: { token } });
  if (!registro) throw new AppError(404, 'El enlace de verificación es inválido');

  if (registro.expiresAt < new Date()) {
    await prisma.registroPendiente.delete({ where: { token } });
    throw new AppError(410, 'El enlace de verificación ha expirado. Registrate nuevamente.');
  }

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        nombre: registro.nombre,
        email: registro.email,
        password: registro.passwordHash,
        rol: 'docente_empleado',
      },
      omit: { password: true },
    });
    await tx.registroPendiente.delete({ where: { token } });
    return u;
  });

  await addLogService(
    `Cuenta creada por auto-registro: ${usuario.email}`,
    'Administracion',
    usuario.nombre,
    'docente_empleado',
    usuario.id,
  );

  return { message: 'Cuenta verificada correctamente. Ya podés iniciar sesión.' };
}
