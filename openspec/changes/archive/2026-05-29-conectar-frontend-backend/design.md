# Design: Conectar frontend al backend

## Arquitectura de la integración

```
Frontend (React)                    Backend (Express)
─────────────────                   ──────────────────
src/app/services/
  http.ts          ──── fetch ────▶  /api/*
  apiClient.ts     (wrap http.ts)
  logsService.ts   (wrap http.ts)

AuthContext.tsx
  login()          ──── POST ─────▶  /api/auth/login  → { token, usuario }
  me()             ──── GET  ─────▶  /api/auth/me     → Usuario
```

## Cliente HTTP centralizado (`http.ts`)

```typescript
// Lee VITE_API_URL del entorno (ej: http://localhost:3000/api)
// Para cada request:
//   1. Lee el token de localStorage ('gestec_token')
//   2. Agrega Authorization: Bearer <token>
//   3. Si respuesta es 401 → limpia token + redirige a /login
//   4. Si respuesta no es ok → lanza error con el mensaje del body

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T>
async function get<T>(path: string): Promise<T>
async function post<T>(path: string, body: unknown): Promise<T>
async function put<T>(path: string, body: unknown): Promise<T>
async function patch<T>(path: string, body: unknown): Promise<T>
async function del(path: string): Promise<void>
```

## Flujo de Auth

```
1. Usuario ingresa email + password en Login.tsx
2. Login.tsx llama loginService(email, password) de apiClient.ts
3. apiClient.ts llama POST /api/auth/login via http.ts
4. Backend valida credenciales → devuelve { token, usuario }
5. Frontend guarda token en localStorage('gestec_token')
6. Frontend guarda usuario en localStorage('usuario') — misma key que el mock
7. AuthContext carga el usuario desde GET /api/auth/me al montar
8. Cualquier request posterior lleva Authorization: Bearer <token>
9. Si el token expira → 401 → redirect a /login
```

## Fallback mock (`VITE_USE_MOCK`)

```typescript
// En cada función de apiClient.ts:
if (import.meta.env.VITE_USE_MOCK === 'true') {
  return mockImplementation(); // código mock actual
}
return http.get('/activos');   // implementación real
```

## Variables de entorno del frontend

```env
# .env (frontend)
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=false
```

## Mapeo de endpoints

| Función apiClient.ts | Método | Endpoint backend |
|---------------------|--------|-----------------|
| login() | POST | /api/auth/login |
| getCurrentUser() | GET | /api/auth/me |
| getActivos() | GET | /api/activos |
| getActivoById(id) | GET | /api/activos/:id |
| createActivo() | POST | /api/activos |
| updateActivo() | PUT | /api/activos/:id |
| deleteActivo() | DELETE | /api/activos/:id |
| getIntervenciones(activoId) | GET | /api/activos/:id/intervenciones |
| createIntervencion() | POST | /api/activos/:id/intervenciones |
| addMantenimientoRecord() | POST | /api/activos/:id/mantenimiento |
| getComponentes() | GET | /api/componentes |
| createComponente() | POST | /api/componentes |
| updateComponente() | PUT | /api/componentes/:id |
| deleteComponente() | DELETE | /api/componentes/:id |
| buscarComponentePorSerie() | GET | /api/componentes/serie/:serie |
| getHistorialComponente() | GET | /api/componentes/:id/historial |
| getTickets() | GET | /api/tickets |
| getTicketById() | GET | /api/tickets/:id |
| createTicket() | POST | /api/tickets |
| updateTicket() | PUT | /api/tickets/:id |
| addComentario() | POST | /api/tickets/:id/comentarios |
| deleteTicket() | DELETE | /api/tickets/:id |
| getTareas() | GET | /api/tareas |
| createTarea() | POST | /api/tareas |
| updateTaskStatus() | PATCH | /api/tareas/:id/estado |
| updateTarea() | PUT | /api/tareas/:id |
| deleteTarea() | DELETE | /api/tareas/:id |
| addComentarioTarea() | POST | /api/tareas/:id/comentarios |
| getStock() | GET | /api/stock/componentes |
| createStockMovimiento() | POST | /api/stock/movimientos |
| getStockMovimientos() | GET | /api/stock/movimientos |
| getUsuarios() | GET | /api/admin/usuarios |
| createUsuario() | POST | /api/admin/usuarios |
| updateUsuario() | PUT | /api/admin/usuarios/:id |
| getUbicacionesStruct() | GET | /api/admin/ubicaciones |
| createUbicacionEntry() | POST | /api/admin/ubicaciones |
| getTiposComponente() | GET | /api/admin/tipos-componente |
| getMarcas() | GET | /api/admin/marcas |
| getProveedores() | GET | /api/admin/proveedores |
| getLogs() | GET | /api/admin/logs |
| clearLogs() | DELETE | /api/admin/logs |
| getInfoOperaciones() | GET | /api/info |
| updateInfoOperaciones() | PUT | /api/info |
