# Design: Importación de datos históricos desde Excel

## Technical Approach

Script TypeScript standalone en `backend/src/scripts/import-excel.ts`, ejecutado directamente con `tsx` (ya en devDependencies). Lee el Excel con la librería `xlsx`, procesa las hojas en orden de dependencias, y realiza upserts idempotentes via Prisma. Sigue el patrón exacto de `backend/prisma/seed.ts`: upsert por campo único, transacciones `$transaction` donde corresponde, y acumulación de errores por fila en lugar de abortar.

El mapeo de columnas del Excel real se centraliza en los bloques `SHEETS`/`COL_ACTIVO`/`COL_COMPONENTE` al inicio del script (ver Interfaces/Contracts).

## Architecture Decisions

### Decision: Ubicación del script en `src/scripts/` (no en `prisma/`)

**Choice**: `backend/src/scripts/import-excel.ts`  
**Alternatives considered**: `backend/prisma/import-excel.ts` (junto al seed), `backend/scripts/import-excel.ts` (raíz)  
**Rationale**: El script reutiliza el singleton `src/lib/prisma.ts` y potencialmente tipos de `src/`. Dentro de `src/` es coherente con la estructura del proyecto. `tsx` no está limitado por `rootDir` de TypeScript — ejecuta el archivo directamente sin pasar por `tsc`.

### Decision: `tsx` como runner (no compilar con `tsc`)

**Choice**: `tsx src/scripts/import-excel.ts`  
**Alternatives considered**: compilar con `tsc` y luego `node dist/scripts/import-excel.js`  
**Rationale**: `tsx` ya es devDependency y es como corren todos los scripts del proyecto (`seed.ts`, `dev`). Compilar requeriría ajustar `rootDir` y `outDir`, innecesario para un script de uso único.

### Decision: `xlsx` como parser de Excel

**Choice**: `npm install xlsx` (SheetJS community edition)  
**Alternatives considered**: `exceljs`, `node-xlsx`  
**Rationale**: `xlsx` es la librería más usada para este caso, soporta `.xlsx` y `.xls`, y permite acceso a hojas por nombre con `workbook.Sheets[nombre]` y conversión a array de objetos con `utils.sheet_to_json()`.

### Decision: Mapeo de columnas como constantes configurables en cabecera del script

**Choice**: Bloques `SHEETS`, `COL_ACTIVO` y `COL_COMPONENTE` al tope del archivo que mapean nombre de hoja/columna del Excel → campo Prisma  
**Alternatives considered**: archivo de configuración JSON externo, argumentos CLI, hardcodeo inline  
**Rationale**: Es el ajuste más rápido cuando se ve el Excel real: cambiar el string de la columna en un solo lugar sin tocar la lógica. No requiere archivos adicionales ni flags CLI.

### Decision: Errores por fila no abortan el proceso

**Choice**: try/catch por fila, acumulación en array `errors`, reporte al final  
**Alternatives considered**: abortar toda la sección ante el primer error, usar transacción global  
**Rationale**: Un Excel de producción puede tener filas con datos parciales o referencias a entidades que no existen. Lo prioritario es importar todo lo que se pueda e informar claramente qué falló.

### Decision: Upsert ignora registros existentes (no sobreescribe)

**Choice**: `upsert({ where: uniqueField, update: {}, create: { ...datos } })`  
**Alternatives considered**: `update: { ...datos }` (sobreescribir si existe)  
**Rationale**: El sistema ya puede tener datos reales cargados manualmente. El import no debe pisar ediciones post-seed. Idempotencia segura: re-correr el script no altera datos existentes.

### Decision: Catálogo resuelto inline con `findFirst` case-insensitive + `create` (no `upsert` literal)

**Choice**: Para cada fila, resolver Ubicacion/TipoComponente/Marca/Proveedor con `findFirst({ where: { nombre/sector: { equals, mode: 'insensitive' } } })` y, si no existe, `create()` con el nombre normalizado vía `titleCase()`. Cache en memoria (`Map`) por entidad para no repetir queries.  
**Alternatives considered**: `prisma.X.upsert({ where: { nombre }, update: {}, create: {...} })` literal, como proponía el proposal original  
**Rationale**: El Excel real tiene variaciones de capitalización ("kingston", "Kingston", "KINGSTON") para el mismo valor. Un `upsert` literal por el string exacto crearía duplicados. `findFirst` insensitive + `create` con `titleCase()` evita duplicados y normaliza la presentación.

### Decision: `idManual` sintético (`IMP-XXXX`) como clave de upsert de Componente

**Choice**: `idManual = "IMP-${String(i+1).padStart(4,'0')}"` (correlativo según la fila de la hoja "2- Inventario"), usado como `where` del `upsert` de Componente.  
**Alternatives considered**: `numeroSerie` como clave de upsert (propuesta original)  
**Rationale**: El Excel real tiene `numeroSerie` vacío, repetido o con placeholders (`s/n`, `s/s`) en una proporción alta de filas — no es apto como clave única idempotente. `idManual` es estable entre corridas y permite idempotencia real (verificado: 2da corrida = 0 creados). `numeroSerie` se conserva como dato informativo, deduplicado en memoria con `usedSerials` y con fallback `SN-${idManual}` cuando es vacío/placeholder/repetido.

