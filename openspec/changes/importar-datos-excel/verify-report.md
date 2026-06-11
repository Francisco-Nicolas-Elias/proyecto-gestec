# Verification Report

**Change**: importar-datos-excel
**Fecha**: 2026-06-11
**Verificador**: sdd-verify

## Completeness

| Métrica | Valor |
|---------|-------|
| Tasks total | 15 |
| Tasks completas | 14 |
| Tasks incompletas | 1 |

**Tarea incompleta**:
- 3.4 "Implementar la Fase 4 del script (stock)" — marcada como **omitida** (no `[x]`). El Excel real solo tiene las hojas `'1- Pc por area'` y `'2- Inventario'`; no existe ninguna hoja de Stock/consumibles. Es una omisión deliberada y documentada, no un olvido, pero deja la Requirement "Importación de Stock consumible" del spec sin implementación (ver Correctness e Issues Found).

## Correctness (Specs)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Ejecución e invocación del script | ✅ Implemented | `pnpm import-excel`, `process.argv[2]`, guard de archivo inexistente con `process.exit(1)` — todo presente en `import-excel.ts:191-211` |
| Parseo del archivo Excel | ✅ Implemented | `xlsx.readFile` + `sheet_to_json({ defval: '' })` para ambas hojas; `str()` tolera celdas vacías |
| Upsert de catálogo (Ubicaciones, TipoComponente, Marca, Proveedor) | ⚠️ Partial | Idempotente y case-insensitive, pero usa `findFirst` + `create` condicional, no `prisma.X.upsert()` literal como exige el spec |
| Importación de Activos | ⚠️ Partial | `upsert` por `nroPc` ✅; pero el escenario "ubicación no mapeada" no omite la fila — usa fallback `'Sin sector'` e importa igual (1 fila afectada) |
| Importación de Componentes | ⚠️ Partial | `$transaction` + historial "creado" ✅; pero la clave de upsert/idempotencia es `idManual` (no `numeroSerie` como dice el spec) |
| Importación de Stock consumible | ❌ Missing | No implementado — el Excel real no tiene hoja de Stock (verificado empíricamente, confirmado en tasks.md 2.3 y 3.4) |
| Continuidad ante errores individuales | ✅ Implemented | try/catch por fila en ambos loops, acumulación en `errors.activos` / `errors.componentes`, sin abortar |
| Reporte final en consola | ✅ Implemented | `printReport()` imprime Catálogo/Activos/Componentes con creados/existentes/errores y veredicto final |

### Scenarios Coverage

