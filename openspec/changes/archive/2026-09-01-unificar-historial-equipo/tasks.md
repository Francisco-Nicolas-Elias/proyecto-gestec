# Tasks: Unificar Intervención y Mantenimiento en historial automático de Editar Equipo

> **Nota de implementación (desviación de diseño):** al verificar contra la base real se encontró que la tabla `StockItem` (pensada para stock por cantidad genérica) está vacía — 0 registros — y nunca se usó con datos reales; el stock real del sistema se calcula contando `Componente` serializados por `tipoComponenteId` con `activoId = null`. El mecanismo de "Repuestos utilizados" originalmente diseñado contra `StockItem` (tareas 2.1/2.5 tal como estaban redactadas) **no se implementó así** — en su lugar, confirmado con el usuario, "repuesto usado" consume automáticamente N unidades disponibles de un `TipoComponente` real (mismo mecanismo que "instalar" un componente, con su `HistorialMovimientoComponente` correspondiente). Ver `design.md` original para el diseño contra `StockItem` (ya no vigente) y el detalle real abajo.

## Phase 1: Backend — Schema y datos base

- [x] 1.1 En `backend/prisma/schema.prisma`: agregar modelos `HistorialEquipo` (`id`, `activoId`, `activo` relation `onDelete: Cascade`, `fecha DateTime @default(now())`, `tecnico String`, `cambios String[]`, relation `repuestos RepuestoHistorial[]`, `@@map("historial_equipo")`) y `RepuestoHistorial` (`id`, `historialId`, `historial` relation `onDelete: Cascade`, `item String`, `cantidad Int`, `@@map("repuestos_historial")`)
- [x] 1.2 En `model Activo`: reemplazar `mantenimientos MantenimientoRecord[]` e `intervenciones Intervencion[]` por `historial HistorialEquipo[]`
- [x] 1.3 Eliminar de `schema.prisma` los modelos `Intervencion`, `RepuestoIntervencion`, `MantenimientoRecord`
- [x] 1.4 Correr `pnpm db:push` desde `backend/` (las 3 tablas viejas estaban en 0 registros — sin necesidad de backup, confirmado antes de aplicar)
- [x] 1.5 `npx prisma generate` corrido (requirió parar el dev server por lock de Windows) y `PrismaClient` regenerado con `historialEquipo`/`repuestoHistorial`

## Phase 2: Backend — Servicios, controllers, rutas

- [x] 2.1 En `activo.schema.ts`: agregado a `updateActivoSchema` `cambios: z.array(z.string()).optional()` y `repuestos: z.array(z.object({ item, cantidad: z.number().int().positive(), tipoComponenteId: z.string().optional() })).optional()` — **`tipoComponenteId` en vez de `stockItemId`** (ver nota arriba)
- [x] 2.2 Eliminados `intervencion.schema.ts` y `mantenimiento.schema.ts`
- [x] 2.3 `updateActivoService` reescrito: extrae `cambios`/`repuestos`, todo dentro de un único `$transaction`
- [x] 2.4 Crea `tx.historialEquipo.create(...)` cuando hay `cambios` y/o `repuestos`
- [x] 2.5 **(rediseñado)** Para cada repuesto con `tipoComponenteId`: busca hasta `cantidad` componentes disponibles (`activoId: null`) de ese tipo; si no alcanza, `AppError(400, ...)` aborta toda la transacción; si alcanza, vincula cada uno (`activoId = id`) y crea su `HistorialMovimientoComponente` (`accion: instalado`) — sin tocar `StockItem`/`StockMovimiento`
- [x] 2.6 `getActivoByIdService` usa `historial: { include: { repuestos: true }, orderBy: { fecha: 'desc' } }`
- [x] 2.7 Eliminados `createIntervencionService`, `getIntervencionesService`, `addMantenimientoService`
- [x] 2.8 Controller actualizado; `updateActivo` ya no necesita `req.user!.id` (no se usa `usuarioId` en el nuevo mecanismo)
- [x] 2.9 Rutas de intervenciones/mantenimiento eliminadas

## Phase 3: Frontend — apiClient y tipos

- [x] 3.1 Agregada interface `HistorialEquipoEntry`
- [x] 3.2 `mapActivo` mapea `historial` (con `toDateStr` en `fecha`, ya que ahora es un DateTime completo, no solo fecha)
- [x] 3.3 `activoPayload()` deja pasar `cambios`/`repuestos` sin filtrar
- [x] 3.4 Eliminadas `getIntervenciones`, `createIntervencion`, `addMantenimientoRecord`, interfaces `Intervencion`/`MantenimientoRecord`; agregada `RepuestoUtilizado { item, cantidad, tipoComponenteId? }`