### Decision: Fallback `'Sin sector'` para Activos sin columna SECTOR

**Choice**: `const sector = str(fila[COL_ACTIVO.sector]) || 'Sin sector';` — si la celda SECTOR está vacía, se usa el literal `'Sin sector'` como nombre de Ubicacion (creándola si no existe) y se importa el Activo igual.  
**Alternatives considered**: omitir la fila y registrarla en `errors.activos` (propuesta original del spec)  
**Rationale**: Solo 1 fila del Excel real no tiene SECTOR. Omitirla descartaría un equipo real de inventario. Asignarlo a una ubicación "Sin sector" preserva el dato y permite reubicarlo manualmente después desde la UI (ver `enrich-ubicacion.ts`).

### Decision: Stock consumible fuera de alcance

**Choice**: No implementar la fase de Stock (`StockItem`/`StockMovimiento`).  
**Alternatives considered**: buscar datos de consumibles dentro de la hoja "2- Inventario" y clasificarlos heurísticamente  
**Rationale**: El Excel real del área de operaciones solo tiene 2 hojas ("1- Pc por area" y "2- Inventario"), ambas con equipos/componentes serializados — no hay hoja ni sección de consumibles sin serie. Si en el futuro se recibe un Excel de stock, se puede extender el script o crear uno nuevo siguiendo el mismo patrón.

## Data Flow

```
process.argv[2]  →  ruta del archivo .xlsx
        │
        ▼
   xlsx.readFile()  →  Workbook
        │
        ├── Hoja "1- Pc por area"  → sheet_to_json({ defval: '' }) → filasActivos[]
        └── Hoja "2- Inventario"   → sheet_to_json({ defval: '' }) → filasComponentes[]
              (si alguna de las dos hojas no existe → error + lista de hojas disponibles + exit 1)

        │
        ▼  (orden de dependencias)
┌──────────────────────────────────────────────────────────────┐
│  Fase: Activos                                                 │
│  for fila of filasActivos                                      │
│    try                                                          │
│      nroPc = fila[COL_ACTIVO.nroPc] || `SIN-ASIG-${n}`         │
│      resolveUbicacion(sector || 'Sin sector', piso)             │
│        → findFirst insensitive, o create() + cache             │
│      upsert Activo (where: nroPc, update: {})                  │
│      activoByPcNumber.set(numeroDePC, { id, nroPc })           │
│    catch → errors.activos.push(...)                            │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Fase: Componentes                                             │
│  for fila of filasComponentes                                  │
│    try                                                          │
│      idManual = `IMP-${String(i+1).padStart(4,'0')}`           │
│      numeroSerie = dedupe(rawSerie) || `SN-${idManual}`         │
│      resolveTipoComponente / resolveMarca / resolveProveedor   │
│        → findFirst insensitive, o create(titleCase) + cache    │
│      activoId = activoByPcNumber.get(nº extraído de Ubicación) │
│      $transaction:                                              │
│        upsert Componente (where: idManual, update: {})         │
│        if creado:                                               │
│          create HistorialMovimientoComponente(accion: creado)  │
│    catch → errors.componentes.push(...)                        │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
   printReport()  →  consola resumen (Catálogo + Activos + Componentes)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/scripts/import-excel.ts` | Create | Script principal de importación |
| `backend/src/scripts/enrich-ubicacion.ts` | Create | Script auxiliar de un solo uso: corrige Activos cuya Ubicacion quedó como "Sin sector" reasignándolos a la ubicación correcta una vez identificada manualmente |
| `backend/package.json` | Modify | Agregar script `import-excel` y dependencia `xlsx` |
| `.gitignore` | Modify | Excluir `backend/data/` (carpeta local donde se coloca el Excel real, no debe subirse al repo) |

## Interfaces / Contracts

### SHEETS y COLUMN_MAP (valores reales del Excel)

```typescript
const SHEETS = {
  activos: '1- Pc por area',
  componentes: '2- Inventario',
};

const COL_ACTIVO = {
  piso: 'PISO',
  oficina: 'OFI.',
  sector: 'SECTOR',
  nroPc: 'Nº DE PC',
  usuarioAsignado: 'USUARIO',
  micro: 'MICRO / PM',
  ram: 'RAM',
  disco: 'DISCO',
  ip: 'IP',
  mac: 'MAC',
  idAD: 'ID AD',
  pAD: 'P AD',
  cbioPC: 'Cbio.PC',
  manten: 'Manten.',
  so: 'S.O.',
  impresoraObs: 'IMPRESORA / Observaciones',
  estado: '109', // header corrido del Excel original — representa "Estado"
  placaVideo: 'PLACA DE VIDEO',
};

const COL_COMPONENTE = {
  id: 'ID',
  ubicacion: 'Ubicación',
  hardware: 'Hardware',
  fecha: 'Fecha',
  responsable: 'Responsable',
  numeroSerie: 'Numero de Serie',
  marca: 'Marca',
  modelo: 'Modelo',
  proveedor: 'Proveedor ', // ojo: la columna del Excel tiene un espacio al final
  observacion: 'observacion',
};
```

