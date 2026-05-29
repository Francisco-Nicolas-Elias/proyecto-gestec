# Proposal: Conectar frontend al backend real

## Intent

El frontend actualmente usa datos mock en `apiClient.ts` (arrays en memoria + localStorage).
El backend Express ya está scaffoldeado y expone todos los endpoints REST.
Este cambio reemplaza las funciones mock por llamadas `fetch` reales al backend, haciendo la app funcional de extremo a extremo.

## Scope

### In Scope
- Reemplazar todas las funciones de `apiClient.ts` con fetch al backend (`http://localhost:3000/api`)
- Implementar gestión de JWT en el frontend (guardar token, enviarlo en headers, manejar 401)
- Adaptar `AuthContext.tsx` para usar el endpoint `POST /api/auth/login` y `GET /api/auth/me`
- Adaptar `logsService.ts` para usar `GET /api/admin/logs` y `DELETE /api/admin/logs`
- Mantener el mock como fallback de desarrollo (variable de entorno `VITE_USE_MOCK=true`)

### Out of Scope
- Subida real de archivos a Supabase Storage (adjuntos siguen siendo UI-only por ahora)
- Implementar refresh tokens
- Deploy a producción

## Approach

Crear un cliente HTTP centralizado (`src/app/services/http.ts`) que:
1. Lee `VITE_API_URL` del entorno (default: `http://localhost:3000/api`)
2. Adjunta el JWT automáticamente en cada request
3. Intercepta 401 y redirige al login

Luego reemplazar función por función en `apiClient.ts`, manteniendo las mismas firmas TypeScript para no romper ningún componente del frontend.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/services/apiClient.ts` | Modified | Reemplazar mock por fetch — mantener firmas idénticas |
| `src/app/services/http.ts` | New | Cliente HTTP con JWT y manejo de errores centralizado |
| `src/app/services/logsService.ts` | Modified | Usar API en lugar de localStorage |
| `src/app/components/AuthContext.tsx` | Modified | Login real con JWT, persistir token en localStorage |
| `src/app/pages/Login.tsx` | Modified | Conectar formulario al endpoint real |
| `.env` / `vite.config.ts` | Modified | Agregar VITE_API_URL |
| `backend/src/` | Already done | Backend scaffoldeado — no cambios esperados |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CORS mal configurado | Media | Backend ya tiene cors() con FRONTEND_URL — verificar que coincida |
| Diferencia entre tipos mock y respuesta real de Prisma | Media | Revisar cada endpoint y ajustar el tipado del frontend |
| Backend no levanta antes de hacer pruebas | Baja | Mantener VITE_USE_MOCK=true como fallback |

## Rollback Plan

Si algo sale mal: setear `VITE_USE_MOCK=true` en `.env` del frontend. El código mock en `apiClient.ts` se preserva comentado hasta que el cambio sea archivado y verificado.

## Dependencies

- Backend corriendo (`cd backend && pnpm dev`)
- `.env` del backend con `DATABASE_URL` válida (Supabase)
- Seed ejecutado (`pnpm db:seed`)

## Success Criteria

- [ ] Login con credenciales reales (admin@institucion.edu / Admin123!) genera JWT y carga el dashboard
- [ ] Los 3 roles ven el contenido correcto según sus permisos
- [ ] CRUD de activos persiste en la base de datos (verificar con Prisma Studio)
- [ ] Crear un ticket como docente y verlo resuelto por operaciones
- [ ] El kanban de tareas carga y permite mover tarjetas
