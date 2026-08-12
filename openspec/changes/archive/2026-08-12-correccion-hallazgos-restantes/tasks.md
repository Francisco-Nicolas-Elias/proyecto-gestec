# Tasks: Corrección de hallazgos importantes y menores

> Marcar cada tarea con `[x]` al completarla.

---

## Fase 1 — Backend: validación y permisos

- [x] **1.1** Crear `backend/src/schemas/intervencion.schema.ts` (ver `design.md`)
- [x] **1.2** Crear `backend/src/schemas/mantenimiento.schema.ts`
- [x] **1.3** Aplicar ambos schemas en `activos.routes.ts`
- [x] **1.4** `tickets.service.ts`: filtrar `asignadosIds` a solo `administrador`/`operaciones` en `createTicketService`
- [x] **1.5** `tareas.service.ts`: ownership (autor o admin) en `deleteComentarioTareaService`
- [x] **1.6** `tareas.controller.ts`: pasar `req.user!.id` a `deleteComentarioTareaService`
- [x] **1.7** Crear `backend/src/schemas/info.schema.ts`, aplicar en `info.routes.ts`
- [x] **1.8** `auth.middleware.ts`: `algorithms: ['HS256']` explícito en `jwt.verify`
- [x] **1.9** `auth.service.ts`: tipar `JWT_EXPIRES_IN` sin `as any`
- [x] **1.10** Instalar `helmet`, aplicar en `app.ts`

## Fase 2 — Frontend: cache y permisos

- [x] **2.1** `apiClient.ts`: `cacheInvalidate('tareas')` en `createTarea`
- [x] **2.2** `apiClient.ts`: `cacheInvalidate` en las 6 mutaciones de comentarios (tickets y tareas)
- [x] **2.3** `apiClient.ts`: agregar `'activos'` a `cacheInvalidate` en `createComponente`/`updateComponente`/`deleteComponente`
- [x] **2.4** `ActivoForm.tsx`: agregar chequeo de `hasPermission('activos')` con redirect
- [x] **2.5** `RegistrarIntervencion.tsx`: agregar chequeo de `hasPermission('activos')` con redirect
- [x] **2.6** `Stock.tsx`: `hasPermission('admin')` → `hasPermission('stock')` en los 2 botones
- [x] **2.7** `Dashboard.tsx`: `Promise.allSettled` + toast de fallo parcial (ver `design.md`)

## Fase 3 — Frontend: limpieza

- [x] **3.1** `Admin.tsx`: eliminar estado, handlers y modales muertos de "Roles" (ver `design.md` para el listado exacto)
- [x] **3.2** `http.ts`: try/catch de red en `uploadFile()`
- [x] **3.3** `MultimediaUpload.tsx`: límite de tamaño de archivo en cliente (50MB)
- [x] **3.4** `TicketDetalle.tsx`: quitar import dinámico redundante de `apiClient`
- [x] **3.5** `NotificationBell.tsx`: fix de closure desactualizado con `useRef`

## Fase 4 — Verificación

- [x] **4.1** `npx tsc --noEmit` en frontend y backend sin errores (frontend: mismos 11 errores preexistentes de siempre, ninguno nuevo)
- [x] **4.2** ⚠️ No probado interactivamente en navegador (sin herramienta de automatización de browser en esta sesión) — verificado a nivel de código: `createTarea` ahora llama `cacheInvalidate('tareas')` con el mismo patrón exacto que `updateTarea`/`deleteTarea`, ya probados y funcionando. Recomendado un spot-check visual rápido
- [x] **4.3** ⚠️ Mismo caso que 4.2 — `cacheInvalidate` agregado con el patrón ya probado, no verificado interactivamente
- [x] **4.4** ⚠️ Mismo caso — `cacheInvalidate('componentes','stock','activos')`, no verificado interactivamente
- [x] **4.5** Verificado con curl: `repuestos` no-array → 400; mantenimiento sin `tecnico` → 400
- [x] **4.6** Verificado con curl (activo temporal, borrado al final): intervención y mantenimiento con body real → 201 ambos
- [x] **4.7** ⚠️ No probado interactivamente — lógica de `Promise.allSettled` + toast revisada por código, sigue el patrón estándar de `toast.error` ya usado en el resto de la app
- [x] **4.8** ⚠️ No probado interactivamente — mismo patrón exacto (`if (!authLoading && !hasPermission(...)) navigate(..., {replace:true})`) ya usado y funcionando en `NuevoComponenteForm.tsx`/`NuevaTareaForm.tsx`
- [x] **4.9** Verificado con curl: docente crea ticket con `asignadosIds` incluyéndose a sí mismo (no-staff) + un admin (staff) → solo el admin quedó asignado
- [x] **4.10** ⚠️ No probado interactivamente — cambio de una palabra (`'admin'`→`'stock'`), mismo patrón que el resto de botones de Stock ya visibles para operaciones
- [x] **4.11** Verificado con curl: operaciones borra comentario ajeno → 403; autor borra el propio → 204; admin borra comentario ajeno (moderación) → 204
- [x] **4.12** Verificado con `grep`: cero referencias colgantes a los identificadores eliminados (`showRolModal`, `editingRol`, etc.) — `tsc` no reporta ningún error en `Admin.tsx`
- [x] **4.13** Verificado con curl: `emails` como string en vez de array → 400; body válido (mismos datos reales sin cambios) → 200
- [x] **4.14** Verificado con `curl -I`: headers de `helmet` presentes (CSP, X-Frame-Options, X-Content-Type-Options, etc.), CORS sigue funcionando
- [x] **4.15** Verificado con curl: login exitoso para los 3 roles de prueba tras agregar `algorithms: ['HS256']` — el token generado se valida correctamente en requests posteriores autenticados

**Nota sobre los ítems marcados ⚠️**: son cambios de UI/comportamiento client-side puro que requieren interacción real en el navegador para confirmar visualmente. No cuento con herramienta de automatización de browser en esta sesión. Cada uno replica un patrón ya existente y probado en el mismo codebase (mismo `cacheInvalidate`, mismo guard de permiso, mismo `toast.error`), por lo que el riesgo de que no funcionen es bajo, pero recomiendo un vistazo rápido del usuario en el navegador antes de dar el change por cerrado en la práctica.
