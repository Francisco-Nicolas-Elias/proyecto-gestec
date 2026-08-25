# Tasks: Actualización de dependencias vulnerables

## Fase 1: Backend (menor riesgo)

- [x] 1.1 Bump `nodemailer` en `backend/package.json` a `>=9.0.1` (instalado: `9.0.5`)
- [x] 1.2 Bump `multer` en `backend/package.json` a `2.2.0`
- [x] 1.3 `pnpm install` en `backend/` y confirmar que no hay errores
- [x] 1.4 `pnpm exec tsc --noEmit` en `backend/` para confirmar que sigue compilando
- [x] 1.5 `pnpm audit` en `backend/` y confirmar que `multer` y `nodemailer` ya no aparecen

## Fase 2: Frontend (mayor riesgo)

- [x] 2.1 Bump `react-router` en `frontend/package.json` a `7.18.2`
- [x] 2.2 Agregar override de `dompurify: '>=3.4.13'` — **nota de implementación**: `pnpm.overrides` en `package.json` ya no es leído por pnpm 11 (warning explícito al instalar); el override real se agregó en la clave `overrides:` de `pnpm-workspace.yaml` (raíz del monorepo), que es donde esta versión de pnpm lo espera. El `pnpm.overrides` de `vite` que ya existía en `frontend/package.json` quedó como hallazgo colateral: probablemente también es un no-op hoy (mismo warning), pero está fuera de alcance de este change — reportado, no corregido.
- [x] 2.3 `pnpm install` en el workspace y confirmar que el lockfile resuelve `dompurify` a `>=3.4.13` (resolvió a `3.4.14`)
- [x] 2.4 `pnpm build` en `frontend/` para confirmar que compila sin errores
- [x] 2.5 `pnpm audit` en `frontend/` y confirmar que `react-router` y `dompurify` ya no aparecen

## Fase 3: Verificación

- [x] 3.1 Verificar conexión/autenticación SMTP real (`transporter.verify()`) tras el bump de `nodemailer` a 9.x — confirma que la validación TLS estricta por default no rompe la conexión contra `smtp.gmail.com:465`
- [x] 3.2 Verificar que `multer` 2.2.0 sigue parseando multipart y aplicando el `fileFilter` igual que antes (archivo permitido aceptado, tipo no permitido rechazado) — probado en aislamiento, sin tocar Supabase Storage real
- [x] 3.3 Levantar el frontend y navegar por todas las rutas del menú, alternar dark mode, refrescar la página en cada pestaña (con atención especial a que `Admin.tsx` mantenga el tab activo tras el refresh) — confirmado por el usuario
- [x] 3.4 Probar login/logout completos tras el bump de `react-router` — confirmado por el usuario
- [x] 3.5 Exportar un PDF desde Activos, ActivoDetalle, Stock y Admin, confirmar mismo contenido/formato que antes — confirmado por el usuario
- [x] 3.7 (agregada) Subida real de un adjunto a un ticket/tarea end-to-end (Supabase Storage incluido) tras el bump de `multer` — confirmado por el usuario
- [x] 3.6 Actualizar `verify-report.md` con el resultado de cada verificación

## Fase 4: Archivo

- [x] 4.1 Mergear `specs/seguridad/spec.md` de este change en `openspec/specs/seguridad/spec.md`
- [x] 4.2 Mover el change a `openspec/changes/archive/`
