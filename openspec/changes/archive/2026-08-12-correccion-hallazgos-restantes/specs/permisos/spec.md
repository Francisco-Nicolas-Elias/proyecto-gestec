# Permisos — Especificación (delta): consistencia frontend/backend

## Purpose

Define el comportamiento de permisos en 3 puntos donde el frontend es más laxo o más restrictivo de lo que el backend realmente permite: formularios de Activos sin chequeo de permiso, botones de Stock con permiso incorrecto, y borrado de comentarios de tarea sin ownership.

---

## Requirements

### Requirement: Chequeo de permiso en formularios de Activos

`ActivoForm.tsx` y `RegistrarIntervencion.tsx` MUST redirigir a cualquier usuario sin permiso `activos` antes de mostrar el formulario — mismo patrón silencioso (sin toast) ya usado en `NuevoComponenteForm.tsx` y `NuevaTareaForm.tsx`: `if (!authLoading && !hasPermission('activos')) navigate('/activos', { replace: true })`.

#### Scenario: Docente intenta crear un activo

- GIVEN un usuario con rol `docente_empleado`
- WHEN navega directamente a `/activos/nuevo`
- THEN el sistema MUST redirigirlo a `/activos`, MUST NOT mostrar el formulario

#### Scenario: Operaciones accede normalmente

- GIVEN un usuario con rol `operaciones`
- WHEN navega a `/activos/nuevo` o `/activos/:id/intervencion`
- THEN el sistema MUST mostrar el formulario normalmente, sin cambios respecto al comportamiento actual

### Requirement: Permiso correcto en botones de edición de Stock

Los botones de editar y eliminar componente en `Stock.tsx` MUST estar disponibles para cualquier usuario con permiso `stock` (`administrador` y `operaciones`), no solo `admin`.

#### Scenario: Operaciones edita un componente desde Stock

- GIVEN un usuario con rol `operaciones`
- WHEN abre la pestaña Stock
- THEN MUST ver y poder usar los botones de editar/eliminar componente, igual que un `administrador`

### Requirement: Ownership en borrado de comentario de tarea

El sistema MUST permitir borrar un comentario de tarea únicamente a su autor o a un usuario con rol `administrador`.

#### Scenario: Autor borra su propio comentario

- GIVEN un usuario `operaciones` que escribió un comentario en una tarea
- WHEN intenta borrarlo
- THEN el sistema MUST permitirlo

#### Scenario: Colega intenta borrar comentario ajeno

- GIVEN un usuario `operaciones` que NO es autor de un comentario de tarea
- WHEN intenta borrarlo
- THEN el sistema MUST responder 403

#### Scenario: Administrador borra cualquier comentario

- GIVEN un usuario `administrador` que NO es autor de un comentario de tarea
- WHEN intenta borrarlo
- THEN el sistema MUST permitirlo (moderación)
