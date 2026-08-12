# Proposal: Corrección de hallazgos importantes y menores (post-auditoría)

## Intent

Tras la corrección de los 3 hallazgos de seguridad críticos (`correccion-seguridad-backend`, archivado), quedan pendientes los hallazgos clasificados como "importante, no bloqueante" y "menor/limpieza" de la misma revisión de código (2 agentes de exploración sobre backend y frontend completos). Ninguno es un riesgo de seguridad grave, pero varios son bugs funcionales reales (datos que no se actualizan visualmente, una funcionalidad de permisos inconsistente entre frontend y backend) y el resto es deuda técnica que conviene resolver antes de producción.

## Scope

### In Scope — Importante

1. **Cache client-side desactualizado tras mutaciones** (`frontend/src/app/services/apiClient.ts`):
   - `createTarea` no invalida el cache `'tareas'` → una tarea recién creada no aparece en el Kanban hasta que expira el TTL (60s).
   - Ninguna mutación de comentarios (tickets ni tareas: `addComentario`, `updateComentarioTicket`, `deleteComentarioTicket`, `addComentarioTarea`, `updateComentarioTarea`, `deleteComentarioTarea`) invalida cache — hoy no rompen nada visible porque los comentarios no se leen del cache de lista, pero si el usuario navega y vuelve dentro de los 60s, `getTareas()`/`getTickets()` puede pisar el estado local con datos viejos.
   - Mutar un `Componente` (`createComponente`/`updateComponente`/`deleteComponente`) no invalida el cache `'activos'`, pese a que `mapActivo()` arma RAM/almacenamiento/marca/modelo del activo a partir de sus componentes — la grilla de Equipos puede mostrar datos de hardware desactualizados hasta 60s después de editar un componente.

2. **Sin validación Zod en intervenciones/mantenimiento de activos** (`backend/src/routes/activos.routes.ts`): `POST /:id/intervenciones` y `POST /:id/mantenimiento` son los únicos endpoints mutadores del sistema sin schema Zod — un body malformado (ej. `repuestos` no siendo un array) causa un 500 sin control.

3. **Dashboard oculta fallas de carga parcial** (`frontend/src/app/pages/Dashboard.tsx`): `loadDashboardData()` usa un único `Promise.all` — si cualquiera de las 4 queries falla, todos los KPIs quedan en 0 sin ningún aviso visible, dando la falsa impresión de que no hay pendientes.

4. **Sin chequeo de permiso en el componente de `ActivoForm.tsx`/`RegistrarIntervencion.tsx`**: mitigado por el backend (rutas ya protegidas con `isOperaciones`), pero un `docente_empleado` que navegue directo a `/activos/nuevo` o `/activos/:id/intervencion` completa el formulario entero y recién al enviar recibe un 403 crudo del backend, en vez de una redirección clara como tienen el resto de las páginas de creación (`NuevoComponenteForm.tsx`, `NuevaTareaForm.tsx`).

5. **`asignadosIds` sin restricción de rol al crear ticket** (`backend/src/services/tickets.service.ts`): `createTicketService` acepta cualquier ID de usuario en `asignadosIds` sin validar que corresponda a staff (`administrador`/`operaciones`) — accesible incluso para `docente_empleado`, que puede crear tickets. Dispara notificación + email a esos IDs sin más control que "el usuario exista".

### In Scope — Menor

