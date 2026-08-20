# Deploy — Especificación (delta): backup automático casero de la base de datos

## Purpose

Define el comportamiento requerido para el backup diario casero de la base de datos (necesario porque el plan gratuito de Supabase no incluye backups automáticos), incluyendo dónde se guarda, cuánto se retiene, y cómo se registra cada corrida.

---

## Requirements

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
