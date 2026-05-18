import { app } from './app';
import { prisma } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  await prisma.$connect();
  console.log('✅ Conectado a PostgreSQL (Supabase)');

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

main().catch((err) => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
