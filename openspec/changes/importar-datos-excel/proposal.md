# Proposal: Importación de datos históricos desde Excel

## Intent

El sistema actualmente solo contiene datos de seed de prueba. El área de operaciones del IES Córdoba tiene un Excel histórico con el inventario real de equipos IT, componentes serializados y stock consumible que nunca fue cargado a GESTEC.

El objetivo es poblar la base de datos de producción con esos datos reales de forma segura, idempotente y trazable, sin intervención manual registro por registro en la UI.

## Scope

### In Scope
- Script TypeScript standalone `backend/src/scripts/import-excel.ts` que parsea el archivo Excel y realiza upserts en Prisma
- Upsert automático de catálogo (Ubicaciones, TipoComponente, Marcas, Proveedores) encontrado en los datos
- Importación de Activos (equipos) con todos sus campos
- Importación de Componentes serializados, con creación automática de `HistorialMovimientoComponente` (acción: `creado`) en `$transaction`
- Importación de StockItems (consumibles) con StockMovimiento inicial de entrada y actualización de cantidad en `$transaction`
- Reporte en consola de filas importadas, filas con error y motivo (sin abortar el proceso completo ante errores individuales)
- Comando `pnpm import-excel` en `backend/package.json`

### Out of Scope
- Endpoint REST para subir Excel desde la UI (puede hacerse en el futuro)
- Importación de Tickets, Tareas, Intervenciones o Mantenimientos históricos
- Importación de Usuarios desde el Excel
- Migración de schema (no se agregan modelos nuevos)
- Validación de negocio compleja (duplicados se resuelven con upsert)

## Approach

Script Node.js/TypeScript en `backend/src/scripts/import-excel.ts`, corrido con `tsx` (ya disponible como devDependency). Usa la librería `xlsx` para parsear el archivo. Sigue exactamente el mismo patrón que `seed.ts`:
- `upsert` idempotente por campo único (`nroPc`, `numeroSerie`, `idManual`, `nombre`)
- Procesa en orden de dependencias: catálogo → activos → componentes → stock
- Cada componente creado genera su `HistorialMovimientoComponente` en `$transaction` (replica `createComponenteService`)
- Cada StockItem creado registra un `StockMovimiento` de entrada inicial en `$transaction` (replica `createStockMovimientoService`)
- El mapeo exacto de columnas del Excel se define en la fase de design, una vez compartido el archivo real

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/scripts/import-excel.ts` | New | Script principal de importación |
| `backend/package.json` | Modified | Agregar script `"import-excel": "tsx src/scripts/import-excel.ts"` |
| `backend/package.json` | Modified | Agregar dependencia `xlsx` |
| `backend/prisma/schema.prisma` | No change | Solo lectura — no se modifica el schema |
| Base de datos (Supabase) | Data | Se insertan/actualizan filas en tablas existentes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nombres de ubicaciones en Excel no coinciden con los del sistema | Alta | Matching case-insensitive + crear nueva ubicación automáticamente si no existe |
| Números de serie o nroPc duplicados entre Excel y seed de prueba | Media | `upsert` idempotente: si existe, se ignora (no sobreescribe) |
| Activos con ubicación no reconocible | Media | Skipear la fila, agregar al reporte de errores, continuar |
| El Excel tiene estructura de hojas o columnas diferente a lo esperado | Alta | El mapeo se revisa y ajusta en fase de design con el archivo real |
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
- El Excel debe compartirse para definir el mapeo exacto en la fase de design

## Success Criteria

- [ ] El script corre sin errores fatales con el Excel real del área de operaciones
- [ ] Todos los activos del Excel aparecen en la UI de GESTEC (`/activos`)
- [ ] Todos los componentes del Excel aparecen con su historial de creación en `/activos/:id`
- [ ] Los componentes en depósito (sin activo asignado) aparecen en `/stock`
- [ ] Los StockItems consumibles aparecen en `/stock` con la cantidad correcta
- [ ] Ejecutar el script una segunda vez no duplica ningún registro
- [ ] El reporte final en consola indica cuántos registros se importaron y cuáles fallaron con su motivo
