# Verify Report: Actualización de dependencias vulnerables

## Backend

- `nodemailer` `8.0.10` → `9.0.5`, `multer` `2.1.1` → `2.2.0`.
- `pnpm exec tsc --noEmit` sin errores tras el bump.
- `pnpm audit` en `backend/`: `multer` y `nodemailer` ya no aparecen en el reporte.
- `transporter.verify()` contra el SMTP real (`smtp.gmail.com:465`) confirmado exitoso — la validación TLS estricta que introduce nodemailer 9.x por default no afecta la conexión SMTP existente.
- Multer 2.2.0 probado en aislamiento (servidor Express mínimo, sin tocar Supabase Storage real): un archivo con mimetype permitido se parsea y acepta igual que antes; un mimetype no permitido es rechazado por el mismo `fileFilter`, mismo comportamiento que con 2.1.1.
- No se probó la subida real end-to-end (Supabase Storage + asociación a Ticket/Tarea) para no crear artefactos de prueba en el storage real — **pendiente como parte de la revisión manual del usuario**.

## Frontend

- `react-router` `7.13.0` → `7.18.2`.
- `dompurify` (dependencia transitiva de `jspdf`, ya en su última versión `4.2.1` y sin necesidad de bump) forzado a `>=3.4.13` vía override — resolvió a `3.4.14`.
- **Nota de implementación importante**: el mecanismo `pnpm.overrides` dentro de `package.json` ya no es leído por la versión de pnpm instalada (11.1.3) — tira un warning explícito (`[WARN] The "pnpm" field in package.json is no longer read by pnpm`). El override de `dompurify` se configuró correctamente en la clave `overrides:` de `pnpm-workspace.yaml` (raíz del monorepo), que es donde esta versión de pnpm lo espera.
- **Hallazgo colateral fuera de alcance**: el override de `vite` que ya existía en `frontend/package.json` (`pnpm.overrides.vite: "6.3.5"`) probablemente también es un no-op hoy por el mismo motivo — no se corrigió en este change porque no es parte de los hallazgos de la auditoría (vite ya está pineado a la versión exacta como dependencia directa, así que el override no cambia el resultado real hoy), pero conviene migrarlo a `pnpm-workspace.yaml` en algún momento para que no sea un problema latente si el pin directo cambia.
- `pnpm build` en `frontend/` exitoso (warning preexistente de chunk size >500kB, no relacionado a este change).
- `pnpm audit` en `frontend/`: `react-router` y `dompurify` ya no aparecen en el reporte.
- No se probó navegación completa, login/logout ni exportación de PDF desde el navegador real — **pendiente como parte de la revisión manual del usuario**, con atención especial al fix reciente de persistencia de tab en `Admin.tsx` (depende de `useSearchParams` de `react-router`).

## xlsx

Sin cambios — confirmado que `0.18.5` sigue siendo la última versión publicada en el registry de npm (SheetJS solo publica fixes en su propio CDN). Riesgo aceptado documentado: el uso real en GESTEC es únicamente de exportación (`json_to_sheet`/`writeFile`), nunca de parseo de un archivo subido por un usuario, por lo que la superficie vulnerable (Prototype Pollution/ReDoS al parsear) no es explotable en el uso actual.

## Verificación manual del usuario

Confirmado por el usuario en navegador real: navegación completa por todas las rutas del menú, dark mode, refresh en cada pestaña (incluyendo persistencia del tab activo en Admin), login/logout, exportación de PDF, y subida real de un adjunto a un ticket/tarea (Supabase Storage incluido). Sin regresiones observadas tras los 4 bumps de dependencias.

## Caveats

Ninguno pendiente — todas las verificaciones de las specs quedaron confirmadas.
