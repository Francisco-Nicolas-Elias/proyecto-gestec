import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { addLogService } from './logs.service';

export async function loginService(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (usuario?.bloqueado) throw new AppError(403, 'Tu cuenta está bloqueada. Contactá al administrador.');

  const valid = usuario ? await bcrypt.compare(password, usuario.password) : false;

  if (!usuario || !valid) {
    if (usuario) {
      const intentos = usuario.intentosFallidos + 1;

      if (intentos >= 10) {
        await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: intentos, bloqueado: true } });
        await addLogService(
          `Cuenta bloqueada automáticamente por ${intentos} intentos fallidos de inicio de sesión`,
          'Administracion',
          usuario.nombre,
          usuario.rol,
          usuario.id,
        );
      } else {
        await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: intentos } });
      }
    }

    throw new AppError(401, 'Email o contraseña incorrectos');
  }

  if (usuario.intentosFallidos > 0) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: 0 } });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');

  const token = jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'] },
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
  if (emailExistentePendiente) {
    if (emailExistentePendiente.expiresAt >= new Date()) {
      throw new AppError(409, 'Ya existe un registro pendiente de verificación para ese email');
    }
    await prisma.registroPendiente.delete({ where: { email } });
  }

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

export async function solicitarRecuperacionService(email: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Siempre responder igual para no revelar si el email existe
  if (!usuario) return { message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' };

  const token = crypto.randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
  });

  await sendPasswordResetEmail(usuario.email, usuario.nombre, token);

  return { message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' };
}

export async function resetPasswordService(token: string, nuevaPassword: string) {
  const usuario = await prisma.usuario.findUnique({ where: { resetPasswordToken: token } });

  if (!usuario || !usuario.resetPasswordExpiry) throw new AppError(400, 'El enlace es inválido o ya fue usado');
  if (usuario.resetPasswordExpiry < new Date()) throw new AppError(410, 'El enlace de recuperación ha expirado. Solicitá uno nuevo.');

  const esMismaPassword = await bcrypt.compare(nuevaPassword, usuario.password);
  if (esMismaPassword) throw new AppError(400, 'La nueva contraseña no puede ser igual a la anterior');

  const hash = await bcrypt.hash(nuevaPassword, 12);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { password: hash, resetPasswordToken: null, resetPasswordExpiry: null },
  });

  await addLogService(
    `Contraseña restablecida por recuperación: ${usuario.email}`,
    'Administracion',
    usuario.nombre,
    usuario.rol,
    usuario.id,
  );

  return { message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' };
}
