// Manda por mail el resultado del backup (aviso de falla o resumen semanal), usando el SMTP del backend/.env.
// Lo invoca deploy/backup-db.sh; el cuerpo del mensaje (texto plano) llega por stdin.
// Uso: echo "cuerpo" | node dist/scripts/notificar-backup.js "<asunto>"
// Destinatarios: BACKUP_ALERT_EMAILS en backend/.env (separados por coma).
// Sale con código 1 si no se pudo enviar.

import 'dotenv/config';
import fs from 'fs';
import nodemailer from 'nodemailer';

const DESTINATARIOS_POR_DEFECTO = 'fahumada@ies21.edu.ar';

async function main() {
  const asunto = process.argv[2];
  if (!asunto) throw new Error('Falta el asunto. Uso: notificar-backup "<asunto>" (cuerpo por stdin)');

  const cuerpo = fs.readFileSync(0, 'utf8').trim() || '(sin detalle)';
  const destinatarios = (process.env.BACKUP_ALERT_EMAILS || DESTINATARIOS_POR_DEFECTO)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (destinatarios.length === 0) throw new Error('BACKUP_ALERT_EMAILS no tiene ningún destinatario');

  const port = Number(process.env.SMTP_PORT ?? 2525);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"GESTEC" <${process.env.SMTP_FROM ?? 'noreply@ies21.edu.ar'}>`,
    to: destinatarios,
    subject: asunto,
    text: cuerpo,
  });
  console.log(`Aviso enviado a: ${destinatarios.join(', ')}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
