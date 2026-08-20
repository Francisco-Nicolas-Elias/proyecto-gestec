# Verify Report: Preparación para deploy con acceso público

## Método

Se agregó temporalmente `req.ip` a la respuesta de `/health` para poder observarlo directamente vía `curl`, se corrió el backend una vez con `NODE_ENV=production` y otra con `NODE_ENV=development`, y se revirtió el cambio temporal al terminar (confirmado con `git diff` limpio).

## Resultados

### `trust proxy`

- **Producción**: con `NODE_ENV=production` y header `X-Forwarded-For: 203.0.113.5`, `req.ip` devolvió `203.0.113.5`. ✅
- **Desarrollo**: con `NODE_ENV=development` y el mismo header, `req.ip` devolvió `::1` (la IP real de conexión), ignorando el header. ✅ Comportamiento sin cambios respecto a antes.
- **Health check normal**: tras el cambio, el backend arranca y responde igual que siempre en modo dev normal. ✅

### Artefactos de infraestructura

- `deploy/apache-gestec.conf.template`: incluye redirect HTTP→HTTPS, proxy de `/api`, `DocumentRoot` al build del frontend con `FallbackResource /index.html` para el ruteo de React Router. ✅
- `deploy/ecosystem.config.js`: config mínima de PM2 con autorestart. ✅
- `deploy/RUNBOOK.md`: cubre en orden todos los puntos pendientes de la nota de memoria de deploy (pnpm, mod_proxy, VirtualHost, certbot, ufw, PM2) más el paso de verificación final. ✅

## Caveats

- Las plantillas no se probaron contra un Apache real (no hay un servidor Ubuntu disponible en este entorno de desarrollo) — se revisaron por sintaxis y cobertura de puntos, no ejecutadas end-to-end. Esto se valida recién en el deploy real.
- El `trust proxy` se probó con un solo hop simulado (`X-Forwarded-For` con un valor). No se probó el caso de múltiples proxies encadenados (no aplica al plan actual: Apache es el único proxy delante del backend).

## Limpieza

- Se revirtió el `_debugIp` agregado temporalmente a `/health` — confirmado con `git diff` sin cambios pendientes ahí.
- Backend de verificación detenido, puerto 3000 liberado.
