import { app } from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;
const ES_PRODUCCION = process.env.NODE_ENV === 'production';
// En producción el backend solo recibe pedidos del proxy (Apache) que corre en el mismo servidor:
// escuchar únicamente en 127.0.0.1 evita que el puerto 3000 quede expuesto a la red aunque falle el firewall.
const HOST = process.env.HOST ?? (ES_PRODUCCION ? '127.0.0.1' : undefined);

async function main() {
  if (ES_PRODUCCION && (process.env.JWT_SECRET ?? '').length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción (generarlo con: openssl rand -base64 48)');
  }

  await prisma.$connect();
  console.log('✅ Conectado a PostgreSQL (Supabase)');

  const onListening = () => {
    console.log(`🚀 Servidor corriendo en http://${HOST ?? 'localhost'}:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV ?? 'development'}`);
  };
  if (HOST) app.listen(PORT, HOST, onListening);
  else app.listen(PORT, onListening);
}

main().catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
