# Proposal: Corrección de hallazgos de seguridad — adjuntos, emails y validación de schemas

## Intent

Durante una auditoría de código previa a producción (revisión manual + dos agentes de exploración sobre backend y frontend completos), se detectaron 3 problemas de seguridad reales que sobreviven independientemente de que el sistema quede restringido a la red interna del instituto — porque cualquier usuario autenticado (no necesita ser administrador) puede explotarlos:

1. Los adjuntos de tickets/tareas se suben a Supabase Storage sin validar el tipo de archivo real — se puede subir un `.html` con script embebido y obtener una URL pública que el navegador ejecuta como HTML.
2. El texto que escribe un usuario (título de tarea, descripción de ticket) se interpola sin escapar en el HTML de los emails de notificación — permite inyectar links falsos que llegan desde una dirección `@ies21.edu.ar` legítima.
3. Los schemas Zod de `Activo`, `Componente` y `Tarea` usan `.passthrough()`, que deja pasar sin validar cualquier campo del body hacia Prisma — el mismo patrón que la auditoría de junio (`correccion-auditoria`) corrigió específicamente para `Ticket`, pero no se extendió al resto.

Durante el diseño de la corrección del punto 3 se encontró además un bug funcional no relacionado a seguridad: `PATCH /api/tareas/:id/estado` no valida `asignadosIds` en su schema, por lo que ese campo se descarta silenciosamente en cada request — la reasignación de responsables al cambiar el estado de una tarea desde el Kanban nunca funciona, aunque el frontend sí lo envía. Se corrige en el mismo change por tocar exactamente el mismo archivo.

Los 22 hallazgos de la auditoría de junio (`correccion-auditoria`) siguen vigentes y sin regresiones — este change no los toca. Tampoco toca el hallazgo de `pAD` (contraseña AD de equipos), descartado explícitamente por decisión del usuario. Tampoco implementa rate limiting por IP en `/auth/login` — descartado tras evaluar que el sistema quedará restringido a la red interna del instituto, lo que reduce ese riesgo específico a un escenario de amenaza interna de baja probabilidad.

## Scope

### In Scope
- Whitelist de tipo MIME en la subida de adjuntos (`multer.fileFilter`), rechazando cualquier archivo que no sea imagen/video/audio de un subtipo permitido.
- Función de escape de HTML aplicada a todo texto de usuario interpolado en los templates de email (`email.ts`).
- Reemplazo de `.passthrough()` por listas explícitas de campos permitidos en `activo.schema.ts`, `componente.schema.ts` y `tarea.schema.ts`.
- Corrección del nombre de campo mal declarado en `tarea.schema.ts` (`asignadoIds` → `asignadosNombres`, el que realmente consume el service).
- Corrección del bug de reasignación silenciosamente descartada en `PATCH /api/tareas/:id/estado`.

### Out of Scope
- Rate limiting por IP en endpoints de auth (evaluado y descartado — ver Intent).
- Cifrado de `pAD` (descartado explícitamente por el usuario en sesión previa).
- Cualquier cambio de frontend — los 3 fixes son puramente de validación/sanitización del lado del backend y no cambian ningún contrato de API ni requieren tocar `apiClient.ts` (los campos que el frontend ya envía hoy son exactamente los que quedan whitelisteados).
- Rate limiting en `/registro`/`/recuperar-password` (relacionado pero no forma parte de los 3 puntos acordados).

## Approach