| Scenario | Status |
|----------|--------|
| Invocación exitosa con ruta válida | ✅ Covered |
| Invocación sin argumento | ✅ Covered (código presente, no probado empíricamente esta sesión) |
| Ruta apunta a archivo inexistente | ✅ Covered (código presente, no probado empíricamente esta sesión) |
| Archivo válido con múltiples hojas | ⚠️ Partial (el spec asume hojas Activos/Componentes/Stock; el Excel real solo tiene 2) |
| Celda opcional vacía | ✅ Covered |
| Ubicación nueva encontrada en los datos | ✅ Covered |
| Marca nueva encontrada en los datos | ✅ Covered |
| Catálogo ya existente | ✅ Covered |
| Activo nuevo importado correctamente | ✅ Covered |
| Activo ya existente (idempotencia) | ✅ Covered (verificado empíricamente: 2da corrida 0 creados / 380 existentes) |
| Activo con ubicación no mapeada | ⚠️ Partial (fallback `'Sin sector'` + importa, en vez de omitir+loguear error) |
| Componente nuevo instalado en un activo | ✅ Covered |
| Componente en depósito (sin activo asignado) | ✅ Covered |
| Componente con número de serie ya existente (idempotencia) | ⚠️ Partial (idempotencia lograda vía `idManual`, no `numeroSerie`; objetivo funcional cumplido) |
| Componente referencia un activo que no existe en la BD | ✅ Covered (75 advertencias verificadas, mismas en ambas corridas) |
| StockItem nuevo con cantidad inicial | ❌ Not covered |
| StockItem ya existente (idempotencia) | ❌ Not covered |
| StockItem con cantidad cero o negativa | ❌ Not covered |
| Una fila falla, el resto continúa | ✅ Covered |
| Importación exitosa sin errores | ✅ Covered (formato verificado estructuralmente; texto final difiere levemente: "✅ Importación completada sin errores") |
| Importación con errores parciales | ✅ Covered (verificado empíricamente: "⚠️ Importación completada con advertencias" + detalle por fila) |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Script en `backend/src/scripts/import-excel.ts` | ✅ Yes | |
| `tsx` como runner | ✅ Yes | `"import-excel": "tsx src/scripts/import-excel.ts"` |
| `xlsx` como parser | ✅ Yes | |
| `COLUMN_MAP` configurable en cabecera | ✅ Yes | El script tiene `SHEETS`/`COL_ACTIVO`/`COL_COMPONENTE` actualizados con headers reales — pero el bloque de ejemplo en `design.md` (líneas 119-171) sigue mostrando los placeholders originales |
| Errores por fila no abortan el proceso | ✅ Yes | |
| Upsert ignora registros existentes (no sobreescribe) | ✅ Yes | `update: {}` en Activo y Componente |

**Documentación desactualizada (fuera del código, pero relevante para archivar)**:
- `design.md` "Data Flow" (líneas 47-108): muestra "Fase 1: Catálogo" como fase separada previa y "Fase 4: Stock" — la implementación real resuelve el catálogo inline dentro de los loops de Activos/Componentes y no tiene fase de Stock.
- `design.md` "Interfaces/Contracts" (líneas 119-171): `COLUMN_MAP`/`SHEETS` siguen siendo el placeholder original (`'Activos'`, `'NroPc'`, etc.), no los headers reales.
- `design.md` "Lógica de upsert con detección de creado vs existente" (líneas 195-223): el ejemplo usa `numeroSerie` como clave; la implementación real usa `idManual`.
- `design.md` "Open Questions" (líneas 248-253): las 4 preguntas quedaron resueltas durante el apply pero siguen sin marcar/documentar.
- `design.md` "File Changes" (líneas 110-115): no incluye `backend/src/scripts/enrich-ubicacion.ts` ni la modificación de `.gitignore` (exclusión de `backend/data/`).
- `proposal.md` "Success Criteria": el ítem "Los StockItems consumibles aparecen en `/stock` con la cantidad correcta" no aplica a este dataset.

## Testing

| Area | Tests Exist? | Coverage |
|------|---------------|----------|
| Suite automatizada | No | No hay test runner configurado (consistente con `CLAUDE.md`) |
| Script corre sin errores fatales | N/A (manual) | ✅ Done — 2 corridas completas, exit code 0 |
| Idempotencia | N/A (manual) | ✅ Done — 2da corrida: 0 creados en todas las categorías |
| Activos en `/activos` | N/A (manual) | ✅ Done vía API (379 activos, ej. PC079 con 11 componentes) |
| Componentes con historial en detalle de activo | N/A (manual) | ✅ Done vía API (`accion: creado` con fecha/responsable/observaciones) |
| Depósito en `/stock` | N/A (manual) | ✅ Done vía API (1046 en depósito / 1573 instalados) |
| StockItems en `/stock` | N/A (manual) | N/A — no hay datos de Stock en este Excel |
| Reporte consola | N/A (manual) | ✅ Done |
| Verificación visual en navegador | N/A (manual) | ⏳ Pendiente del lado del usuario |

## Issues Found

