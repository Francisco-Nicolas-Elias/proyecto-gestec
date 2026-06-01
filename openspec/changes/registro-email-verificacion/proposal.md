# Proposal: Registro de usuarios con verificación de email institucional

## Intent

Actualmente solo un administrador puede crear cuentas desde el panel de Admin. Se necesita que los propios docentes y empleados de la institución puedan registrarse de forma autónoma, garantizando que solo accedan personas con email `@ies21.edu.ar` mediante un flujo de verificación por correo.

## Scope

### In Scope
- Botón "Crear usuario" en la página de Login
- Página `/registro` con formulario (nombre, email, contraseña)
- Validación de dominio `@ies21.edu.ar` en frontend y backend
- Endpoint `POST /api/auth/registro` — crea registro pendiente y envía email de verificación
- Endpoint `GET /api/auth/verificar/:token` — activa la cuenta
- Página `/verificar-email` en el frontend que consume el token de la URL
- Rol por defecto: `docente_empleado`
- Integración de Nodemailer para envío de emails vía SMTP
- Registro en logs de auditoría al crear cuenta

### Out of Scope
- Recuperación de contraseña real (ya existe la página pero es mock — queda para otro change)
- Auto-aprobación con rol distinto a `docente_empleado`
- Panel de revisión de registros pendientes para el admin
- Reenvío manual de email de verificación

## Approach

**Tabla `RegistroPendiente`** (nueva): almacena temporalmente los datos de quien se registra (nombre, email, passwordHash, token UUID, expiresAt +24h) hasta que verifica su email. Al verificar se crea el `Usuario` real y se elimina el registro pendiente. Este enfoque mantiene el modelo `Usuario` limpio — los no-verificados no aparecen en ninguna lista de la app.

**Nodemailer** como biblioteca de email SMTP. Requiere variables de entorno: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Compatible con Gmail, Outlook, y cualquier servidor SMTP institucional.

**Flujo completo:**
1. Usuario llena el formulario → frontend valida dominio
2. `POST /api/auth/registro` → backend valida dominio, hashea password, guarda `RegistroPendiente`, envía email
3. Usuario hace clic en el link del email → `/verificar-email?token=xxx`
4. Frontend llama `GET /api/auth/verificar/:token`
5. Backend valida token y expiración, crea `Usuario` con rol `docente_empleado`, elimina `RegistroPendiente`
6. Frontend muestra éxito y redirige al login

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `backend/prisma/schema.prisma` | Modificado | Nueva tabla `RegistroPendiente` |
| `backend/src/routes/auth.routes.ts` | Modificado | 2 endpoints nuevos |
| `backend/src/controllers/auth.controller.ts` | Modificado | 2 handlers nuevos |
| `backend/src/services/auth.service.ts` | Modificado | `registroService` + `verificarEmailService` |
| `backend/src/lib/email.ts` | Nuevo | Configuración Nodemailer + función `sendVerificationEmail` |
| `backend/.env` | Modificado | Variables SMTP |
| `frontend/src/app/pages/Registro.tsx` | Nuevo | Formulario de registro |
| `frontend/src/app/pages/VerificarEmail.tsx` | Nuevo | Página de confirmación con token |
| `frontend/src/app/pages/Login.tsx` | Modificado | Botón "Crear usuario" |
| `frontend/src/app/app/routes.tsx` | Modificado | Rutas `/registro` y `/verificar-email` (públicas) |
| `frontend/src/app/services/apiClient.ts` | Modificado | `registrarse()` + `verificarEmail()` |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Credenciales SMTP no disponibles en entorno de dev | Media | Usar Mailtrap como SMTP de testing gratuito |
| Token expirado antes de que el usuario haga clic | Baja | Ventana de 24h, mensaje claro en la UI |
| Alguien registra un email @ies21.edu.ar que no existe | Baja | El email de verificación simplemente no llega; la cuenta no se activa |
| Acumulación de `RegistroPendiente` expirados | Baja | Se pueden limpiar manualmente; fuera de scope por ahora |

## Rollback Plan

1. Revertir los endpoints en `auth.routes.ts` (eliminar las 2 rutas nuevas)
2. Revertir `auth.service.ts` y `auth.controller.ts`
3. Eliminar `backend/src/lib/email.ts`
4. Revertir `Login.tsx` (quitar el botón)
5. Eliminar páginas `Registro.tsx` y `VerificarEmail.tsx`
6. Revertir `routes.tsx`
7. Ejecutar `prisma migrate dev --name rollback-registro` para eliminar la tabla (o revertir la migración)

La app queda exactamente como estaba — el registro solo lo hace el admin.

## Dependencies

- `nodemailer` + `@types/nodemailer` (instalar en backend)
- Credenciales SMTP válidas (Mailtrap para dev, SMTP institucional para producción)
- Requiere **migración de DB**: `prisma migrate dev --name registro-pendiente`

## Success Criteria

- [ ] Un usuario con email `@ies21.edu.ar` puede completar el flujo completo (registro → email → verificación → login)
- [ ] Un email con dominio distinto es rechazado en frontend y backend con mensaje claro
- [ ] El usuario creado por auto-registro tiene rol `docente_empleado`
- [ ] El admin puede cambiar el rol desde Admin → Usuarios
- [ ] Si el token expiró (>24h), el backend devuelve error y el frontend lo comunica
- [ ] El log de auditoría registra la creación de la cuenta
- [ ] Los usuarios creados por el admin (sin flujo de verificación) no se ven afectados