1. **Adjuntos**: agregar `fileFilter` a la configuración de `multer` en `adjuntos.routes.ts`. Lista blanca de MIME types concretos (no wildcards como `image/*`, sino subtipos explícitos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/webm`). Un archivo rechazado devuelve `AppError(400, ...)`, capturado por el `errorHandler` global ya existente.
2. **Emails**: función `escapeHtml()` en `backend/src/lib/email.ts` (reemplaza `<`, `>`, `&`, `"`, `'` por sus entidades HTML). Se aplica a todo valor de texto de usuario interpolado en los 4 templates existentes (nombre, título de tarea, descripción de ticket).
3. **Schemas**: quitar `.passthrough()` de los 3 schemas y declarar explícitamente cada campo que el service realmente consume (relevado campo por campo contra `activoPayload`/`componentePayload`/`tareaPayload` del frontend y los services del backend, documentado en `design.md`). Al no declarar `.passthrough()` ni `.strict()`, Zod usa su modo por defecto ("strip"): cualquier campo no declarado se descarta silenciosamente del body ya parseado, sin romper requests legítimos — mismo comportamiento que ya tiene `ticket.schema.ts` hoy.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/routes/adjuntos.routes.ts` | Modified | `fileFilter` con whitelist de MIME types en multer |
| `backend/src/lib/email.ts` | Modified | Helper `escapeHtml()` aplicado a interpolaciones de texto de usuario |
| `backend/src/schemas/activo.schema.ts` | Modified | Quitar `.passthrough()`, whitelist explícita de campos |
| `backend/src/schemas/componente.schema.ts` | Modified | Quitar `.passthrough()` (ya tenía la lista de campos) |
| `backend/src/schemas/tarea.schema.ts` | Modified | Quitar `.passthrough()`, corregir `asignadoIds`→`asignadosNombres`, agregar `asignadosIds` a `updateTareaEstadoSchema` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Al quitar `.passthrough()`, algún campo que el frontend sí envía hoy queda fuera del whitelist y rompe un flujo existente (creación/edición de Activo/Componente/Tarea) | Baja | Se relevó exactamente qué campos manda cada payload builder del frontend (`activoPayload`, `componentePayload`, `tareaPayload` en `apiClient.ts`) antes de armar cada whitelist — documentado campo por campo en `design.md`. Verificación manual de los 3 formularios como parte de las tasks |
| El `fileFilter` de multer es demasiado restrictivo y bloquea un formato legítimo que hoy se usa (ej. un formato de audio/video específico de algún dispositivo) | Baja-Media | Whitelist basada en los tipos que efectivamente puede producir el componente `MultimediaUpload.tsx` del frontend (foto/video de cámara, audio de mic) más formatos comunes de archivo subido manualmente (jpg, png, mp4). Si aparece un caso real no cubierto, se agrega el MIME type puntual — no requiere rediseño |
| El escape de HTML en emails corrompe visualmente algún texto legítimo que use caracteres como `&` o comillas | Baja | El escape solo convierte a entidades HTML equivalentes (`&amp;`, `&quot;`, etc.), que los clientes de email renderizan de vuelta como el carácter original — no hay pérdida de información visible |

## Rollback Plan

Cambios acotados a 5 archivos del backend, sin migración de base de datos ni cambio de contrato de API. Revertible con `git revert` del commit sin ninguna dependencia externa. Si el `fileFilter` bloquea un tipo de archivo legítimo en producción, se puede ampliar la whitelist con un cambio de una línea sin rollback completo.

## Dependencies

Ninguna dependencia nueva — se usa `multer` (ya instalado) y una función de escape HTML escrita a mano (no amerita traer una librería para 5 líneas de código).

## Success Criteria

- [ ] Subir un archivo `.html`/`.svg` (con `Content-Type` falseado a `text/html`) a un ticket/tarea devuelve 400 y no se almacena.
- [ ] Subir una imagen/video/audio real de un tipo permitido sigue funcionando exactamente igual que antes.
- [ ] Un ticket/tarea con `<script>`/`<a href=...>` en su descripción/título dispara un email donde ese texto aparece literal (escapado), no como HTML/link funcional.
- [ ] Crear y editar un Activo, Componente y Tarea desde los formularios normales del frontend sigue funcionando sin cambios visibles para el usuario.
- [ ] Un body con un campo no declarado en el schema (ej. `createdAt` manipulado) es ignorado silenciosamente, no llega a Prisma.
- [ ] Reasignar responsables de una tarea al cambiar su estado desde el Kanban actualiza efectivamente los asignados (antes no funcionaba).
