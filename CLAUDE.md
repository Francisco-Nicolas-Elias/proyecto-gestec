# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estructura del monorepo

```
proyecto-gestec/
├── frontend/          ← React 18 + Vite + TypeScript (Figma Make)
├── backend/           ← Node.js + Express + TypeScript (API REST)
├── openspec/          ← Spec-Driven Development (SDD)
├── CLAUDE.md
└── pnpm-workspace.yaml
```

## Comandos

### Frontend (`cd frontend`)
```bash
pnpm dev          # servidor de desarrollo Vite (http://localhost:5173)
pnpm build        # build de producción
```

### Backend (`cd backend`)
```bash
pnpm dev                        # servidor Express con hot-reload (http://localhost:3000)
pnpm build                      # compilar TypeScript a dist/
pnpm db:migrate                 # crear y aplicar nueva migración
pnpm db:deploy                  # aplicar migraciones en producción
pnpm db:seed                    # cargar datos iniciales
pnpm db:studio                  # GUI visual de la base de datos (Prisma Studio)
```

No hay linter ni test suite configurados.

---

## Frontend

**GESTEC** es una SPA React 18 + Vite + TypeScript para gestión de recursos IT en una institución educativa.

### Entry point & routing

`frontend/src/main.tsx` → `frontend/src/app/App.tsx` → `frontend/src/app/routes.tsx`

`routes.tsx` define un `createBrowserRouter` con dos capas:
1. `Root` — monta `ThemeProvider` → `AuthProvider` → `<Outlet />` (providers dentro del router para que HMR no rompa contexto)
2. `ProtectedMainLayout` — envuelve todas las rutas autenticadas en `ProtectedRoute` + `MainLayout`

Rutas públicas: `/login`, `/recuperar-password`. Todo lo demás requiere autenticación.

### Services (`frontend/src/app/services/`)

| Archivo | Propósito |
|---------|-----------|
| `apiClient.ts` | Acceso a datos — conectado al backend real vía `http.ts`. Contiene mappers (backend → frontend), write helpers, interfaces TypeScript y todas las funciones exportadas. |
| `http.ts` | Cliente fetch centralizado con JWT automático e intercepción de 401. |
| `logsService.ts` | Log de auditoría — usa `GET/DELETE /api/admin/logs`. |
| `useFormPersistence.ts` | Hook que persiste borradores de formulario en sessionStorage. Devuelve `[state, setState, clearPersistence]`. |

### Auth & permisos

`AuthContext.tsx` expone `useAuth()`:
- `usuario: Usuario | null` — cargado desde localStorage al montar
- `hasPermission(module: string): boolean` — RBAC por rol (`administrador | operaciones | docente_empleado`)

Mapa de permisos en `AuthContext.tsx:hasPermission`. Menú filtrado por permiso en `MainLayout.tsx`.

### UI layer

- **shadcn/ui** en `frontend/src/app/components/ui/` (Radix UI + Tailwind CSS v4)
- **Dark mode**: `ThemeContext` agrega/quita clase `dark` en `<html>`. Usar `dark:` variants de Tailwind.
- **Toasts**: `import { toast } from 'sonner@2.0.3'` — la versión en el path es convención de Figma Make, **no cambiar**.
- **Assets**: importar con `figma:asset/<filename>` (resuelto por plugin Vite a `src/assets/`)
- **Path alias**: `@` → `frontend/src/`

