# Design: Unificar Intervención y Mantenimiento en historial automático de Editar Equipo

## Technical Approach

El diff de campos se calcula en el **frontend** (`ActivoForm.tsx`), no en el backend: al entrar en modo edición ya se tiene el `activo` original cargado (`getActivoById`) y, al momento de guardar, se tiene el `form` final. Comparar ambos ahí es directo y evita duplicar lógica de comparación en el backend (que además no ve los cambios de componentes RAM/almacenamiento/placaVideo/placaMadre, porque esos se resuelven con llamadas separadas a `updateComponente` después del `PUT /activos/:id`, según el patrón ya existente). El backend solo persiste lo que el frontend ya calculó: recibe `cambios: string[]` + `repuestos: {...}[]` en el mismo body de `PUT /activos/:id`, y dentro de la misma `$transaction` del update crea el `HistorialEquipo` y descuenta stock — reutilizando exactamente el patrón transaccional que ya tenía `createIntervencionService`.

## Architecture Decisions

### Decision: Un solo modelo `HistorialEquipo` con `cambios String[]`, en vez de una fila por campo modificado

**Choice**: Cada guardado con cambios genera **una** fila en `HistorialEquipo`, con un array de strings (`cambios`) que describe cada modificación individual.
**Alternatives considered**: (a) una tabla `CambioHistorial` con una fila por campo modificado (más "normalizado" pero innecesario, nadie va a filtrar/reportar por campo individual); (b) guardar el diff como JSON libre.
**Rationale**: Postgres soporta arrays nativos y Prisma los mapea directo a `String[]`, sin tabla intermedia. Es exactamente lo que se necesita para mostrarlo en el detalle y en el PDF (una lista de líneas de texto por evento de guardado). Se mantiene una tabla aparte (`RepuestoHistorial`) solo para los repuestos porque esos SÍ tienen estructura propia (ítem + cantidad) que ya se usa para el descuento de stock — reutiliza el mismo patrón que tenía `RepuestoIntervencion`.

### Decision: El diff se calcula en el frontend, el backend solo persiste

**Choice**: `ActivoForm.tsx` calcula `cambios: string[]` antes de llamar a `updateActivo`, y lo manda como parte del payload.
**Alternatives considered**: Calcular el diff en `updateActivoService` comparando `prisma.activo.findUnique` (antes) contra `data` (después).
**Rationale**: El backend NO ve los cambios de RAM/almacenamiento/placaVideo/placaMadre en el mismo request — esos son componentes vinculados vía `activoId` en llamadas aparte a `PUT /componentes/:id`, que se disparan DESPUÉS de que `updateActivo` ya resolvió (ver `ActivoForm.tsx:syncModulos` y el sync de placaVideo/placaMadre, ya existente). Si el backend intentara diffear, no tendría visibilidad de esos cambios de componentes en el momento del `PUT /activos/:id`. El frontend, en cambio, tiene el estado completo (antes y después) de absolutamente todo, componentes incluidos, en el mismo lugar donde ya arma esas llamadas de sync.

### Decision: Reutilizar `PUT /api/activos/:id` en vez de un endpoint nuevo

**Choice**: Extender el body de `PUT /activos/:id` con `cambios?: string[]` y `repuestos?: {item, cantidad, stockItemId}[]` opcionales, en vez de crear `POST /activos/:id/historial`.
**Alternatives considered**: Endpoint separado para el historial, llamado después del `PUT` (igual que hoy `POST /activos/:id/intervenciones` es una llamada aparte).
**Rationale**: El objetivo explícito del cambio es que sea **una sola acción de guardado** (Editar Equipo), no dos llamadas encadenadas. Meterlo en la misma transacción del `PUT` garantiza atomicidad: si falla el descuento de stock, el equipo tampoco se actualiza a medias.

### Decision: Repuestos con stock insuficiente abortan toda la transacción

**Choice**: Si algún repuesto pedido no tiene stock suficiente, se lanza `AppError` y se aborta la transacción completa (ni se actualiza el equipo, ni se descuenta nada, ni se crea historial).
**Alternatives considered**: Descontar lo que se pueda y avisar con warning.
**Rationale**: Mismo comportamiento que ya tenía el flujo de Intervención (`RegistrarIntervencion` + `createIntervencionService`, que corre todo dentro de un único `$transaction`). Consistente con la Requirement de la spec ("no MUST dejar el stock en negativo ni guardar el equipo a medias").

