# Equipos — Especificación

## Purpose

Define el ciclo de vida de edición de un Equipo (Activo) y su historial de cambios: cómo se registran las modificaciones realizadas sobre un equipo (datos, componentes), reemplazando los antiguos flujos separados de "Intervención" y "Mantenimiento" por un único historial automático generado al editar.

## Requirements

### Requirement: Editar Equipo como único punto de registro de cambios

El sistema MUST NOT ofrecer flujos separados de "Intervención" ni "Mantenimiento" para registrar trabajo técnico sobre un equipo. Toda modificación (datos del equipo, componentes instalados) SHALL registrarse exclusivamente a través de `PUT /api/activos/:id` (Editar Equipo).

#### Scenario: Los botones de Intervención y Mantenimiento no existen

- GIVEN un usuario con permiso sobre `activos` viendo el detalle de un equipo
- WHEN se renderiza la pantalla
- THEN el sistema MUST NOT mostrar un botón "Intervención" ni un botón/modal "Mantenimiento"

#### Scenario: Los endpoints de Intervención y Mantenimiento ya no existen

- WHEN se hace una request a `POST /api/activos/:id/intervenciones`, `GET /api/activos/:id/intervenciones` o `POST /api/activos/:id/mantenimiento`
- THEN el sistema MUST responder 404 (ruta eliminada)

### Requirement: Historial automático con diff de campos al editar

Al guardar una edición de equipo que efectivamente modifica algún dato (campos simples o componentes instalados), el sistema MUST crear una entrada de historial (`HistorialEquipo`) asociada a ese equipo, con la fecha, el técnico (usuario autenticado que edita) y una lista de descripciones legibles de cada cambio individual.

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
- WHEN un usuario abre "Editar", no modifica ningún campo ni componente, y guarda
- THEN el sistema MUST NOT crear una entrada de historial vacía

#### Scenario: Historial visible en el detalle del equipo, ordenado por fecha

- GIVEN un equipo con 3 entradas de historial de distintas fechas
- WHEN un usuario abre el detalle del equipo
- THEN el sistema MUST mostrar las 3 entradas ordenadas de más reciente a más antigua, cada una con fecha, técnico y la lista de cambios

### Requirement: Componentes sin sección propia se gestionan desde Stock

Los componentes cuyo tipo no tiene una sección dedicada en Editar Equipo (ej. teclado, mouse, auricular, monitor) SHALL gestionarse (vincular o desvincular de un equipo) desde Stock → Editar Componente, seleccionando el equipo destino o "Depósito IT". El detalle del equipo SHALL mostrar estos componentes en una sección informativa ("Otros Periféricos").

#### Scenario: Editar la ubicación de un periférico desde Stock

- GIVEN un componente de tipo "Mouse" sin equipo asignado (en depósito)
- WHEN un usuario lo edita desde Stock y selecciona un equipo como ubicación
- THEN el sistema MUST vincular el componente a ese equipo (`activoId` actualizado) y registrar el movimiento en su historial de componente

#### Scenario: Tipos con sección propia siguen siendo de solo lectura en Stock

- GIVEN un componente de tipo "RAM" (con sección dedicada en Editar Equipo)
- WHEN un usuario abre Editar Componente en Stock
- THEN el campo Ubicación MUST mostrarse de solo lectura, indicando que se edita desde el formulario del equipo

#### Scenario: Otros periféricos visibles en el detalle del equipo

- GIVEN un equipo con un "Teclado" y un "Mouse" vinculados
- WHEN un usuario abre el detalle del equipo
- THEN el sistema MUST mostrar ambos en una sección "Otros Periféricos" con su tipo y N° de serie

### Requirement: Reemplazo del export PDF de historial

El export a PDF del detalle de un equipo SHALL mostrar el nuevo historial unificado (`HistorialEquipo`) en lugar de las secciones separadas de intervenciones y mantenimientos que existían antes.

#### Scenario: Exportar PDF de un equipo con historial

- GIVEN un equipo con 2 entradas de historial
- WHEN un usuario exporta el PDF del equipo
- THEN el PDF MUST incluir ambas entradas con su fecha, técnico y cambios, sin referencias a "Intervención" ni "Mantenimiento" como secciones separadas

#### Scenario: Exportar PDF de un equipo sin historial

- GIVEN un equipo recién creado sin ninguna entrada de historial
- WHEN un usuario exporta el PDF
- THEN el sistema MUST generar el PDF igual, mostrando la sección de historial vacía sin error
