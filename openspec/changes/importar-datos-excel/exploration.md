## Exploration: Importación de datos históricos desde Excel

### Current State

La base de datos está poblada únicamente con datos de seed de prueba (3 activos, 13 componentes, algunos tickets/tareas).
El área de operaciones tiene un Excel histórico con el inventario real de equipos IT, componentes y stock que nunca fue cargado al sistema.
No existe ningún mecanismo de importación masiva — toda la carga es manual vía UI o el seed.ts de desarrollo.

### Affected Areas

- `backend/prisma/schema.prisma` — referencia de campos y constraints (@unique, FK obligatorias)
- `backend/prisma/seed.ts` — patrón a replicar: upsert idempotente por campo único
- `backend/src/services/componentes.service.ts` — `createComponenteService` crea `HistorialMovimientoComponente` en $transaction al registrar un componente; el script debe replicar este comportamiento
- `backend/src/services/stock.service.ts` — `createStockMovimientoService` actualiza `cantidad` del `StockItem` en $transaction; el script debe hacer lo mismo
- `backend/src/scripts/` (nuevo) — ubicación del script de importación

### Modelos que toca el import (orden de dependencias)

```
Nivel 0 — Catálogo (sin FK externas):
  TipoComponente (nombre @unique)
  Marca          (nombre @unique)
  Proveedor      (nombre, contacto?, telefono?)
  Ubicacion      (sector @unique, piso)

Nivel 1 — Activos (FK → Ubicacion):
  Activo         (nroPc @unique, ubicacionId, ...30 campos opcionales)

Nivel 2 — Componentes (FK → TipoComponente, Marca, Activo?):
  Componente               (idManual @unique, numeroSerie @unique, tipoComponenteId, marcaId, activoId?)
  HistorialMovimientoComponente  (creado automáticamente junto con cada Componente)

Nivel 3 — Stock consumibles (sin FK a Activo):
  StockItem      (nombre, tipoComponenteId?, proveedorId?, cantidad, minimoRequerido)
  StockMovimiento (stockItemId FK, tipo: entrada, cantidad, motivo)
```

### Campos obligatorios mínimos por modelo

| Modelo | Campos requeridos |
|--------|-------------------|
| Activo | `nroPc`, `ubicacionId` |
| Componente | `idManual`, `tipoComponenteId`, `marcaId`, `modelo`, `numeroSerie`, `responsable` |
| StockItem | `nombre` |
| StockMovimiento | `stockItemId`, `tipo`, `cantidad`, `motivo` |

### Approaches

1. **Script standalone Node.js/TypeScript en `backend/src/scripts/`**
   - Pros: acceso directo a Prisma (sin overhead HTTP), transacciones reales, idempotente con upsert, puede correr con `npx ts-node` o `pnpm tsx`, misma estructura que seed.ts
   - Cons: el Excel debe estar en el servidor (o en la máquina de desarrollo)
   - Effort: Medium

2. **Endpoint REST `POST /api/admin/import` con multer**
   - Pros: permite subir desde UI, sin acceso al servidor
   - Cons: mucho overhead (auth, validación HTTP, manejo de errores REST), no transaccional fácilmente, más código
   - Effort: High

3. **Convertir Excel a CSV manualmente y usar un script SQL directo**
   - Pros: muy rápido de escribir
   - Cons: frágil, no valida constraints, no crea historial de componentes, no actualiza contadores de stock
   - Effort: Low (pero arriesgado)

### Recommendation

**Approach 1 — Script standalone TypeScript.**
Mismo patrón que `seed.ts`: leer el Excel con la librería `xlsx` (ya disponible en npm), parsear hojas, upsertear en orden de dependencias, crear el historial de componentes en $transaction, registrar movimientos de stock con actualización de cantidad. Puede correrse con `npx tsx src/scripts/import-excel.ts` sin levantar el servidor.

El Excel aún no fue compartido, por lo que el **diseño de mapeo de columnas** se definirá en la spec/design una vez vista la estructura real.

### Risks

- **Nombres de ubicaciones en el Excel no coinciden exactamente** con los del sistema → el script debe hacer matching case-insensitive y loguear los no resueltos en lugar de fallar
- **Números de serie duplicados** → el upsert por `numeroSerie` es idempotente, pero se debe confirmar qué hacer: ignorar o actualizar
- **Activos sin ubicación reconocida** → abortar esa fila y reportar, no interrumpir el import completo
- **Catálogo incompleto** (marcas/tipos no vistos antes) → el script debe crearlos automáticamente con `upsert`
- **El Excel puede tener varias hojas** con distintas estructuras → hay que verificar la estructura real antes de fijar el mapeo

### Ready for Proposal

Sí — con la condición de que el usuario comparta el Excel antes de la fase de spec/design para definir el mapeo exacto de columnas. El proposal y las tareas pueden escribirse ahora; el diseño técnico detallado (mapeo columna→campo) queda para cuando se vea el archivo.