## Data Flow

```
ActivoForm.tsx (guardar)
  │
  ├─ 1. calcularCambios(activoOriginal, formFinal)  ──► cambios: string[]
  │
  ├─ 2. payload = { ...activoPayload(form), cambios, repuestos }
  │
  ├─ 3. PUT /api/activos/:id  ──────────────────────────────────┐
  │                                                              ▼
  │                                          updateActivoService (backend)
  │                                            $transaction:
  │                                              a) tx.activo.update(...)
  │                                              b) if (cambios.length || repuestos.length):
  │                                                   tx.historialEquipo.create({ cambios, repuestos: {create: [...]} })
  │                                              c) for each repuesto con stockItemId:
  │                                                   tx.stockItem.update({ cantidad: {decrement} })  ── error si cantidad < 0
  │                                                   tx.stockMovimiento.create({ tipo: salida, referenciaHistorial })
  │
  ├─ 4. (igual que hoy) sync de componentes: updateComponente(...) para placaVideo/placaMadre/RAM/almacenamiento
  │
  └─ 5. toast.success + navigate('/activos')

ActivoDetalle.tsx (ver equipo)
  │
  └─ GET /api/activos/:id  ──► incluye `historial: HistorialEquipo[]` (con `repuestos`)
       └─ Render: lista "Historial" (fecha, técnico, cambios[], repuestos[]) + export PDF
```

## File Changes

| File | Action | Description |
|------|--------|--------------|
| `backend/prisma/schema.prisma` | Modify | Eliminar `Intervencion`, `RepuestoIntervencion`, `MantenimientoRecord` y sus relaciones en `Activo` (`intervenciones`, `mantenimientos`). Agregar `HistorialEquipo` + `RepuestoHistorial`, relación `historial HistorialEquipo[]` en `Activo`. |
| `backend/src/schemas/activo.schema.ts` | Modify | Agregar `cambios: z.array(z.string()).optional()` y `repuestos: z.array(z.object({item, cantidad, stockItemId?})).optional()` a `updateActivoSchema` (no a `createActivoSchema` — Crear Equipo no lleva repuestos ni cambios). |
| `backend/src/schemas/intervencion.schema.ts` | Delete | Ya no se usa. |
| `backend/src/schemas/mantenimiento.schema.ts` | Delete | Ya no se usa. |
| `backend/src/services/activos.service.ts` | Modify | `updateActivoService` pasa a recibir `cambios`/`repuestos`, correr todo dentro de `$transaction`, crear `HistorialEquipo` + descontar stock. Eliminar `createIntervencionService`, `getIntervencionesService`, `addMantenimientoService`. `getActivoByIdService` cambia el `include` de `intervenciones`/`mantenimientos` a `historial: { include: { repuestos: true }, orderBy: { fecha: 'desc' } }`. |
| `backend/src/controllers/activos.controller.ts` | Modify | Eliminar `getIntervenciones`, `createIntervencion`, `addMantenimiento`. |
| `backend/src/routes/activos.routes.ts` | Modify | Eliminar las 3 rutas de intervenciones/mantenimiento y sus imports de schema. |
| `frontend/src/app/pages/ActivoForm.tsx` | Modify | Nueva sección "Repuestos utilizados" (solo `isEdit`), función `calcularCambios()`, extender el payload de `handleSubmit` con `cambios`/`repuestos`. |
| `frontend/src/app/pages/ActivoDetalle.tsx` | Modify | Sacar botones Intervención/Mantenimiento y sus modales. Nueva sección "Historial" leyendo `activo.historial`. Actualizar `exportarPDF` para usar `historial` en vez de `intervenciones`/`mantenimientos`. |
| `frontend/src/app/pages/RegistrarIntervencion.tsx` | Delete | Reemplazado por la sección dentro de `ActivoForm.tsx`. |
| `frontend/src/app/routes.tsx` | Modify | Eliminar la ruta `activos/:id/intervencion` (o el path que use hoy) y su import. |
| `frontend/src/app/services/apiClient.ts` | Modify | Eliminar `getIntervenciones`, `createIntervencion`, `addMantenimientoRecord` y sus tipos. Agregar tipo `HistorialEquipoEntry` (fecha, tecnico, cambios, repuestos), extender `mapActivo` para mapear `historial`, extender `activoPayload`/`updateActivo` para incluir `cambios`/`repuestos` sin que se filtren del payload (a diferencia de `ramModulos`/`almacenamientoModulos`, que sí deben seguir filtrándose porque no son campos directos del modelo `Activo`). |

