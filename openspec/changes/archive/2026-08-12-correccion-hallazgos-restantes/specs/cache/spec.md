# Cache client-side — Especificación (delta): invalidación tras mutaciones

## Purpose

Define qué cache TTL client-side (`_cache` en `apiClient.ts`) debe invalidarse tras cada mutación, para que la UI refleje los cambios recientes sin esperar el TTL de 60 segundos ni requerir un refresh manual.

---

## Requirements

### Requirement: Invalidación de cache al crear una tarea

El sistema MUST invalidar el cache `'tareas'` inmediatamente después de que `createTarea()` complete exitosamente.

#### Scenario: Nueva tarea visible sin esperar el TTL

- GIVEN que el usuario tiene abierta la pantalla de Tareas (cache `'tareas'` poblado)
- WHEN crea una nueva tarea desde `NuevaTareaForm` y vuelve a `/tareas`
- THEN la tarea recién creada MUST aparecer en el Kanban inmediatamente, sin esperar 60 segundos

### Requirement: Invalidación de cache al mutar comentarios de tickets y tareas

El sistema MUST invalidar el cache correspondiente (`'tickets'` o `'tareas'`) tras agregar, editar o eliminar un comentario de ticket o tarea.

#### Scenario: Comentario no desaparece al navegar y volver

- GIVEN que el usuario agrega un comentario a un ticket o tarea
- WHEN navega a otra pantalla y vuelve al listado dentro de los 60 segundos siguientes
- THEN el comentario agregado MUST seguir reflejado correctamente al volver a abrir el detalle del recurso

### Requirement: Invalidación de cache de Activos al mutar un Componente

El sistema MUST invalidar el cache `'activos'` (además de `'componentes'` y `'stock'`, que ya invalida) tras crear, editar o eliminar un `Componente`.

#### Scenario: Edición de componente instalado se refleja en la grilla de Equipos

- GIVEN un Componente de tipo RAM instalado en un Activo, visible en la grilla de `/activos` con su número de serie actual
- WHEN se edita el número de serie de ese Componente desde `EditarComponenteModal`
- THEN la grilla de `/activos` MUST mostrar el número de serie actualizado la próxima vez que se cargue, sin esperar el TTL