## Phase 4: Frontend — ActivoForm.tsx (repuestos + diff)

- [x] 4.1 Agregado `repuestos: RepuestoForm[]` al `form` (persistido junto al resto vía `useFormPersistence`, reseteado a `[]` en cada carga de edición)
- [x] 4.2 Sección "Repuestos Utilizados" agregada, visible solo `isEdit === true`, selector con `getStock()` (que ya devuelve `tipoComponenteId` como `id`)
- [x] 4.3 `calcularCambios()` escrita: campos simples + bloques de componente único (Procesador/Placa Madre/Placa Video/Impresora) + Estado + P AD (sin exponer valor)
- [x] 4.4 `diffModulos()` compara RAM/Almacenamiento por `nroSerie` contra el original
- [x] 4.5 `handleSubmit` calcula `cambios`+`repuestos` solo en modo edición y los agrega al payload de `updateActivo`
- [x] 4.6 `activoOriginalRef` agregado, poblado en el `load()` de edición

## Phase 5: Frontend — ActivoDetalle.tsx y limpieza de rutas

- [x] 5.1 Botón "Intervención" eliminado
- [x] 5.2 **(hallazgo adicional)** Este proyecto no tenía un modal de Mantenimiento separado en `ActivoDetalle.tsx` — el mantenimiento vivía dentro de la misma pestaña "Historial" (formulario inline `showAddMant`); eliminado junto con la pestaña
- [x] 5.3 Pestaña "Historial" reescrita: lista unificada de `activo.historial` (fecha, técnico, cambios como lista, repuestos como badges)
- [x] 5.4 `exportarHistorialPDF` reescrito: una sola tabla con columnas Fecha/Técnico/Cambios/Repuestos desde `activo.historial`
- [x] 5.5 `RegistrarIntervencion.tsx` eliminado
- [x] 5.6 Ruta `activos/:id/intervencion` y su import eliminados de `routes.tsx`
- [x] 5.7 **(hallazgo adicional, fuera del plan original)** `Activos.tsx` tenía un modal "Historial de Mantenimiento" propio en la grilla (columna "Último mantenimiento"), separado de `ActivoDetalle.tsx`, que dependía de `historialMantenimiento` (siempre vacío ahí porque el listado no incluía esa relación). Reemplazado: el click ahora navega directo al detalle del equipo en vez de abrir un modal roto/redundante.

## Phase 6: Verificación

- [x] 6.1 `tsc --noEmit` limpio en `backend/` y `frontend/` (solo quedan errores preexistentes no relacionados: `figma:asset/*`, `ImportMeta.env`, `ringColor`, `Stock.tsx` size prop)
- [x] 6.2 Verificado con curl (usuario admin temporal, borrado después): `GET/POST .../intervenciones` y `POST .../mantenimiento` → 404
- [x] 6.3 Verificado: cambiar `estado` en un equipo real + `cambios` → historial creado correctamente con la línea de diff (probado sobre un equipo real, revertido después)
- [ ] 6.4 No re-verificado explícitamente en esta sesión (la sincronización de módulos RAM/almacenamiento ya se verificó y arregló en un cambio anterior de esta misma conversación) — pendiente de que el usuario lo confirme en su revisión manual
- [x] 6.5 Verificado: repuesto "RAM" x2 con `tipoComponenteId` real → stock en depósito bajó de 175 a 173, 2 componentes reales quedaron vinculados al equipo, historial con el repuesto registrado (revertido después)
- [x] 6.6 Verificado: repuesto "Operaciones" (0 en depósito) x1 → 400 "Stock insuficiente", equipo NO se modificó (observaciones no se guardó), historial no se creó
- [x] 6.7 Verificado: `PUT` sin `cambios` ni `repuestos` → historial sigue en 0 entradas
- [x] 6.8 Confirmado por código: la sección solo renderiza si `isEdit === true`
- [ ] 6.9 Pendiente — requiere navegador, delegado a la verificación manual del usuario
- [ ] 6.10 Pendiente — permisos no se tocaron en este cambio (mismas rutas `isOperaciones`), pero la confirmación visual en los 3 roles queda para la revisión manual del usuario
- [ ] 6.11 Pendiente — verificación manual del usuario en navegador
