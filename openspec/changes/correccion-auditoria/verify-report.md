# Reporte de Verificación — Corrección de Auditoría

> Verificación code-level de cada punto del checklist final.
> Fecha: 2026-06-26

---

## V.1 ✅ IDOR en comentarios de tickets

**Código verificado:** `backend/src/services/tickets.service.ts`

`addComentarioTicketService` (línea ~146):
- Si `userRol === Rol.docente_empleado` y `ticket.creadorId !== autorId` → lanza `AppError(403, 'No podés comentar en tickets ajenos')` ✓
- Para `docente_empleado`, `esInterno` se fuerza a `false` independientemente del body ✓

`getTicketByIdService` (línea ~27):
- Filtra `where: { esInterno: false }` en comentarios si `userRol === Rol.docente_empleado` ✓
- Lanza `AppError(403)` si el ticket pertenece a otro usuario ✓

**Resultado:** Un `docente_empleado` que intente comentar en un ticket ajeno recibe **403**. Los comentarios internos no son visibles para este rol.

---

## V.2 ✅ IDOR en adjuntos (borrar adjunto ajeno → 403)

**Código verificado:** `backend/src/services/adjuntos.service.ts`

`deleteAdjuntoService` (línea ~71):
- Carga el adjunto con `include: { ticket, comentarioTicket }` para obtener `creadorId`/`autorId`
- Si `userRol === Rol.docente_empleado` evalúa:
  ```typescript
  const esOwner =
    (adj.ticketId && adj.ticket?.creadorId === userId) ||
    (adj.comentarioTicketId && adj.comentarioTicket?.autorId === userId);
  if (!esOwner) throw new AppError(403, ...)
  ```
- Adjuntos de tareas: `esOwner = false` siempre para docente_empleado → 403 ✓

`uploadAdjuntoService` (línea ~26):
- Bloquea adjuntos a tareas para `docente_empleado` ✓
- Verifica `creadorId` del ticket / `autorId` del comentario antes de subir ✓

**Resultado:** Borrar o subir un adjunto en un recurso ajeno devuelve **403**.

---

## V.3 ✅ Validación Zod — body inválido → 400 con mensaje descriptivo

**Código verificado:** `validate.middleware.ts`, `error.middleware.ts`, rutas y schemas

**Flujo:**
1. `validate(schema)` llama `schema.parse(req.body)` → lanza `ZodError` si falla
2. `errorHandler` captura `ZodError` y responde:
   ```json
   { "error": "Datos inválidos", "detalles": [{ "campo": "titulo", "mensaje": "El título es requerido" }] }
   ```
3. `http.ts` en el frontend mapea `detalles[0].mensaje` → toast descriptivo

**Rutas con Zod aplicado:**

| Ruta | Schema |
|------|--------|
| `POST /api/tickets` | `createTicketSchema` |
| `PUT /api/tickets/:id` | `updateTicketSchema` |
| `POST /api/tickets/:id/comentarios` | `createComentarioSchema` |
| `POST /api/tareas` | `createTareaSchema` |
| `PUT /api/tareas/:id` | `updateTareaSchema` |
| `PATCH /api/tareas/:id/estado` | `updateTareaEstadoSchema` |
| `POST/PUT /api/tareas/:id/comentarios` | `createComentarioTareaSchema` |
| `POST /api/activos` | `createActivoSchema` |
| `PUT /api/activos/:id` | `updateActivoSchema` |
| `POST /api/componentes` | `createComponenteSchema` |
| `PUT /api/componentes/:id` | `updateComponenteSchema` |
| `POST /api/stock/movimientos` | `createMovimientoSchema` |
| `POST /api/admin/usuarios` | `createUsuarioSchema` |
| `PUT /api/admin/usuarios/:id` | `updateUsuarioSchema` |

**Observación:** `POST /api/activos/:id/intervenciones` no tiene schema Zod — fuera del scope de esta auditoría.

**Resultado:** Body inválido en cualquiera de las rutas anteriores devuelve **400** con campo y mensaje legible.

---

## V.4 ✅ Movimiento de stock tipo "ajuste" cambia la cantidad

**Código verificado:** `backend/src/services/stock.service.ts` + `backend/src/controllers/stock.controller.ts`

