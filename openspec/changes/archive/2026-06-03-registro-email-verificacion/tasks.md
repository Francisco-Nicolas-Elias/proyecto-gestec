# Tasks: Registro de usuarios con verificación de email institucional

## Estado general: ✅ Verificado

---

## Fase 1 — Infraestructura (DB + email)

- [x] **1.1** Agregar modelo `RegistroPendiente` a `backend/prisma/schema.prisma` (campos: id, nombre, email unique, passwordHash, token unique, expiresAt, createdAt)
- [x] **1.2** Ejecutar migración: usada `prisma db push` en lugar de `db:migrate` por drift previo en la BD (columnas `detalle` y `nro` sin registro en historial). Tabla `registros_pendientes` creada y verificada.
- [x] **1.3** Instalar dependencias de email: `cd backend && pnpm add nodemailer && pnpm add -D @types/nodemailer`
- [x] **1.4** Crear `backend/src/lib/email.ts` — configurar transporte Nodemailer con variables `SMTP_*` del `.env` y exportar `sendVerificationEmail(email, nombre, token)`

---

## Fase 2 — Backend: servicios y controladores

- [x] **2.1** Agregar `registroService(nombre, email, password)` en `backend/src/services/auth.service.ts`
- [x] **2.2** Agregar `verificarEmailService(token)` en `backend/src/services/auth.service.ts`
- [x] **2.3** Agregar handlers `registro` y `verificarEmail` en `backend/src/controllers/auth.controller.ts`
- [x] **2.4** Agregar en `backend/src/routes/auth.routes.ts`: schema Zod para registro, `POST /registro`, `GET /verificar/:token`

---

## Fase 3 — Frontend: páginas y conexión

- [x] **3.1** Agregar `registrarse()` y `verificarEmail()` en `frontend/src/app/services/apiClient.ts`
- [x] **3.2** Crear `frontend/src/app/pages/Registro.tsx`
- [x] **3.3** Crear `frontend/src/app/pages/VerificarEmail.tsx`
- [x] **3.4** Modificar `frontend/src/app/pages/Login.tsx` — botón "Crear usuario"
- [x] **3.5** Modificar `frontend/src/app/routes.tsx` — rutas `/registro` y `/verificar-email`

---

## Fase 4 — Integración y verificación manual

- [x] **4.1** Probar `POST /api/auth/registro` con email `@ies21.edu.ar` válido → verificar que se crea `RegistroPendiente` en Prisma Studio y el email aparece en Mailtrap con el enlace correcto
- [x] **4.2** Probar `POST /api/auth/registro` con `@gmail.com` → debe retornar 400 con mensaje de dominio
- [x] **4.3** Probar `POST /api/auth/registro` con email ya existente → debe retornar 409
- [x] **4.4** Probar `GET /api/auth/verificar/:token` con token válido → verificar que se crea `Usuario` con rol `docente_empleado` en DB y se elimina el `RegistroPendiente`
- [x] **4.5** Probar `GET /api/auth/verificar/:token` con token expirado (editar `expiresAt` a fecha pasada en DB) → debe retornar 410
- [x] **4.6** Flujo completo en el browser: `/registro` → email en Mailtrap → clic en enlace → `/verificar-email` → éxito → `/login` → login con la cuenta nueva
- [x] **4.7** Verificar que el admin puede cambiar el rol del nuevo usuario desde Admin → Usuarios

---

## Fase 5 — Cleanup

- [x] **5.1** Actualizar `CLAUDE.md` — documentar las nuevas variables de entorno SMTP y el uso de `prisma db push`
