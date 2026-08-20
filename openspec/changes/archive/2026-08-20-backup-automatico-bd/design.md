# Design: Backup automático casero de la base de datos

## `deploy/backup-db.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- Configuración (ajustar al servidor real) ---
BACKUP_DIR="/var/backups/gestec"
RETENTION_DAYS=7
RCLONE_REMOTE="gdrive:gestec-backups"      # nombre del remote configurado con `rclone config`
ENV_FILE="/var/www/gestec/backend/.env"    # ruta real del repo en el servidor
LOG_FILE="/var/log/gestec-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: no se encontro $ENV_FILE"
  exit 1
fi

DIRECT_URL=$(grep -E '^DIRECT_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"')

if [ -z "$DIRECT_URL" ]; then
  log "ERROR: DIRECT_URL vacia o no encontrada en $ENV_FILE"
  exit 1
fi

FILENAME="gestec-$(date '+%Y%m%d-%H%M%S').sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

if pg_dump "$DIRECT_URL" | gzip > "$FILEPATH"; then
  log "OK: dump local creado en $FILEPATH ($(du -h "$FILEPATH" | cut -f1))"
else
  log "ERROR: pg_dump fallo"
  rm -f "$FILEPATH"
  exit 1
fi

if rclone copy "$FILEPATH" "$RCLONE_REMOTE" 2>>"$LOG_FILE"; then
  log "OK: subido a $RCLONE_REMOTE"
else
  log "ERROR: rclone copy fallo (el backup local sigue existiendo)"
fi

find "$BACKUP_DIR" -name 'gestec-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" 2>>"$LOG_FILE" || log "ADVERTENCIA: no se pudo rotar backups remotos"

log "Backup finalizado"
```

Decisiones clave:
- `set -euo pipefail`: cualquier comando que falle corta el script (salvo donde se maneja el error explícitamente con `if`).
- Se usa `DIRECT_URL` (puerto 5432, sin pgbouncer) porque `pg_dump` necesita una conexión de sesión completa, no compatible con el modo transacción del pooler que usa `DATABASE_URL`.
- El parseo del `.env` es un `grep`+`cut` simple porque el archivo ya sigue el formato `CLAVE="valor"` de una sola línea (visto en `backend/.env.example`) — no hace falta un parser más complejo.
- El log nunca imprime `DIRECT_URL` ni ningún dato sensible, solo el resultado de cada paso.
- La falla de `rclone copy` no aborta el script (el `||` no se usa ahí, se deja que el `if` capture el error y siga) — así la rotación y el resto de la corrida no se ven afectados por un problema de conectividad puntual con Google Drive, y el dump local igual queda disponible.

## `deploy/RUNBOOK.md` — sección nueva a agregar

Después del paso de PM2, agregar:

### Backup automático de la base de datos

```bash
# 1. Instalar cliente de PostgreSQL (para pg_dump)
sudo apt install postgresql-client

# 2. Instalar rclone
curl https://rclone.org/install.sh | sudo bash

# 3. Configurar el remote de Google Drive (paso interactivo — requiere
#    autenticarse con una cuenta de Google real del equipo, se abre un link
#    para autorizar; seguir el wizard y nombrar el remote "gdrive")
rclone config

# 4. Crear carpeta de backups y dar permisos de ejecución al script
sudo mkdir -p /var/backups/gestec
chmod +x /var/www/gestec/deploy/backup-db.sh

# 5. Ajustar en backup-db.sh las rutas reales (ENV_FILE, RCLONE_REMOTE) si difieren

# 6. Probar una corrida manual antes de dejarlo en cron
/var/www/gestec/deploy/backup-db.sh
cat /var/log/gestec-backup.log

# 7. Agregar al crontab (corre todos los días a las 3am)
crontab -e
# agregar la linea:
# 0 3 * * * /var/www/gestec/deploy/backup-db.sh
```

## Verificación local (sin servidor real disponible)

No hay `pg_dump`, `rclone` ni `crontab` disponibles en este entorno de desarrollo (Windows). Se verifica lo que sí es posible de forma aislada:
- Sintaxis del script (`bash -n`).
- Lógica de parseo del `.env` (grep+cut) contra un `.env` de prueba con el mismo formato real.
- Lógica de rotación (`find -mtime +N -delete`) contra archivos de prueba con fechas simuladas.

El resto (pipeline real de `pg_dump`/`rclone`, cron) queda para probarse en el servidor real durante el deploy — se deja documentado como caveat en el verify-report.
