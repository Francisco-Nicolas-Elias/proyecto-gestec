# Design: Actualización de dependencias vulnerables (auditoría agosto 2026)

## Technical Approach

Bump puntual de versión (no saltar de mayor) para cada paquete, con `pnpm audit` confirmado contra el registry real (no asumido). Un hallazgo cambió respecto al proposal original: `jspdf` **ya está en su última versión** (`4.2.1`) — no hace falta bumpearlo. El `dompurify` vulnerable no es una dependencia directa de `jspdf`, sino una `optionalDependency` transitiva (`jspdf` declara `dompurify: ^3.3.1`, un rango que ya permite versiones parcheadas); quedó resuelto en `3.4.3` simplemente porque el lockfile no se había vuelto a resolver. La corrección correcta es un `pnpm.overrides` en `frontend/package.json`, no un bump de `jspdf`.

## Architecture Decisions

### Decision: Versión objetivo de cada paquete

**Choice**:
| Paquete | Actual | Objetivo | Motivo del número exacto |
|---------|--------|----------|---------------------------|
| `react-router` (frontend) | `7.13.0` | `>=7.18.2` | Es el umbral más alto entre los 8 advisories activos de `pnpm audit` (el último en cerrarse es "RSC Mode CSRF Bypass", patched `>=7.18.2`). Se descarta saltar a la v8 (ya publicada en npm) por ser un major fuera del alcance de este change de seguridad. |
| `multer` (backend) | `2.1.1` | `2.2.0` | Última versión estable de la serie 2.x (siguiente es `3.0.0-alpha`, no apta para producción). Cierra los 2 advisories de DoS. |
| `nodemailer` (backend) | `8.0.10` | `>=9.0.1` | El advisory activo (`raw` bypassea `disableFileAccess`/`disableUrlAccess`) está parcheado recién en `9.0.1` — la serie 8.x no tiene fix. Es un bump de mayor (8→9); investigado el único breaking change real: desde `9.0.0` las requests HTTPS salientes (adjuntos por URL, OAuth2, proxy) validan el certificado TLS del servidor por default. No afecta a GESTEC porque el único uso de red saliente es SMTP contra `smtp.gmail.com:465`, con certificado válido de Google — no hay fetch de adjuntos por URL remota ni OAuth2 configurado en `email.ts`. |
| `dompurify` (frontend, transitivo de `jspdf`) | `3.4.3` (resuelto) | `>=3.4.13` | `jspdf@4.2.1` (ya la última versión, no requiere bump) declara `dompurify: ^3.3.1` como optional dependency — rango que ya cubre `3.4.13`+. El fix es forzar la resolución vía `pnpm.overrides`, no bumpear `jspdf`. |
| `xlsx` (frontend + backend) | `0.18.5` | Sin cambio — riesgo aceptado | Confirmado en npm registry: `0.18.5` es la última versión publicada ahí (SheetJS solo publica fixes en su propio CDN, `cdn.sheetjs.com`, no en npm). Migrar de fuente rompe el flujo estándar de `pnpm install` y queda fuera de alcance de este change. |

**Alternatives considered**: Bumpear `react-router` directo a la v8 publicada en npm (más "al día"), o migrar `xlsx` a la fuente oficial de SheetJS.
**Rationale**: Un major de `react-router` (7→8) puede cambiar APIs de routing usadas en `routes.tsx` y arriesga mucho más que el objetivo de este change (cerrar CVEs conocidos). Migrar `xlsx` fuera del registry de npm rompe la reproducibilidad estándar de instalación del resto del equipo — se documenta como riesgo aceptado en vez de resolverlo ahora, dado que el uso real (solo exportar, nunca parsear input de usuario) ya lo hace no explotable.

### Decision: Orden de aplicación

**Choice**: 1) `nodemailer` → 2) `multer` → 3) `dompurify` (override) → 4) `react-router`, de menor a mayor riesgo de romper algo.
**Alternatives considered**: Aplicar todo junto en un solo commit.
**Rationale**: `nodemailer` y `multer` son bumps de backend acotados a una sola superficie cada uno (envío de email, subida de adjuntos) y fáciles de probar en aislamiento. El override de `dompurify` no cambia ninguna API consumida directamente por el código del proyecto. `react-router` se deja al final porque es el de mayor superficie (todo el routing de la SPA) — si algo se rompe, es más fácil aislar la causa si ya se validó que los otros 3 bumps no introdujeron nada raro.

## Data Flow

No aplica — este change no modifica flujo de datos, solo versiones de dependencias que ya están integradas en los flujos existentes (routing, subida de adjuntos, envío de email, exportación PDF).

## File Changes

| File | Action | Description |
|------|--------|--------------|
| `frontend/package.json` | Modify | Bump `react-router` a `>=7.18.2`; agregar sección `pnpm.overrides` con `dompurify: ">=3.4.13"` |
| `backend/package.json` | Modify | Bump `multer` a `2.2.0`, `nodemailer` a `>=9.0.1` |
| `pnpm-lock.yaml` | Modify | Regenerado por `pnpm install` tras los bumps |

## Interfaces / Contracts

Sin cambios de API pública del proyecto. `multer` 2.2.0 mantiene la misma interfaz de `req.file`/`req.files` que 2.1.1 (fix es interno, sobre parseo de multipart). `nodemailer` 9.x mantiene la misma API de `createTransport`/`sendMail` usada en `backend/src/lib/email.ts` (o equivalente) — el único cambio de comportamiento es la validación TLS estricta por default en requests HTTPS salientes, no en la conexión SMTP en sí (que usa su propio `secure: true` en el puerto 465, ya validado hoy).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Automatizado | `pnpm audit` sin los 4 hallazgos | Correr en backend y frontend tras los bumps, confirmar que `react-router`, `multer`, `nodemailer` y `dompurify` ya no aparecen |
| Manual — nodemailer | Envío de email de recuperación de contraseña y de verificación de registro | Disparar ambos flujos con un email de prueba real, confirmar que llega con el mismo contenido de siempre |
| Manual — multer | Subida de adjunto en Ticket, Tarea e Intervención | Subir un archivo de cada tipo permitido (imagen/video/audio) en cada uno de los 3 recursos, confirmar que se sube y queda visible |
| Manual — react-router | Navegación completa | Recorrer todas las rutas del menú, alternar dark mode, refrescar la página en cada pestaña (con atención especial a que `Admin.tsx` mantenga el tab activo tras el refresh, fix reciente que depende de `useSearchParams`), hacer login y logout |
| Manual — dompurify/jspdf | Exportación a PDF | Exportar un PDF desde Activos, ActivoDetalle, Stock y Admin, confirmar mismo contenido/formato que antes |

## Migration / Rollout

No requiere migración de datos. Rollout es un solo `pnpm install` tras los bumps de `package.json`, aplicado localmente y verificado antes de commitear (no hay ambiente de staging separado en este proyecto). Si algo se rompe tras un bump puntual, revertir solo esa línea de versión y volver a instalar, sin afectar los demás bumps ya aplicados.

## Open Questions

- [ ] Ninguna — todas las versiones objetivo fueron confirmadas contra `pnpm audit` real y el registry de npm, no asumidas.
