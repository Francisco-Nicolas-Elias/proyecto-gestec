#!/usr/bin/env bash
# Backup diario casero de la base de datos (plan gratuito de Supabase no incluye backups automáticos).
# Pensado para correr sin supervisión vía cron. Ajustar la config de abajo a los paths reales del servidor.
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