6. **Stock.tsx**: botones de editar/eliminar componente gateados por `hasPermission('admin')` en vez de `hasPermission('stock')` — confirmado con el usuario que es un descuido a corregir, ya que el backend permite esa acción también a `operaciones`.
7. **Código muerto del CRUD simulado de "Roles"** en `Admin.tsx` (~150 líneas: handlers, estado y modales sin ningún botón que los dispare desde la UI).
8. **`uploadFile()` en `http.ts`** no envuelve el `fetch` en try/catch como sí lo hace `request()` — una falla de red durante la subida de un adjunto lanza un error crudo en vez del mensaje amigable ya estandarizado.
9. **Borrado de comentario de tarea sin verificación de ownership** (`backend/src/services/tareas.service.ts:deleteComentarioTareaService`) — inconsistente con `updateComentarioTareaService` (sí valida autoría). Decisión de producto confirmada con el usuario: solo el autor del comentario o un `administrador` pueden borrarlo (un `operaciones` ya no podrá borrar el comentario de un colega, mismo criterio que editar, con excepción de moderación para admin).
10. **Sin `helmet`** ni headers de seguridad básicos en el backend (`backend/src/app.ts`).
11. **JWT sin `algorithms` explícito** en `jwt.verify` (`auth.middleware.ts`) y cast `as any` evitable en `JWT_EXPIRES_IN` (`auth.service.ts`).
12. **`PUT /api/info` sin validación Zod** (`backend/src/routes/info.routes.ts`) — único endpoint mutador de Admin sin schema, a diferencia del resto.
13. **`MultimediaUpload.tsx` sin límite de tamaño de archivo en el cliente** antes de leer con `FileReader.readAsDataURL` — en mobile, adjuntar un video pesado puede colgar la pestaña antes de llegar al rechazo del backend (50MB).
14. **`TicketDetalle.tsx`**: import dinámico redundante de `apiClient` (`getTicketById` ya está importado estáticamente arriba).
15. **`NotificationBell.tsx`**: `loadNotifications` compara contra `notifications.length` capturado en un closure desactualizado — la detección de "hay tickets nuevos desde el último poll" casi nunca dispara tras la primera carga. Impacto real nulo hoy porque `sendNotificationEmail` es un stub sin implementación, pero es lógica rota que conviene corregir.

### Out of Scope (decisiones ya tomadas en sesiones previas, no se reabren)

- Rate limiting por IP en `/auth/login` — descartado (sistema restringido a red interna del instituto).
- Cifrado de `pAD` — descartado explícitamente por el usuario.
- Mensaje de enumeración de usuarios en login — deprioritizado junto con el rate limiting.
- Refactor de componentes/páginas grandes (`Admin.tsx` 2055 líneas, `Stock.tsx` 1148, etc.) — es una sugerencia de mantenibilidad, no un bug; un refactor de ese tamaño amerita su propio change dedicado si se decide encarar.

## Approach

