# Proposal: Unificar Intervención y Mantenimiento en un historial automático de Editar Equipo

## Intent

Hoy, en el detalle de un Equipo, existen dos flujos manuales separados para registrar cambios técnicos — "Intervención" (diagnóstico, acción, repuestos con descuento de stock, tiempos, resultado) y "Mantenimiento" (fecha, tipo, descripción, técnico) — además del flujo de "Editar Equipo" (que modifica componentes, observaciones y datos del equipo pero no deja ningún registro histórico de qué cambió).

Esto genera duplicación y confusión: un técnico que cambia un componente vía "Editar" no deja rastro de ese cambio, mientras que para dejar rastro tiene que abrir un formulario aparte (Intervención) que no está conectado a lo que realmente se editó. El usuario (dueño del proyecto) decidió unificar todo: que **Editar Equipo sea el único punto de entrada**, y que cada guardado genere automáticamente una entrada de historial describiendo qué cambió, incluyendo los repuestos usados (que siguen descontando stock).

## Scope

### In Scope
- Eliminar el botón/flujo "Intervención" (`RegistrarIntervencion.tsx`, ruta, endpoints, modelos `Intervencion`/`RepuestoIntervencion`).
- Eliminar el flujo "Mantenimiento" (botón/modal en `ActivoDetalle.tsx`, endpoint `POST /activos/:id/mantenimiento`, modelo `MantenimientoRecord`).
- Nuevo modelo unificado `HistorialEquipo` (+ `RepuestoHistorial` para los repuestos usados) que reemplaza a los tres anteriores.
- Agregar sección "Repuestos utilizados" dentro de `ActivoForm.tsx` (solo visible en modo edición), con descuento de stock transaccional al guardar — mismo comportamiento que tenía Intervención.
- Al guardar una edición, generar automáticamente una entrada de historial con diff de campos legible (qué cambió, no solo "editado"), calculado en el frontend comparando el estado cargado vs. el estado final antes de guardar.
- Actualizar `ActivoDetalle.tsx`: sacar el botón "Intervención" y el botón/modal de "Mantenimiento", reemplazar la pestaña/sección de intervenciones+mantenimientos por un único listado de "Historial" (cambios + repuestos, ordenado por fecha).
- Actualizar el export a PDF de "Historial de Mantenimiento e Intervenciones" para que use el nuevo `HistorialEquipo`.
- Migración de Prisma: nueva tabla `historial_equipo`/`repuestos_historial`, eliminar `intervenciones`, `repuestos_intervencion`, `mantenimiento_records`.

### Out of Scope
- No se migran datos históricos existentes de `Intervencion`/`MantenimientoRecord` al nuevo modelo (se pierden esos registros — ver Riesgos). El usuario no pidió migración de datos.
- No se toca el historial de movimientos de **componentes** (`HistorialMovimientoComponente`, pestaña "Componentes" del detalle) — es un concepto distinto (trazabilidad de dónde estuvo instalado cada componente), no forma parte de este cambio.
- No se agrega diffing de campos en el backend — el cálculo del diff (qué texto describe cada cambio) se hace en el frontend, que ya tiene el estado "antes" (activo cargado) y "después" (form final) disponibles.

## Approach