### Estructura del reporte de errores acumulado

```typescript
interface ImportError {
  fila:   number;
  dato:   string;   // nroPc / ID del Excel / numeroSerie
  motivo: string;
}

const counts = {
  ubicaciones:  { creados: 0, existentes: 0 },
  tipos:        { creados: 0, existentes: 0 },
  marcas:       { creados: 0, existentes: 0 },
  proveedores:  { creados: 0, existentes: 0 },
  activos:      { creados: 0, existentes: 0 },
  componentes:  { creados: 0, existentes: 0 },
};

const errors: { activos: ImportError[]; componentes: ImportError[] } = {
  activos: [],
  componentes: [],
};
```

### Lógica de upsert con detección de "creado vs existente"

Prisma `upsert` con `update: {}` siempre retorna el registro pero no indica si fue creado o actualizado. Para detectarlo se hace un `findUnique` previo por `idManual` (no `numeroSerie` — ver decisión "idManual sintético"):

```typescript
// idManual: sintético y correlativo según la fila de "2- Inventario"
const idManual = `IMP-${String(i + 1).padStart(4, '0')}`;

// numeroSerie: deduplicado en memoria, con fallback sintético
const rawSerie = str(fila[COL_COMPONENTE.numeroSerie]);
const isPlaceholder = ['', 's/s', 's/n'].includes(rawSerie.toLowerCase());
const numeroSerie = (!isPlaceholder && !usedSerials.has(rawSerie.toLowerCase()))
  ? rawSerie
  : `SN-${idManual}`;
if (numeroSerie === rawSerie) usedSerials.add(rawSerie.toLowerCase());

const existing = await prisma.componente.findUnique({ where: { idManual } });

await prisma.$transaction(async (tx) => {
  const c = await tx.componente.upsert({
    where:  { idManual },
    update: {},
    create: { idManual, numeroSerie, tipoComponenteId, marcaId, modelo, proveedorId, activoId, responsable, fechaIngreso },
  });

  if (!existing) {
    await tx.historialMovimientoComponente.create({
      data: {
        componenteId:     c.id,
        activoId:         activoId ?? undefined,
        activoCodigo,
        accion:           AccionComponente.creado,
        ubicacionDestino: activoCodigo ?? 'Depósito IT',
        fecha:            fechaIngreso,
        responsable,
        observaciones:    'Importado desde Excel histórico (ID original: ..., fila N)',
      },
    });
  }
  return c;
});
```

## Testing Strategy

No hay test runner configurado en el proyecto. La verificación es manual:

| Capa | Qué verificar | Cómo |
|------|--------------|------|
| Script corre | Sin errores fatales | `pnpm import-excel archivo.xlsx` y ver salida |
| Idempotencia | Segunda ejecución no duplica | Correr dos veces, contar registros antes y después |
| Activos | Aparecen en `/activos` de la UI | Abrir frontend y contar/buscar |
| Componentes | Aparecen con historial en `/activos/:id` | Abrir detalle de un equipo |
| Depósito | Componentes sin equipo en `/stock` | Ver sección Stock → Componentes |
| Reporte consola | Conteos y errores mostrados | Revisar output en terminal |

## Migration / Rollout

No hay cambios de schema. Solo inserción de datos.

Para revertir si los datos importados son incorrectos:
1. `pnpm db:studio` → filtrar por `createdAt` del momento del import → borrar manualmente
2. O desde Supabase Dashboard: `DELETE FROM activos WHERE "createdAt" > 'YYYY-MM-DD HH:MM'`
3. Corregir `COL_ACTIVO`/`COL_COMPONENTE` y re-ejecutar (idempotente)

## Decisiones resueltas durante el apply

- **Nombres de hojas y columnas del Excel real**: `SHEETS = { activos: '1- Pc por area', componentes: '2- Inventario' }`. Mapeo completo en `COL_ACTIVO`/`COL_COMPONENTE` (ver Interfaces/Contracts).
- **¿Hoja de Stock separada?**: No existe — el Excel real solo tiene las 2 hojas anteriores (ver decisión "Stock consumible fuera de alcance").
- **Campo `responsable` en Componente**: columna `Responsable` de la hoja "2- Inventario"; si está vacía, fallback `'Importación Excel'`.
- **Fechas históricas**: columna `Fecha` de la hoja "2- Inventario", convertida con `excelDateToJSDate()` (formato serial de Excel); si está vacía o no es un número válido, fallback `new Date()`.
