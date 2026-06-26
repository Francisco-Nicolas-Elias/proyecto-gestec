# Tasks: Corrección de Auditoría

> Marcar cada tarea con `[x]` al completarla.
> Orden de trabajo recomendado: Críticos → Altos → Medios → Bajos.

---

## Fase 1 — 🔴 Críticos (seguridad)

### 1.1 IDOR en comentarios de tickets
- [x] **1.1.1** En `tickets.service.ts`: al crear comentario, verificar que `ticket.creadorId === req.user.id` si el rol es `docente_empleado`
- [x] **1.1.2** En `tickets.service.ts`: bloquear que `docente_empleado` pueda setear `esInterno: true` en comentarios
- [x] **1.1.3** En `tickets.service.ts`: al leer comentarios de un ticket ajeno como `docente_empleado`, filtrar los que tienen `esInterno: true`

### 1.2 IDOR en adjuntos
- [x] **1.2.1** En `adjuntos.service.ts`: crear función que verifique ownership del adjunto (buscar el recurso padre y validar que el `creadorId` o `usuarioId` coincide con `req.user.id`)
- [x] **1.2.2** En `adjuntos.routes.ts`: aplicar verificación de ownership antes del handler DELETE
- [x] **1.2.3** En `adjuntos.routes.ts`: aplicar verificación de ownership antes del handler POST (adjuntar a recurso ajeno)

### 1.3 Falta de validación Zod en backend
- [x] **1.3.1** Crear schemas Zod para `Ticket` (create + update) en `backend/src/schemas/ticket.schema.ts`
- [x] **1.3.2** Crear schemas Zod para `Tarea` (create + update) en `backend/src/schemas/tarea.schema.ts`
- [x] **1.3.3** Crear schemas Zod para `Activo` (create + update) en `backend/src/schemas/activo.schema.ts`
- [x] **1.3.4** Crear schemas Zod para `Componente` (create + update) en `backend/src/schemas/componente.schema.ts`
- [x] **1.3.5** Crear schemas Zod para `StockMovimiento` en `backend/src/schemas/stock.schema.ts`
- [x] **1.3.6** Crear schemas Zod para `Usuario` (create + update) en `backend/src/schemas/usuario.schema.ts` — incluir validación de formato de email y longitud mínima de password
- [x] **1.3.7** Aplicar `validate(schema)` en `tickets.routes.ts` para POST y PUT
- [x] **1.3.8** Aplicar `validate(schema)` en `tareas.routes.ts` para POST y PUT
- [x] **1.3.9** Aplicar `validate(schema)` en `activos.routes.ts` para POST y PUT
- [x] **1.3.10** Aplicar `validate(schema)` en `componentes.routes.ts` para POST y PUT
- [x] **1.3.11** Aplicar `validate(schema)` en `stock.routes.ts` para POST de movimientos
- [x] **1.3.12** Aplicar `validate(schema)` en `admin.routes.ts` para POST y PUT de usuarios

### 1.4 Módulo "Roles" simulado en Admin.tsx
- [x] **1.4.1** Identificar el bloque "Roles" en `Admin.tsx` y evaluar si existe endpoint real o no
- [x] **1.4.2** Si no hay endpoint: convertir el panel a readonly con un aviso "Próximamente" o eliminarlo del menú lateral

### 1.5 Fuga de micrófono en MultimediaUpload.tsx
- [x] **1.5.1** Leer `MultimediaUpload.tsx` e identificar dónde se abre el stream de micrófono/cámara
- [x] **1.5.2** Agregar cleanup en el `useEffect` (o en el unmount) que llame `stream.getTracks().forEach(t => t.stop())`

---

## Fase 2 — 🟠 Altos (integridad de datos)

### 2.1 updateTicket sin whitelist de campos
- [x] **2.1.1** En `tickets.service.ts (updateTicketService)`: definir lista explícita de campos permitidos para actualizar (título, descripción, estado, prioridad, asignadoId) y desestructurar solo esos del body

### 2.2 Logs de auditoría con rol hardcodeado incorrecto
- [x] **2.2.1** En `tickets.service.ts`: reemplazar `'docente_empleado'` hardcodeado por `usuarioRol` dinámico en `addLogService` al crear ticket
- [x] **2.2.2** En `tickets.service.ts`: ídem para borrado de tickets
- [x] **2.2.3** En `tareas.service.ts`: verificar y corregir el rol en los logs de borrado
- [x] **2.2.4** En `activos.service.ts`: verificar y corregir el rol en los logs de borrado
- [x] **2.2.5** En `componentes.service.ts`: verificar y corregir el rol en los logs de borrado
- [x] **2.2.6** Auditar todos los demás servicios que llamen `addLogService` con rol hardcodeado

### 2.3 Bug authLoading en 4 páginas
- [x] **2.3.1** Corregir `Activos.tsx`: no redirigir hasta que `authLoading === false`
- [x] **2.3.2** Corregir `ActivoDetalle.tsx`: ídem
- [x] **2.3.3** Corregir `Tickets.tsx`: ídem
- [x] **2.3.4** Corregir `TicketDetalle.tsx`: ídem

