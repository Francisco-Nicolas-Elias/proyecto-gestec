# Proposal: Migrar el JWT de localStorage a cookie httpOnly

## Intent

El token JWT de sesión hoy se guarda en `localStorage` y se manda a mano en el header `Authorization` de cada request (`frontend/src/app/services/http.ts`). Esto es un hallazgo de seguridad conocido desde una auditoría anterior (severidad baja, quedó documentado como comentario `RIESGO XSS` en `AuthContext.tsx:25-27`): cualquier script inyectado vía XSS puede leer `localStorage` y robar el token para reutilizarlo fuera del navegador de la víctima.

Con el sistema pasando a acceso público, se decidió cerrar esto: mover el JWT a una cookie `httpOnly`, que JavaScript no puede leer bajo ningún escenario de XSS.

## Scope

### In Scope
- Backend: el login setea el JWT en una cookie `httpOnly` (`secure` en producción, `sameSite: 'lax'`) en vez de devolverlo en el cuerpo de la respuesta.
- Backend: `authenticate` middleware lee el token de la cookie, no del header `Authorization`.
- Backend: nuevo endpoint `POST /api/auth/logout` que limpia la cookie server-side.
- Frontend: `http.ts` deja de leer/mandar el token a mano; todas las requests usan `credentials: 'include'`.
- Frontend: `apiClient.ts` (`login`/`logout`) dejan de gestionar `gestec_token` en `localStorage`.
- Frontend: `AuthContext.tsx` bootstrapea la sesión llamando siempre a `/auth/me` al montar (ya no depende de un token cacheado para decidir si intentarlo), y se quita el comentario `RIESGO XSS` ya resuelto.
- Frontend: la detección de "sesión expirada" en 401 (`http.ts`) pasa a basarse en si la request era a `/auth/login` (error esperado, no redirige) vs cualquier otro endpoint (sesión inválida/expirada, redirige) — reemplaza el chequeo actual basado en comparar el token cacheado en `localStorage`.

### Out of Scope
- CSRF tokens explícitos: no hacen falta porque `sameSite: 'lax'` ya bloquea el envío de la cookie en requests cross-site, y frontend + backend van a vivir bajo el mismo dominio en producción (Apache sirve ambos).
- Refresh tokens / rotación de tokens — no existe hoy, no se agrega en este change.
- Cambiar la duración de la sesión (`JWT_EXPIRES_IN` se mantiene igual).

## Approach

Reemplazar el transporte del JWT (header manual → cookie automática del browser) sin cambiar nada de cómo se genera o valida el JWT en sí (mismo `jwt.sign`/`jwt.verify`, mismo `JWT_SECRET`, mismo payload). El cambio es puramente de "dónde vive y cómo viaja el token", no de la lógica de autenticación.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/app.ts` | Modified | Agrega `cookie-parser` |
| `backend/src/controllers/auth.controller.ts` | Modified | `login` setea cookie; nuevo `logout` |
| `backend/src/routes/auth.routes.ts` | Modified | Nueva ruta `POST /logout` |
| `backend/src/middlewares/auth.middleware.ts` | Modified | Lee token de cookie |
| `frontend/src/app/services/http.ts` | Modified | `credentials: 'include'`, sin header manual, nueva lógica de 401 |
| `frontend/src/app/services/apiClient.ts` | Modified | `login`/`logout` sin `gestec_token` |
| `frontend/src/app/components/AuthContext.tsx` | Modified | Bootstrap siempre vía `/auth/me` |
| `openspec/specs/auth/spec.md` | Modified | Nuevo requirement de sesión vía cookie |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSRF en requests que mutan datos, ya que el browser manda la cookie automáticamente | Low | `sameSite: 'lax'` bloquea el envío de la cookie en la gran mayoría de escenarios cross-site (forms/fetch de otro origen); frontend y backend comparten dominio en producción, reduciendo aún más la superficie |
| Romper la sesión en desarrollo si `secure: true` se aplica también fuera de producción (los navegadores no mandan cookies `secure` por HTTP no-localhost) | Medium | `secure` se gatea explícitamente por `NODE_ENV === 'production'`; en dev (`http://localhost`) los navegadores sí permiten cookies no-secure sin problema |
| Bootstrap de sesión ahora siempre pega a `/auth/me` en cada carga de la app (antes se salteaba si no había token cacheado) | Low | Es un solo request liviano; es el patrón estándar para auth basada en cookies |
| Algún lugar del frontend que todavía dependa de `gestec_token` en `localStorage` quede roto | Low | Se verificó por grep que las únicas referencias están en `http.ts` y `apiClient.ts` |

## Rollback Plan

Revertir el commit del change. No hay migración de datos (no toca el schema de Prisma) — es un cambio de código puro en ambos lados. Si algo falla en producción, revertir deja el sistema exactamente como estaba (token en localStorage + header manual).

## Dependencies

- `cookie-parser` (nueva dependencia del backend).

## Success Criteria

- [ ] Tras un login exitoso, la respuesta no incluye el token en el body — llega como cookie `httpOnly` (verificable con las devtools del navegador, no con JS).
- [ ] Las requests autenticadas funcionan sin ningún header `Authorization` manual.
- [ ] `POST /auth/logout` limpia la cookie y una request posterior a un endpoint protegido responde 401.
- [ ] Refrescar la página mantiene la sesión iniciada (bootstrap vía `/auth/me` con la cookie).
- [ ] Un intento de login con credenciales incorrectas muestra el error normal en el formulario, sin redirigir a `/login` (ya está ahí).
- [ ] Los 3 roles (administrador, operaciones, docente_empleado) pueden loguearse, navegar y desloguearse sin errores.
