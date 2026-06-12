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

#### Scenario: Archivo válido con las hojas esperadas

- GIVEN un archivo Excel con las hojas "1- Pc por area" y "2- Inventario"
- WHEN el script parsea el archivo
- THEN MUST leer cada hoja por nombre y mapear sus filas a los modelos `Activo` y `Componente` respectivamente
- AND si alguna de las dos hojas no existe, MUST imprimir las hojas disponibles del archivo y terminar con código de salida 1

#### Scenario: Celda opcional vacía

- GIVEN una fila de Activo con el campo `observaciones` en blanco
- WHEN el script procesa esa fila
- THEN MUST importar el activo con `observaciones: ""` sin lanzar error

---

### Requirement: Resolución de catálogo (Ubicaciones, TipoComponente, Marca, Proveedor)

El script MUST crear automáticamente los registros de catálogo referenciados en los datos si aún no existen.

El script MUST resolver cada referencia de catálogo (`sector` para Ubicacion, `nombre` para TipoComponente/Marca/Proveedor) mediante una búsqueda case-insensitive (`findFirst` con `mode: 'insensitive'`); si no existe, MUST crear el registro con el nombre normalizado en Title Case. El resultado MUST cachearse en memoria para no repetir la búsqueda ante valores repetidos.

#### Scenario: Ubicación nueva encontrada en los datos

- GIVEN que una fila de Activo referencia la ubicación "Laboratorio 4" que no existe en la BD
- WHEN el script procesa esa fila
- THEN MUST crear la Ubicacion "Laboratorio 4" antes de crear el Activo
- AND el Activo MUST quedar vinculado a esa nueva Ubicacion

#### Scenario: Marca nueva encontrada en los datos

- GIVEN que una fila de Componente referencia la marca "asus" (en minúsculas) que no existe en la BD
- WHEN el script procesa esa fila
- THEN MUST buscar la Marca de forma case-insensitive, no encontrarla, y crearla como "Asus" (Title Case) antes de crear el Componente

#### Scenario: Catálogo ya existente (con variación de mayúsculas)

- GIVEN que la Marca "Samsung" ya existe en la BD
- WHEN el script procesa una fila que referencia "SAMSUNG" o "samsung"
- THEN MUST reutilizar el registro existente (vía `findFirst` insensitive) sin crear uno duplicado

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

#### Scenario: Activo sin columna SECTOR (ubicación en blanco)

- GIVEN una fila de Activo cuya columna `SECTOR` está vacía
- WHEN el script procesa esa fila
- THEN MUST asignar la Ubicacion `"Sin sector"` (creándola si aún no existe) y crear el Activo igualmente
- AND MUST NO omitir la fila ni agregarla al reporte de errores

#### Scenario: Activo sin número de PC asignado

- GIVEN una fila de Activo cuya columna `Nº DE PC` está vacía
- WHEN el script procesa esa fila
- THEN MUST generar un identificador sintético `SIN-ASIG-XXX` (correlativo) para usar como `nroPc`
- AND MUST crear el Activo con ese `nroPc` sintético

---

### Requirement: Importación de Componentes

El script MUST importar cada fila de la hoja de Componentes como un registro `Componente` en la BD.

El campo `idManual` es el identificador único usado para el upsert — el script MUST generarlo de forma sintética y correlativa (`IMP-0001`, `IMP-0002`, ...) según la posición de la fila en la hoja, y MUST usar `upsert` por `idManual`.

El campo `numeroSerie` también es único en el modelo, pero el Excel real contiene valores vacíos, placeholders (`s/n`, `s/s`) y duplicados. El script MUST deduplicar `numeroSerie` en memoria y MUST usar `SN-${idManual}` como valor sintético cuando el original esté vacío, sea un placeholder o ya haya sido usado por otra fila.

Cada `Componente` creado MUST generar automáticamente un `HistorialMovimientoComponente` con `accion: creado` en la misma transacción Prisma.

#### Scenario: Componente nuevo instalado en un activo

- GIVEN una fila de Componente cuya columna `Ubicación` tiene un valor con formato "PC" + número (ej. "PC0042") que corresponde a un Activo importado en la fase anterior
- WHEN el script importa esa fila
- THEN MUST crear el `Componente` con `activoId` apuntando a ese Activo
- AND MUST crear un `HistorialMovimientoComponente` con `accion: creado` en la misma `$transaction`
- AND el historial MUST registrar el `activoCodigo` del activo asignado

#### Scenario: Componente en depósito (sin activo asignado)

- GIVEN una fila de Componente cuya columna `Ubicación` está vacía o no tiene formato "PC" + número
- WHEN el script importa esa fila
- THEN MUST crear el `Componente` con `activoId: null`
- AND el `HistorialMovimientoComponente` MUST registrar `ubicacionDestino: "Depósito IT"`

#### Scenario: Componente con idManual ya existente (idempotencia)

- GIVEN una segunda ejecución del script sobre el mismo Excel, donde el `idManual` calculado para una fila (`IMP-XXXX`) ya existe en la BD
- WHEN el script ejecuta el upsert
- THEN MUST NO crear un nuevo componente ni un nuevo registro de historial
- AND MUST contabilizar la fila como "ya existente" en el reporte

#### Scenario: Numero de serie vacío, placeholder o duplicado

- GIVEN una fila de Componente cuyo `Numero de Serie` está vacío, es "s/n"/"s/s", o ya fue usado por otra fila de la misma corrida
- WHEN el script procesa esa fila
- THEN MUST asignar `numeroSerie: "SN-${idManual}"` como valor sintético único

#### Scenario: Componente referencia un activo que no existe en la BD

- GIVEN una fila de Componente cuya columna `Ubicación` tiene formato "PC" + número (ej. "PC0099") pero ese número no corresponde a ningún Activo importado
- WHEN el script procesa esa fila
- THEN MUST importar el Componente con `activoId: null` (como si estuviera en depósito)
- AND MUST agregar una advertencia al reporte indicando que la ubicación no coincide con ningún activo

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
- Cantidad de registros creados y ya existentes para cada entidad de catálogo (Ubicaciones, Tipos de componente, Marcas, Proveedores)
- Cantidad de registros creados, ya existentes y errores/advertencias para Activos y Componentes
- Detalle por fila de cada error/advertencia (hasta 50 por sección)

#### Scenario: Importación exitosa sin errores

- GIVEN un archivo Excel completamente válido
- WHEN el script termina
- THEN MUST imprimir en consola algo como:
  ```
  📊 REPORTE DE IMPORTACIÓN
  Catálogo:
    Ubicaciones:      2 creadas,  0 ya existentes
    Tipos componente: 5 creados,  3 ya existentes
    Marcas:           4 creadas,  2 ya existentes
    Proveedores:      1 creados,  0 ya existentes

  Activos:      42 creados,  0 ya existentes,  0 errores
  Componentes:  87 creados,  0 ya existentes,  0 advertencias/errores

  ✅ Importación completada sin errores
  ```

#### Scenario: Importación con errores parciales

- GIVEN un archivo Excel con algunas filas inválidas
- WHEN el script termina
- THEN MUST imprimir el reporte con los errores detallados por fila
- AND MUST imprimir "⚠️ Importación completada con advertencias" al final
