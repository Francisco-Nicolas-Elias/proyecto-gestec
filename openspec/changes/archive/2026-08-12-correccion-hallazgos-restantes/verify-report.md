# Reporte de Verificación — Hallazgos importantes y menores

> Verificación code-level + pruebas end-to-end contra el backend real (puerto 3000) donde fue posible.
> Fecha: 2026-08-12

---

## Backend — verificado end-to-end con curl (usuarios temporales de los 3 roles, creados y eliminados en la sesión)

| Check | Resultado |
|-------|-----------|
| Validación Zod en `POST /:id/intervenciones` (body inválido → 400, válido → 201) | ✅ |
| Validación Zod en `POST /:id/mantenimiento` (body inválido → 400, válido → 201) | ✅ |
| `asignadosIds` filtrado a solo staff al crear ticket (docente intenta auto-asignarse → ignorado; admin incluido → asignado) | ✅ |
| Ownership en borrado de comentario de tarea (operaciones no-autor → 403; autor → 204; admin moderando → 204) | ✅ |
| Validación Zod en `PUT /api/info` (body inválido → 400; body válido → 200) | ✅ |
| `helmet` headers presentes (`curl -I`), CORS sigue funcionando | ✅ |
| `algorithms: ['HS256']` explícito en `jwt.verify` — login y requests autenticados de los 3 roles siguen funcionando | ✅ |
| `npx tsc --noEmit` backend | ✅ sin errores |

## Frontend — verificado por código, no interactivamente en navegador

No cuento con herramienta de automatización de browser en esta sesión. Los siguientes cambios fueron verificados por revisión de código (cada uno replica un patrón ya existente y probado en el mismo archivo/codebase) y con `tsc --noEmit` (mismos 11 errores preexistentes de siempre, ninguno nuevo), pero no con interacción real en el navegador:

- Cache invalidation en `createTarea` y las 6 mutaciones de comentarios — mismo patrón que `updateTarea`/`deleteTarea` (ya funcionando).
- Cache invalidation `'activos'` en mutaciones de Componente.
- Permiso en `ActivoForm.tsx`/`RegistrarIntervencion.tsx` — mismo patrón que `NuevoComponenteForm.tsx` (ya funcionando).
- `Stock.tsx`: `hasPermission('stock')` en vez de `'admin'`.
- `Dashboard.tsx`: `Promise.allSettled` + `toast.error` en fallo parcial.
- Limpieza de `Admin.tsx` (Roles): confirmado con `grep` que no quedó ninguna referencia colgante a los identificadores eliminados.
- `MultimediaUpload.tsx`, `TicketDetalle.tsx`, `NotificationBell.tsx`, `http.ts`: cambios menores, cada uno probado por lectura de código contra la lógica descrita en `design.md`.

**Recomendado**: un vistazo rápido del usuario en el navegador (Kanban tras crear tarea, comentarios de ticket/tarea, formulario de nuevo activo como docente, botones de Stock como operaciones) antes de considerar estos puntos 100% cerrados en la práctica.

## Resumen

Todo lo verificable por API (9 de los 17 hallazgos, incluyendo los de mayor riesgo de seguridad/permisos) fue probado end-to-end con éxito. Los 8 hallazgos restantes son cambios de frontend de bajo riesgo (mismo patrón que código ya funcionando en el mismo archivo), verificados por código pero no interactivamente.

**Datos de prueba**: todos los registros creados durante la verificación (3 usuarios, 1 activo con intervención/mantenimiento, 1 tarea con comentarios, 1 ticket) fueron eliminados al finalizar.

El change está listo para archivar, con la recomendación de un smoke-test visual del usuario en los puntos marcados arriba.
