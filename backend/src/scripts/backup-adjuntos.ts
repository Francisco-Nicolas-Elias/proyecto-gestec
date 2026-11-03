// Backup de los adjuntos (Supabase Storage, bucket "gestec-adjuntos") a una carpeta local.
// Es incremental: solo descarga los archivos que todavía no están en la carpeta destino
// (los nombres son únicos, así que un archivo ya descargado nunca cambia).
// Uso: node dist/scripts/backup-adjuntos.js <carpeta-destino>
//      (en desarrollo: pnpm tsx src/scripts/backup-adjuntos.ts <carpeta-destino>)
// Lee SUPABASE_URL y SUPABASE_SERVICE_KEY de backend/.env (se corre desde la carpeta backend).
// Sale con código 1 si algún archivo no se pudo descargar.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'gestec-adjuntos';
const PAGE_SIZE = 100;

async function main() {
  const destino = process.argv[2];
  if (!destino) throw new Error('Falta la carpeta destino. Uso: backup-adjuntos <carpeta-destino>');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el .env');

  const supabase = createClient(url, key);
  fs.mkdirSync(destino, { recursive: true });

  let total = 0;
  let descargados = 0;
  let fallidos = 0;

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`No se pudo listar el bucket: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      // Los adjuntos se guardan en la raíz del bucket; una entrada sin id es una carpeta
      if (!item.id) continue;
      total++;
      const archivo = path.join(destino, path.basename(item.name));
      if (fs.existsSync(archivo)) continue;

      const { data: blob, error: errDescarga } = await supabase.storage.from(BUCKET).download(item.name);
      if (errDescarga || !blob) {
        console.error(`ERROR descargando ${item.name}: ${errDescarga?.message ?? 'sin contenido'}`);
        fallidos++;
        continue;
      }
      // Se escribe a un temporal y se renombra, para que un corte a mitad no deje un archivo incompleto
      const temporal = `${archivo}.part`;
      fs.writeFileSync(temporal, Buffer.from(await blob.arrayBuffer()));
      fs.renameSync(temporal, archivo);
      descargados++;
    }

    if (data.length < PAGE_SIZE) break;
  }

  console.log(`Adjuntos en el bucket: ${total} | descargados ahora: ${descargados} | fallidos: ${fallidos}`);
  if (fallidos > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
