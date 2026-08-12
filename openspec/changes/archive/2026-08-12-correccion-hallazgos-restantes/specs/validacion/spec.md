# Validación — Especificación (delta): intervenciones, mantenimiento, asignación de tickets, info

## Purpose

Define la validación de entrada requerida en los endpoints que hoy carecen de ella o la tienen incompleta: intervenciones y mantenimiento de activos, restricción de rol al asignar responsables de un ticket, e info institucional.

---

## Requirements

### Requirement: Validación Zod en intervenciones de activos

`POST /api/activos/:id/intervenciones` MUST validar el body contra un schema Zod antes de procesar la request.

#### Scenario: Body válido

- GIVEN un usuario `operaciones`/`administrador`
- WHEN envía una intervención con `fecha`, `tipo`, `diagnostico`, `accion`, `tecnico`, `resultado` y `repuestos` como array (posiblemente vacío)
- THEN el sistema MUST aceptar y crear la intervención, igual que hoy

#### Scenario: Body inválido

- GIVEN un usuario `operaciones`/`administrador`
- WHEN envía una intervención sin `diagnostico` o con `repuestos` que no es un array
- THEN el sistema MUST responder 400 con mensaje descriptivo, no 500

### Requirement: Validación Zod en mantenimiento de activos

`POST /api/activos/:id/mantenimiento` MUST validar el body contra un schema Zod antes de procesar la request.

#### Scenario: Body válido

- GIVEN un usuario `operaciones`/`administrador`
- WHEN envía `fecha`, `tipo`, `descripcion` y `tecnico`
- THEN el sistema MUST aceptar y registrar el mantenimiento, igual que hoy

#### Scenario: Body inválido

- WHEN falta `fecha` o `tecnico`
- THEN el sistema MUST responder 400 con mensaje descriptivo

### Requirement: Restricción de rol en `asignadosIds` al crear un ticket

Al crear un ticket, el sistema MUST filtrar `asignadosIds` para incluir únicamente usuarios con rol `administrador` u `operaciones`. Cualquier ID que no corresponda a esos roles MUST ser ignorado silenciosamente, sin generar error.

#### Scenario: Asignación válida a staff

- GIVEN un usuario que crea un ticket con `asignadosIds` conteniendo el ID de un usuario `operaciones`
- WHEN se crea el ticket
- THEN ese usuario MUST quedar asignado y notificado, igual que hoy

#### Scenario: ID de un usuario no-staff incluido

- GIVEN un `docente_empleado` que crea un ticket con `asignadosIds` conteniendo el ID de otro `docente_empleado`
- WHEN se crea el ticket
- THEN ese ID MUST ser ignorado — el ticket se crea sin ese usuario en `asignados`, sin error visible para quien lo creó

### Requirement: Validación Zod en `PUT /api/info`

El sistema MUST validar el body de `PUT /api/info` contra un schema Zod.

#### Scenario: Body válido

- GIVEN un `administrador`
- WHEN envía `telefono`, `telefonoInterno`, `horariosAtencion` y `emails` (array de strings)
- THEN el sistema MUST aceptar y guardar, igual que hoy

#### Scenario: Body inválido

- WHEN `emails` no es un array, o falta algún campo requerido
- THEN el sistema MUST responder 400 con mensaje descriptivo
