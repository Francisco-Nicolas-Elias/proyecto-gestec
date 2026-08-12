# Design: Corrección de seguridad — adjuntos, emails y schemas

## 1. Whitelist de tipo MIME en adjuntos

**Archivo**: `backend/src/routes/adjuntos.routes.ts`

```ts
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new AppError(400, 'Tipo de archivo no permitido'));
  },
});
```

`multer` invoca `cb(err)` cuando el `fileFilter` rechaza un archivo; Express propaga ese error a la cadena de middlewares de error, donde lo captura el `errorHandler` global existente (`AppError` → responde con `statusCode`/`message`). No requiere cambios en `errorHandler` ni en el controller — mismo mecanismo que ya usa el resto del sistema.

`audio/webm` se incluye porque `MultimediaUpload.tsx` graba audio del micrófono con la Web Audio API, que en la mayoría de navegadores produce ese tipo. `video/quicktime` cubre `.mov` de cámaras/celulares.

## 2. Escape de HTML en emails

**Archivo**: `backend/src/lib/email.ts`

```ts
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

Se aplica en el punto de interpolación, no al dato guardado en base — la descripción/título siguen persistiendo tal cual el usuario los escribió (se ven bien en la UI de GESTEC, que ya escapa por defecto al ser React); el escape es exclusivo del render del email.

Puntos de aplicación:
- `sendVerificationEmail(email, nombre, token)` → `escapeHtml(nombre)`
- `sendPasswordResetEmail(email, nombre, token)` → `escapeHtml(nombre)`
- `sendTaskAssignedEmail(email, nombre, tarea, asignadoPor)` → `escapeHtml(nombre)`, `escapeHtml(tarea.titulo)`, `escapeHtml(asignadoPor)`
- `sendTicketAssignedEmail(email, nombre, ticket, asignadoPor)` → `escapeHtml(nombre)`, `escapeHtml(ticket.descripcion)`, `escapeHtml(asignadoPor)`

`asignadoPor` y `nombre` vienen de `Usuario.nombre`, que hoy no tiene ninguna restricción de caracteres a nivel schema — se escapan por la misma razón que cualquier otro texto de usuario.

## 3. Whitelist estricta en schemas

Mecanismo: `validate(schema)` (`validate.middleware.ts`) hace `req.body = schema.parse(req.body)`. Zod, sin `.passthrough()` ni `.strict()`, usa su modo por defecto **"strip"**: el objeto resultante de `.parse()` solo contiene las claves declaradas en el schema — cualquier otra clave del body original desaparece silenciosamente. Es exactamente el comportamiento que ya tiene `ticket.schema.ts` (sin `.passthrough()`) y que evitó tener que agregar ninguna lógica nueva de filtrado en los services.

### 3.1 `activo.schema.ts`

Campos relevados contra `activoPayload()` en `frontend/src/app/services/apiClient.ts` (línea ~224, tras excluir todos los campos que son solo de UI: `sector`, `piso`, `usuario`, `ubicacion`, `codigo`, `tipo`, `marca`, `modelo`, `responsable`, `tags`, `historialMantenimiento`, `ramModulos`, `almacenamientoModulos`, `placaVideo*`, `placaMadre*` — ninguno de estos llega al backend como parte del body de Activo) y contra el modelo `Activo` de `schema.prisma`:

```ts
const activoBase = z.object({
  nroPc: z.string().regex(/^PC\d{2,4}$/, 'Formato inválido — Ej: PC001'),
  ubicacionId: z.string().optional(),
  oficina: z.string().optional(),
  usuarioAsignado: z.string().optional(),
  microModelo: z.string().optional(),
  microMarca: z.string().optional(),
  microNroSerie: z.string().optional(),
  ramTotal: z.string().optional(),
  almacenamientoTotal: z.string().optional(),
  ip: z.string().optional(),
  mac: z.string().optional(),
  idAD: z.string().optional(),
  pAD: z.string().optional(),
  sistemaOperativo: z.string().optional(),
  impresoraModelo: z.string().optional(),
  impresoraMarca: z.string().optional(),
  impresoraNroSerie: z.string().optional(),
  observaciones: z.string().optional(),
  fechaCambioPC: z.string().optional().nullable(),
  fechaUltimoMantenimiento: z.string().optional().nullable(),
  estado: z.enum(['activa', 'inactiva']).optional(),
});

