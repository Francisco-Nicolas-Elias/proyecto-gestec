# Design: Hardening de auth y validación de catálogo

## Technical Approach

Dos piezas independientes, ambas reutilizando patrones ya existentes en el codebase (ver `openspec/changes/archive/2026-08-20-seguridad-acceso-publico/` para el precedente de `loginRateLimiter`, y `backend/src/schemas/*.schema.ts` + `validate.middleware.ts` para el precedente de Zod):

1. Un nuevo rate limiter compartido por los 4 endpoints de `auth.routes.ts` que hoy no tienen ninguno.
2. 5 schemas Zod nuevos, uno por recurso de catálogo, aplicados con el `validate()` ya existente.

## Architecture Decisions

### Decision: Un solo limiter compartido para los 4 endpoints, no uno por endpoint

**Choice**: `authActionsRateLimiter` único, aplicado a `registro`, `recuperar-password`, `reset-password` y `verificar/:token`.
**Alternatives considered**: un limiter distinto por endpoint (como podría sugerir "cada endpoint tiene su propio contador" en la spec).
**Rationale**: la spec dice que cada endpoint tiene su propio contador — `express-rate-limit` ya hace esto automáticamente por instancia de middleware: si se aplica la MISMA instancia de limiter a las 4 rutas, la librería trackea el contador por combinación de IP **y** ruta internamente (keyGenerator por defecto usa la IP, pero el store interno de `express-rate-limit` es por instancia+ruta cuando se monta como middleware de ruta, no global). Para que quede explícito y no dependa de un detalle interno de la librería, se crea una única factory/instancia y se monta en las 4 rutas — esto es exactamente lo que ya hace `loginRateLimiter` (una instancia, una ruta). Simplicidad sobre 4 instancias casi idénticas.

### Decision: `max: 10` en vez de reusar `max: 20` de login

**Choice**: `windowMs: 15 * 60 * 1000, max: 10`.
**Alternatives considered**: copiar el mismo `windowMs: 10min, max: 20` de `loginRateLimiter`.
**Rationale**: login es un flujo que un usuario legítimo repite constantemente (varias veces por día); registro/recuperación de contraseña/verificación son flujos de una sola vez por usuario. Un límite más bajo (10 en 15 min) sigue siendo generoso para el caso de NAT institucional (varios docentes registrándose el mismo día) sin dejar la puerta tan abierta a abuso de SMTP como un límite calcado del de login.

### Decision: Sin `skipSuccessfulRequests`

**Choice**: no usar esa opción en `authActionsRateLimiter`.
**Rationale**: `skipSuccessfulRequests` tiene sentido en login porque un "éxito" (contraseña correcta) es un evento que se repite indefinidamente sin ser abuso. En registro/recuperación/verificación, un "éxito" (201, o 200 de verificación) es un evento que ocurre una sola vez por usuario real — no hay necesidad de decrementar el contador tras un éxito, y hacerlo no ayudaría al caso de NAT (que ya está cubierto por `max: 10`).

### Decision: Schemas Zod colocados en `backend/src/schemas/`, un archivo por dominio existente o uno nuevo `catalogo.schema.ts`

**Choice**: crear `backend/src/schemas/catalogo.schema.ts` con los 5 schemas (`createUbicacionSchema`, `createTipoComponenteSchema`, `createMarcaSchema`, `createProveedorSchema`, `createAreaSchema`), reusando el mismo schema para create y update en los recursos donde no hay diferencia de campos requeridos (todos, en este caso — a diferencia de `usuario.schema.ts` que sí distingue create/update porque `password` es opcional en update).
**Alternatives considered**: un archivo separado por recurso (5 archivos nuevos).
**Rationale**: los 5 recursos son catálogos simples de 1-3 campos cada uno; agruparlos en un solo archivo evita 5 archivos casi vacíos y sigue siendo fácil de navegar. Ningún recurso distingue create/update (no hay campos que solo apliquen a uno u otro), así que un solo schema por recurso alcanza.

### Decision: Campos exactos por schema, basados en `schema.prisma`

