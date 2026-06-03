# Design: Registro de usuarios con verificación de email institucional

## Technical Approach

Se agrega un flujo de auto-registro de dos pasos: el usuario llena un formulario → el backend guarda un `RegistroPendiente` con token UUID y envía un email → el usuario hace clic en el enlace → el backend crea el `Usuario` definitivo.

Se usa una tabla separada `RegistroPendiente` en lugar de agregar campos nullable a `Usuario`, para mantener el modelo limpio. Los no-verificados nunca aparecen en ninguna lista de la app.

---

## Architecture Decisions

### Decision: Tabla `RegistroPendiente` vs campos en `Usuario`

**Elección**: tabla separada `RegistroPendiente`  
**Alternativa descartada**: agregar `verificado Boolean`, `tokenVerificacion String?`, `tokenExpira DateTime?` a `Usuario`  
**Rationale**: la alternativa contamina `Usuario` con tres campos transientes que son null en el 99 % de los registros. La tabla separada es más limpia, facilita la limpieza de tokens expirados y evita que usuarios no verificados aparezcan en queries de `Usuario`.

### Decision: Nodemailer para envío de emails

**Elección**: `nodemailer` con transporte SMTP configurable via variables de entorno  
**Alternativa descartada**: `resend` (API key externa), `@sendgrid/mail`  
**Rationale**: Nodemailer es la opción más universal — funciona con cualquier SMTP (Mailtrap en dev, SMTP institucional en producción) sin depender de un proveedor específico. Ya hay variables `SMTP_*` en `.env`.

### Decision: Token generado en Node.js con `crypto.randomUUID()`

**Elección**: `crypto.randomUUID()` (built-in Node.js ≥ 14.17)  
**Alternativa descartada**: paquete `uuid`  
**Rationale**: no requiere dependencia adicional. Genera UUIDs v4 criptográficamente seguros.

### Decision: Expiración de 24 horas

**Elección**: `expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)`  
**Rationale**: tiempo suficiente para que el usuario revise su bandeja sin dejar el token activo indefinidamente.

---

## Data Flow

```
REGISTRO:

Registro.tsx
  └─→ apiClient.registrarse(nombre, email, password)
        └─→ POST /api/auth/registro
              └─→ registroController
                    └─→ registroService
                          ├─ validar dominio @ies21.edu.ar
                          ├─ verificar unicidad (Usuario + RegistroPendiente)
                          ├─ bcrypt.hash(password, 12)
                          ├─ prisma.registroPendiente.create({ token: UUID, expiresAt: +24h })
                          ├─ sendVerificationEmail(email, token)   ← fire & forget (try/catch)
                          └─→ 201 { message: "Revisá tu email para verificar tu cuenta" }
  └─→ mostrar pantalla de éxito


VERIFICACIÓN:

Usuario hace clic en: {FRONTEND_URL}/verificar-email?token=xxx
  └─→ VerificarEmail.tsx monta → lee ?token de URL
        └─→ apiClient.verificarEmail(token)
              └─→ GET /api/auth/verificar/:token
                    └─→ verificarEmailController
                          └─→ verificarEmailService
                                ├─ buscar RegistroPendiente por token
                                ├─ si no existe → AppError(404)
                                ├─ si expiresAt < now → eliminar + AppError(410)
                                ├─ prisma.$transaction:
                                │    ├─ crear Usuario (rol: docente_empleado)
                                │    └─ eliminar RegistroPendiente
                                ├─ addLogService(...)
                                └─→ 200 { message: "Cuenta verificada" }
        └─→ mostrar pantalla de éxito con link a /login
```

---

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/prisma/schema.prisma` | Modificar | Agregar modelo `RegistroPendiente` |
| `backend/src/lib/email.ts` | Crear | Configuración Nodemailer + `sendVerificationEmail()` |
| `backend/src/services/auth.service.ts` | Modificar | Agregar `registroService` + `verificarEmailService` |
| `backend/src/controllers/auth.controller.ts` | Modificar | Agregar handlers `registro` + `verificarEmail` |
| `backend/src/routes/auth.routes.ts` | Modificar | Agregar 2 rutas + schemas Zod |
| `frontend/src/app/pages/Registro.tsx` | Crear | Formulario de registro |
| `frontend/src/app/pages/VerificarEmail.tsx` | Crear | Página de confirmación con token |
| `frontend/src/app/pages/Login.tsx` | Modificar | Agregar botón "Crear usuario" |
| `frontend/src/app/routes.tsx` | Modificar | Rutas `/registro` y `/verificar-email` (públicas) |
| `frontend/src/app/services/apiClient.ts` | Modificar | `registrarse()` + `verificarEmail()` |

---

## Interfaces / Contracts

### Prisma — modelo nuevo

```prisma
model RegistroPendiente {
  id           String   @id @default(cuid())
  nombre       String
  email        String   @unique
  passwordHash String
  token        String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@map("registros_pendientes")
}
```

### Endpoint: POST /api/auth/registro

```
Body:    { nombre: string, email: string, password: string }
Success: 201 { message: string }
Errors:
  400 — dominio no permitido o body inválido (Zod)
  409 — email ya registrado (Usuario o RegistroPendiente)
```

Zod schema:
```ts
z.object({
  nombre:   z.string().min(2, 'El nombre es requerido'),
  email:    z.string().email().endsWith('@ies21.edu.ar', 'Solo se permiten emails @ies21.edu.ar'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})
```

### Endpoint: GET /api/auth/verificar/:token

```
Params:  token (string UUID)
Success: 200 { message: string }
Errors:
  404 — token no encontrado
  410 — token expirado
```

### apiClient — funciones nuevas

```ts
export async function registrarse(nombre: string, email: string, password: string): Promise<{ message: string }>

export async function verificarEmail(token: string): Promise<{ message: string }>
```

### email.ts — sendVerificationEmail

```ts
export async function sendVerificationEmail(email: string, nombre: string, token: string): Promise<void>
// Envía email con enlace: {FRONTEND_URL}/verificar-email?token={token}
// No lanza — captura errores internamente y los loguea en consola
```

---

## Testing Strategy

No hay test runner configurado. Verificación manual:

| Capa | Qué verificar | Cómo |
|------|--------------|------|
| Backend | `POST /api/auth/registro` con email válido | curl / Postman → debe crear RegistroPendiente en DB y mostrar email en Mailtrap |
| Backend | `POST /api/auth/registro` con dominio incorrecto | curl → debe retornar 400 |
| Backend | `GET /api/auth/verificar/:token` válido | copiar token de DB → debe crear Usuario y eliminar RegistroPendiente |
| Backend | `GET /api/auth/verificar/:token` expirado | editar `expiresAt` en DB a fecha pasada → debe retornar 410 |
| Frontend | Flujo completo desde `/registro` hasta login | navegar en el browser |
| Frontend | Email con dominio incorrecto | ingresar `@gmail.com` → error inline antes de enviar |

---

## Migration / Rollout

Requiere migración de DB:

```bash
cd backend
pnpm db:migrate
# Nombre sugerido: registro-pendiente
```

Los `Usuario` existentes (creados por admin o por seed) no se ven afectados — no hay cambios en el modelo `Usuario`.

---

## Open Questions

- Ninguna. El diseño está completo y no hay decisiones bloqueantes pendientes.
