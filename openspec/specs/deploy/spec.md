# Deploy — Especificación

## Purpose

Define el comportamiento requerido para que el backend confíe correctamente en la IP del cliente cuando corre detrás de un reverse proxy (Apache), el contenido mínimo que deben tener los artefactos de infraestructura preparados para el deploy en el servidor de IES21, y el backup diario casero de la base de datos (el plan gratuito de Supabase no incluye backups automáticos).

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
- THEN MUST incluir, en orden, los pasos: confirmar `pnpm` instalado, habilitar `mod_proxy`/`mod_proxy_http`, colocar el VirtualHost, obtener certificado con certbot, configurar `ufw` para exponer solo 80/443, buildear frontend y backend, arrancar el backend con PM2, y configurar el backup automático de la base de datos

---

### Requirement: Backup diario con copia local y externa

El sistema MUST generar, una vez al día, un dump comprimido de la base de datos completa, usando la conexión directa (`DIRECT_URL`), y MUST guardar una copia en disco local y otra en un destino externo (Google Drive vía `rclone`).

El script MUST leer las credenciales de conexión desde el `.env` real del servidor, sin duplicarlas en ningún archivo versionado ni imprimirlas en el log.

#### Scenario: Corrida diaria exitosa

- GIVEN el cron configurado corre el script de backup
- WHEN `pg_dump` y la subida a `rclone` se completan sin error
- THEN MUST existir un archivo `.sql.gz` con timestamp en el path local configurado
- AND MUST existir una copia equivalente en el remote de `rclone` configurado
- AND el log MUST registrar la corrida como exitosa

#### Scenario: Falla de `pg_dump`

- GIVEN el script corre pero `pg_dump` falla (ej. credenciales inválidas, base inaccesible)
- WHEN el script detecta el error
- THEN MUST NOT dejar un archivo de dump corrupto o vacío en el destino local
- AND el log MUST registrar el error de forma específica

#### Scenario: Falla de la subida externa mientras el dump local sí se generó

- GIVEN `pg_dump` genera el dump local correctamente pero `rclone copy` falla (ej. sin conexión, remote mal configurado)
- WHEN el script continúa su ejecución
- THEN el dump local MUST conservarse igual (no se borra por la falla de la subida)
- AND el log MUST registrar el error de la subida por separado del resultado de `pg_dump`

---

### Requirement: Rotación de backups a 7 días

El sistema MUST borrar automáticamente, en cada corrida, los dumps (locales y del remote externo) con más de 7 días de antigüedad.

#### Scenario: Rotación local

- GIVEN existen dumps locales de más de 7 días en el directorio de backups
- WHEN corre el script
- THEN esos archivos MUST ser eliminados del disco local

#### Scenario: Rotación externa

- GIVEN existen dumps de más de 7 días en el remote de `rclone`
- WHEN corre el script
- THEN esos archivos MUST ser eliminados del remote
