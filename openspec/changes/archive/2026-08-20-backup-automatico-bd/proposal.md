# Proposal: Backup automático casero de la base de datos

## Intent

GESTEC usa el plan gratuito de Supabase, que no incluye backups automáticos (esa feature es exclusiva de Pro y planes superiores). Con datos reales de producción (376 activos, componentes, usuarios reales de la institución), no tener ningún backup es un riesgo serio de pérdida de datos. Se decidió armar un backup casero: un cron job en el propio servidor de IES21 que dumpea la base todos los días, guarda una copia local y otra en Google Drive (vía `rclone`), con rotación de 7 días en ambos destinos.

## Scope

### In Scope
- Script `deploy/backup-db.sh`: `pg_dump` contra la base (vía `DIRECT_URL`, no el pooler), comprimido con `gzip`, guardado localmente con timestamp, subido a Google Drive vía `rclone`, y rotación (borrado) de copias de más de 7 días en ambos destinos.
- El script lee `DIRECT_URL` directamente del `backend/.env` real del servidor — no duplica credenciales en ningún archivo nuevo.
- Log de cada corrida (éxito/error) a un archivo, para poder auditar que el backup efectivamente corrió.
- Actualizar `deploy/RUNBOOK.md` con los pasos de instalación: `postgresql-client`, `rclone` (incluyendo el paso interactivo de `rclone config` para autorizar Google Drive, que el equipo tiene que hacer manualmente por ser un flow de OAuth), permisos del script, y la entrada de `crontab`.

### Out of Scope
- Migrar a Supabase Pro.
- Point-in-time recovery (PITR) — no existe en el plan gratuito, y el backup casero es un dump diario, no continuo.
- Alertas automáticas por email si el backup falla (se podría sumar después reutilizando el SMTP ya configurado; por ahora alcanza con el log).
- Restaurar un backup (proceso manual documentado aparte si hace falta usarlo alguna vez, no se automatiza un "restore script" en este change).
- Ejecutar el `rclone config` o probar la subida real a Google Drive (requiere autorización interactiva de una cuenta real del equipo).

## Approach

Un script bash simple y auto-contenido en `deploy/`, pensado para correr sin supervisión vía cron. Se decidieron 7 días de retención (mismo estándar que Supabase Pro) y copia local + externa (Google Drive vía `rclone`) porque el servidor de IES21 es un único punto de falla si el backup solo quedara en su propio disco.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `deploy/backup-db.sh` | New | Script de dump + subida + rotación |
| `deploy/RUNBOOK.md` | Modified | Agrega pasos de instalación y configuración del backup |
| `openspec/specs/deploy/spec.md` | Modified | Nuevo requirement de backup automático |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El script falla silenciosamente (ej. `rclone` sin configurar) y nadie se entera hasta necesitar restaurar | Medium | El script loguea cada paso (éxito/error) a un archivo; se documenta en el RUNBOOK revisar el log periódicamente. Alertas por email quedan como mejora futura, no bloqueante. |
| Credenciales de la base expuestas si el script o el log las imprimen | Low | El script lee `DIRECT_URL` del `.env` real (no lo hardcodea) y nunca la imprime en el log, solo mensajes de éxito/error genéricos |
| Falta de espacio en disco del servidor por acumulación de dumps | Low | Rotación automática de 7 días en el destino local |

## Rollback Plan

Borrar `deploy/backup-db.sh` y quitar la línea de `crontab` (`crontab -e` y eliminar la entrada). No afecta el funcionamiento de la aplicación en absoluto — es un proceso independiente.

## Dependencies

- `postgresql-client` (paquete del sistema, no de npm) en el servidor de IES21, para tener `pg_dump`.
- `rclone` (binario del sistema) configurado con un remote de Google Drive.

## Success Criteria

- [ ] El script genera un dump comprimido con timestamp en el path local configurado.
- [ ] El script sube ese mismo dump al remote de `rclone` configurado.
- [ ] Dumps (locales y remotos) de más de 7 días se borran automáticamente en la corrida siguiente.
- [ ] Cada corrida deja un registro claro (éxito o error específico) en el log.
- [ ] El RUNBOOK deja instrucciones completas para que el equipo instale y active esto por SSH, incluyendo el paso interactivo de `rclone config`.
