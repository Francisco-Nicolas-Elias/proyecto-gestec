# Exploration: Auditoría de seguridad 2026-08 (post acceso público)

## Current State

GESTEC ya pasó por 4 rondas previas de auditoría/corrección: `2026-06-26-correccion-auditoria` (22 hallazgos: IDOR, Zod, RBAC, etc.), `2026-08-12-correccion-seguridad-backend` (adjuntos sin whitelist MIME, emails sin escapar, `.passthrough()` en schemas), `2026-08-12-correccion-hallazgos-restantes` (cache stale, Zod en intervenciones/mantenimiento, helmet agregado, `algorithms` explícito en JWT), y esta semana (2026-08-20-*): decisión de acceso público a internet, rate limiting + no-enumeración en `/auth/login`, `trust proxy` condicional, artefactos de deploy, y migración de JWT a cookie httpOnly.

Se verificó código real (no memoria) de: todas las rutas backend y sus middlewares, `auth.service.ts` completo, `app.ts`, dependencias (`pnpm audit` en el workspace completo — es un monorepo pnpm, el audit cubre `backend` y `frontend` juntos), uso real de `xlsx`/`jspdf`/`multer`/`nodemailer`.

**Verificado y descartado como hallazgo** (para no reabrir lo ya corregido):
- RBAC backend: las 9 familias de rutas (`activos`, `componentes`, `tickets`, `tareas`, `stock`, `admin`, `info`, `adjuntos`, `notificaciones`) aplican `router.use(authenticate, ...)` al tope del archivo — no hay ningún endpoint mutador sin autenticación.
- CORS: `origin` cae a string vacía si `FRONTEND_URL` no está seteada en producción (falla cerrado, no wildcard+credentials).
- `express.json()` sin `limit` custom → usa el default de 100kb de body-parser, por lo que la vulnerabilidad de body-parser (bypass de límite inválido) no aplica hoy.
- Módulo "Roles" de `Admin.tsx`: ya es solo lectura (informativo), el CRUD simulado fue eliminado en `2026-08-12-correccion-hallazgos-restantes` (task 3.1).
- `xlsx` en frontend (`Activos.tsx`, `Stock.tsx`) solo se usa para **exportar** (`json_to_sheet`/`writeFile`), nunca para parsear un archivo subido por el usuario. El único parseo real (`import-excel.ts`) es un script standalone de backend, sin endpoint HTTP asociado (confirmado "Out of Scope" en su proposal original) — no es explotable remotamente.
- `nodemailer`: la vulnerabilidad conocida requiere la opción `raw` de `sendMail`, no usada en ningún llamado de `email.ts`.

## Affected Areas

- `backend/src/routes/auth.routes.ts` — 4 endpoints sin rate limiting
- `backend/src/services/auth.service.ts` — enumeración en `registroService`
- `backend/src/routes/admin.routes.ts` — 5 recursos de catálogo sin Zod
- `backend/package.json` / `frontend/package.json` — dependencias con CVEs activos
- `frontend/src/app/pages/*.tsx` (uso de `jspdf`/`dompurify`)

## Hallazgos

