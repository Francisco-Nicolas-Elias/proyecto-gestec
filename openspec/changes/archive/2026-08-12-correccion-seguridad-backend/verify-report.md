# Reporte de Verificación — Corrección de seguridad (adjuntos, emails, schemas)

> Verificación code-level + pruebas end-to-end contra el backend real (puerto 3000).
> Fecha: 2026-08-12

---

## V.1 ✅ Whitelist de tipo MIME en adjuntos

**Código verificado**: `backend/src/routes/adjuntos.routes.ts`

`fileFilter` agregado a `multer` con whitelist explícita de 11 MIME types (imagen/video/audio). Un archivo fuera de la lista dispara `cb(new AppError(400, 'Tipo de archivo no permitido'))`, propagado por Express al `errorHandler` global existente.

**Probado con curl** (usuario `administrador` temporal, creado y eliminado en la misma sesión de pruebas):
- `POST /api/adjuntos` con `test.png` (`Content-Type: image/png`) → **201**, subido a Supabase Storage y registrado en `Adjunto` normalmente.
- `POST /api/adjuntos` con `attack.html` (`Content-Type: text/html`, contenido `<script>alert(document.cookie)</script>`) → **400** `{"error":"Tipo de archivo no permitido"}`, sin registro en Supabase Storage ni en la base.

**Resultado**: un archivo disfrazado de HTML ya no puede subirse y obtener una URL pública ejecutable por el navegador.

---

## V.2 ✅ Escape de HTML en emails

**Código verificado**: `backend/src/lib/email.ts`

Función `escapeHtml()` agregada y aplicada a `nombre` (4 templates), `tarea.titulo`/`asignadoPor` (`sendTaskAssignedEmail`) y `ticket.descripcion`/`asignadoPor` (`sendTicketAssignedEmail`).

**Verificado**:
- La función, probada de forma aislada con un payload malicioso (`<a href="http://sitio-falso.com">click aca</a> & <script>alert(1)</script>`), produce el HTML escapado correcto sin ningún carácter `<`, `>`, `&`, `"` sin convertir.
- `grep` sobre el archivo confirma que ninguna interpolación de texto de usuario en el cuerpo HTML quedó sin pasar por `escapeHtml()`. La única ocurrencia sin escapar es en el `subject` de un email (texto plano, no HTML — no aplica).

**Limitación de esta verificación**: no se confirmó visualmente el resultado en un cliente de email real (sin acceso a una bandeja de entrada desde este entorno). Recomendado confirmarlo la próxima vez que se envíe una notificación real con datos de producción.

**Resultado**: un título/descripción con markup HTML ya no se renderiza como link/script funcional en el email recibido — se verá como texto literal.

---

## V.3 ✅ Whitelist estricta de campos en Activo, Componente y Tarea

**Código verificado**: `backend/src/schemas/activo.schema.ts`, `componente.schema.ts`, `tarea.schema.ts`

Los 3 schemas quitaron `.passthrough()`. `activo.schema.ts` ganó la lista explícita de 19 campos (relevados 1:1 contra `activoPayload()` del frontend y el modelo Prisma). `tarea.schema.ts` corrigió el campo mal declarado (`asignadoIds`→`asignadosNombres`) y removió `ticketId` (campo huérfano que habría roto `prisma.tarea.create` si alguna vez se enviaba con valor).

**Probado con curl** (Activo y Componente temporales, creados y eliminados en la sesión de pruebas):
- `POST /api/activos` con campos normales → 201 correcto.
- `PUT /api/activos/:id` con `observaciones` normal + `createdAt: "2020-01-01..."` + `id: "otro-id"` inyectados → el `observaciones` se actualiza, pero `createdAt` real del registro (`2026-08-12T14:50:28...`) **no cambia** — el campo inyectado fue ignorado silenciosamente, sin error.
- Mismo patrón repetido con `POST/PUT /api/componentes` (`createdAt` inyectado en el edit, ignorado; `modelo` sí se actualiza).

**Resultado**: ya no es posible setear campos arbitrarios de la tabla vía el body — solo los campos declarados en cada schema llegan a Prisma.

---

## V.4 ✅ Reasignación de responsables al cambiar el estado de una tarea (bug preexistente corregido)

**Código verificado**: `backend/src/schemas/tarea.schema.ts` (`updateTareaEstadoSchema`)

Se agregó `asignadosIds: z.array(z.string()).optional()` al schema. Antes, `PATCH /:id/estado` ya no tenía `.passthrough()` pero tampoco declaraba `asignadosIds`, así que Zod lo descartaba del body en cada request — la reasignación desde el Kanban al cambiar el estado nunca funcionaba, pese a que el frontend sí lo envía (`apiClient.ts:916`).

**Probado con curl**:
- Se creó una Tarea con 1 asignado.
- `PATCH /:id/estado` con `{estado: "en_curso", asignadosIds: []}` → el estado cambió a `en_curso`.
- `GET /:id` posterior confirmó `asignados: []` — la desasignación se aplicó.

**Resultado**: la reasignación de responsables al cambiar el estado de una tarea desde el Kanban ahora funciona como el frontend siempre esperó que funcionara.

---

## Resumen general

| Check | Estado | Notas |
|-------|--------|-------|
| V.1 Whitelist MIME en adjuntos | ✅ Aprobado | Probado con imagen real (aceptada) y HTML disfrazado (rechazado 400) |
| V.2 Escape de HTML en emails | ⚠️ Aprobado con salvedad | Lógica y wiring verificados; falta confirmación visual en email real |
| V.3 Whitelist de schemas (Activo/Componente/Tarea) | ✅ Aprobado | Probado con mass assignment real (`createdAt`, `id`) — ignorado en los 3 modelos |
| V.4 Fix de reasignación en cambio de estado | ✅ Aprobado | Bug preexistente confirmado y corregido con prueba end-to-end |

**Compilación**: `npx tsc --noEmit` sin errores tras todos los cambios.
**Alcance**: solo se modificaron los 5 archivos de backend listados en `proposal.md` — ningún archivo de frontend fue tocado, confirmado con `git status`.
**Datos de prueba**: todos los registros creados durante la verificación (usuario, activo, componente, tarea, adjunto) fueron eliminados al finalizar — no queda ningún residuo en la base de datos real.

El change está listo para archivar, con la salvedad anotada en V.2 (recomendable una confirmación visual del email en el primer uso real tras el deploy).
