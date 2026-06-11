# Design: Importación de datos históricos desde Excel

## Technical Approach

Script TypeScript standalone en `backend/src/scripts/import-excel.ts`, ejecutado directamente con `tsx` (ya en devDependencies). Lee el Excel con la librería `xlsx`, procesa las hojas en orden de dependencias, y realiza upserts idempotentes via Prisma. Sigue el patrón exacto de `backend/prisma/seed.ts`: upsert por campo único, transacciones `$transaction` donde corresponde, y acumulación de errores por fila en lugar de abortar.

El mapeo de columnas del Excel se centraliza en un bloque `COLUMN_MAP` al inicio del script, facilitando el ajuste cuando el archivo real sea compartido.

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

### Decision: `COLUMN_MAP` como constante configurable en cabecera del script

**Choice**: Bloque de constantes al tope del archivo que mapea nombre de columna Excel → campo Prisma  
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

## Data Flow

```
process.argv[2]  →  ruta del archivo .xlsx
        │
        ▼
   readExcel()
   xlsx.readFile()  →  Workbook
        │
        ├── Hoja "Activos"      → sheet_to_json → filas[]
        ├── Hoja "Componentes"  → sheet_to_json → filas[]
        └── Hoja "Stock"        → sheet_to_json → filas[]

        │
        ▼  (orden de dependencias)
┌─────────────────────────────────────────────┐
│  Fase 1: Catálogo                           │
│  upsert Ubicacion   (where: sector)         │
│  upsert TipoComponente (where: nombre)      │
│  upsert Marca          (where: nombre)      │
│  upsert Proveedor      (where: nombre)      │
│  → maps: ubMap, tipoMap, marcaMap, provMap  │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Fase 2: Activos                            │
│  for fila of activos_filas                  │
│    try                                      │
│      upsert Activo (where: nroPc)           │
│      activoMap[nroPc] = activo.id           │
│    catch → errors.activos.push(...)         │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Fase 3: Componentes                        │
│  for fila of componentes_filas              │
│    try                                      │
│      $transaction:                          │
│        upsert Componente (where: numeroSerie│
│        if creado:                           │
│          create HistorialMovimiento(creado) │
│    catch → errors.componentes.push(...)     │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Fase 4: Stock                              │
│  for fila of stock_filas                    │
│    try                                      │
│      upsert StockItem (where: nombre)       │
│      if creado y cantidad > 0:              │
│        $transaction:                        │
│          create StockMovimiento(entrada)    │
│          update StockItem.cantidad          │
│    catch → errors.stock.push(...)           │
└─────────────────────────────────────────────┘
        │
        ▼
   printReport()  →  consola resumen
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/scripts/import-excel.ts` | Create | Script principal de importación |
| `backend/package.json` | Modify | Agregar script `import-excel` y dependencia `xlsx` |

## Interfaces / Contracts

### COLUMN_MAP (placeholder — actualizar con nombres reales del Excel)

```typescript
// ─── CONFIGURACIÓN DE COLUMNAS DEL EXCEL ────────────────────────────────────
// Ajustar los valores string para que coincidan con los encabezados reales
// del archivo Excel. Las claves son los nombres internos del script.
const SHEETS = {
  activos:     'Activos',      // nombre de la hoja en el Excel
  componentes: 'Componentes',
  stock:       'Stock',
};

const COL_ACTIVO = {
  nroPc:              'NroPc',
  ubicacion:          'Ubicacion',
  oficina:            'Oficina',
  usuarioAsignado:    'Usuario Asignado',
  microModelo:        'Modelo CPU',
  microMarca:         'Marca CPU',
  microNroSerie:      'Serie CPU',
  ramTotal:           'RAM Total',
  almacenamientoTotal:'Almacenamiento',
  ip:                 'IP',
  mac:                'MAC',
  idAD:               'ID AD',
  pAD:                'Password AD',
  sistemaOperativo:   'Sistema Operativo',
  impresoraModelo:    'Modelo Impresora',
  impresoraMarca:     'Marca Impresora',
  impresoraNroSerie:  'Serie Impresora',
  observaciones:      'Observaciones',
};

const COL_COMPONENTE = {
  idManual:       'ID',
  tipoComponente: 'Tipo',
  marca:          'Marca',
  modelo:         'Modelo',
  numeroSerie:    'Nro Serie',
  capacidad:      'Capacidad',
  proveedor:      'Proveedor',
  nroPcAsignado:  'Equipo',       // vacío = en depósito
  responsable:    'Responsable',
};

const COL_STOCK = {
  nombre:         'Nombre',
  tipoComponente: 'Tipo',
  proveedor:      'Proveedor',
  cantidad:       'Cantidad',
  minimoRequerido:'Minimo',
};
```

### Estructura del reporte de errores acumulado

```typescript
interface ImportError {
  fila:   number;
  dato:   string;   // nroPc / numeroSerie / nombre del ítem
  motivo: string;
}

const errors: {
  activos:     ImportError[];
  componentes: ImportError[];
  stock:       ImportError[];
} = { activos: [], componentes: [], stock: [] };

const counts: {
  activos:     { creados: number; existentes: number };
  componentes: { creados: number; existentes: number };
  stock:       { creados: number; existentes: number };
} = { ... };
```

### Lógica de upsert con detección de "creado vs existente"

Prisma `upsert` con `update: {}` siempre retorna el registro pero no indica si fue creado o actualizado. Para detectar si es nuevo se compara `createdAt === updatedAt` o se hace un `findUnique` previo:

```typescript
// Patrón: findUnique antes del upsert
const existe = await prisma.componente.findUnique({ where: { numeroSerie } });
const componente = await prisma.$transaction(async (tx) => {
  const c = await tx.componente.upsert({
    where:  { numeroSerie },
    update: {},
    create: { ...datos },
  });
  if (!existe) {
    await tx.historialMovimientoComponente.create({
      data: {
        componenteId:     c.id,
        accion:           'creado',
        ubicacionDestino: c.activoId ? c.activoId : 'Depósito IT',
        activoCodigo:     activoMap_invertido[c.activoId ?? ''],
        fecha:            new Date(),
        responsable:      'Importación Excel',
        observaciones:    'Componente importado desde planilla histórica',
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
| StockItems | Cantidad correcta en `/stock` | Ver sección Stock → Consumibles |
| Reporte consola | Conteos y errores mostrados | Revisar output en terminal |

## Migration / Rollout

No hay cambios de schema. Solo inserción de datos.

Para revertir si los datos importados son incorrectos:
1. `pnpm db:studio` → filtrar por `createdAt` del momento del import → borrar manualmente
2. O desde Supabase Dashboard: `DELETE FROM activos WHERE "createdAt" > 'YYYY-MM-DD HH:MM'`
3. Corregir `COLUMN_MAP` y re-ejecutar (idempotente)

## Open Questions

- [ ] **Nombres de hojas y columnas del Excel real** — Se resolverán en la fase de apply cuando el usuario comparta el archivo. El `COLUMN_MAP` en la cabecera del script es el punto de ajuste.
- [ ] **¿El Excel tiene hoja de Stock separada o los consumibles están mezclados con componentes?** — Definir en apply.
- [ ] **Campo `responsable` en Componente** — ¿Existe una columna en el Excel o se usa un valor fijo como `"Importación histórica"`? Definir en apply.
- [ ] **¿Hay fechas históricas en el Excel?** — Si existe una columna de fecha de ingreso, mapearla a `fechaIngreso` de Componente. Si no, usar `new Date()`.