| # | Severidad | Archivo:línea | Descripción | Recomendación |
|---|-----------|----------------|--------------|---------------|
| 1 | 🟠 Alto | `backend/src/routes/auth.routes.ts:41-44` | `/registro`, `/recuperar-password`, `/reset-password`, `/verificar/:token` no tienen rate limiting (solo `/login` lo tiene desde el change de la semana pasada). Con acceso público, cualquiera puede spamear emails reales de recuperación/verificación contra la cuenta SMTP institucional (riesgo de que Google marque `noreply@ies21.edu.ar` como spam) o intentar fuerza bruta sobre los tokens. | Reusar `express-rate-limit` con una config más laxa (ej. `windowMs: 15min, max: 5-10`) aplicada a los 4 endpoints. No requiere `skipSuccessfulRequests` porque no hay concepto de "éxito" repetible en la mayoría. |
| 2 | 🟠 Alto | `backend/src/services/auth.service.ts:63-65` | `registroService` responde `409 "El email ya está registrado"` quePermite enumerar qué emails `@ies21.edu.ar` ya tienen cuenta en GESTEC — antes mitigado por ser LAN-only, ahora explotable desde cualquier lugar de internet. | Responder siempre el mismo mensaje genérico ("Si los datos son válidos, vas a recibir un email") independientemente de si el usuario ya existe, igual que ya se hizo en `solicitarRecuperacionService`. Requiere decisión de producto: ¿vale la pena la fricción UX de no decir "ya registrado" explícitamente? (mismo trade-off ya resuelto para login/recuperación). |
| 3 | 🟠 Alto | `frontend/package.json` (`react-router: 7.13.0`) | Múltiples CVEs activos en la versión instalada: DoS no autenticado vía route matching ineficiente, CSRF bypass (acciones ejecutadas antes del 400), XSS vía `javascript:` en redirects RSC, open redirect vía `//` o backslash, arbitrary constructor injection en hidratación SSR. | Bump a `>=7.18.2` (última parcheada al momento del audit). Cambio de versión de librería, sin cambios de código esperados dado que la API pública no cambió entre minors. Verificar manualmente routing tras el bump. |
| 4 | 🟠 Alto | `backend/package.json` (`multer: ^2.1.1`) | DoS vía nombres de campo profundamente anidados en el endpoint de adjuntos (`POST /api/adjuntos`), accesible a cualquier usuario autenticado (incluido `docente_empleado`). | Bump a la versión parcheada más reciente de la serie 2.x. Verificar que la subida de adjuntos siga funcionando tras el update. |
| 5 | 🟡 Medio | `backend/src/routes/admin.routes.ts:24-46` | Los 5 recursos de catálogo (`ubicaciones`, `tipos-componente`, `marcas`, `proveedores`, `areas`) no tienen `validate(schema)` en sus POST/PUT — únicos endpoints mutadores del sistema sin Zod, a diferencia de todo el resto (patrón que las auditorías de junio y agosto sí corrigieron en otros módulos). Requiere rol `administrador`, así que el riesgo real es bajo (solo un admin legítimo o su sesión comprometida), pero un body malformado puede producir un 500 en vez de un 400 descriptivo, o guardar datos con tipos incorrectos. | Crear schemas Zod explícitos para los 5 recursos (son simples: `nombre`, y en el caso de `ubicaciones` también `sector`/`piso`) y aplicar `validate()`, mismo patrón que `usuario.schema.ts`. |
| 6 | 🟡 Medio | `frontend/package.json` (`jspdf`→`dompurify@3.4.3`) | Cadena de dependencias con múltiples XSS/bypass de sanitización moderados en `dompurify` (usado internamente por `jspdf` para el export de PDF en `Activos.tsx`/`ActivoDetalle.tsx`/`Stock.tsx`/`Admin.tsx`). Explotable solo si el PDF embebe HTML con contenido de usuario sin sanitizar antes de pasarlo a `jspdf`. | Confirmar (al implementar) si el export de PDF interpola texto de usuario como HTML; si no, el riesgo es teórico y solo amerita el bump de versión. Si sí, sanitizar/escapar antes. Bump de `jspdf` a una versión que fije `dompurify>=3.4.13`. |
| 7 | 🟡 Medio | `backend/package.json` (`nodemailer: ^8.0.10`) | CVE de SSRF/lectura de archivos vía opción `raw` de `sendMail` — no usada hoy en `email.ts` (mitigante real), pero vale actualizar por higiene y para no dejar la puerta abierta a un uso futuro descuidado de `raw`. | Bump a la última versión estable de la serie 8.x/9.x. Sin cambios de código esperados. |
| 8 | ⚪ Bajo | `frontend/package.json` (`xlsx: ^0.18.5`) | Prototype Pollution + ReDoS conocidos, sin fix publicado en el registro npm (SheetJS solo publica versiones parcheadas en su propio CDN). Uso real en la app es solo de **exportación** (no parsea input no confiable) más un script backend local sin endpoint HTTP — riesgo real bajo hoy. | Opcional: migrar a `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz` como dependencia, o directamente no priorizar dado el uso actual no expone la superficie vulnerable. |
| 9 | ⚪ Bajo | Múltiples (`vite`, `esbuild`, `tar`, `postcss`, `nanoid`, `@babel/core`, `deepmerge-ts`) | El resto de los ~38 hallazgos de `pnpm audit` (1 crítico + varios altos incluidos) son dependencias de build/dev-tooling (Vite dev server, Prisma CLI, empaquetado) que no llegan al bundle ni al runtime de producción. | Actualizar en el próximo `pnpm update` de rutina (ej. al bumpear `vite`/`react-router`/`prisma` mayor), sin urgencia ni change dedicado. |

## Approaches

1. **Un solo change grande** — todos los hallazgos Altos+Medios en un único ciclo SDD, como se hizo en `correccion-auditoria` de junio.
   - Pros: un solo proposal/verify, más simple de trackear.
   - Cons: mezcla cambios de dependencias (riesgo de romper algo) con lógica de negocio (rate limiting/enumeración) — un rollback parcial es más difícil.
   - Effort: Medium.

2. **Dos changes separados** — (a) hardening de auth (rate limiting + no-enumeración en registro) y validación Zod del catálogo admin; (b) actualización de dependencias vulnerables (react-router, multer, nodemailer, jspdf/dompurify).
   - Pros: los bumps de dependencias son mecánicamente distintos (requieren rebuild/test de UI) del hardening de lógica de negocio; separar permite revertir uno sin afectar el otro.
   - Cons: dos ciclos de propose→verify→archive en vez de uno.
   - Effort: Medium.

### Recommendation

Approach 2 (dos changes). Los bumps de `react-router`/`multer`/`nodemailer`/`jspdf` son cambios de versión con riesgo de romper comportamiento visual/funcional (sobre todo `react-router`, que toca todo el routing), mientras que rate limiting + no-enumeración + Zod del catálogo admin son cambios de lógica pura de backend sin dependencias nuevas. Mantenerlos separados facilita el rollback y la verificación manual dirigida (probar routing completo tras el bump de `react-router`, vs. probar los 4 endpoints de auth tras el hardening).

## Risks

- Bump de `react-router` de minor 7.13→7.18 podría tener cambios de comportamiento no documentados en el resumen del CVE — requiere probar navegación completa (todas las rutas, dark mode, refresh, 404).
- Agregar rate limiting a `/registro` podría bloquear a varios docentes registrándose el mismo día desde la misma IP de la institución (NAT) — usar el mismo patrn `skipSuccessfulRequests` no aplica igual de bien acá porque un registro exitoso no se repite; conviene un `max` generoso (ej. 10 en 15 min) para no bloquear el uso legítimo.
- Cambiar el mensaje de "email ya registrado" a uno genérico es un cambio de UX visible — confirmar con el usuario antes de implementar, igual que se hizo con el trade-off de "cuenta bloqueada" en el login.

## Ready for Proposal

Sí. Recomendación: dos changes — `auditoria-seguridad-2026-08-hardening` (hallazgos #1, #2, #5) y `auditoria-seguridad-2026-08-dependencias` (#3, #4, #6, #7, opcionalmente #8). Los hallazgos #9 (dev-only) no ameritan change, solo mención en la memoria del proyecto para el próximo `pnpm update` de rutina.
