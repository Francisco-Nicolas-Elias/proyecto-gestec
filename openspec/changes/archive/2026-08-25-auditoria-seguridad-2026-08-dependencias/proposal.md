# Proposal: Actualización de dependencias vulnerables (auditoría agosto 2026)

## Intent

`pnpm audit` sobre el workspace completo detectó vulnerabilidades activas en 4 dependencias que sí llegan al runtime de producción: `react-router` (DoS, bypass de CSRF, XSS, open redirect), `multer` (DoS en subida de adjuntos), `nodemailer` (SSRF/lectura de archivos vía opción no usada) y `dompurify` (XSS moderado, dependencia interna de `jspdf`). Change hermano de `auditoria-seguridad-2026-08-hardening` (lógica de negocio) — separado porque un bump de versión tiene un perfil de riesgo distinto: requiere verificación funcional/visual manual en vez de solo revisar lógica de backend, y permite revertir un bump puntual sin afectar el hardening.

## Scope

### In Scope
- Bump de `react-router` (frontend) de `7.13.0` a `>=7.18.2`.
- Bump de `multer` (backend) a la última versión parcheada de la serie 2.x.
- Bump de `nodemailer` (backend) a la última versión estable de su serie.
- Bump de `jspdf` (frontend) a una versión cuya dependencia interna `dompurify` sea `>=3.4.13`.
- Evaluar `xlsx` (frontend): documentar como riesgo aceptado (uso actual es solo exportación, no parsea input de usuario) o migrar a la fuente oficial de SheetJS si el bump de las otras 4 no lleva mucho esfuerzo extra.

### Out of Scope
- Los ~30 hallazgos restantes de `pnpm audit` que son dependencias de build/dev-tooling (`vite`, `esbuild`, `tar`, `postcss`, `nanoid`, `@babel/core`, `deepmerge-ts`, Prisma CLI) — no llegan al bundle ni al runtime de producción. Quedan para el próximo `pnpm update` de rutina, sin change dedicado.
- Hallazgos de lógica de negocio (rate limiting, Zod) — change hermano `auditoria-seguridad-2026-08-hardening`.

## Approach

Bump directo de cada paquete a la versión mínima que resuelve el CVE (no la última mayor disponible, para minimizar el delta de comportamiento), seguido de verificación manual dirigida a la superficie que cada paquete toca: routing completo para `react-router`, subida de adjuntos para `multer`, envío de emails para `nodemailer`, exportación a PDF para `jspdf`. `pnpm audit` de nuevo al final para confirmar que los 4 hallazgos quedaron resueltos.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `frontend/package.json` (`react-router`) | Modified | Bump `7.13.0` → `>=7.18.2` |
| `backend/package.json` (`multer`) | Modified | Bump a última versión parcheada de la serie 2.x |
| `backend/package.json` (`nodemailer`) | Modified | Bump a última versión estable |
| `frontend/package.json` (`jspdf`) | Modified | Bump a versión con `dompurify>=3.4.13` |
| `frontend/package.json` (`xlsx`) | Modified o Documented | Migración opcional o riesgo aceptado documentado |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `react-router` 7.13→7.18 rompe algo no documentado en el changelog del CVE (routing, hidratación) | Medium | Probar navegación completa manualmente: todas las rutas del menú, dark mode, refresh en cada pestaña (especial atención al fix de persistencia de tab en `Admin.tsx`), login/logout |
| Bump de `multer` cambia el formato de `req.file`/`req.files` que consume el código existente | Low | Revisar el código que lee `req.file` en los controllers de adjuntos antes de dar por cerrado; probar subida real en Tickets/Tareas/Intervenciones |
| Bump de `jspdf` cambia la API de generación de PDF | Low | Probar exportación real en las 4 páginas que la usan |
| `xlsx` sin fix oficial en npm — cualquier decisión (migrar o aceptar) deja algo pendiente | Low | Documentar la decisión final explícitamente en el verify-report, no dejarlo ambiguo |

## Rollback Plan

Cada bump es un cambio de versión en `package.json` + lockfile. Revertir es `git revert` del commit, seguido de `pnpm install` para volver a las versiones anteriores. Si un bump puntual rompe algo y los demás no, se puede revertir solo esa línea del `package.json` sin afectar el resto.

## Dependencies

Ninguna — son actualizaciones de paquetes ya instalados, no requieren infraestructura nueva.

## Success Criteria

- [ ] `pnpm audit` ya no reporta los 4 hallazgos de `react-router`, `multer`, `nodemailer` y `dompurify`.
- [ ] Navegación completa del frontend probada manualmente sin regresiones tras el bump de `react-router`.
- [ ] Subida de adjuntos, envío de emails y exportación a PDF probados manualmente sin regresiones.
- [ ] Decisión sobre `xlsx` documentada explícitamente (migrado o riesgo aceptado).
