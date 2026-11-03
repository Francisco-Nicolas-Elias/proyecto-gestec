#!/usr/bin/env bash
# Backup diario casero de la base de datos (plan gratuito de Supabase no incluye backups automáticos).
# Pensado para correr sin supervisión vía cron. Ajustar la config de abajo a los paths reales del servidor.
set -euo pipefail

# --- Configuración (ajustar al servidor real) ---
BACKUP_DIR="/var/backups/gestec"
RETENTION_DAYS=7
RCLONE_REMOTE="gdrive:gestec-backup-ies"   # nombre del remote configurado con `rclone config`
ENV_FILE="/var/www/gestec/backend/.env"    # ruta real del repo en el servidor
LOG_FILE="/var/log/gestec-backup.log"
ADJUNTOS_DIR="/var/backups/gestec-adjuntos"            # espejo local de los adjuntos (no se rota)
RCLONE_REMOTE_ADJUNTOS="gdrive:gestec-backup-ies-adjuntos"

# cron arranca con un PATH mínimo; asegurar que se encuentren node, pg_dump y rclone
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

# Avisos por mail (destinatarios: BACKUP_ALERT_EMAILS en backend/.env, separados por coma).
# Si falla algo se avisa en el momento; si todo salió bien se manda un resumen los lunes
# (si un lunes NO llega ese mail, el backup dejó de correr y hay que revisarlo).
FALLOS=0
touch "$LOG_FILE"
INICIO_LOG=$(wc -l < "$LOG_FILE")

notificar() {
  local asunto="$1"
  local cuerpo
  cuerpo="$(tail -n +"$((INICIO_LOG + 1))" "$LOG_FILE" 2>/dev/null | tail -n 40)"
  if ! (cd "$(dirname "$ENV_FILE")" && echo "$cuerpo" | node dist/scripts/notificar-backup.js "$asunto") >> "$LOG_FILE" 2>&1; then
    log "ADVERTENCIA: no se pudo enviar el aviso por mail"
  fi
}

al_salir() {
  local codigo=$?
  if [ "$codigo" -ne 0 ] || [ "$FALLOS" -ne 0 ]; then
    notificar "[GESTEC] FALLO el backup del $(date '+%d/%m/%Y')"
  elif [ "$(date '+%u')" = "1" ]; then
    notificar "[GESTEC] Backups funcionando - resumen del lunes $(date '+%d/%m/%Y')"
  fi
}
trap al_salir EXIT

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
  FALLOS=1
fi

find "$BACKUP_DIR" -name 'gestec-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" 2>>"$LOG_FILE" || { log "ADVERTENCIA: no se pudo rotar backups remotos"; FALLOS=1; }

# --- Adjuntos (Supabase Storage) ---
# Espejo incremental local + copia a Drive. Un fallo acá no invalida el backup de la base (ya hecho arriba).
# Se usa "rclone copy" (no "sync"): lo borrado desde la app queda en el backup, por si fue un error.
BACKEND_DIR="$(dirname "$ENV_FILE")"
if (cd "$BACKEND_DIR" && node dist/scripts/backup-adjuntos.js "$ADJUNTOS_DIR") >> "$LOG_FILE" 2>&1; then
  log "OK: adjuntos sincronizados en $ADJUNTOS_DIR"
  if rclone copy "$ADJUNTOS_DIR" "$RCLONE_REMOTE_ADJUNTOS" 2>>"$LOG_FILE"; then
    log "OK: adjuntos subidos a $RCLONE_REMOTE_ADJUNTOS"
  else
    log "ERROR: rclone copy de adjuntos fallo (la copia local sigue existiendo)"
    FALLOS=1
  fi
else
  log "ERROR: no se pudieron respaldar los adjuntos (ver lineas anteriores del log)"
  FALLOS=1
fi

log "Backup finalizado"
