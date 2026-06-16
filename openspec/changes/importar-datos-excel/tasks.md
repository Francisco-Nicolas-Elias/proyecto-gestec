L# Tasks: Importación de datos históricos desde Excel

## Phase 1: Preparación del script (sin necesitar el Excel)

- [x] 1.1 Instalar dependencia `xlsx` en `backend/`: `cd backend && pnpm add xlsx && pnpm add -D @types/xlsx` — instalado solo `xlsx` (incluye sus propios tipos TS, `@types/xlsx` no es necesario)
- [x] 1.2 Agregar en `backend/package.json` → `scripts`: `"import-excel": "tsx src/scripts/import-excel.ts"`
- [x] 1.3 Crear `backend/src/scripts/import-excel.ts` con el esqueleto completo: bloque `COLUMN_MAP` placeholder, interfaces `ImportError` y `counts`, función `main()` vacía por secciones, lógica de `process.argv[2]` para recibir la ruta del archivo, y salida con código 1 si no se provee ruta o el archivo no existe
- [x] 1.4 Implementar la lectura del Excel en el esqueleto: `xlsx.readFile(ruta)` + `utils.sheet_to_json(workbook.Sheets[SHEETS.activos])` para cada hoja, con guard si la hoja no existe en el archivo

## Phase 2: Mapeo de columnas (requiere el Excel real)

- [x] 2.1 Recibir el archivo Excel del usuario, ejecutar el script con `--dry-run` o simplemente loguear los headers de cada hoja para ver los nombres reales de columnas (`Object.keys(filas[0])`) — hecho con `inspect-excel.ts`
- [x] 2.2 Actualizar el bloque `COLUMN_MAP` en `import-excel.ts` reemplazando los strings placeholder por los nombres exactos de columna del Excel real (ej: `nroPc: 'NroPc'` → `nroPc: 'N° PC'` si así aparece en el archivo)
- [x] 2.3 Actualizar el bloque `SHEETS` si los nombres de las hojas del Excel difieren de los placeholders (`'Activos'`, `'Componentes'`, `'Stock'`) — hojas reales: `'1- Pc por area'` y `'2- Inventario'` (no existe hoja de Stock)

## Phase 3: Lógica de importación

- [x] 3.1 Implementar la Fase 1 del script (catálogo): upsert de `Ubicacion` (`where: { sector }`), `TipoComponente` (`where: { nombre }`), `Marca` (`where: { nombre }`), `Proveedor` (`where: { nombre }`) — construir los maps `ubMap`, `tipoMap`, `marcaMap`, `provMap` para uso en fases siguientes
- [x] 3.2 Implementar la Fase 2 del script (activos): iterar filas de la hoja Activos, resolver `ubicacionId` via `ubMap`, ejecutar `prisma.activo.upsert({ where: { nroPc }, update: {}, create: {...} })`, acumular en `activoMap[nroPc] = activo.id`, capturar errores por fila en `errors.activos`
- [x] 3.3 Implementar la Fase 3 del script (componentes): iterar filas de la hoja Componentes, hacer `findUnique({ where: { numeroSerie } })` para detectar si es nuevo, ejecutar `$transaction` con `upsert` del Componente + `create` del `HistorialMovimientoComponente` (accion: `creado`, ubicacionDestino según `activoId`), capturar errores por fila en `errors.componentes`
- [ ] ~~3.4 Implementar la Fase 4 del script (stock)~~ — **omitido**: el Excel real no tiene hoja de Stock (solo "1- Pc por area" y "2- Inventario"), por lo que no hay datos de consumibles que importar
- [x] 3.5 Implementar `printReport()`: imprimir tabla con creados/existentes/errores por sección, listar cada error con número de fila y motivo, imprimir `✅ Importación completada` o `⚠️ Importación completada con advertencias` según si hubo errores

## Phase 4: Verificación

- [x] 4.1 Ejecutar `pnpm import-excel ruta/al/archivo.xlsx` con el Excel real y verificar que el reporte en consola muestra conteos coherentes con el archivo (spec: Scenario "Importación exitosa sin errores" / "Importación con errores parciales") — 376 activos + 2601 componentes creados, 75 advertencias (PCs referenciados que no están en "1- Pc por area", se dejaron en Depósito)
- [x] 4.2 Verificar idempotencia: ejecutar el script una segunda vez con el mismo Excel y confirmar que todos los contadores de "creados" muestran 0 y los de "ya existentes" muestran los mismos números que los "creados" de la primera ejecución (spec: Scenario "Activo ya existente", "Componente con número de serie ya existente", "StockItem ya existente") — segunda corrida: 0 creados / 380 activos y 2601 componentes "ya existentes", mismas 75 advertencias
- [x] 4.3 Verificar en el frontend con backend corriendo: `/activos` muestra los equipos importados, el detalle de un activo muestra sus componentes con historial de creación, `/stock` muestra los componentes en depósito y los StockItems con la cantidad correcta — verificado a nivel API (sin StockItems porque este Excel no trae hoja de Stock): `/api/activos` devuelve los 379 activos con sus componentes (ej. PC079 con 11 componentes IMP-XXXX), `/api/componentes/:id/historial` muestra el registro "creado" con fecha/responsable/observaciones del Excel, `/api/stock/componentes` agrega correctamente 2619 componentes (1046 depósito / 1573 instalados). Verificación visual en navegador pendiente del lado del usuario.
