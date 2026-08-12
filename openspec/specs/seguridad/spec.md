# Seguridad — Especificación (delta): validación de adjuntos, escape de emails y whitelist de schemas

## Purpose

Define el comportamiento requerido para tres controles de seguridad del backend: validación de tipo de archivo en adjuntos, escape de HTML en el contenido de emails salientes, y whitelist estricta de campos mutables en los endpoints de Activo, Componente y Tarea. Incluye además el comportamiento correcto de reasignación de responsables al cambiar el estado de una tarea (bug funcional encontrado en el mismo archivo que se corrige).

---

## Requirements

### Requirement: Whitelist de tipo MIME en adjuntos

El sistema MUST rechazar la subida de cualquier archivo cuyo tipo MIME no pertenezca a una lista explícita de tipos permitidos (imagen, video, audio de subtipos concretos).

La validación MUST ocurrir en el middleware de subida (`multer`), antes de que el archivo llegue al service o se suba a almacenamiento externo.

Un archivo rechazado MUST responder con status 400 y un mensaje descriptivo, sin persistir ningún dato ni subir el archivo a Supabase Storage.

#### Scenario: Subida de imagen de tipo permitido

- GIVEN un usuario autenticado con permiso para adjuntar al recurso (ticket propio, o cualquier ticket/tarea si es `operaciones`/`administrador`)
- WHEN sube un archivo con `Content-Type: image/jpeg`
- THEN el sistema acepta el archivo y lo procesa igual que hoy (sube a Supabase Storage, crea el registro `Adjunto`)

#### Scenario: Subida de archivo HTML disfrazado

- GIVEN un usuario autenticado con permiso para adjuntar al recurso
- WHEN sube un archivo con `Content-Type: text/html` (independientemente del contenido o la extensión del nombre del archivo)
- THEN el sistema MUST responder 400 y MUST NOT subir el archivo a Supabase Storage ni crear ningún registro `Adjunto`

#### Scenario: Subida de tipo no cubierto por la whitelist

- GIVEN un usuario autenticado con permiso para adjuntar al recurso
- WHEN sube un archivo con un `Content-Type` que no está en la lista explícita (ej. `application/pdf`, `application/octet-stream`)
- THEN el sistema MUST responder 400

---

### Requirement: Escape de HTML en contenido interpolado en emails

El sistema MUST escapar los caracteres especiales de HTML (`<`, `>`, `&`, `"`, `'`) en cualquier texto provisto por un usuario antes de interpolarlo en el cuerpo HTML de un email saliente.

Esto aplica a: nombre de usuario, título de tarea, descripción de ticket, y cualquier otro campo de texto libre que se incluya en un template de email a futuro.

#### Scenario: Título de tarea con markup

- GIVEN una tarea con título `Revisar <a href="http://sitio-falso.com">click acá</a>`
- WHEN el sistema envía el email de notificación de tarea asignada
- THEN el HTML recibido MUST mostrar el texto literal (incluyendo `&lt;a href=...&gt;`), MUST NOT renderizarse como un link funcional

#### Scenario: Texto sin caracteres especiales

- GIVEN un ticket con descripción `Impresora del laboratorio 3 sin toner`
- WHEN el sistema envía el email de notificación de ticket asignado
- THEN el texto se muestra sin ninguna alteración visible

---

### Requirement: Whitelist estricta de campos mutables en Activo, Componente y Tarea

El sistema MUST validar y filtrar el body de `POST/PUT /api/activos`, `POST/PUT /api/componentes` y `POST/PUT /api/tareas` contra una lista explícita de campos permitidos por schema Zod, sin usar `.passthrough()` ni equivalentes que permitan campos arbitrarios.

Cualquier campo presente en el body que no esté declarado en el schema MUST ser descartado silenciosamente antes de llegar a Prisma (comportamiento por defecto de Zod sin `.passthrough()`/`.strict()`), sin que esto genere un error para el cliente ni rompa el flujo normal de creación/edición.

El schema de Tarea MUST validar el campo que el service efectivamente consume para la reasignación de responsables al crear/editar (`asignadosNombres`), no un campo no utilizado por ningún flujo real.

#### Scenario: Campo no declarado en el body es ignorado

- GIVEN un usuario con permiso para editar un Activo
- WHEN envía `PUT /api/activos/:id` con un body que incluye `createdAt: "2020-01-01"` además de los campos normales del formulario
- THEN el sistema MUST ignorar `createdAt` silenciosamente y actualizar el Activo solo con los campos declarados en el schema
- AND el `createdAt` real del registro MUST permanecer sin cambios

#### Scenario: Creación normal de Activo/Componente/Tarea sigue funcionando

- GIVEN un usuario con permiso, usando el formulario normal del frontend
- WHEN crea o edita un Activo, Componente o Tarea con los campos habituales
- THEN el sistema MUST aceptar el request y persistir todos los campos enviados por el frontend, sin ningún campo faltante respecto al comportamiento anterior a este cambio

---

### Requirement: Reasignación de responsables al cambiar el estado de una tarea

El endpoint `PATCH /api/tareas/:id/estado` MUST validar y aceptar el campo `asignadosIds` cuando se envía junto con `estado`, y MUST aplicar la reasignación de responsables en la misma operación.

#### Scenario: Cambiar estado y reasignar responsables desde el Kanban

- GIVEN una tarea existente asignada a un usuario A
- WHEN se envía `PATCH /api/tareas/:id/estado` con `{ estado: "en_curso", asignadosIds: ["<id de usuario B>"] }`
- THEN el sistema MUST cambiar el estado de la tarea a `en_curso`
- AND MUST reemplazar los responsables asignados por el usuario B
- AND MUST notificar al usuario B de la nueva asignación

#### Scenario: Cambiar solo el estado sin tocar asignados

- GIVEN una tarea existente asignada a un usuario A
- WHEN se envía `PATCH /api/tareas/:id/estado` con `{ estado: "finalizada" }` (sin `asignadosIds`)
- THEN el sistema MUST cambiar el estado
- AND los responsables asignados MUST permanecer sin cambios
