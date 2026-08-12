# Design: Corrección de hallazgos importantes y menores

## 1. Cache client-side (`frontend/src/app/services/apiClient.ts`)

### 1.1 `createTarea`
Agregar `cacheInvalidate('tareas')` al inicio de la función, igual que `updateTarea`/`deleteTarea` ya hacen.

### 1.2 Comentarios de tickets y tareas
`addComentario`, `updateComentarioTicket`, `deleteComentarioTicket` → `cacheInvalidate('tickets')`.
`addComentarioTarea`, `updateComentarioTarea`, `deleteComentarioTarea` → `cacheInvalidate('tareas')`.

### 1.3 Componente → Activos
`createComponente`, `updateComponente`, `deleteComponente`: agregar `'activos'` a la llamada existente de `cacheInvalidate('componentes', 'stock')` → `cacheInvalidate('componentes', 'stock', 'activos')`.

## 2. Validación Zod en intervenciones y mantenimiento

**Archivos nuevos**: `backend/src/schemas/intervencion.schema.ts`, `backend/src/schemas/mantenimiento.schema.ts`

Campos relevados contra `createIntervencionService`/`addMantenimientoService` (`activos.service.ts`):

```ts
// intervencion.schema.ts
import { z } from 'zod';

export const createIntervencionSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  diagnostico: z.string().min(1, 'El diagnóstico es requerido'),
  accion: z.string().min(1, 'La acción es requerida'),
  tecnico: z.string().min(1, 'El técnico es requerido'),
  tiempoEstimado: z.number().optional(),
  tiempoReal: z.number().optional(),
  resultado: z.string().min(1, 'El resultado es requerido'),
  comentarios: z.string().optional(),
  repuestos: z.array(z.object({
    item: z.string().min(1),
    cantidad: z.number(),
    stockItemId: z.string().optional(),
  })).default([]),
});
```

```ts
// mantenimiento.schema.ts
import { z } from 'zod';

export const createMantenimientoSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  tecnico: z.string().min(1, 'El técnico es requerido'),
});
```

En `activos.routes.ts`:
```ts
router.post('/:id/intervenciones', isOperaciones, validate(createIntervencionSchema), ctrl.createIntervencion);
router.post('/:id/mantenimiento', isOperaciones, validate(createMantenimientoSchema), ctrl.addMantenimiento);
```

## 3. Dashboard: fallo parcial visible

**Archivo**: `frontend/src/app/pages/Dashboard.tsx`

Reemplazar `Promise.all` por `Promise.allSettled`, aplicar cada resultado por separado y avisar de los que fallaron:

```ts
const loadDashboardData = async () => {
  const results = await Promise.allSettled([
    hasPermission('activos') ? getActivos() : Promise.resolve([]),
    getTickets(),
    hasPermission('tareas') ? getTareas() : Promise.resolve([]),
    hasPermission('stock')  ? getStock()  : Promise.resolve([]),
  ]);
  const [activosR, ticketsR, tareasR, stockR] = results;
  const labels = ['Equipos', 'Tickets', 'Tareas', 'Stock'];
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? labels[i] : null))
    .filter(Boolean);

  if (activosR.status === 'fulfilled') setAllActivos(activosR.value);
  if (ticketsR.status === 'fulfilled') setAllTickets(ticketsR.value);
  if (tareasR.status === 'fulfilled') setAllTareas(tareasR.value);
  if (stockR.status === 'fulfilled') setAllStock(stockR.value);

  if (failed.length > 0) {
    console.error('Error loading dashboard sections:', failed);
    toast.error(`No se pudo cargar: ${failed.join(', ')}`);
  }

  if (hasPermission('admin')) {
    try { setLogs((await getLogs()).slice(0, 10)); }
    catch (e) { console.error('Error loading logs:', e); toast.error('No se pudieron cargar los logs recientes'); }
  }

  setLoading(false);
};
```

Requiere agregar `import { toast } from 'sonner@2.0.3';` (no estaba importado en este archivo).

Nota: las secciones que fallan mantienen su estado anterior (array vacío en la carga inicial, o el último valor bueno conocido si es un refetch por `onActivosChange`) — no se pisan con datos falsos, solo se avisa que no se actualizaron.