**CRITICAL** (must fix before archive):
1. **Requirement "Importación de Stock consumible" no implementada.** El spec define un requirement completo + 3 escenarios para `StockItem`/`StockMovimiento` que no tienen ninguna implementación, porque el Excel real no trae hoja de Stock. Esto no es un bug — es una decisión correcta dado el dataset real — pero si se archiva el spec tal cual, quedará documentando una funcionalidad inexistente. Antes de `/sdd-archive`, actualizar `proposal.md` (Scope/Success Criteria) y `specs/import/spec.md` para remover o marcar como "no aplica a este dataset / hoja de Stock no presente" el requirement de Stock.

**WARNING** (should fix):
1. **Catálogo: `findFirst` + `create` en vez de `upsert` literal.** El spec exige `upsert` por campo único para Ubicacion/TipoComponente/Marca/Proveedor. La implementación real usa resolución case-insensitive (`findFirst` con `mode: 'insensitive'` + `create` condicional con `titleCase()`), que es funcionalmente idempotente y más tolerante a variaciones de mayúsculas en el Excel — pero no es literalmente `upsert`. Actualizar el spec para describir este patrón.
2. **Componentes: clave de upsert/idempotencia es `idManual`, no `numeroSerie`.** El spec exige `upsert` por `numeroSerie`. La implementación real usa `idManual` (sintético, `IMP-XXXX`) como clave, porque `numeroSerie` en el Excel real tiene muchos duplicados/placeholders (`s/n`, `s/s`, vacío) — esos casos se deduplican aparte con `usedSerials` y se les asigna `SN-${idManual}`. El objetivo de idempotencia se cumple igual (verificado: 2da corrida = 0 creados), pero el mecanismo difiere del spec. Actualizar el spec.
3. **Activos: fallback `'Sin sector'` en vez de omitir fila.** El escenario "Activo con ubicación no mapeada" exige omitir la fila + loguear error si la columna de ubicación está en blanco. La implementación real asigna `'Sin sector'` como Ubicacion por defecto e importa el Activo igual (1 fila afectada, verificado empíricamente). Esto preserva el dato del equipo en vez de perderlo, lo cual parece preferible para datos de producción — pero deviation del spec. Documentar este fallback como comportamiento intencional en el spec.
4. **`design.md` desactualizado en varios puntos** (Data Flow, COLUMN_MAP de ejemplo, lógica de upsert de ejemplo, Open Questions sin resolver, File Changes incompleto) — ver detalle en sección Coherence. Recomendado actualizar antes de archivar para que el diseño archivado refleje lo realmente implementado.
5. **`proposal.md` Success Criteria desactualizado** — el ítem de StockItems no aplica a este dataset; debería marcarse como N/A con una nota, en vez de quedar como un criterio sin cumplir.

**SUGGESTION** (nice to have):
1. `enrich-ubicacion.ts` (script de enriquecimiento adicional, mantenido en el repo por decisión del usuario) no está documentado en la tabla "File Changes" de `design.md` — agregar una fila breve explicando su propósito para que quede claro por qué existe.
2. Los escenarios "Invocación sin argumento" y "Ruta apunta a archivo inexistente" están implementados en código pero no se ejecutaron empíricamente esta sesión. Bajo riesgo dado lo simple del guard, pero un smoke test rápido (`pnpm import-excel` sin argumentos) cerraría la cobertura.

## Verdict

**PASS WITH WARNINGS**

La importación se ejecutó exitosamente contra los datos reales (376 Activos + 2601 Componentes, idempotencia confirmada en una segunda corrida, gap de fidelidad de datos detectado y corregido proactivamente con `enrich-ubicacion.ts`), pero el spec/design quedaron desalineados respecto a varias decisiones tomadas durante el apply (clave `idManual` vs `numeroSerie`, catálogo vía `findFirst`+`create` vs `upsert`, fallback `'Sin sector'`, ausencia de hoja de Stock) — se recomienda actualizar `proposal.md`, `design.md` y `specs/import/spec.md` para reflejar la implementación real antes de `/sdd-archive`.
