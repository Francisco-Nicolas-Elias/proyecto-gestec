# Delta for Seguridad

## ADDED Requirements

### Requirement: Dependencias de runtime sin vulnerabilidades conocidas activas

Las dependencias que llegan al runtime de producción (`react-router`, `multer`, `nodemailer`, `jspdf`) MUST estar en una versión sin vulnerabilidades conocidas activas reportadas por `pnpm audit` al momento de este change.

Un bump de versión MUST preservar el comportamiento funcional existente de cada superficie que la dependencia soporta (routing del frontend, subida de adjuntos, envío de emails, exportación a PDF) — este requirement no introduce ni remueve funcionalidad, solo actualiza la versión.

#### Scenario: `pnpm audit` sin hallazgos de runtime tras el bump

- GIVEN las 4 dependencias actualizadas a una versión parcheada
- WHEN se corre `pnpm audit` sobre el workspace
- THEN el reporte MUST NOT incluir vulnerabilidades para `react-router`, `multer`, `nodemailer` ni `dompurify`/`jspdf`

#### Scenario: Navegación del frontend sin regresiones tras el bump de react-router

- GIVEN el frontend con `react-router` actualizado
- WHEN un usuario navega por todas las rutas del menú, alterna dark mode, refresca la página en cualquier pestaña (incluyendo Admin con su tab persistido en la URL) y hace login/logout
- THEN el comportamiento MUST ser idéntico al que tenía antes del bump

#### Scenario: Subida de adjuntos sin regresiones tras el bump de multer

- GIVEN el backend con `multer` actualizado
- WHEN un usuario sube un adjunto a un ticket, tarea o intervención
- THEN el archivo MUST subirse y quedar accesible igual que antes del bump

#### Scenario: Envío de emails sin regresiones tras el bump de nodemailer

- GIVEN el backend con `nodemailer` actualizado
- WHEN el sistema envía un email de recuperación de contraseña o verificación de registro
- THEN el email MUST llegar con el mismo contenido y formato que antes del bump

#### Scenario: Exportación a PDF sin regresiones tras el bump de jspdf

- GIVEN el frontend con `jspdf` actualizado
- WHEN un usuario exporta un PDF desde Activos, ActivoDetalle, Stock o Admin
- THEN el PDF generado MUST tener el mismo contenido y formato que antes del bump
