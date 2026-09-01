# Equipos — Especificación

## Purpose

Define el ciclo de vida de edición de un Equipo (Activo) y su historial de cambios: cómo se registran las modificaciones realizadas sobre un equipo (datos, componentes, repuestos usados) y cómo se descuenta stock cuando se usan repuestos, reemplazando los antiguos flujos separados de "Intervención" y "Mantenimiento" por un único historial automático generado al editar.

## Requirements

### Requirement: Editar Equipo como único punto de registro de cambios

El sistema NO MUST ofrecer flujos separados de "Intervención" ni "Mantenimiento" para registrar trabajo técnico sobre un equipo. Toda modificación (datos del equipo, componentes instalados, repuestos utilizados) SHALL registrarse exclusivamente a través de `PUT /api/activos/:id` (Editar Equipo).

#### Scenario: Los botones de Intervención y Mantenimiento no existen

- GIVEN un usuario con permiso sobre `activos` viendo el detalle de un equipo
- WHEN se renderiza la pantalla
- THEN el sistema MUST NOT mostrar un botón "Intervención" ni un botón/modal "Mantenimiento"

#### Scenario: Los endpoints de Intervención y Mantenimiento ya no existen

- WHEN se hace una request a `POST /api/activos/:id/intervenciones`, `GET /api/activos/:id/intervenciones` o `POST /api/activos/:id/mantenimiento`
- THEN el sistema MUST responder 404 (ruta eliminada)

### Requirement: Historial automático con diff de campos al editar

Al guardar una edición de equipo que efectivamente modifica algún dato (campos simples, componentes instalados o repuestos utilizados), el sistema MUST crear una entrada de historial (`HistorialEquipo`) asociada a ese equipo, con la fecha, el técnico (usuario autenticado que edita) y una lista de descripciones legibles de cada cambio individual.

#### Scenario: Editar un campo simple genera una entrada de historial con el detalle del cambio

- GIVEN un equipo con `estado = "activa"`
- WHEN un usuario lo edita y cambia `estado` a `"inactiva"` y guarda
- THEN el sistema MUST crear una entrada de historial cuyo listado de cambios incluye una descripción equivalente a "Estado: activa → inactiva"

#### Scenario: Agregar o quitar un módulo de RAM/almacenamiento genera una entrada de historial

- GIVEN un equipo sin módulos de RAM cargados
- WHEN un usuario agrega un módulo de RAM (marca, modelo, N° de serie) y guarda
- THEN el sistema MUST crear una entrada de historial que describe el módulo agregado (ej. "RAM: agregado módulo Kingston 8GB")

- GIVEN un equipo con un módulo de almacenamiento instalado
- WHEN un usuario elimina ese módulo del formulario y guarda
- THEN el sistema MUST crear una entrada de historial que describe el módulo quitado

#### Scenario: Guardar sin ningún cambio real no genera entrada de historial

- GIVEN un equipo cargado en el formulario de edición
- WHEN un usuario abre "Editar", no modifica ningún campo ni componente ni repuesto, y guarda
- THEN el sistema MUST NOT crear una entrada de historial vacía

#### Scenario: Historial visible en el detalle del equipo, ordenado por fecha

- GIVEN un equipo con 3 entradas de historial de distintas fechas
- WHEN un usuario abre el detalle del equipo
- THEN el sistema MUST mostrar las 3 entradas ordenadas de más reciente a más antigua, cada una con fecha, técnico y la lista de cambios

### Requirement: Repuestos utilizados dentro de Editar Equipo con descuento de stock

El formulario de Editar Equipo (no el de Crear Equipo) SHALL incluir una sección opcional de "Repuestos utilizados", donde el usuario puede seleccionar ítems del stock y una cantidad. Al guardar, si hay repuestos cargados, el sistema MUST descontar la cantidad indicada del stock correspondiente y MUST registrar esos repuestos en la misma entrada de historial generada por el guardado, todo dentro de una única transacción.

#### Scenario: Registrar un repuesto usado descuenta stock y queda en el historial

- GIVEN un ítem de stock "Memoria RAM" con cantidad 10 en depósito
- WHEN un usuario edita un equipo, agrega en "Repuestos utilizados" ese ítem con cantidad 1, y guarda
- THEN el sistema MUST descontar 1 unidad del stock de "Memoria RAM" (quedando en 9)
- AND la entrada de historial de ese guardado MUST incluir el repuesto usado (ítem y cantidad)

#### Scenario: Repuesto con stock insuficiente no se descuenta y no rompe el guardado del equipo

- GIVEN un ítem de stock con cantidad 0
- WHEN un usuario intenta registrar ese repuesto con cantidad 1 al editar un equipo
- THEN el sistema MUST rechazar la operación de guardado completa con un error descriptivo (no MUST dejar el stock en negativo ni guardar el equipo a medias)

#### Scenario: Crear Equipo no ofrece repuestos utilizados

- GIVEN un usuario creando un equipo nuevo (no editando uno existente)
- WHEN se renderiza el formulario
- THEN el sistema MUST NOT mostrar la sección "Repuestos utilizados" (no aplica: un equipo recién creado no tuvo intervención técnica previa)

### Requirement: Reemplazo del export PDF de historial

El export a PDF del detalle de un equipo SHALL mostrar el nuevo historial unificado (`HistorialEquipo`) en lugar de las secciones separadas de intervenciones y mantenimientos que existían antes.

#### Scenario: Exportar PDF de un equipo con historial

- GIVEN un equipo con 2 entradas de historial (una con repuestos, otra sin)
- WHEN un usuario exporta el PDF del equipo
- THEN el PDF MUST incluir ambas entradas con su fecha, técnico, cambios y repuestos (si los hubo), sin referencias a "Intervención" ni "Mantenimiento" como secciones separadas

#### Scenario: Exportar PDF de un equipo sin historial

- GIVEN un equipo recién creado sin ninguna entrada de historial
- WHEN un usuario exporta el PDF
- THEN el sistema MUST generar el PDF igual, mostrando la sección de historial vacía sin error
