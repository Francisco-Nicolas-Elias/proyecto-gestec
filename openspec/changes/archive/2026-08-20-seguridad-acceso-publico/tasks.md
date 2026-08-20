# Tasks: Rate limiting y no-enumeración en login

## Fase 1: Backend

- [x] 1.1 Instalar `express-rate-limit` (`pnpm add express-rate-limit` en `backend/`)
- [x] 1.2 Crear `backend/src/middlewares/rateLimit.middleware.ts` con `loginRateLimiter` (windowMs 10min, max 20, skipSuccessfulRequests, mensaje custom)
- [x] 1.3 Aplicar `loginRateLimiter` en `backend/src/routes/auth.routes.ts` en `POST /login`, antes de `validate(loginSchema)`
- [x] 1.4 Reescribir `loginService` en `backend/src/services/auth.service.ts`: unificar mensaje 401 a "Email o contraseña incorrectos" para email inexistente y password incorrecta; mover el chequeo de `bloqueado` después de validar password; mantener intacto el conteo/bloqueo a los 10 intentos

## Fase 2: Frontend

- [x] 2.1 Revisar `frontend/src/app/pages/Login.tsx` — confirmado: el mensaje unificado contiene la palabra "email" por lo que cae consistentemente en la rama que resalta ese campo, sin necesidad de cambios de código

## Fase 3: Verificación

- [x] 3.1 Con el backend corriendo, crear un usuario de prueba temporal vía Prisma y probar: login con email inexistente, login con password incorrecta para ese usuario — confirmar mismo status/mensaje en ambos
- [x] 3.2 Probar que tras 10 fallos consecutivos la cuenta de prueba se bloquea igual que antes (403 "cuenta bloqueada")
- [x] 3.3 Probar el rate limit: automatizar ~21 requests fallidas seguidas a `/api/auth/login` desde curl/script y confirmar que la request 21 devuelve 429
- [x] 3.4 Confirmar que un login exitoso intercalado no rompe/cuenta para el límite (skipSuccessfulRequests)
- [x] 3.5 Limpiar el usuario de prueba y cualquier dato temporal creado
- [x] 3.6 Actualizar `verify-report.md` con resultados, incluyendo cualquier caveat

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/seguridad/spec.md` de este change en `openspec/specs/seguridad/spec.md`
- [x] 4.2 Mover el change a `openspec/changes/archive/`
