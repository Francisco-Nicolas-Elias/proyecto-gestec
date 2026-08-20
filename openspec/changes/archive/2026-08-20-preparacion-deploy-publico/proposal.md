# Proposal: Preparación para deploy con acceso público

## Intent

GESTEC va a ser accesible desde internet (no LAN-only) y se va a alojar en un servidor Ubuntu + Apache propio de IES21. Antes del deploy real (que requiere dominio definitivo, acceso SSH del equipo y ejecución manual de varios pasos de infraestructura), hay una serie de cambios y artefactos que se pueden preparar ahora, sin depender de la revisión manual pendiente ni del deploy en sí:

1. Un ajuste de código (`trust proxy`) necesario para que el rate limiting por IP (agregado en el change anterior) funcione correctamente detrás del reverse proxy de Apache.
2. Plantillas de configuración de infraestructura (VirtualHost de Apache, PM2) listas para copiar/pegar cuando el equipo tenga el dominio y acceda por SSH al servidor.
3. Un runbook con la lista exacta de comandos a ejecutar en el servidor (ufw, certbot, a2enmod, pnpm build, pm2), para que el equipo no tenga que improvisarlos.
4. Corrección de un dato desactualizado en `backend/.env.example` (el `connection_limit` de ejemplo sigue diciendo 1, cuando el valor correcto ya usado en producción es 10, fix de una sesión anterior por lag de navegación).

Ninguno de estos cambios requiere el dominio final ni acceso al servidor — son código y plantillas con placeholders. El deploy real (subir código, correr los comandos, activar SSL) queda fuera de este change y se hace después de que termine la revisión manual (desktop y mobile).

## Scope

### In Scope
- `backend/src/app.ts`: habilitar `trust proxy` condicionalmente cuando `NODE_ENV === 'production'`.
- `backend/.env.example`: corregir el `connection_limit` de ejemplo de 1 a 10.
- Nueva carpeta `deploy/` en la raíz del repo con:
  - `deploy/apache-gestec.conf.template` — VirtualHost (HTTP→HTTPS redirect, reverse proxy de `/api` a `localhost:3000`, servir el build estático del frontend, paths de certificado SSL a completar por certbot).
  - `deploy/ecosystem.config.js` — configuración de PM2 para correr el backend en producción.
  - `deploy/RUNBOOK.md` — lista de comandos paso a paso para el equipo (a2enmod, ufw, certbot, build, pm2), con placeholders claros para dominio y rutas.

### Out of Scope
- Ejecutar cualquier comando en el servidor real de IES21 (requiere SSH, decisión del equipo).
- Obtener el dominio o el certificado SSL real.
- El paso de "subir el código y prender el servidor" (deploy final) — se hace después de la revisión manual.
- Cambios relacionados a JWT en localStorage (tema aparte, no decidido).

## Approach

Preparar todo como código/documentación versionada en el repo, con placeholders explícitos (`TU_DOMINIO`, `/var/www/gestec`, etc.) que el equipo reemplaza al momento de ejecutar. El único cambio de comportamiento real en esta sesión es el `trust proxy`, que se verifica localmente simulando un header `X-Forwarded-For` (ya que no hay reverse proxy real disponible en desarrollo).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/app.ts` | Modified | `trust proxy` condicional a producción |
| `backend/.env.example` | Modified | Corrige `connection_limit` de ejemplo |
| `deploy/apache-gestec.conf.template` | New | Plantilla de VirtualHost |
| `deploy/ecosystem.config.js` | New | Config de PM2 |
| `deploy/RUNBOOK.md` | New | Runbook de comandos para el equipo |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Habilitar `trust proxy` sin estar realmente detrás de un proxy confiable permitiría spoofear la IP vía header `X-Forwarded-For` y burlar el rate limiting | Low | Se gatea por `NODE_ENV === 'production'`, y en producción el plan es que Apache SIEMPRE esté delante del backend (el firewall del runbook cierra el puerto 3000 hacia afuera, por lo que no hay forma de pegarle directo al backend sin pasar por Apache) |
| Las plantillas de infraestructura queden desactualizadas si cambia la estructura de carpetas real del servidor | Medium | Placeholders claros y documentados en el RUNBOOK; se ajustan en el momento del deploy real |

## Rollback Plan

El `trust proxy` se revierte quitando las 3 líneas agregadas en `app.ts`. La carpeta `deploy/` es enteramente nueva y aditiva — borrarla no afecta nada del funcionamiento de la app. La corrección del `.env.example` es solo documentación.

## Dependencies

Ninguna nueva dependencia de npm.

## Success Criteria

- [ ] Con `NODE_ENV=production` y un header `X-Forwarded-For` simulado, `req.ip` refleja la IP del header (confirmando que `trust proxy` toma efecto).
- [ ] Con `NODE_ENV=development` (o sin setear), el comportamiento de `req.ip` no cambia respecto a hoy.
- [ ] Las plantillas de `deploy/` compilan conceptualmente (sintaxis válida de Apache conf y de PM2 ecosystem) y cubren: HTTPS redirect, proxy de `/api`, estático de frontend, PM2 con reinicio automático.
- [ ] El RUNBOOK cubre, en orden, todos los pasos pendientes de la nota de memoria: pnpm, mod_proxy, VirtualHost, certbot, ufw, PM2.
