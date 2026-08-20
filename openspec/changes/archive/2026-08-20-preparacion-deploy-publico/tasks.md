# Tasks: Preparación para deploy con acceso público

## Fase 1: Backend

- [x] 1.1 Agregar `trust proxy` condicional a `NODE_ENV === 'production'` en `backend/src/app.ts`
- [x] 1.2 Corregir `connection_limit=1` → `connection_limit=10` en `backend/.env.example`

## Fase 2: Infraestructura (artefactos, sin ejecutar en servidor real)

- [x] 2.1 Crear `deploy/apache-gestec.conf.template` (redirect HTTPS, proxy `/api`, estático frontend, SPA fallback)
- [x] 2.2 Crear `deploy/ecosystem.config.js` (PM2)
- [x] 2.3 Crear `deploy/RUNBOOK.md` con la lista completa de comandos en orden

## Fase 3: Verificación

- [x] 3.1 Verificar que `req.ip` respeta `X-Forwarded-For` con `NODE_ENV=production`
- [x] 3.2 Verificar que `req.ip` lo ignora con `NODE_ENV=development` (comportamiento actual intacto)
- [x] 3.3 Confirmar que el backend sigue arrancando y respondiendo normalmente (health check) tras el cambio
- [x] 3.4 Revisar a simple vista que `apache-gestec.conf.template`, `ecosystem.config.js` y `RUNBOOK.md` cubren todos los puntos del design.md
- [x] 3.5 Actualizar `verify-report.md`

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/deploy/spec.md` en `openspec/specs/deploy/spec.md` (nuevo dominio de specs)
- [x] 4.2 Mover el change a `openspec/changes/archive/`
