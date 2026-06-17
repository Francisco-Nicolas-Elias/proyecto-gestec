import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 2525),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, nombre: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const link = `${frontendUrl}/verificar-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"GESTEC" <${process.env.SMTP_FROM ?? 'noreply@ies21.edu.ar'}>`,
      to: email,
      subject: 'Verificá tu cuenta en GESTEC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #00a6d6;">Bienvenido/a a GESTEC, ${nombre}</h2>
          <p>Para activar tu cuenta hacé clic en el siguiente botón:</p>
          <a href="${link}" style="
            display: inline-block;
            background: #00a6d6;
            color: white;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 16px 0;
          ">Verificar mi cuenta</a>
          <p style="color: #666; font-size: 13px;">
            Este enlace expira en 24 horas. Si no solicitaste este registro podés ignorar este email.
          </p>
          <p style="color: #999; font-size: 12px;">
            Si el botón no funciona copiá este enlace en tu navegador:<br/>
            <a href="${link}" style="color: #00a6d6;">${link}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Error al enviar email de verificación:', err);
  }
}

export async function sendPasswordResetEmail(email: string, nombre: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const link = `${frontendUrl}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"GESTEC" <${process.env.SMTP_FROM ?? 'noreply@ies21.edu.ar'}>`,
      to: email,
      subject: 'Restablecer contraseña — GESTEC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #00a6d6;">Hola ${nombre},</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en GESTEC.</p>
          <p>Hacé clic en el siguiente botón para crear una nueva contraseña:</p>
          <a href="${link}" style="
            display: inline-block;
            background: #00a6d6;
            color: white;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 16px 0;
          ">Restablecer contraseña</a>
          <p style="color: #666; font-size: 13px;">
            Este enlace expira en 1 hora. Si no solicitaste el restablecimiento, podés ignorar este email — tu contraseña no cambiará.
          </p>
          <p style="color: #999; font-size: 12px;">
            Si el botón no funciona copiá este enlace en tu navegador:<br/>
            <a href="${link}" style="color: #00a6d6;">${link}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Error al enviar email de recuperación de contraseña:', err);
  }
}

export async function sendTaskAssignedEmail(
  email: string,
  nombre: string,
  tarea: { titulo: string },
  asignadoPor: string,
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const link = `${frontendUrl}/tareas`;

  try {
    await transporter.sendMail({
      from: `"GESTEC" <${process.env.SMTP_FROM ?? 'noreply@ies21.edu.ar'}>`,
      to: email,
      subject: `Te asignaron una tarea: ${tarea.titulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2 style="color: #00a6d6;">Hola ${nombre},</h2>
          <p><strong>${asignadoPor}</strong> te asignó como responsable de la tarea:</p>
          <p style="font-size: 16px; font-weight: bold; color: #333;">"${tarea.titulo}"</p>
          <a href="${link}" style="
            display: inline-block;
            background: #00a6d6;
            color: white;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 16px 0;
          ">Ver tablero de tareas</a>
          <p style="color: #999; font-size: 12px;">
            Si el botón no funciona copiá este enlace en tu navegador:<br/>
            <a href="${link}" style="color: #00a6d6;">${link}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[email] Error al enviar email de tarea asignada:', err);
  }
}
