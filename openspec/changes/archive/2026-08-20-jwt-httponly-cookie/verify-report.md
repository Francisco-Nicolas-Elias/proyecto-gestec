# Verify Report: JWT en cookie httpOnly

## Método

Verificación en dos capas: primero el flujo HTTP puro con `curl` y un cookie jar contra un usuario de prueba temporal (creado y eliminado vía Prisma), y después una verificación manual real en navegador hecha por el usuario (login, navegación, refresh, logout).

## Resultados — nivel HTTP (`curl`)

- **Login exitoso**: la respuesta trae `Set-Cookie: gestec_token=...; HttpOnly` y el body **no** incluye el token (`{"usuario": {...}}` solamente). ✅
- **`/auth/me` con cookie**: 200, autentica correctamente sin ningún header `Authorization`. ✅
- **`/auth/me` sin cookie**: 401. ✅
- **Logout**: responde con `Set-Cookie: gestec_token=; Expires=Thu, 01 Jan 1970...` (cookie invalidada). Una request posterior a `/auth/me` reusando la cookie vieja da 401. ✅
- **Login con password incorrecta**: 401 sin `Set-Cookie`, mismo mensaje "Email o contraseña incorrectos" de siempre (comportamiento del change de rate-limiting, sin cambios). ✅

## Bug encontrado y corregido durante la verificación manual

Al probar en navegador real, la página entró en un **loop infinito de recargas**. Causa: `AuthContext` ahora llama siempre a `GET /auth/me` al montar (antes se salteaba si no había token cacheado). La primera versión de `http.ts` solo excluía `/auth/login` del redirect automático en 401 — así que el 401 esperado de `/auth/me` (nadie logueado todavía) disparaba `window.location.href = '/login'`, lo que remonta toda la app, vuelve a llamar `/auth/me`, 401 de nuevo, redirect de nuevo, indefinidamente.

**Fix**: se agregó `/auth/me` a la misma excepción que `/auth/login` en `http.ts` — ambos 401 se tratan como resultado normal que maneja el propio caller, sin redirect ni recarga. `design.md` y `specs/auth/spec.md` de este change se actualizaron para reflejar la regla corregida (excluye ambos endpoints, no solo login).

## Resultados — verificación manual en navegador (usuario)

Confirmado directamente por el usuario: login, navegación entre todas las pestañas de la app, refrescar la página (sesión se mantiene), y logout — todo funcionando correctamente tras el fix. ✅

## Otras verificaciones

- `pnpm build` del frontend compila sin errores tras todos los cambios (los errores de `tsc --noEmit` presentes son preexistentes — resolución de `figma:asset` e `import.meta.env`, no relacionados a este change).
- `npx tsc --noEmit` del backend, sin errores.
- Grep confirma cero referencias a `gestec_token` en `frontend/src` (ya no vive en ningún JS del cliente).

## Limpieza

- Usuario de prueba `test.cookie.temp@ies21.edu.ar` eliminado de la base.
- Cookie jar temporal (`cookies.txt`) eliminado del scratchpad.
- Backend y frontend de verificación detenidos, puertos 3000 y 5173 liberados.