## 4. Permiso en `ActivoForm.tsx` / `RegistrarIntervencion.tsx`

Mismo patrón que `NuevoComponenteForm.tsx:60-62`:

```ts
// ActivoForm.tsx — agregar import { useAuth } from '../components/AuthContext';
const { hasPermission, loading: authLoading } = useAuth();
useEffect(() => {
  if (!authLoading && !hasPermission('activos')) navigate('/activos', { replace: true });
}, [authLoading]);
```

```ts
// RegistrarIntervencion.tsx — ya importa useAuth, agregar hasPermission/authLoading a la desestructuración
const { usuario, hasPermission, loading: authLoading } = useAuth();
useEffect(() => {
  if (!authLoading && !hasPermission('activos')) navigate('/activos', { replace: true });
}, [authLoading]);
```

## 5. `asignadosIds` restringido a staff al crear ticket

**Archivo**: `backend/src/services/tickets.service.ts` (`createTicketService`)

```ts
const { asignadosIds, ...rest } = data;

let asignadosValidos: string[] = [];
if (asignadosIds?.length) {
  const staff = await prisma.usuario.findMany({
    where: { id: { in: asignadosIds }, rol: { in: [Rol.administrador, Rol.operaciones] } },
    select: { id: true },
  });
  asignadosValidos = staff.map((u) => u.id);
}

const ticket = await prisma.ticket.create({
  data: {
    ...rest,
    creadorId,
    estado: EstadoTicket.nuevo,
    asignados: { create: asignadosValidos.map((usuarioId) => ({ usuarioId })) },
  },
  include: { creador: { omit: { password: true } }, ...TICKET_ASIGNADOS_INCLUDE },
});
```

`updateTicketService` no necesita el mismo fix — ya bloquea `docente_empleado` de tocar `asignadosIds` por completo (línea 105-107), y solo staff llega a esa rama.

## 6. Stock: permiso correcto en botones

**Archivo**: `frontend/src/app/pages/Stock.tsx:557,567` — reemplazar `hasPermission('admin')` por `hasPermission('stock')` en los dos botones (editar/eliminar componente).

## 7. Código muerto de "Roles" en `Admin.tsx`

Eliminar:
- Estado: `showRolModal`, `editingRol`, `showDeleteRolModal`, `rolToDelete`, `rolFormData`/`setRolFormData`/`clearRolFormDataPersistence` (línea ~102-106), y el `useFormPersistence('gestec:admin:rol:new', INIT_ROL)` asociado.
- `INIT_ROL` (constante a nivel de módulo, queda sin uso).
- El `useEffect` de inicialización del form de Rol (~349-361).
- Handlers: `openNuevoRol`, `handleEditRol`, `closeRolModal`, `handleSubmitRol`, `togglePermiso`, `confirmDeleteRol` (~363-433).
- Los dos `<Modal>` de Rol en el JSX (~1594-1670: "Modal Rol" y "Modal Eliminar Rol").

Mantener: `roles` (cambia a `const [roles] = useState([...])`, sin setter ya que nada lo muta tras el cleanup), el render de solo-lectura de la pestaña Roles (~794-840), `PERMISOS_DISPONIBLES`, `Shield`/`Check` (siguen usados por el render de solo lectura).

## 8. `uploadFile()` con try/catch de red

**Archivo**: `frontend/src/app/services/http.ts`

```ts
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('gestec_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new Error('Sin conexión con el servidor. Verificá tu red e intentá nuevamente.');
  }
  if (res.status === 401) { /* ...igual que hoy... */ }
  // ...resto igual...
}
```

## 9. Ownership en borrado de comentario de tarea

**Archivo**: `backend/src/services/tareas.service.ts`

```ts
export async function deleteComentarioTareaService(
  comentarioId: string,
  usuarioId: string,
  usuarioRol: string,
  usuarioNombre: string,
) {
  const comentario = await prisma.comentarioTarea.findUnique({ where: { id: comentarioId }, select: { autorId: true } });
  if (!comentario) throw new AppError(404, 'Comentario no encontrado');
  if (usuarioRol !== 'administrador' && comentario.autorId !== usuarioId) {
    throw new AppError(403, 'No podés eliminar comentarios ajenos');
  }
  await prisma.comentarioTarea.delete({ where: { id: comentarioId } });
  await addLogService(`Comentario de tarea eliminado`, 'Tareas', usuarioNombre, usuarioRol);
}
```