## Interfaces / Contracts

### Prisma schema

```prisma
model HistorialEquipo {
  id          String   @id @default(cuid())
  activoId    String
  activo      Activo   @relation(fields: [activoId], references: [id], onDelete: Cascade)
  fecha       DateTime @default(now())
  tecnico     String
  cambios     String[]

  repuestos RepuestoHistorial[]

  @@map("historial_equipo")
}

model RepuestoHistorial {
  id          String          @id @default(cuid())
  historialId String
  historial   HistorialEquipo @relation(fields: [historialId], references: [id], onDelete: Cascade)
  item        String
  cantidad    Int

  @@map("repuestos_historial")
}
```

En `model Activo`: reemplazar

```prisma
  mantenimientos MantenimientoRecord[]
  intervenciones Intervencion[]
```

por

```prisma
  historial HistorialEquipo[]
```

Requiere `pnpm db:push` (no `db:migrate`, siguiendo la nota de drift ya documentada en `CLAUDE.md`).

### `PUT /api/activos/:id` — body extendido

```ts
{
  // ...todos los campos existentes de updateActivoSchema...
  cambios?: string[];               // ej: ["Estado: activa → inactiva", "RAM: agregado módulo Kingston 8GB"]
  repuestos?: {
    item: string;                   // nombre del ítem de stock, para mostrar en el historial
    cantidad: number;
    stockItemId?: string;           // si viene, se descuenta stock; si no, solo queda registrado (repuesto "manual")
  }[];
}
```

### `updateActivoService` (backend) — pseudocódigo

```ts
export async function updateActivoService(id, data, usuarioNombre, usuarioRol) {
  const { cambios, repuestos, ...activoData } = data;

  return prisma.$transaction(async (tx) => {
    const activo = await tx.activo.update({ where: { id }, data: activoData, include: { ubicacion: true } });

    if ((cambios?.length ?? 0) > 0 || (repuestos?.length ?? 0) > 0) {
      await tx.historialEquipo.create({
        data: {
          activoId: id,
          tecnico: usuarioNombre,
          cambios: cambios ?? [],
          repuestos: { create: (repuestos ?? []).map(r => ({ item: r.item, cantidad: r.cantidad })) },
        },
      });
    }

    for (const r of (repuestos ?? []).filter(r => r.stockItemId)) {
      const item = await tx.stockItem.findUnique({ where: { id: r.stockItemId! } });
      if (!item || item.cantidad < r.cantidad) {
        throw new AppError(400, `Stock insuficiente para "${r.item}"`);
      }
      await tx.stockItem.update({
        where: { id: r.stockItemId! },
        data: { cantidad: { decrement: r.cantidad }, ultimaActualizacion: new Date() },
      });
      await tx.stockMovimiento.create({
        data: {
          stockItemId: r.stockItemId!,
          tipo: TipoMovimientoStock.salida,
          cantidad: r.cantidad,
          motivo: `Repuesto usado en equipo ${activo.nroPc}`,
          usuarioId: /* req.user.id, pasado como parámetro adicional */,
        },
      });
    }

    await addLogService(`Equipo "${activo.nroPc}" editado`, 'Equipos', usuarioNombre, usuarioRol);
    return activo;
  });
}
```

Nota: `addLogService` ya se llama hoy en `updateActivoService` — se mantiene igual, es el log de auditoría de Admin (`LogEntry`), un concepto distinto del nuevo `HistorialEquipo` (que es specific del equipo, visible en su detalle).

### `calcularCambios()` (frontend, en `ActivoForm.tsx`) — algoritmo

Recibe el `activo` original (cargado al entrar a editar) y el `form` final (justo antes de armar el payload de submit):

