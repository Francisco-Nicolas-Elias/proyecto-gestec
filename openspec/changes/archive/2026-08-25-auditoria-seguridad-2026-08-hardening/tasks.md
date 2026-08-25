# Tasks: Hardening de auth y validación de catálogo

> Nota: al llegar a esta fase se descubrió que el código de las Fases 1 y 2 ya estaba escrito (sin commitear, restos de trabajo previo a este tramo de la conversación) y coincide con el diseño de este change. Se marcan como completas tras revisar el diff existente; falta la verificación en vivo.

## Fase 1: Rate limiting en auth

- [x] 1.1 Nuevo `authActionsRateLimiter` en `rateLimit.middleware.ts` (windowMs 15min, max 10)
- [x] 1.2 Aplicar el limiter a `/registro`, `/recuperar-password`, `/reset-password`, `/verificar/:token` en `auth.routes.ts`

## Fase 2: Validación Zod en catálogo de Admin

- [x] 2.1 Crear `backend/src/schemas/catalogo.schema.ts` con schemas para `ubicacion`, `tipoComponente`, `marca`, `proveedor`, `area`
- [x] 2.2 Aplicar `validate()` en los POST/PUT de los 5 recursos en `admin.routes.ts`

## Fase 3: Verificación

- [x] 3.1 Levantar el backend y confirmar que compila sin errores tras los cambios (`tsc --noEmit` sin errores)
- [x] 3.2 Probar rate limiting: 11 requests a `/registro` con un test temporal → los primeros 10 dan 201, el 11vo da 429
- [x] 3.3 Probar validación Zod: body inválido en `areas`/`ubicaciones` → 400 con mensaje descriptivo; campo extra no declarado → ignorado silenciosamente
- [x] 3.4 Probar que los 5 CRUDs de catálogo siguen funcionando normalmente con datos válidos desde el navegador real — confirmado por el usuario
- [x] 3.5 Probar el flujo completo de registro/recuperación de contraseña desde el navegador real tras agregar el rate limiter — confirmado por el usuario
- [x] 3.6 Actualizar `verify-report.md` con el resultado de cada verificación

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/{seguridad,validacion}/spec.md` de este change en `openspec/specs/{seguridad,validacion}/spec.md`
- [x] 4.2 Mover el change a `openspec/changes/archive/`