`tareas.controller.ts:deleteComentario` debe pasar `req.user!.id` y `req.user!.rol` (hoy solo pasa `usuario!.nombre` y `usuario!.rol` — falta el `id`).

## 10. `helmet`

**Archivo**: `backend/src/app.ts` — `npm install helmet` en `backend/`, luego:

```ts
import helmet from 'helmet';
// ...
app.use(helmet());
```

Colocado antes de `cors()` o después indistintamente (no interfieren) — se coloca junto a los demás `app.use()` globales al inicio.

## 11. JWT: algoritmo explícito + tipado de expiresIn

**Archivo**: `backend/src/middlewares/auth.middleware.ts`
```ts
const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
```

**Archivo**: `backend/src/services/auth.service.ts` — reemplazar el cast `as any` por un tipo más preciso:
```ts
const token = jwt.sign(
  { sub: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
  secret,
  { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as jwt.SignOptions['expiresIn'] },
);
```

## 12. Validación Zod en `PUT /api/info`

**Archivo nuevo**: `backend/src/schemas/info.schema.ts`
```ts
import { z } from 'zod';

export const updateInfoSchema = z.object({
  telefono: z.string(),
  telefonoInterno: z.string(),
  horariosAtencion: z.string(),
  emails: z.array(z.string().email()),
});
```

**Archivo**: `backend/src/routes/info.routes.ts`
```ts
router.put('/', authenticate, isAdmin, validate(updateInfoSchema), updateInfo);
```

## 13. Límite de tamaño en `MultimediaUpload.tsx`

```ts
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB, igual al límite del backend

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const tooLarge = files.find(f => f.size > MAX_FILE_SIZE);
  if (tooLarge) {
    toast.error(`"${tooLarge.name}" supera el límite de 50MB`);
    if (fileInputRef.current) fileInputRef.current.value = '';
    return;
  }
  // ...resto igual...
};
```//NB: revisar si `toast` ya está importado en este archivo; si no, agregar `import { toast } from 'sonner@2.0.3';`.

## 14. `TicketDetalle.tsx`: quitar import dinámico redundante

```ts
// Antes:
const updated = await import('../services/apiClient').then(m => m.getTicketById(id!));
// Después (getTicketById ya está importado estáticamente arriba):
const updated = await getTicketById(id!);
```

## 15. `NotificationBell.tsx`: fix de closure desactualizado

Reemplazar la comparación basada en `notifications.length` (capturado en closure) por un `useRef` actualizado en cada carga:

```ts
const prevNewTicketsCountRef = useRef(0);

const loadNotifications = async () => {
  try {
    const [tickets, notifs] = await Promise.all([getTickets(), getNotificaciones()]);
    const todosNuevos = tickets.filter((t: any) => t.estado === 'nuevo');
    dismissedIds.current = purgeDismissed(todosNuevos.map((t: any) => t.id));
    const newTickets = todosNuevos.filter((t: any) => !dismissedIds.current.has(t.id));

    const previousCount = prevNewTicketsCountRef.current;
    const currentCount = newTickets.length;
    if (currentCount > previousCount && previousCount > 0) {
      const newReports = newTickets.slice(0, currentCount - previousCount);
      await sendNotificationEmail({ to: auth?.usuario?.email || '', reportes: newReports, usuarioNombre: auth?.usuario?.nombre || '' });
    }
    prevNewTicketsCountRef.current = currentCount;

    setNotifications(newTickets);
    setTareaNotifs(notifs.filter((n) => !n.leida));
    setUnreadCount(newTickets.length + notifs.filter((n) => !n.leida).length);
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
};
```

## No requiere transacción Prisma nueva

Ninguno de los 17 items toca lógica de escritura multi-tabla más allá de lo que ya existe.

## No requiere cambios de contrato de API salvo lo documentado

Los nuevos schemas Zod (intervenciones, mantenimiento, info) validan exactamente los campos que el frontend ya envía — verificado contra `RegistrarIntervencion.tsx` y `Informacion.tsx` antes de escribir cada schema.