1. **Campos simples** (comparación directa string/string, con etiquetas legibles): `sector`, `oficina`, `usuario`, `microMarca+microModelo+microNroSerie` (como bloque "Procesador"), `placaMadreMarca+Modelo+NroSerie`, `placaVideoMarca+Modelo+NroSerie+Capacidad`, `ip`, `mac`, `idAD`, `sistemaOperativo`, `impresoraMarca+Modelo+NroSerie`, `observaciones`, `fechaCambioPC`, `fechaUltimoMantenimiento`, `estado`. Para cada uno: si `original !== nuevo` y no es password (`pAD` NO se compara ni se loguea el valor plano, solo si cambió: `"P AD actualizado"`), agregar línea `"{Etiqueta}: {viejo} → {nuevo}"` (si el viejo estaba vacío, `"{Etiqueta}: {nuevo}"`).
2. **RAM / Almacenamiento** (arrays, comparados por `nroSerie`): módulos en `form` cuyo `nroSerie` no está en el array original → `"RAM: agregado módulo {marca} {modelo} ({capacidad})"`. Módulos que estaban en el original y ya no están en `form` → `"RAM: quitado módulo {marca} {modelo}"`. (Igual para almacenamiento con su etiqueta.)
3. El resultado es un `string[]` plano — se concatena con las líneas de otros bloques y se manda tal cual en `cambios`.

Esta función vive junto a los demás helpers de `ActivoForm.tsx`, no en `apiClient.ts` (es lógica de presentación del diff, no de transporte de datos).

### `getActivoById` / `mapActivo` (frontend)

```ts
export interface HistorialEquipoEntry {
  id: string;
  fecha: string;
  tecnico: string;
  cambios: string[];
  repuestos: { item: string; cantidad: number }[];
}
```

`mapActivo` agrega `historial: (a.historial ?? []).map(h => ({ id: h.id, fecha: h.fecha, tecnico: h.tecnico, cambios: h.cambios, repuestos: h.repuestos ?? [] }))`.

## Testing Strategy

No hay test runner configurado (ver `CLAUDE.md`) — verificación manual con el dev server:

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend manual | `PUT /activos/:id` con `cambios`+`repuestos` válidos crea `HistorialEquipo` y descuenta stock | `curl` autenticado, o Prisma Studio para inspeccionar tablas antes/después |
| Backend manual | Repuesto con stock insuficiente aborta todo (equipo NO se actualiza) | `curl` forzando `cantidad` mayor al stock disponible, confirmar 400 y que el equipo no cambió |
| Backend manual | Rutas viejas de intervención/mantenimiento devuelven 404 | `curl` a las rutas eliminadas |
| Frontend manual | Editar un campo simple genera línea de historial correcta | Navegador: cambiar `estado`, guardar, ver detalle |
| Frontend manual | Agregar/quitar módulo de RAM/almacenamiento genera línea de historial | Navegador: editar un equipo con módulos |
| Frontend manual | Guardar sin cambios no genera entrada vacía | Navegador: abrir editar, guardar sin tocar nada |
| Frontend manual | Repuestos utilizados no aparece en Crear Equipo, sí en Editar | Navegador: comparar ambos formularios |
| Frontend manual | PDF exporta el nuevo historial sin errores, con y sin entradas | Navegador: exportar PDF de un equipo con historial y de uno sin |
| Los 3 roles | `operaciones`/`administrador` pueden editar y ver historial; `docente_empleado` no tiene acceso a Equipos (ya restringido hoy) | Login con cada rol |

## Migration / Rollout

Requiere migración de schema (`pnpm db:push`, ver nota de drift en `CLAUDE.md`): se eliminan 3 tablas (`intervenciones`, `repuestos_intervencion`, `mantenimiento_records`) y se crean 2 nuevas (`historial_equipo`, `repuestos_historial`). **Se pierden los datos existentes en esas 3 tablas** — confirmado y aceptado por el usuario en el proposal (sin plan de migración de datos). Recomendado: `pg_dump` manual de esas 3 tablas antes de aplicar, por si se quiere consultar el historial viejo fuera del sistema.

No hay feature flag ni rollout gradual — el sistema está en revisión manual pre-deploy, sin usuarios reales todavía, así que se aplica directo.

## Open Questions

- [ ] ¿El `usuarioId` para `StockMovimiento` en `updateActivoService` — hay que agregar `req.user!.id` a los parámetros del service (hoy solo recibe `usuarioNombre`, `usuarioRol`)? → Sí, hace falta extenderlo; se resuelve en tasks/apply, no bloquea el diseño.
- [ ] Ninguna otra pendiente — el resto de las decisiones ya fueron confirmadas por el usuario en el proposal.