**Correcciones aplicadas:**
1. **Controller** mapea `itemId` → `stockItemId`:
   ```typescript
   const { itemId, ...rest } = req.body;
   svc.createStockMovimientoService({ stockItemId: itemId, ...rest }, ...)
   ```
   Antes, `data.stockItemId` era `undefined` → el movimiento fallaba silenciosamente.

2. **Delta de ajuste** corregido:
   ```typescript
   const delta = data.tipo === 'entrada' ? data.cantidad
               : data.tipo === 'salida'  ? -data.cantidad
               : data.cantidad - item.cantidad;   // ajuste: set to target
   ```
   Ejemplo: stock actual = 10, ajuste a 15 → delta = +5, stock pasa a 15 ✓
   Ejemplo: stock actual = 10, ajuste a 3  → delta = -7, stock pasa a 3  ✓

3. **Error** cambiado a `AppError(404)` para que el errorHandler lo capture correctamente.

**Resultado:** Un movimiento de ajuste **efectivamente modifica** el `cantidad` del `StockItem`.

---

## V.5 ✅ authLoading — no redirigir antes de que auth cargue

**Código verificado:** 4 páginas con pattern `loading || authLoading`

| Página | Línea | Guard |
|--------|-------|-------|
| `Activos.tsx` | ~466 | `if (loading \|\| authLoading) return <LoadingSpinner />` |
| `ActivoDetalle.tsx` | ~354 | `if (loading \|\| authLoading) return <LoadingSpinner />` |
| `Tickets.tsx` | ~201 | `if (loading \|\| authLoading) return <LoadingSpinner />` |
| `TicketDetalle.tsx` | ~262 | `if (loading \|\| authLoading) return <LoadingSpinner />` |

**Lógica:** Mientras `authLoading === true`, el usuario aún no fue cargado del backend. El spinner evita que `hasPermission()` devuelva `false` prematuramente y que el componente renderice UI con permisos incorrectos.

**Resultado:** Al navegar como usuario autenticado, la página muestra spinner hasta que auth carga — sin flash de contenido incorrecto ni redirección prematura.

---

## V.6 ✅ Intervención con múltiples repuestos — descuento atómico de stock

**Código verificado:** `backend/src/services/activos.service.ts` + `frontend/src/app/pages/RegistrarIntervencion.tsx`

**Backend — `createIntervencionService`:**
```typescript
const intervencion = await prisma.$transaction(async (tx) => {
  const inv = await tx.intervencion.create({ ... }); // crea intervención + repuestos
  for (const rep of data.repuestos.filter(r => r.stockItemId)) {
    await tx.stockMovimiento.create({ ... });           // registra movimiento de salida
    await tx.stockItem.update({ cantidad: { decrement: rep.cantidad } }); // descuenta
  }
  return inv;
});
```

- Todo ocurre en **una sola transacción**: si falla cualquier descuento, la intervención entera se revierte ✓
- Cada repuesto con `stockItemId` genera su propio `StockMovimiento` y decrementa `StockItem.cantidad` ✓
- La verificación de existencia del item lanza `AppError(404)` dentro de la transacción → rollback automático ✓

**Frontend — `RegistrarIntervencion.tsx`:**
- El loop `for (const repuesto of ...) { await createStockMovimiento(...) }` fue **eliminado** ✓
- Los repuestos ahora incluyen `stockItemId: r.itemId` en el payload de `createIntervencion` ✓
- Un solo request al backend maneja todo

**Resultado:** Al registrar una intervención con N repuestos, todos se descontaron del stock en una operación atómica. Si alguno falla (stock no encontrado), ningún cambio persiste.

---

## Resumen general

| Check | Estado | Notas |
|-------|--------|-------|
| V.1 IDOR comentarios tickets | ✅ Aprobado | 403 para docente_empleado en ticket ajeno |
| V.2 IDOR adjuntos | ✅ Aprobado | 403 para ownership incorrecto |
| V.3 Validación Zod | ✅ Aprobado | 400 + mensaje descriptivo en 14 endpoints |
| V.4 Ajuste stock delta | ✅ Aprobado | Delta correcto + mapping itemId→stockItemId |
| V.5 authLoading en 4 páginas | ✅ Aprobado | Spinner hasta que auth carga |
| V.6 Transacción intervención | ✅ Aprobado | Atómica con $transaction, frontend simplificado |

**Todos los checks verificados. El change está listo para archivar.**