1. **Backend**: nuevo modelo Prisma `HistorialEquipo` (activoId, fecha, tecnico, `cambios String[]`) + `RepuestoHistorial` (item, cantidad, historialId). Eliminar `Intervencion`, `RepuestoIntervencion`, `MantenimientoRecord` y sus relaciones en `Activo`. Extender `PUT /api/activos/:id` para aceptar opcionalmente `cambios: string[]` y `repuestos: {item, cantidad, stockItemId?}[]` en el body — el service, dentro de la misma `$transaction` del update, crea el `HistorialEquipo` (si hay cambios o repuestos) y descuenta stock por cada repuesto con `stockItemId` (mismo patrón que `createIntervencionService` tenía). Eliminar rutas/controllers/services de intervenciones y mantenimiento. `GET /api/activos/:id` pasa a incluir `historial: HistorialEquipo[]` en vez de `intervenciones`/`mantenimientos`.
2. **Frontend — ActivoForm.tsx**: agregar sección "Repuestos utilizados" (mismo patrón de selector que tenía `RegistrarIntervencion.tsx`: ítem de stock + cantidad), solo en modo edición. Antes de guardar, calcular el diff comparando el `activo` cargado original vs. el `form` final (campos simples + módulos de RAM/almacenamiento/placaVideo/placaMadre agregados/quitados/modificados) y armar el array `cambios: string[]`. Enviar `cambios` + `repuestos` junto con el resto del payload en `updateActivo`.
3. **Frontend — ActivoDetalle.tsx**: sacar botones de Intervención y Mantenimiento. Reemplazar sección de intervenciones/mantenimientos por un listado único "Historial" leído de `activo.historial`, mostrando fecha, técnico, lista de cambios y repuestos usados (si los hubo). Actualizar el export PDF para usar esta misma fuente.
4. **Eliminar**: `RegistrarIntervencion.tsx`, su ruta en `routes.tsx`, y las funciones ya sin uso en `apiClient.ts` (`getIntervenciones`, `createIntervencion`, `addMantenimientoRecord`, etc.), reemplazadas por el nuevo `getHistorialEquipo`/tipo `HistorialEquipoEntry`.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `backend/prisma/schema.prisma` | Modified | Nuevo `HistorialEquipo`+`RepuestoHistorial`, elimina `Intervencion`, `RepuestoIntervencion`, `MantenimientoRecord` |
| `backend/prisma/migrations/` | New | Nueva migración de schema (`pnpm db:push` en dev, ver nota de drift en CLAUDE.md) |
| `backend/src/services/activos.service.ts` | Modified | `updateActivoService` genera historial+repuestos en transacción; se eliminan `createIntervencionService`, `getIntervencionesService`, `addMantenimientoService` |
| `backend/src/controllers/activos.controller.ts` | Modified | Eliminar handlers de intervenciones/mantenimiento |
| `backend/src/routes/activos.routes.ts` | Modified | Eliminar rutas `POST .../intervenciones`, `POST .../mantenimiento`, `GET .../intervenciones` |
| `backend/src/schemas/*.ts` | Modified | Eliminar schema de intervención/mantenimiento si existen, agregar schema para `cambios`/`repuestos` en el update de activo |
| `frontend/src/app/pages/ActivoForm.tsx` | Modified | Sección "Repuestos utilizados" + cálculo de diff al guardar |
| `frontend/src/app/pages/ActivoDetalle.tsx` | Modified | Sacar botones Intervención/Mantenimiento, nuevo listado "Historial", export PDF actualizado |
| `frontend/src/app/pages/RegistrarIntervencion.tsx` | Removed | Ya no aplica |
| `frontend/src/app/routes.tsx` | Modified | Eliminar ruta de intervención |
| `frontend/src/app/services/apiClient.ts` | Modified | Eliminar funciones de intervención/mantenimiento, agregar `getHistorialEquipo`/tipos nuevos, extender `updateActivo` payload |
| `openspec/specs/equipos/spec.md` | New | Primer spec del dominio "equipos" (no existía) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Se pierden los registros históricos ya cargados de Intervención/Mantenimiento al borrar esas tablas | Alta (es intencional, no hay migración de datos) | Confirmado explícitamente aceptado por el usuario — out of scope migrar datos viejos. Se puede exportar un dump antes de aplicar la migración si se quiere conservar un respaldo fuera del sistema. |
| El diff de campos calculado en frontend puede quedar desincronizado si dos personas editan el mismo equipo casi al mismo tiempo (el diff se calcula contra lo que el frontend cargó, no contra el estado real al momento de guardar) | Baja (uso interno, pocos usuarios concurrentes) | Aceptable para el alcance actual del sistema; no se agrega locking optimista en este cambio |
| Reventar el export PDF de historial si algún equipo no tiene `historial` (array vacío) | Baja | Manejar array vacío explícitamente en el render y en el PDF, igual que ya se hace con `intervenciones.length > 0` hoy |

## Rollback Plan

Si algo falla durante o después de aplicar: revertir el commit del cambio (`git revert`) y, si ya se corrió `pnpm db:push` con el nuevo schema, restaurar `schema.prisma` a la versión anterior y volver a correr `pnpm db:push` (no hay backup automático configurado aún para pre-producción, así que se recomienda un `pg_dump` manual antes de aplicar la migración de schema por las dudas). No hay usuarios en producción todavía (sistema en revisión manual pre-deploy), así que el riesgo real de rollback es bajo.

## Dependencies

- Ninguna externa. Depende de que la revisión manual de "Equipos" siga en curso — este cambio se aplica sobre esa misma pantalla.

## Success Criteria

- [ ] El botón "Intervención" ya no existe en ningún lado del detalle de equipo
- [ ] El botón/modal "Mantenimiento" ya no existe
- [ ] Editar un equipo (cambiar un campo, agregar/quitar un módulo de RAM o almacenamiento, o registrar un repuesto usado) genera una entrada de historial visible en el detalle, con el detalle de qué cambió
- [ ] Registrar un repuesto usado desde Editar Equipo descuenta stock correctamente (mismo comportamiento transaccional que tenía Intervención)
- [ ] El export PDF del equipo muestra el nuevo historial unificado sin errores
- [ ] `tsc --noEmit` sin errores en frontend y backend
