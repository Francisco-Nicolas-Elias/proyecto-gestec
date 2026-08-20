# Tasks: JWT en cookie httpOnly

## Fase 1: Backend

- [x] 1.1 Instalar `cookie-parser` (+ `@types/cookie-parser`) y agregarlo en `app.ts`
- [x] 1.2 `auth.controller.ts`: `login` setea cookie httpOnly, response ya no incluye `token` en el body
- [x] 1.3 `auth.controller.ts`: nuevo `logout` que limpia la cookie
- [x] 1.4 `auth.routes.ts`: agregar `POST /logout`
- [x] 1.5 `auth.middleware.ts`: leer token de `req.cookies` en vez de header `Authorization`

## Fase 2: Frontend

- [x] 2.1 `http.ts`: `credentials: 'include'` en `request` y `uploadFile`, sacar lectura/envío manual del token
- [x] 2.2 `http.ts`: nueva lógica de 401 (login no redirige, resto sí)
- [x] 2.3 `apiClient.ts`: `login`/`logout` sin `gestec_token`, `logout` llama a `POST /auth/logout`
- [x] 2.4 `AuthContext.tsx`: bootstrap siempre vía `/auth/me`, quitar comentario `RIESGO XSS` y referencias a `gestec_token`

## Fase 3: Verificación

- [x] 3.1 Verificar con `curl` (cookie jar) el flujo completo: login → `Set-Cookie` sin token en body → `/auth/me` con cookie → logout → `/auth/me` post-logout da 401
- [x] 3.2 Verificar en navegador real: login, navegación entre pestañas, refrescar página mantiene sesión, logout
- [x] 3.3 Verificar que un login con credenciales incorrectas muestra el error en el formulario sin redirigir
- [x] 3.4 Confirmar por grep que no queda ninguna referencia a `gestec_token` en el frontend
- [x] 3.5 Actualizar `verify-report.md`

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/auth/spec.md` de este change en `openspec/specs/auth/spec.md`
- [x] 4.2 Mover el change a `openspec/changes/archive/`
