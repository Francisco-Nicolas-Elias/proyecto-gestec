# Tasks: Backup automático casero de la base de datos

## Fase 1: Script

- [x] 1.1 Crear `deploy/backup-db.sh` (dump, subida, rotación, logging)

## Fase 2: Runbook

- [x] 2.1 Agregar sección "Backup automático de la base de datos" a `deploy/RUNBOOK.md`

## Fase 3: Verificación

- [x] 3.1 Validar sintaxis del script (`bash -n`)
- [x] 3.2 Probar la lógica de parseo del `.env` contra un archivo de prueba con el mismo formato real
- [x] 3.3 Probar la lógica de rotación (`find -mtime +N -delete`) contra archivos de prueba con fechas simuladas
- [x] 3.4 Documentar en `verify-report.md` qué quedó verificado y qué depende del servidor real (pg_dump, rclone, cron)

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/deploy/spec.md` de este change en `openspec/specs/deploy/spec.md`
- [x] 4.2 Mover el change a `openspec/changes/archive/`
