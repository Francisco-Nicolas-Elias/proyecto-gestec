# Proposal: Importación de datos históricos desde Excel

## Intent

El sistema actualmente solo contiene datos de seed de prueba. El área de operaciones del IES Córdoba tiene un Excel histórico con el inventario real de equipos IT, componentes serializados y stock consumible que nunca fue cargado a GESTEC.

El objetivo es poblar la base de datos de producción con esos datos reales de forma segura, idempotente y trazable, sin intervención manual registro por registro en la UI.

## Scope

### In Scope
- Script TypeScript standalone `backend/src/scripts/import-excel.ts` que parsea el archivo Excel y realiza upserts en Prisma
- Resolución automática de catálogo (Ubicaciones, TipoComponente, Marcas, Proveedores) encontrado en los datos, vía búsqueda case-insensitive + creación si no existe
- Importación de Activos (equipos) con todos sus campos
- Importación de Componentes serializados, con creación automática de `HistorialMovimientoComponente` (acción: `creado`) en `$transaction`
- Reporte en consola de filas importadas, filas con error y motivo (sin abortar el proceso completo ante errores individuales)
- Comando `pnpm import-excel` en `backend/package.json`

### Out of Scope
- Endpoint REST para subir Excel desde la UI (puede hacerse en el futuro)
- Importación de Tickets, Tareas, Intervenciones o Mantenimientos históricos
- Importación de Usuarios desde el Excel
- Importación de Stock consumible (`StockItem`/`StockMovimiento`) — el Excel real del área de operaciones solo tiene las hojas "1- Pc por area" y "2- Inventario"; no existe ninguna hoja de stock/consumibles
- Migración de schema (no se agregan modelos nuevos)
- Validación de negocio compleja (duplicados se resuelven con upsert)

## Approach

Script Node.js/TypeScript en `backend/src/scripts/import-excel.ts`, corrido con `tsx` (ya disponible como devDependency). Usa la librería `xlsx` para parsear el archivo. Sigue el patrón general de `seed.ts`, con algunos ajustes definidos durante la implementación:
- `upsert` idempotente por campo único: `nroPc` para Activo, `idManual` (sintético `IMP-XXXX`) para Componente
- Catálogo (Ubicacion, TipoComponente, Marca, Proveedor) resuelto inline por fila mediante `findFirst` case-insensitive + `create` si no existe, con cache en memoria
- Procesa en orden de dependencias: activos → componentes (el catálogo se resuelve dentro de cada loop, no como fase previa separada)
- Cada componente creado genera su `HistorialMovimientoComponente` en `$transaction` (replica `createComponenteService`)
- El mapeo de columnas del Excel real (hojas "1- Pc por area" y "2- Inventario") está centralizado en `SHEETS`/`COL_ACTIVO`/`COL_COMPONENTE` al inicio del script

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/scripts/import-excel.ts` | New | Script principal de importación |
| `backend/src/scripts/enrich-ubicacion.ts` | New | Script auxiliar de un solo uso: corrige Activos cuya Ubicacion quedó como "Sin sector", reasignándolos a la ubicación correcta |
| `backend/package.json` | Modified | Agregar script `"import-excel": "tsx src/scripts/import-excel.ts"` |
| `backend/package.json` | Modified | Agregar dependencia `xlsx` |
| `.gitignore` | Modified | Excluir `backend/data/` (carpeta local donde se coloca el Excel real) |
| `backend/prisma/schema.prisma` | No change | Solo lectura — no se modifica el schema |
| Base de datos (Supabase) | Data | Se insertan/actualizan filas en tablas existentes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nombres de ubicaciones en Excel no coinciden con los del sistema | Alta | Matching case-insensitive + crear nueva ubicación automáticamente si no existe |
| Números de serie duplicados, vacíos o placeholder (`s/n`, `s/s`) en el Excel real | Alta | `idManual` sintético (`IMP-XXXX`) como clave de upsert; `numeroSerie` se deduplica en memoria y usa `SN-${idManual}` como fallback |
| Activos sin columna SECTOR | Baja (1 fila real) | Fallback a Ubicacion `'Sin sector'`, se importa el Activo igual y se reubica manualmente después |
| El Excel tiene estructura de hojas o columnas diferente a lo esperado | Resuelto | Hojas reales confirmadas: "1- Pc por area" y "2- Inventario"; mapeo fijado en `SHEETS`/`COL_ACTIVO`/`COL_COMPONENTE` |
| Ejecución accidental en producción con datos incorrectos | Baja | El script requiere ruta de archivo como argumento; es idempotente (re-correr no duplica) |

## Rollback Plan

El script usa `upsert` — no borra datos. En el peor caso, si los datos importados son incorrectos:
1. Identificar los registros por `createdAt` (todos los importados tendrán fecha cercana)
2. Borrar manualmente desde Prisma Studio (`pnpm db:studio`) o con queries SQL directas en Supabase
3. Corregir el script/mapeo y volver a ejecutar (idempotente)

No hay migraciones de schema, por lo que no hay riesgo de estructura de base de datos.

## Dependencies

- El archivo Excel del área de operaciones debe estar disponible en el filesystem antes de ejecutar el script
- La librería `xlsx` debe instalarse como dependencia en `backend/`

## Success Criteria

- [x] El script corre sin errores fatales con el Excel real del área de operaciones
- [ ] Todos los activos del Excel aparecen en la UI de GESTEC (`/activos`) — verificado vía API (376 activos); verificación visual pendiente
- [ ] Todos los componentes del Excel aparecen con su historial de creación en `/activos/:id` — verificado vía API; verificación visual pendiente
- [ ] Los componentes en depósito (sin activo asignado) aparecen en `/stock` — verificado vía API (1046 en depósito); verificación visual pendiente
- ~~Los StockItems consumibles aparecen en `/stock` con la cantidad correcta~~ — **No aplica**: el Excel real no tiene hoja de Stock/consumibles
- [x] Ejecutar el script una segunda vez no duplica ningún registro (verificado: 2da corrida = 0 creados en todas las categorías)
- [x] El reporte final en consola indica cuántos registros se importaron y cuáles fallaron con su motivo
