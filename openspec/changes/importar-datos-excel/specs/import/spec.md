# Import — Especificación: Importación de datos históricos desde Excel

## Purpose

Define el comportamiento del script `import-excel.ts` que popula la base de datos de producción con datos históricos reales del área de operaciones del IES Córdoba, leyendo un archivo Excel y realizando upserts idempotentes en Prisma.

---

## Requirements

### Requirement: Ejecución e invocación del script

El script MUST poder ejecutarse con `pnpm import-excel` desde el directorio `backend/`.

El script MUST requerir la ruta al archivo Excel como argumento posicional.

Si no se provee la ruta o el archivo no existe, el script MUST terminar con un mensaje de error claro y código de salida distinto de cero.

#### Scenario: Invocación exitosa con ruta válida

- GIVEN que el archivo Excel existe en la ruta indicada
- WHEN se ejecuta `pnpm import-excel ruta/al/archivo.xlsx`
- THEN el script inicia la importación e imprime progreso en consola

#### Scenario: Invocación sin argumento

- GIVEN que no se provee ruta de archivo
- WHEN se ejecuta `pnpm import-excel`
- THEN el script MUST imprimir un mensaje de uso y terminar con código de salida 1

#### Scenario: Ruta apunta a archivo inexistente

- GIVEN que la ruta provista no corresponde a ningún archivo
- WHEN se ejecuta el script
- THEN el script MUST imprimir "Archivo no encontrado: {ruta}" y terminar con código de salida 1

---

### Requirement: Parseo del archivo Excel

El script MUST leer el archivo `.xlsx` usando la librería `xlsx` y procesar cada hoja relevante.

El script SHOULD tolerar celdas vacías en campos opcionales sin fallar.

#### Scenario: Archivo válido con múltiples hojas

- GIVEN un archivo Excel con hojas para Activos, Componentes y Stock
- WHEN el script parsea el archivo
- THEN MUST leer cada hoja por nombre y mapear sus filas a los modelos correspondientes

#### Scenario: Celda opcional vacía

- GIVEN una fila de Activo con el campo `observaciones` en blanco
- WHEN el script procesa esa fila
- THEN MUST importar el activo con `observaciones: ""` sin lanzar error

---

### Requirement: Upsert de catálogo (Ubicaciones, TipoComponente, Marca, Proveedor)

El script MUST crear automáticamente los registros de catálogo referenciados en los datos si aún no existen.

El script MUST usar `upsert` por campo único (`sector` para Ubicacion, `nombre` para TipoComponente y Marca) para garantizar idempotencia.

#### Scenario: Ubicación nueva encontrada en los datos

- GIVEN que una fila de Activo referencia la ubicación "Laboratorio 4" que no existe en la BD
- WHEN el script procesa esa fila
- THEN MUST crear la Ubicacion "Laboratorio 4" antes de crear el Activo
- AND el Activo MUST quedar vinculado a esa nueva Ubicacion

#### Scenario: Marca nueva encontrada en los datos

- GIVEN que una fila de Componente referencia la marca "Asus" que no existe en la BD
- WHEN el script procesa esa fila
- THEN MUST crear la Marca "Asus" via upsert antes de crear el Componente

#### Scenario: Catálogo ya existente

- GIVEN que la Marca "Samsung" ya existe en la BD
- WHEN el script procesa una fila que referencia "Samsung"
- THEN MUST reutilizar el registro existente sin crear uno duplicado

---

### Requirement: Importación de Activos

El script MUST importar cada fila de la hoja de Activos como un registro `Activo` en la BD.

El campo `nroPc` es el identificador único — el script MUST usar `upsert` por `nroPc`.

Si el `nroPc` ya existe en la BD, el script SHOULD omitir la actualización (ignorar la fila) y continuar.

#### Scenario: Activo nuevo importado correctamente

- GIVEN una fila de Activo con `nroPc` que no existe en la BD y `ubicacion` reconocida
- WHEN el script procesa esa fila
- THEN MUST crear el registro `Activo` con todos los campos mapeados
- AND el `estado` MUST ser `activa` por defecto

#### Scenario: Activo ya existente (idempotencia)

- GIVEN una fila con `nroPc: "PC001"` que ya existe en la BD
- WHEN el script ejecuta el upsert
- THEN MUST NO modificar el registro existente
- AND MUST contabilizar la fila como "ya existente" en el reporte

#### Scenario: Activo con ubicación no mapeada

- GIVEN una fila de Activo cuya columna de ubicación está en blanco o tiene un valor no interpretable
- WHEN el script procesa esa fila
- THEN MUST omitir esa fila
- AND MUST agregar una entrada al reporte de errores indicando el `nroPc` y motivo

---

### Requirement: Importación de Componentes

El script MUST importar cada fila de la hoja de Componentes como un registro `Componente` en la BD.

Los campos `numeroSerie` e `idManual` son únicos — el script MUST usar `upsert` por `numeroSerie`.

