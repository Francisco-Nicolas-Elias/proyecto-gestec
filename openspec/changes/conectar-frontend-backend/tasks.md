# Tasks: Conectar frontend al backend

## Estado general: 🔴 Pendiente

---

## Fase 1 — Backend: verificación y ajustes

- [ ] **1.1** Instalar dependencias del backend (`cd backend && pnpm install`)
- [ ] **1.2** Configurar `backend/.env` con `DATABASE_URL` y `DIRECT_URL` de Supabase
- [ ] **1.3** Ejecutar primera migración: `pnpm prisma migrate dev --name init`
- [ ] **1.4** Ejecutar seed: `pnpm db:seed` — verificar que crea usuarios, activos y tickets
- [ ] **1.5** Levantar el backend: `pnpm dev` — confirmar `GET /health` responde `{ status: "ok" }`
- [ ] **1.6** Probar login manual: `POST /api/auth/login` con `admin@institucion.edu / Admin123!` → recibir JWT

---

## Fase 2 — Frontend: cliente HTTP y auth

- [ ] **2.1** Crear `src/app/services/http.ts` — cliente fetch centralizado con JWT automático y manejo de 401
- [ ] **2.2** Agregar `VITE_API_URL=http://localhost:3000/api` y `VITE_USE_MOCK=false` al `.env` del frontend
- [ ] **2.3** Actualizar `vite.config.ts` para exponer las variables de entorno al cliente
- [ ] **2.4** Reemplazar login mock en `AuthContext.tsx` → llamar `POST /api/auth/login`, guardar JWT en localStorage
- [ ] **2.5** Reemplazar `getCurrentUser()` en `AuthContext.tsx` → llamar `GET /api/auth/me` con el token guardado
- [ ] **2.6** Actualizar `ProtectedRoute.tsx` para redirigir al login si no hay token válido

---

## Fase 3 — Frontend: reemplazar apiClient módulo por módulo

- [ ] **3.1** Reemplazar funciones de **Activos**: `getActivos`, `getActivoById`, `createActivo`, `updateActivo`, `deleteActivo`
- [ ] **3.2** Reemplazar funciones de **Intervenciones y Mantenimiento**: `getIntervenciones`, `createIntervencion`, `addMantenimientoRecord`
- [ ] **3.3** Reemplazar funciones de **Componentes**: `getComponentes`, `createComponente`, `updateComponente`, `deleteComponente`, `buscarComponentePorSerie`, `getHistorialComponente`
- [ ] **3.4** Reemplazar funciones de **Tickets**: `getTickets`, `getTicketById`, `createTicket`, `updateTicket`, `updateTicketStatus`, `addComentario`, `deleteTicket`
- [ ] **3.5** Reemplazar funciones de **Tareas**: `getTareas`, `createTarea`, `updateTaskStatus`, `updateTarea`, `deleteTarea`, `addComentarioTarea`, `updateComentarioTarea`, `deleteComentarioTarea`
- [ ] **3.6** Reemplazar funciones de **Stock**: `getStock`, `getStockMovimientos`, `createStockMovimiento`
- [ ] **3.7** Reemplazar funciones de **Catálogo Admin**: `getUbicacionesStruct`, `getTiposComponente`, `getMarcas`, `getProveedores` y sus CRUD
- [ ] **3.8** Reemplazar funciones de **Usuarios Admin**: `getUsuarios`, `createUsuario`, `updateUsuario`
- [ ] **3.9** Reemplazar `logsService.ts` → usar `GET /api/admin/logs` y `DELETE /api/admin/logs`
- [ ] **3.10** Reemplazar **Info Operaciones**: `getInfoOperaciones`, `updateInfoOperaciones`

---

## Fase 4 — Integración y verificación

- [ ] **4.1** Login con cada uno de los 3 roles — verificar que el menú filtra correctamente
- [ ] **4.2** CRUD completo de activos — verificar persistencia con Prisma Studio
- [ ] **4.3** Crear ticket como docente → cambiar estado como operador → verificar flujo completo
- [ ] **4.4** Mover tarjetas en el kanban de tareas — verificar estado actualizado en DB
- [ ] **4.5** Verificar que los logs del sistema se registran en la DB y se ven en Admin → Logs
- [ ] **4.6** Probar con `VITE_USE_MOCK=true` que el fallback mock sigue funcionando

---

## Fase 5 — Cleanup y archivo

- [ ] **5.1** Eliminar arrays mock de `apiClient.ts` (solo conservar las interfaces TypeScript)
- [ ] **5.2** Actualizar `CLAUDE.md` con los comandos de arranque del backend
- [ ] **5.3** Ejecutar `/sdd-verify` para confirmar que todo lo implementado coincide con la propuesta
- [ ] **5.4** Ejecutar `/sdd-archive` para mover este change a `archive/`