### 2.4 Stock sin transacción en RegistrarIntervencion
- [x] **2.4.1** Mover la lógica de descuento de stock desde el frontend (`RegistrarIntervencion.tsx`) a un endpoint del backend
- [x] **2.4.2** En el service de backend: envolver la creación de intervención + descuento de stock en `prisma.$transaction([...])`
- [x] **2.4.3** En el frontend: simplificar `RegistrarIntervencion.tsx` para que solo llame al endpoint (sin loop de descuentos)

### 2.5 Catches vacíos en ActivoForm.tsx
- [x] **2.5.1** En `ActivoForm.tsx`: localizar los `catch { /* silencioso */ }` en la sincronización de placa de video y placa madre
- [x] **2.5.2** Reemplazar por `catch (err) { toast.error('No se pudo sincronizar el componente'); console.error(err); }`

### 2.6 http.ts sin manejo de errores de red
- [x] **2.6.1** En `http.ts`: envolver el `fetch` en try/catch y relanzar como error legible cuando `fetch` falla por conexión (`TypeError: Failed to fetch`)
- [x] **2.6.2** Mostrar un toast o mensaje consistente en toda la app cuando hay error de red

---

## Fase 3 — 🟡 Medios (deuda técnica)

### 3.1 addLogService faltante en catálogo
- [ ] **3.1.1** En `admin.service.ts (updateMarcaService)`: agregar `addLogService(...)` al final
- [ ] **3.1.2** En `admin.service.ts (updateProveedorService)`: ídem

### 3.2 stock.service lanza Error genérico
- [ ] **3.2.1** En `stock.service.ts (createStockMovimientoService)`: reemplazar `throw new Error(...)` por `throw new AppError(404, ...)`

### 3.3 Bug: ajuste de stock no aplica delta
- [ ] **3.3.1** En `stock.service.ts`: en el case `'ajuste'` de `createStockMovimientoService`, agregar `prisma.stockItem.update({ where: { id }, data: { cantidad: { increment/decrement } } })`
- [ ] **3.3.2** Verificar manualmente que un movimiento de ajuste cambia la cantidad visible en la UI

### 3.4 Botón "Limpiar Todo" de logs sin try/catch
- [ ] **3.4.1** En `Admin.tsx` (o donde esté el botón): envolver la llamada en try/catch con toast de error

### 3.5 Rutas frontend sin chequeo de permiso
- [ ] **3.5.1** Identificar las rutas de creación de tarea y componente en `routes.tsx`
- [ ] **3.5.2** Agregar `hasPermission(...)` o `ProtectedRoute` con rol requerido en esas rutas

### 3.6 Doble fetch en TicketDetalle.tsx
- [ ] **3.6.1** Leer `TicketDetalle.tsx` e identificar los dos useEffect/fetch que cargan el mismo recurso
- [ ] **3.6.2** Consolidar en un único fetch

---

## Fase 4 — ⚪ Bajos (limpieza)

### 4.1 Import implícito de crypto
- [ ] **4.1.1** En `auth.service.ts`: agregar `import crypto from 'node:crypto'` explícito al inicio del archivo

### 4.2 CORS sin fallback seguro
- [ ] **4.2.1** En la configuración de CORS (probablemente `app.ts` o middleware dedicado): si `FRONTEND_URL` no está seteada, usar `''` (bloquear todo) en vez de `'*'` o `undefined`

### 4.3 JWT en localStorage
- [ ] **4.3.1** Documentar el riesgo en un comentario en `AuthContext.tsx` (no hay acción inmediata posible sin cambiar toda la arquitectura de auth)

### 4.4 Debounce sin cleanup
- [ ] **4.4.1** Identificar el componente con debounce sin cleanup (probablemente un buscador)
- [ ] **4.4.2** Agregar `return () => clearTimeout(timer)` en el `useEffect`

### 4.5 normalize() inconsistente con tildes
- [ ] **4.5.1** Identificar el filtro afectado
- [ ] **4.5.2** Aplicar `.normalize('NFD').replace(/[̀-ͯ]/g, '')` tanto al valor del input como al campo comparado

---

## Verificación final

- [ ] **V.1** Probar flujo de comentarios de tickets con rol `docente_empleado` — no debe poder comentar en tickets ajenos
- [ ] **V.2** Probar borrado de adjunto con usuario que no es el dueño — debe recibir 403
- [ ] **V.3** Enviar body inválido a cada endpoint con Zod — debe recibir 400 con mensaje descriptivo
- [ ] **V.4** Verificar que un movimiento de stock tipo "ajuste" cambia la cantidad en pantalla
- [ ] **V.5** Navegar a Activos, ActivoDetalle, Tickets, TicketDetalle como usuario no autenticado — no debe redirigir antes de que auth cargue
- [ ] **V.6** Registrar una intervención con múltiples repuestos y verificar que todos se descontaron del stock correctamente