### Variables de entorno del frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK=false   # true = usar mock de apiClient.ts sin backend
```

### Módulos de dominio

| Ruta | Página | Notas |
|------|--------|-------|
| `/activos` | `Activos.tsx`, `ActivoDetalle.tsx`, `ActivoForm.tsx` | CRUD de equipos con trazabilidad de componentes |
| `/tickets` | `Tickets.tsx`, `TicketDetalle.tsx`, `CrearReporte.tsx` | `docente_empleado` solo puede crear |
| `/stock` | `Stock.tsx` | Inventario de componentes serializados con trazabilidad de ubicación |
| `/tareas` | `Tareas.tsx` | Kanban con react-dnd |
| `/admin` | `Admin.tsx` | Usuarios, ubicaciones, catálogo, logs |

---

## Backend

API REST en Node.js + Express + TypeScript con arquitectura MVC estricta.

### Estructura (`backend/src/`)

```
routes/       ← definen endpoints y aplican middlewares
controllers/  ← try/catch + llaman al service + next(err)
services/     ← toda la lógica de negocio con Prisma
middlewares/  ← auth (JWT), roles (RBAC), error (global), validate (Zod)
lib/prisma.ts ← singleton PrismaClient
types/        ← augmentación de Express.Request con req.user
```

### Middlewares

- `authenticate` — verifica JWT del header `Authorization: Bearer <token>`
- `requireRoles(...roles)` / `isAdmin` / `isOperaciones` / `isAnyUser` — RBAC
- `errorHandler` — captura `AppError`, `ZodError`, errores Prisma y errores genéricos
- `validate(schema)` — valida `req.body` con Zod, lanza si falla

### Endpoints disponibles

| Recurso | Rutas |
|---------|-------|
| Auth | `POST /api/auth/login` · `GET /api/auth/me` |
| Activos | `GET/POST /api/activos` · `GET/PUT/DELETE /api/activos/:id` (el `PUT` acepta `cambios` opcional — genera historial automático) |
| Componentes | `GET/POST /api/componentes` · `GET/PUT/DELETE /api/componentes/:id` · `GET /api/componentes/serie/:serie` · `GET /api/componentes/:id/historial` |
| Tickets | `GET/POST /api/tickets` · `GET/PUT/DELETE /api/tickets/:id` · `POST /api/tickets/:id/comentarios` |
| Tareas | `GET/POST /api/tareas` · `GET/PUT/DELETE /api/tareas/:id` · `PATCH /api/tareas/:id/estado` · CRUD de comentarios |
| Stock | `GET /api/stock/componentes` · `GET /api/stock/items` |
| Admin | CRUD de usuarios, ubicaciones, tipos-componente, marcas, proveedores · `GET/DELETE /api/admin/logs` |
| Info | `GET/PUT /api/info` |

### Variables de entorno del backend (`backend/.env`)

```env
DATABASE_URL="postgresql://..."   # Supabase — Transaction mode (puerto 6543)
DIRECT_URL="postgresql://..."     # Supabase — Direct (puerto 5432, para migraciones)
JWT_SECRET="secreto_largo"
JWT_EXPIRES_IN="8h"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
SMTP_HOST=smtp.gmail.com             # Gmail/Google Workspace institucional (@ies21.edu.ar)
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@ies21.edu.ar
```

---

## Base de datos (Prisma + Supabase PostgreSQL)

Schema: `backend/prisma/schema.prisma`

> **Nota sobre migraciones**: la BD tiene columnas (`detalle` en logs, `nro` en tickets) agregadas via `db push` sin registro en el historial de migraciones. Usar `pnpm db:push` para aplicar cambios de schema en desarrollo en lugar de `pnpm db:migrate`, para evitar errores de drift.

### Modelo de datos

| Modelo | Descripción |
|--------|-------------|
| `Usuario` | Roles: `administrador`, `operaciones`, `docente_empleado`. Campo `password` hasheado con bcrypt. |
| `Ubicacion` | Sector + piso físico. Fuente dinámica para formularios. |
| `Activo` | Equipo de IT. FK a `Ubicacion`. |
| `Componente` | Hardware serializado. `activoId = null` → en Depósito IT. |
| `HistorialMovimientoComponente` | Trazabilidad de movimientos de cada componente. |
| `HistorialEquipo` | Historial automático del equipo — se genera al editar (diff de campos) desde `PUT /api/activos/:id` (no hay flujo separado de "Intervención"/"Mantenimiento"). |
| `TipoComponente` · `Marca` · `Proveedor` | Catálogo editable desde Admin. |
| `Ticket` + `ComentarioTicket` | Tickets de soporte. `docente_empleado` solo ve los propios. |
| `Tarea` + `TareaAsignado` + `TareaHistorial` + `ComentarioTarea` | Kanban del equipo IT. |
| `StockItem` + `StockMovimiento` | Modelo legado para consumibles sin número de serie — sin flujo de aplicación activo (0 registros, ninguna pantalla los crea). El stock real se gestiona 100% vía `Componente`. |
| `Adjunto` | Multimedia. 4 FKs nullable (ticket, comentarioTicket, tarea, comentarioTarea). |
| `InfoOperaciones` | Singleton con `id = "config"`. Siempre usar upsert. |
| `LogEntry` | Auditoría. `usuarioNombre` y `usuarioRol` desnormalizados. |

### Convenciones

- `Componente.activoId = null` → en depósito; `≠ null` → instalado en un activo.
- Componentes de tipos sin sección propia en Equipos (teclado, mouse, auricular, etc. — ver `TIPOS_GESTIONADOS_DESDE_EQUIPO` en `apiClient.ts`) se vinculan/desvinculan desde Stock → Editar Componente, no desde Equipos.
- Editar un equipo (`updateActivoService`) usa `prisma.$transaction` para actualizar el activo y crear su `HistorialEquipo` de forma atómica.
- `addLogService()` en todo service que mute datos.
- `AppError(statusCode, message)` para errores de negocio controlados.

---

## Spec-Driven Development (SDD)

Usar el flujo SDD para cualquier feature, refactor o integración no trivial. Artefactos en `openspec/`.

### Ciclo de un change

```
/sdd-explore   → investigar idea o codebase
/sdd-propose   → definir intent, scope, riesgos, rollback (→ proposal.md)
/sdd-spec      → escribir specs Given/When/Then (→ specs/)
/sdd-design    → diseño técnico: endpoints, flujo, decisiones (→ design.md)
/sdd-tasks     → lista de tareas por fases (→ tasks.md)
/sdd-apply     → implementar siguiendo specs y design
/sdd-verify    → comparar implementación contra specs (→ verify-report.md)
/sdd-archive   → mergear specs y mover change a archive/
```

### Change activo

`openspec/changes/conectar-frontend-backend/` — reemplazar mock por fetch real al backend.
Ver `tasks.md` para el estado de cada tarea.

### Reglas clave

- Nunca saltear verify antes de archivar.
- `openspec/specs/` es la fuente de verdad — los delta specs no son autoritativos hasta archivarse.
- Todo proposal debe tener rollback plan.
- Todo service que mute datos debe llamar `addLogService()`.
