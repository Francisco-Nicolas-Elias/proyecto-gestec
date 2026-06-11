// Enriquecimiento posterior al import: agrega la "Ubicación" original del Excel
// al historial de los componentes cuya ubicación no es "PCxxx", "BAJA" ni
// "operaciones" (esos casos quedaron en Depósito sin esa info durante el import).
// Uso: pnpm tsx src/scripts/enrich-ubicacion.ts <ruta-archivo.xlsx>
//
// Es idempotente: si ya se agregó la nota, no la duplica.

import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: tsx src/scripts/enrich-ubicacion.ts <ruta-archivo.xlsx>');
    process.exit(1);
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(resolved);
  const sheet = workbook.Sheets['2- Inventario'];
  const filas = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const pcPattern = /^pc\s*0*(\d+)\s*$/i;
  let actualizados = 0;
  let yaEnriquecidos = 0;
  let sinHistorial = 0;
  const omitidos: string[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const ub = str(fila['Ubicación']);
    if (!ub) continue;
    if (pcPattern.test(ub)) continue;
    if (ub.toUpperCase() === 'BAJA') continue;
    if (ub.toLowerCase() === 'operaciones') continue;

    const idManual = `IMP-${String(i + 1).padStart(4, '0')}`;
    const componente = await prisma.componente.findUnique({
      where: { idManual },
      include: { historial: { where: { accion: 'creado' } } },
    });

    if (!componente) {
      omitidos.push(idManual);
      continue;
    }
    const hist = componente.historial[0];
    if (!hist) {
      sinHistorial++;
      continue;
    }

    const nota = `Ubicación original: "${ub}"`;
    if (hist.observaciones?.includes(nota)) {
      yaEnriquecidos++;
      continue;
    }

    await prisma.historialMovimientoComponente.update({
      where: { id: hist.id },
      data: {
        observaciones: [hist.observaciones, nota].filter(Boolean).join(' | '),
      },
    });
    actualizados++;
  }

  console.log(`✓ ${actualizados} historiales enriquecidos con la ubicación original`);
  if (yaEnriquecidos) console.log(`  (${yaEnriquecidos} ya tenían la nota — sin cambios)`);
  if (sinHistorial) console.log(`⚠️  ${sinHistorial} componentes sin historial "creado"`);
  if (omitidos.length) console.log(`⚠️  ${omitidos.length} idManual no encontrados: ${omitidos.slice(0, 10).join(', ')}`);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