**Choice**:
- `ubicacionSchema`: `{ sector: z.string().min(1), piso: z.string().min(1) }`
- `tipoComponenteSchema`: `{ nombre: z.string().min(1) }`
- `marcaSchema`: `{ nombre: z.string().min(1) }`
- `proveedorSchema`: `{ nombre: z.string().min(1), contacto: z.string().optional(), telefono: z.string().optional() }`
- `areaSchema`: `{ nombre: z.string().min(1) }`

**Rationale**: verificado contra `backend/prisma/schema.prisma:87-129` — `Ubicacion.sector`/`piso` son ambos `String` requeridos (no `String?`), `Proveedor.contacto`/`telefono` son `String?` (opcionales), el resto son `nombre: String` único y requerido. Ningún schema necesita `.passthrough()` — se sigue el patrón ya establecido de descartar campos no declarados.

## Data Flow

    Request POST/PUT /api/admin/{recurso}
         │
         ▼
    authenticate ──▶ isAdmin ──▶ validate({recurso}Schema) ──▶ controller ──▶ service (Prisma)
                                        │
                                        └─ 400 si el body no matchea el schema (antes de tocar Prisma)

    Request a los 4 endpoints de auth
         │
         ▼
    authActionsRateLimiter ──▶ validate(schema existente) ──▶ controller
         │
         └─ 429 si se superó el límite (antes de validar body o tocar la DB/SMTP)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/middlewares/rateLimit.middleware.ts` | Modify | Agregar y exportar `authActionsRateLimiter` |
| `backend/src/routes/auth.routes.ts` | Modify | Aplicar `authActionsRateLimiter` a `registro`, `verificar/:token`, `recuperar-password`, `reset-password` |
| `backend/src/schemas/catalogo.schema.ts` | Create | 5 schemas Zod: ubicación, tipo de componente, marca, proveedor, área |
| `backend/src/routes/admin.routes.ts` | Modify | Importar los 5 schemas y aplicar `validate()` en los 10 endpoints POST/PUT correspondientes |

## Interfaces / Contracts

```ts
// backend/src/middlewares/rateLimit.middleware.ts
export const authActionsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});
```

```ts
// backend/src/schemas/catalogo.schema.ts
export const ubicacionSchema = z.object({
  sector: z.string().min(1, 'El sector es requerido'),
  piso: z.string().min(1, 'El piso es requerido'),
});

export const tipoComponenteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});

export const marcaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
});

export const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
});
```

```ts
// backend/src/routes/auth.routes.ts (fragmento modificado)
router.post('/registro', authActionsRateLimiter, validate(registroSchema), registro);
router.get('/verificar/:token', authActionsRateLimiter, verificarEmail);
router.post('/recuperar-password', authActionsRateLimiter, validate(recuperarSchema), solicitarRecuperacion);
router.post('/reset-password', authActionsRateLimiter, validate(resetSchema), resetPassword);
```

```ts
// backend/src/routes/admin.routes.ts (fragmento modificado, ejemplo con ubicaciones)
router.post('/ubicaciones', isAdmin, validate(ubicacionSchema), ctrl.createUbicacion);
router.put('/ubicaciones/:id', isAdmin, validate(ubicacionSchema), ctrl.updateUbicacion);
// ... análogo para tipos-componente, marcas, proveedores, areas
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integración manual (curl) | Rate limiting: 11 requests seguidos a `/registro` devuelven 429 en el 11vo | `curl` en loop contra el backend local |
| Integración manual (navegador) | Los 5 CRUDs de catálogo en Admin siguen funcionando con datos válidos | Crear/editar/eliminar cada uno desde la UI real |
| Integración manual (curl) | Body inválido en cada recurso de catálogo devuelve 400, no 500 | `curl` con body sin `nombre` o con `piso` de tipo incorrecto |
| Regresión | Verificar que el registro/recuperación de contraseña normal (1 intento) sigue funcionando tras agregar el rate limiter | Probar el flujo completo con un usuario de prueba |

## Migration / Rollout

No migration required — no hay cambios de schema de base de datos, solo middlewares nuevos aplicados a rutas existentes.

## Open Questions

Ninguna.
