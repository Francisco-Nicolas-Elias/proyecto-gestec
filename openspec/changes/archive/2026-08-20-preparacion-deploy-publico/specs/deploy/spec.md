# Deploy — Especificación (delta): preparación para acceso público

## Purpose

Define el comportamiento requerido para que el backend confíe correctamente en la IP del cliente cuando corre detrás de un reverse proxy (Apache), y el contenido mínimo que deben tener los artefactos de infraestructura preparados para el deploy en el servidor de IES21.

---

## Requirements

### Requirement: `trust proxy` habilitado solo en producción

El sistema MUST confiar en el primer hop de un reverse proxy (`trust proxy: 1`) únicamente cuando `NODE_ENV === 'production'`.

En cualquier otro entorno (`development`, sin definir), el sistema MUST NOT confiar en el header `X-Forwarded-For` para determinar `req.ip`.

#### Scenario: Producción detrás de Apache

- GIVEN el backend corriendo con `NODE_ENV=production`
- WHEN llega una request con header `X-Forwarded-For: 203.0.113.5` (seteado por Apache con la IP real del visitante)
- THEN `req.ip` MUST reflejar `203.0.113.5`, no la IP del proxy

#### Scenario: Desarrollo local sin proxy

- GIVEN el backend corriendo con `NODE_ENV=development`
- WHEN llega una request con un header `X-Forwarded-For` arbitrario
- THEN `req.ip` MUST NOT tomar ese header en cuenta (se comporta igual que antes de este cambio)

---

### Requirement: Artefactos de infraestructura listos para el deploy

El repositorio MUST incluir, en una carpeta `deploy/`, una plantilla de VirtualHost de Apache, una configuración de PM2, y un runbook de comandos — todos con placeholders explícitos para los valores específicos del servidor (dominio, rutas) que se completan recién en el momento del deploy real.

#### Scenario: Plantilla de Apache cubre lo mínimo necesario

- GIVEN el archivo `deploy/apache-gestec.conf.template`
- WHEN se revisa su contenido
- THEN MUST incluir: redirect de HTTP a HTTPS, proxy de `/api` hacia `http://localhost:3000`, y el servido de los archivos estáticos del build de frontend

#### Scenario: Runbook cubre todos los pasos pendientes conocidos

- GIVEN el archivo `deploy/RUNBOOK.md`
- WHEN se revisa su contenido
- THEN MUST incluir, en orden, los pasos: confirmar `pnpm` instalado, habilitar `mod_proxy`/`mod_proxy_http`, colocar el VirtualHost, obtener certificado con certbot, configurar `ufw` para exponer solo 80/443, buildear frontend y backend, y arrancar el backend con PM2
