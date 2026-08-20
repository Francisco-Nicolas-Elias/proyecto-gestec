# Verify Report: Backup automático casero de la base de datos

## Método

Este entorno de desarrollo (Windows) no tiene `pg_dump`, `rclone` ni `crontab` disponibles — son herramientas de servidor Linux que van a estar en el servidor de IES21. Se verificó lo que sí es posible de forma aislada, y se documentan como caveat las partes que solo se pueden probar en el servidor real.

## Resultados

- **Sintaxis del script**: `bash -n deploy/backup-db.sh` no reportó errores. ✅
- **Parseo del `.env`**: probado contra un archivo de prueba con el mismo formato real (`DIRECT_URL="postgresql://..."`) — la extracción con `grep`+`cut` devolvió el valor correcto sin las comillas. ✅
- **Rotación de 7 días**: probada con 4 archivos de prueba con fechas simuladas (10, 8, 5 y 1 día de antigüedad) usando `touch -d`. Tras correr `find -mtime +7 -delete`, quedaron solo los de 5 y 1 día — los de 8 y 10 días se borraron correctamente. ✅

## Caveats (dependen del servidor real, no probado acá)

- El pipeline completo de `pg_dump | gzip` contra la base real de Supabase.
- La subida real con `rclone copy` a Google Drive (requiere `rclone config` con autorización interactiva de una cuenta real — no se puede automatizar ni probar desde este entorno).
- La rotación remota (`rclone delete --min-age`).
- La ejecución vía `crontab` (Windows no tiene cron).

Estos puntos quedan explícitamente como parte de la "Verificación final" del `RUNBOOK.md` (paso 9), a confirmar por el equipo cuando lo instalen en el servidor real: correr el script manualmente una vez y revisar `/var/log/gestec-backup.log` antes de dejarlo en cron.

## Limpieza

- Archivos y carpeta de prueba (`.env` de prueba, archivos con fechas simuladas) eliminados del scratchpad, no llegaron al repo.