Los items con comportamiento observable y testable (cache, validación Zod, permisos, resiliencia del Dashboard) tienen specs formales Given/When/Then en `specs/`. Los items de limpieza/hardening puro sin ramificación de comportamiento a especificar (código muerto, import redundante, headers de seguridad, tipado de JWT) se documentan directamente en `design.md`/`tasks.md`, siguiendo el mismo criterio que ya se usó en `correccion-auditoria` (que no tuvo specs formales para sus 22 items de limpieza/seguridad).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/app/services/apiClient.ts` | Modified | Cache invalidation en `createTarea`, comentarios (tickets/tareas), componentes→activos |
| `backend/src/schemas/intervencion.schema.ts` | New | Schema Zod para intervenciones |
| `backend/src/schemas/mantenimiento.schema.ts` | New | Schema Zod para mantenimiento |
| `backend/src/routes/activos.routes.ts` | Modified | Aplicar los nuevos schemas |
| `frontend/src/app/pages/Dashboard.tsx` | Modified | Manejo de fallo parcial en `loadDashboardData` |
| `frontend/src/app/pages/ActivoForm.tsx` | Modified | Chequeo de `hasPermission('activos')` |
| `frontend/src/app/pages/RegistrarIntervencion.tsx` | Modified | Chequeo de `hasPermission('activos')` |
| `backend/src/services/tickets.service.ts` | Modified | Filtrar `asignadosIds` a solo staff en `createTicketService` |
| `frontend/src/app/pages/Stock.tsx` | Modified | `hasPermission('admin')` → `hasPermission('stock')` |
| `frontend/src/app/pages/Admin.tsx` | Modified | Eliminar código muerto de Roles |
| `frontend/src/app/services/http.ts` | Modified | `uploadFile()` con try/catch de red |
| `backend/src/services/tareas.service.ts` | Modified | Ownership check en `deleteComentarioTareaService` |
| `backend/src/app.ts` | Modified | Agregar `helmet` |
| `backend/src/middlewares/auth.middleware.ts` | Modified | `algorithms: ['HS256']` explícito |
| `backend/src/services/auth.service.ts` | Modified | Tipado más estricto de `JWT_EXPIRES_IN` |
| `backend/src/schemas/info.schema.ts` | New | Schema Zod para `InfoOperaciones` |
| `backend/src/routes/info.routes.ts` | Modified | Aplicar el nuevo schema |
| `frontend/src/app/components/MultimediaUpload.tsx` | Modified | Límite de tamaño de archivo en cliente |
| `frontend/src/app/pages/TicketDetalle.tsx` | Modified | Quitar import dinámico redundante |
| `frontend/src/app/components/NotificationBell.tsx` | Modified | Fix de closure desactualizado con `useRef` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El nuevo schema Zod de intervenciones/mantenimiento rechaza un body que el frontend real envía hoy (campo faltante en la whitelist) | Baja | Relevar campo por campo contra `RegistrarIntervencion.tsx` antes de escribir el schema, igual que se hizo en el change anterior |
| Filtrar `asignadosIds` a solo staff en `createTicketService` rompe algún flujo legítimo donde se asigna a un `docente_empleado` | Muy baja | Verificar en el frontend (`CrearReporte.tsx`) qué lista de usuarios ofrece el selector de asignación — si ya solo ofrece staff, el filtro del backend es puramente defensivo y no cambia comportamiento visible |
| `helmet` con su config por defecto rompe algo (ej. CSP bloqueando el frontend en otro origen) | Baja | Usar `helmet()` sin configuración estricta de CSP (el CORS ya restringe el origen permitido); verificar que el frontend siga pudiendo consumir la API tras el cambio |
| Quitar el código muerto de Roles en `Admin.tsx` borra algo que en realidad se usa | Muy baja | Confirmado con grep que ningún `onClick` dispara `openNuevoRol`/`handleEditRol`/`setShowDeleteRolModal(true)` — verificación visual en el navegador tras el cambio igual |

## Rollback Plan

Todos los cambios son reversibles con `git revert`, sin migración de base de datos. El único archivo nuevo en `schema.prisma` no se toca en este change. Si `helmet` causa un problema en producción, se puede remover con un cambio de una línea.

## Dependencies

- `helmet` — nueva dependencia npm para el backend (liviana, sin sub-dependencias problemáticas).

## Success Criteria

- [ ] Crear una tarea la muestra inmediatamente en el Kanban sin esperar el TTL del cache.
- [ ] Agregar/editar/borrar un comentario de ticket o tarea no se "pierde" visualmente al navegar y volver dentro de los 60s.
- [ ] Editar un componente instalado en un activo refleja el cambio inmediatamente en la grilla de Equipos.
- [ ] Un body malformado a `/intervenciones` o `/mantenimiento` devuelve 400 con mensaje descriptivo, no 500.
- [ ] Si falla la carga de una sección del Dashboard, el usuario ve un aviso en vez de KPIs en 0 silenciosos.
- [ ] Un `docente_empleado` que navegue a `/activos/nuevo` es redirigido con un mensaje claro, no ve el formulario.
- [ ] `createTicketService` ignora cualquier ID en `asignadosIds` que no corresponda a `administrador`/`operaciones`.
- [ ] En Stock, `operaciones` puede editar/eliminar componentes igual que `administrador`.
- [ ] `Admin.tsx` no tiene código inalcanzable relacionado a Roles.
- [ ] Una falla de red al subir un adjunto muestra el mismo mensaje amigable que el resto de la app.
- [ ] Un `operaciones` que intente borrar el comentario de tarea de un colega recibe 403; un `administrador` puede borrar cualquier comentario.
- [ ] El backend responde con headers de seguridad básicos (`helmet`).
- [ ] `jwt.verify` solo acepta tokens firmados con `HS256`.
- [ ] `PUT /api/info` rechaza un body inválido con 400.
- [ ] Adjuntar un archivo grande en `MultimediaUpload.tsx` es rechazado en el cliente antes de intentar leerlo.
