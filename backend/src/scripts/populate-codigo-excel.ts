// Pobla el campo codigoExcel en los componentes importados desde Excel.
// Lee el texto de observaciones del primer historial (ej: "ID original: 1234, fila 5")
// y lo guarda en el campo codigoExcel de cada componente.
// Uso: pnpm tsx src/scripts/populate-codigo-excel.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const componentes = await prisma.componente.findMany({
    where: { codigoExcel: null },
    include: {
      historial: {
        where: { accion: 'creado' },
        orderBy: { fecha: 'asc' },
        take: 1,
      },
    },
  });

  console.log(`Procesando ${componentes.length} componentes sin codigoExcel...`);

  let updated = 0;
  let sinId = 0;

  for (const c of componentes) {
    const obs = c.historial[0]?.observaciones ?? '';
    const match = /ID original:\s*([^,|)]+)/.exec(obs);
    if (match) {
      const rawId = match[1].trim();
      if (rawId && rawId.toLowerCase() !== 's/d' && rawId !== '') {
        await prisma.componente.update({
          where: { id: c.id },
          data: { codigoExcel: rawId },
        });
        updated++;
      } else {
        sinId++;
      }
    }
  }

  console.log(`✅ ${updated} componentes actualizados con codigoExcel`);
  console.log(`ℹ️  ${sinId} componentes sin ID original en el historial (s/d)`);
  console.log(`   ${componentes.length - updated - sinId} componentes sin historial de importación`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
