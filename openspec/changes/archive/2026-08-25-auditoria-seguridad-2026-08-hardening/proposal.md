# Proposal: Hardening de auth y validación de catálogo (auditoría agosto 2026)

## Intent

La auditoría de seguridad de agosto 2026 (`openspec/changes/auditoria-seguridad-2026-08/exploration.md`) encontró que, tras la decisión de acceso público a internet, cuatro endpoints de `auth.routes.ts` quedaron sin rate limiting (solo `/login` lo tiene, agregado en el change de la semana pasada) y que los 5 recursos de catálogo de Admin son los únicos endpoints mutadores del sistema sin validación Zod. Ambos son huecos de hardening que quedaron abiertos por ser incrementales a trabajo previo, no vulnerabilidades explotadas activamente.

## Scope

### In Scope
- Rate limiting en `POST /registro`, `POST /recuperar-password`, `POST /reset-password`, `GET /verificar/:token`.
- Schemas Zod + middleware `validate()` en los 5 recursos de catálogo de Admin: `ubicaciones`, `tipos-componente`, `marcas`, `proveedores`, `areas`.

### Out of Scope
- Enumeración de usuarios en `/registro` (hallazgo #2 de la auditoría) — decisión explícita del usuario de mantener el mensaje "el email ya está registrado", aceptando ese riesgo.
- Actualización de dependencias vulnerables (`react-router`, `multer`, `nodemailer`, `jspdf`) — change hermano `auditoria-seguridad-2026-08-dependencias`.

## Approach

Reusar los patrones ya existentes en el proyecto en vez de introducir nuevos:
- Un nuevo limiter en `backend/src/middlewares/rateLimit.middleware.ts` (ej. `authActionsRateLimiter`, `windowMs: 15min, max: 10`, sin `skipSuccessfulRequests` porque no aplica al mismo patrón que login), aplicado a los 4 endpoints en `auth.routes.ts`. `max: 10` en vez de un valor más bajo para no bloquear registros legítimos desde la IP compartida (NAT) de la institución.
- Schemas Zod nuevos para los 5 recursos de catálogo, siguiendo el estilo de los schemas existentes del proyecto (mismo directorio/convención que ya usa `usuario.schema.ts` u otro schema similar), aplicados con el middleware `validate(schema)` ya existente.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `backend/src/middlewares/rateLimit.middleware.ts` | Modified | Nuevo limiter `authActionsRateLimiter` |
| `backend/src/routes/auth.routes.ts` | Modified | Aplicar el nuevo limiter a 4 endpoints |
| `backend/src/schemas/` | New | 5 schemas Zod nuevos para catálogo de Admin |
| `backend/src/routes/admin.routes.ts` | Modified | Aplicar `validate()` en POST/PUT de los 5 recursos |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rate limit bloquea registros/recuperaciones legítimas desde la IP compartida de la institución | Medium | `max: 10` en vez de un valor bajo tipo el de login (`20` en 10min ya probó no molestar el uso normal) |
| Zod en catálogo rechaza payloads que el frontend actual envía con campos extra o distinto formato | Low | Revisar el payload real que manda cada formulario de Admin antes de fijar el schema; probar los 5 CRUDs manualmente tras implementar |

## Rollback Plan

Cada cambio es aislado por archivo (un middleware nuevo + su aplicación puntual en rutas). Revertir es un `git revert` del commit del change, o comentar la línea del limiter/`validate()` en la ruta afectada sin tocar el resto del sistema.

## Dependencies

Ninguna — no requiere paquetes nuevos (`express-rate-limit` y `zod` ya están instalados).

## Success Criteria

- [ ] Los 4 endpoints de auth devuelven 429 tras superar el límite configurado, sin afectar el flujo normal de un solo intento.
- [ ] Los 5 recursos de catálogo de Admin devuelven 400 con mensaje descriptivo ante un payload inválido, en vez de 500.
- [ ] Los 5 CRUDs de catálogo siguen funcionando normalmente desde el frontend con datos válidos.