Cada `Componente` creado MUST generar automáticamente un `HistorialMovimientoComponente` con `accion: creado` en la misma transacción Prisma.

#### Scenario: Componente nuevo instalado en un activo

- GIVEN una fila de Componente con `numeroSerie` nuevo y `nroPc` que existe en la BD
- WHEN el script importa esa fila
- THEN MUST crear el `Componente` con `activoId` apuntando al Activo correspondiente
- AND MUST crear un `HistorialMovimientoComponente` con `accion: creado` en la misma `$transaction`
- AND el historial MUST registrar el `activoCodigo` del activo asignado

#### Scenario: Componente en depósito (sin activo asignado)

- GIVEN una fila de Componente con `numeroSerie` nuevo y sin `nroPc` asociado (campo vacío)
- WHEN el script importa esa fila
- THEN MUST crear el `Componente` con `activoId: null`
- AND el `HistorialMovimientoComponente` MUST registrar `ubicacionDestino: "Depósito IT"`

#### Scenario: Componente con número de serie ya existente (idempotencia)

- GIVEN una fila cuyo `numeroSerie` ya existe en la BD
- WHEN el script ejecuta el upsert
- THEN MUST NO crear un nuevo componente ni un nuevo registro de historial
- AND MUST contabilizar la fila como "ya existente" en el reporte

#### Scenario: Componente referencia un activo que no existe en la BD

- GIVEN una fila de Componente cuyo `nroPc` no corresponde a ningún Activo importado
- WHEN el script procesa esa fila
- THEN MUST importar el Componente con `activoId: null` (como si estuviera en depósito)
- AND MUST agregar una advertencia al reporte indicando que el activo no fue encontrado

---

### Requirement: Importación de Stock consumible

El script MUST importar cada fila de la hoja de Stock como un registro `StockItem` en la BD.

El campo `nombre` es el identificador de upsert.

Si el `StockItem` es nuevo, el script MUST crear un `StockMovimiento` de tipo `entrada` con la cantidad inicial en la misma transacción Prisma, y actualizar `cantidad` en el `StockItem`.

#### Scenario: StockItem nuevo con cantidad inicial

- GIVEN una fila de Stock con nombre "Cable HDMI" y cantidad 15 que no existe en la BD
- WHEN el script importa esa fila
- THEN MUST crear el `StockItem` con `cantidad: 15`
- AND MUST crear un `StockMovimiento` de tipo `entrada` con `cantidad: 15` y `motivo: "Importación inicial desde Excel"` en la misma `$transaction`

#### Scenario: StockItem ya existente (idempotencia)

- GIVEN un `StockItem` con nombre "Tóner HP" que ya existe en la BD
- WHEN el script ejecuta el upsert
- THEN MUST NO crear un nuevo StockMovimiento ni modificar la cantidad existente
- AND MUST contabilizar la fila como "ya existente" en el reporte

#### Scenario: StockItem con cantidad cero o negativa

- GIVEN una fila de Stock con cantidad 0
- WHEN el script procesa esa fila
- THEN MUST crear el `StockItem` con `cantidad: 0`
- AND MUST NO crear un `StockMovimiento` (no hay movimiento real)

---

### Requirement: Continuidad ante errores individuales

El script MUST continuar procesando el resto de las filas cuando una fila individual falla.

El script MUST NOT abortar la importación completa ante un error en una fila.

#### Scenario: Una fila falla, el resto continúa

- GIVEN un archivo Excel con 50 filas de activos donde la fila 12 tiene datos inválidos
- WHEN el script procesa el archivo
- THEN MUST importar exitosamente las 49 filas válidas
- AND MUST registrar la fila 12 en el reporte de errores con el motivo
- AND MUST terminar con código de salida 0 (importación completada con advertencias)

---

### Requirement: Reporte final en consola

Al finalizar, el script MUST imprimir en consola un resumen con:
- Cantidad de registros creados por sección (Catálogo, Activos, Componentes, Stock)
- Cantidad de registros ya existentes (omitidos) por sección
- Cantidad de errores por sección con detalle por fila

#### Scenario: Importación exitosa sin errores

- GIVEN un archivo Excel completamente válido
- WHEN el script termina
- THEN MUST imprimir en consola algo como:
  ```
  ✓ Catálogo:    5 creados,  3 ya existentes
  ✓ Activos:    42 creados,  0 ya existentes,  0 errores
  ✓ Componentes: 87 creados,  0 ya existentes,  0 errores
  ✓ Stock:       12 creados,  0 ya existentes,  0 errores
  ✅ Importación completada
  ```

#### Scenario: Importación con errores parciales

- GIVEN un archivo Excel con algunas filas inválidas
- WHEN el script termina
- THEN MUST imprimir el reporte con los errores detallados por fila
- AND MUST imprimir "⚠️ Importación completada con advertencias" al final