export const createActivoSchema = activoBase;
export const updateActivoSchema = activoBase.partial();
```

Nota: `ubicacionId` queda `.optional()` en ambos (no `.required()`) porque `createActivoService` lo recibe siempre resuelto desde `activoPayload()` en el frontend, pero technically el modelo Prisma lo exige (`ubicacionId String` sin `?`) — si falta, Prisma ya rechaza la creación con su propio error. No se agrega una validación Zod redundante que duplique esa garantía.

### 3.2 `componente.schema.ts`

Ya tenía la lista completa de campos correcta (`idManual`, `tipoComponenteId`, `numeroSerie`, `marcaId`, `modelo`, `proveedorId`, `capacidad`, `activoId`, `responsable`, `codigoExcel` — verificado 1:1 contra `componentePayload()` en el frontend). Único cambio: quitar `.passthrough()`.

### 3.3 `tarea.schema.ts`

Dos problemas a corregir, no solo el `.passthrough()`:

1. El schema declara `asignadoIds` (singular "asignado"), pero **ningún** código lo usa — ni el frontend lo envía, ni `createTareaService`/`updateTareaService` lo leen. Lo que realmente se envía y consume es `asignadosNombres` (ver `tareaPayload()` en el frontend y `tareas.service.ts:59,151`). Con `.passthrough()` esto no se notaba porque `asignadosNombres` pasaba igual sin ser validado; al quitar `.passthrough()` sin corregir esto, `asignadosNombres` quedaría **eliminado** del body y la asignación de responsables al crear/editar tareas dejaría de funcionar — hay que corregir el nombre del campo, no solo quitar `.passthrough()`.

2. `updateTareaEstadoSchema` (usado por `PATCH /:id/estado`) no declara `asignadosIds`, pese a que `tareas.controller.ts:24` lo lee de `req.body` y `updateTaskStatusService` lo usa para reasignar responsables al cambiar el estado desde el Kanban. Como este schema **ya** no tiene `.passthrough()` hoy, `asignadosIds` ya se está descartando en cada request actual — es un bug preexistente, no introducido por este change, que se corrige acá por tocar el mismo archivo.

```ts
export const createTareaSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  ubicacionTexto: z.string().optional().nullable(),
  activoId: z.string().optional().nullable(),
  asignadosNombres: z.array(z.string()).optional(),
  asignadosIds: z.array(z.string()).optional(), // compatibilidad: createTareaService acepta ambos
});

export const updateTareaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['pendiente', 'en_curso', 'finalizada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaLimite: z.string().optional().nullable(),
  ubicacionTexto: z.string().optional().nullable(),
  activoId: z.string().optional().nullable(),
  asignadosNombres: z.array(z.string()).optional(),
});

export const updateTareaEstadoSchema = z.object({
  estado: z.enum(['pendiente', 'en_curso', 'finalizada']),
  asignadosIds: z.array(z.string()).optional(),
});

export const createComentarioTareaSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío'),
});
```

`asignadosIds` se mantiene también en `createTareaSchema`/`updateTareaSchema` porque `createTareaService` (línea 61) acepta `data.asignadosIds ?? []` como primera opción antes de caer a resolver por nombre — dejarlo fuera del schema rompería ese camino si algún caller llega a usarlo (hoy el frontend solo manda `asignadosNombres` en estos dos endpoints, pero el service ya soporta ambos, así que el schema debe reflejar lo que el service acepta, no solo lo que el frontend actual envía).

## No requiere cambios de frontend

Se verificó campo por campo que todo lo que `apiClient.ts` envía hoy en los 3 endpoints (activos, componentes, tareas) está cubierto por las whitelists de arriba. Ningún request legítimo actual cambia de comportamiento.

## No requiere transacción Prisma

Ninguno de los 3 fixes toca lógica de escritura multi-tabla — son cambios de validación/sanitización en la capa de entrada (middleware de multer, schemas Zod) y en la capa de salida (template de email). No aplica `$transaction`.
