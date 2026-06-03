# Auth — Especificación: Registro con verificación de email

## Purpose

Define el comportamiento del sistema para el auto-registro de nuevos usuarios institucionales mediante email `@ies21.edu.ar`, incluyendo validación de dominio, creación de registro pendiente, envío de email de verificación y activación de cuenta.

---

## Requirements

### Requirement: Validación de dominio institucional

El sistema MUST rechazar cualquier solicitud de registro cuyo email no pertenezca al dominio `@ies21.edu.ar`.

La validación MUST aplicarse tanto en el frontend (antes de enviar la request) como en el backend (al recibir la request), siendo la validación del backend la autoritativa.

#### Scenario: Registro con email institucional válido

- GIVEN que el usuario ingresa el email `juan.gomez@ies21.edu.ar`
- WHEN envía el formulario de registro
- THEN el sistema acepta el email y procesa el registro

#### Scenario: Registro con dominio no institucional

- GIVEN que el usuario ingresa el email `juan.gomez@gmail.com`
- WHEN envía el formulario de registro
- THEN el sistema MUST retornar un error con status 400
- AND el mensaje MUST indicar que solo se permiten emails `@ies21.edu.ar`

#### Scenario: Validación en backend con email manipulado

- GIVEN que un cliente envía `POST /api/auth/registro` con `email: "hack@otro.com"` (bypasseando el frontend)
- WHEN el backend procesa la request
- THEN el sistema MUST retornar 400 con mensaje de dominio no permitido

---

### Requirement: Unicidad de email

El sistema MUST verificar que el email no esté ya registrado (ni como `Usuario` activo ni como `RegistroPendiente` aún no verificado).

#### Scenario: Email ya registrado como usuario activo

- GIVEN que existe un `Usuario` con email `existente@ies21.edu.ar`
- WHEN se envía `POST /api/auth/registro` con ese mismo email
- THEN el sistema MUST retornar 409
- AND el mensaje MUST indicar que el email ya está registrado

#### Scenario: Email con verificación pendiente

- GIVEN que existe un `RegistroPendiente` con email `pendiente@ies21.edu.ar` aún no expirado
- WHEN se envía `POST /api/auth/registro` con ese mismo email
- THEN el sistema MUST retornar 409
- AND el mensaje MUST indicar que ya existe un registro pendiente de verificación para ese email

#### Scenario: Email nuevo

- GIVEN que el email `nuevo@ies21.edu.ar` no existe en `Usuario` ni en `RegistroPendiente`
- WHEN se envía `POST /api/auth/registro` con ese email
- THEN el sistema MUST crear el `RegistroPendiente` y continuar

---

### Requirement: Creación de registro pendiente

Al recibir una solicitud de registro válida, el sistema MUST crear un `RegistroPendiente` con los datos del usuario y un token de verificación de uso único.

- El token MUST ser un UUID v4 generado aleatoriamente.
- El token MUST expirar 24 horas después de su creación.
- La contraseña MUST ser hasheada con bcrypt (factor 12) antes de almacenarse.
- El rol asignado por defecto MUST ser `docente_empleado`.

#### Scenario: Creación exitosa de registro pendiente

- GIVEN una request válida con nombre, email `@ies21.edu.ar` y contraseña
- WHEN `POST /api/auth/registro` es procesado
- THEN el sistema MUST crear un registro en `RegistroPendiente` con token UUID y expiración en 24h
- AND la contraseña almacenada MUST ser el hash bcrypt, no el texto plano
- AND el sistema MUST responder 201 con mensaje de éxito (sin exponer el token en la respuesta)

---

### Requirement: Envío de email de verificación

Tras crear el `RegistroPendiente`, el sistema MUST enviar un email de verificación a la dirección registrada.

- El email MUST contener un enlace con el token: `{FRONTEND_URL}/verificar-email?token={token}`
- El email SHOULD tener asunto claro que identifique a GESTEC y la acción requerida.
- Si el envío falla, el sistema SHOULD registrar el error pero MUST igualmente retornar 201 al cliente (el usuario puede intentar registrarse nuevamente).

#### Scenario: Email enviado correctamente

- GIVEN un `RegistroPendiente` recién creado
- WHEN el servicio SMTP responde con éxito
- THEN el email llega a la bandeja con el enlace de verificación correcto

#### Scenario: Fallo en envío de email

- GIVEN un `RegistroPendiente` recién creado
- WHEN el servicio SMTP falla (timeout, credenciales inválidas, etc.)
- THEN el sistema MUST registrar el error en consola
- AND MUST igualmente retornar 201 al cliente

---

### Requirement: Verificación de token

El endpoint `GET /api/auth/verificar/:token` MUST activar la cuenta si el token es válido y no ha expirado.

#### Scenario: Verificación exitosa

- GIVEN un `RegistroPendiente` con token válido y `expiresAt` en el futuro
- WHEN el frontend llama `GET /api/auth/verificar/:token`
- THEN el sistema MUST crear un `Usuario` con los datos del registro pendiente y rol `docente_empleado`
- AND MUST eliminar el `RegistroPendiente`
- AND MUST registrar en `LogEntry` la creación de la cuenta
- AND MUST retornar 200 con mensaje de éxito

#### Scenario: Token inexistente

- GIVEN un token que no existe en `RegistroPendiente`
- WHEN el frontend llama `GET /api/auth/verificar/:token`
- THEN el sistema MUST retornar 404 con mensaje de token inválido

#### Scenario: Token expirado

- GIVEN un `RegistroPendiente` cuyo `expiresAt` es anterior a la fecha/hora actual
- WHEN el frontend llama `GET /api/auth/verificar/:token`
- THEN el sistema MUST retornar 410 (Gone) con mensaje de enlace expirado
- AND el registro pendiente SHOULD ser eliminado

#### Scenario: Token ya utilizado

- GIVEN que un token ya fue utilizado (el `RegistroPendiente` ya no existe y el `Usuario` fue creado)
- WHEN el frontend llama `GET /api/auth/verificar/:token` con el mismo token
- THEN el sistema MUST retornar 404 (el token no existe)

---

### Requirement: Rol por defecto y administración posterior

El `Usuario` creado por auto-registro MUST tener rol `docente_empleado`.

El administrador SHOULD poder cambiar el rol de cualquier usuario desde el panel de Admin → Usuarios (funcionalidad ya existente — no se modifica).

#### Scenario: Rol asignado automáticamente

- GIVEN una verificación exitosa de un registro pendiente
- WHEN se crea el `Usuario`
- THEN el campo `rol` MUST ser `docente_empleado`

---

### Requirement: Auditoría

Toda creación de cuenta vía auto-registro MUST generar una entrada en `LogEntry`.

#### Scenario: Log de creación de cuenta

- GIVEN que se verifica exitosamente un token de registro
- WHEN se crea el `Usuario`
- THEN MUST existir un `LogEntry` con acción `"Cuenta creada por auto-registro: {email}"`, módulo `Administracion`, usuarioNombre con el nombre del nuevo usuario
