# Tasks: Corrección de seguridad — adjuntos, emails y schemas

> Marcar cada tarea con `[x]` al completarla.
> No requiere fase de Frontend — los 3 fixes son de backend puro, sin cambio de contrato de API.

---

## Fase 1 — Whitelist de tipo MIME en adjuntos

- [x] **1.1** En `adjuntos.routes.ts`: agregar `fileFilter` a la config de `multer` con la whitelist de MIME types del `design.md`
- [x] **1.2** Verificado con curl (usuario admin temporal, borrado al final): subir un `.png` real → 201, se sube a Supabase Storage y se crea el `Adjunto` normalmente
- [x] **1.3** Verificado con curl: subir un archivo con `Content-Type: text/html` → 400 `{"error":"Tipo de archivo no permitido"}`, sin registro en Supabase Storage ni en la base

## Fase 2 — Escape de HTML en emails

- [x] **2.1** En `email.ts`: agregar función `escapeHtml()`
- [x] **2.2** Aplicar `escapeHtml()` a `nombre` en `sendVerificationEmail` y `sendPasswordResetEmail`
- [x] **2.3** Aplicar `escapeHtml()` a `nombre`, `tarea.titulo` y `asignadoPor` en `sendTaskAssignedEmail`
- [x] **2.4** Aplicar `escapeHtml()` a `nombre`, `ticket.descripcion` y `asignadoPor` en `sendTicketAssignedEmail`
- [x] **2.5** ⚠️ Verificación parcial — no se pudo confirmar visualmente en un email recibido real (sin acceso a una bandeja de entrada desde este entorno). Se verificó en su lugar: (a) la función `escapeHtml()` aplicada a un payload malicioso (`<a href="...">`, `<script>`, `&`) produce el HTML escapado correcto sin ningún carácter sin convertir; (b) `grep` sobre `email.ts` confirma que no queda ninguna interpolación de `nombre`/`tarea.titulo`/`ticket.descripcion`/`asignadoPor` sin pasar por `escapeHtml()` en el cuerpo HTML (el único uso sin escapar es en el `subject` de texto plano, donde no aplica). Recomendado: confirmar visualmente en un email real la próxima vez que se cree y asigne una tarea/ticket con datos reales

## Fase 3 — Whitelist estricta en schemas

- [x] **3.1** `activo.schema.ts`: quitar `.passthrough()`, reemplazar por la lista explícita de campos del `design.md`
- [x] **3.2** `componente.schema.ts`: quitar `.passthrough()`
- [x] **3.3** `tarea.schema.ts`: quitar `.passthrough()` de `createTareaSchema`/`updateTareaSchema`, corregir `asignadoIds`→`asignadosNombres`, agregar `asignadosIds` a los tres schemas según corresponda (ver `design.md`). Además se removió `ticketId` (campo huérfano detectado durante la implementación, no existe en el modelo `Tarea` de Prisma ni se usa en el service — no estaba en `design.md`, se documenta acá como desviación menor)
- [x] **3.4** `tarea.schema.ts`: agregar `asignadosIds` a `updateTareaEstadoSchema`
- [x] **3.5** Verificado con curl: crear Activo temporal (`PC9999`) con campos normales → 201 con todos los campos correctos; editar con `observaciones` normal + `createdAt`/`id` inyectados → el update se aplica pero `createdAt`/`id` quedan intactos (ignorados). Activo de prueba borrado al final
- [x] **3.6** Verificado con curl: crear Componente temporal con campos normales → 201 correcto; editar `modelo` + `createdAt` inyectado → `modelo` se actualiza, `createdAt` queda intacto (ignorado). Componente de prueba borrado al final
- [x] **3.7** Verificado con curl: crear Tarea con `asignadosNombres: ["Test Security Review"]` → 201, el array `asignados` resuelve correctamente al usuario por nombre. Tarea de prueba borrada al final (no se probó `updateTareaService` con `asignadosNombres` de forma aislada, pero usa exactamente el mismo mecanismo de resolución que `createTareaService`, ya verificado)
- [x] **3.8** Verificado con curl: `PATCH /:id/estado` con `{estado, asignadosIds: []}` sobre la tarea de prueba (que tenía 1 asignado) → el estado cambia Y los asignados quedan en `[]`, confirmado con un GET posterior. Antes de este fix, `asignadosIds` se descartaba silenciosamente y la desasignación no ocurría
- [x] **3.9** Mismo test que 3.5 (campo `createdAt` inyectado en `PUT /api/activos/:id`, ignorado correctamente)

---

## Verificación final

- [x] **V.1** Todas las verificaciones de arriba se hicieron en una sola pasada con curl contra el backend real (puerto 3000), usando un usuario `administrador` temporal creado y eliminado al finalizar
- [x] **V.2** Ningún flujo existente quedó roto — todas las creaciones/ediciones probadas devolvieron los datos esperados; `npx tsc --noEmit` sin errores
- [x] **V.3** Confirmado con `git status` — solo se modificaron los 5 archivos de backend listados en `proposal.md`, ningún archivo de `frontend/` fue tocado
