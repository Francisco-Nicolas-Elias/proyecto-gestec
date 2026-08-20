# Proposal: Rate limiting y no-enumeración en login por acceso público

## Intent

El sistema GESTEC pasó de un despliegue asumido LAN-only a acceso público desde internet (decisión del equipo: docentes y operadores deben poder acceder desde su casa o datos móviles). Esto reabre dos riesgos de seguridad que habían sido deprioritizados bajo la premisa de "solo red interna":

1. `POST /api/auth/login` no tiene ningún límite de tasa por IP/general — con acceso público, un atacante puede intentar fuerza bruta distribuida sin más freno que el bloqueo por cuenta (10 intentos fallidos).
2. El mensaje de error de login distingue "el correo no está registrado" (401, cuenta inexistente) de "la contraseña es incorrecta" (401, cuenta existente) y además revela cuántos intentos quedan antes del bloqueo — permitiendo enumerar qué emails existen en el sistema.

## Scope

### In Scope
- Rate limiting por IP en `POST /api/auth/login`: límite generoso (20 intentos fallidos cada 10 minutos por IP), sin contar los intentos exitosos (`skipSuccessfulRequests`), como defensa en profundidad adicional al bloqueo por cuenta ya existente.
- Unificar el mensaje de error de login a uno genérico ("Email o contraseña incorrectos") tanto para email inexistente como para contraseña incorrecta, y eliminar el aviso de "intentos restantes" (que solo se mostraba cuando el email existía).
- Mantener el mensaje distinto de "cuenta bloqueada" (403) — ocurre después de que el usuario ya se autenticó exitosamente antes, no es información nueva para un atacante externo intentando credenciales al azar.
- Requerir HTTPS en el deploy de producción (documentar como bloqueante en el checklist de deploy, no implementar infraestructura en este change).

### Out of Scope
- Implementación del VirtualHost/SSL en el servidor IES21 (queda en el change de deploy, separado).
- CAPTCHA u otros mecanismos anti-bot adicionales.
- Rate limiting en otros endpoints (recuperar-password ya usa mensaje no-enumerable; no se toca).
- 2FA / MFA.

## Approach

- Agregar `express-rate-limit` como dependencia del backend.
- Middleware de rate limit aplicado solo a la ruta `POST /api/auth/login`, configurado con `windowMs: 10 * 60 * 1000`, `max: 20`, `skipSuccessfulRequests: true`, keyed por IP (default del paquete).
- Modificar `loginService` en `backend/src/services/auth.service.ts`: eliminar la rama de "intentos restantes" y el mensaje distinto para email inexistente; unificar en un solo `AppError(401, 'Email o contraseña incorrectos')` para ambos casos (usuario no encontrado, password inválida). El conteo de `intentosFallidos` y el bloqueo automático a los 10 intentos se mantienen sin cambios funcionales, solo cambia el mensaje que ve el cliente.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | Agrega `express-rate-limit` |
| `backend/src/middlewares/rateLimit.middleware.ts` | New | Limiter configurado para login |
| `backend/src/routes/auth.routes.ts` | Modified | Aplica el limiter a `POST /login` |
| `backend/src/services/auth.service.ts` | Modified | Mensajes de error unificados en `loginService` |
| `openspec/specs/seguridad/spec.md` | Modified | Nuevos requirements de rate limiting y no-enumeración |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Falsos positivos por NAT institucional bloqueando usuarios legítimos | Low | Límite generoso (20/10min) y `skipSuccessfulRequests` — solo afecta ráfagas de fallos, no uso normal mixto |
| Perder la UX de "último intento" reduce la ayuda al usuario que se equivoca de contraseña | Low | Decisión explícita del usuario (prioriza cerrar la enumeración) — el bloqueo de cuenta sigue funcionando igual, solo cambia el mensaje |

## Rollback Plan

Revertir el commit del change. El middleware de rate limit es aditivo (una ruta nueva de restricción) y se puede remover quitando la línea que lo aplica en `auth.routes.ts` sin afectar nada más. El cambio de mensajes en `loginService` es una reversión directa del `if/else` a su forma anterior.

## Dependencies

- `express-rate-limit` (nuevo paquete npm).

## Success Criteria

- [ ] Tras 20 intentos fallidos de login desde la misma IP en 10 minutos, la request 21 responde 429 antes de llegar a `loginService`.
- [ ] Un login exitoso no cuenta para el límite de la IP.
- [ ] Intentar login con un email inexistente y con una password incorrecta para un email existente devuelven exactamente el mismo mensaje y status code (401).
- [ ] El bloqueo automático por 10 intentos fallidos en la misma cuenta sigue funcionando igual que antes.
