# Seguridad — Especificación (delta): rate limiting en login y no-enumeración de usuarios

## Purpose

Define el comportamiento requerido para dos controles de seguridad en `POST /api/auth/login`, motivados por el pase del sistema a acceso público (no LAN-only): límite de tasa por IP y eliminación de la enumeración de usuarios vía mensajes de error.

---

## Requirements

### Requirement: Rate limiting por IP en login

El sistema MUST limitar la cantidad de intentos de login fallidos por dirección IP a 20 cada 10 minutos.

Los intentos de login exitosos MUST NOT contar para este límite.

Al superar el límite, el sistema MUST responder con status 429 antes de ejecutar cualquier lógica de autenticación (no debe llegar a consultar la base de datos ni comparar contraseña).

Este límite es independiente y adicional al bloqueo de cuenta por 10 intentos fallidos ya existente (`Usuario.bloqueado`).

#### Scenario: Ráfaga de intentos fallidos desde la misma IP

- GIVEN una IP que realizó 20 intentos de login fallidos en los últimos 10 minutos
- WHEN esa misma IP realiza un intento adicional de login (con cualquier email/password)
- THEN el sistema MUST responder 429 sin consultar la base de datos

#### Scenario: Login exitoso no cuenta para el límite

- GIVEN una IP que realizó varios intentos fallidos y luego un login exitoso
- WHEN esa IP continúa haciendo login normalmente después
- THEN el login exitoso MUST NOT sumar al contador de intentos fallidos de esa IP

#### Scenario: Uso normal de una IP compartida (NAT institucional)

- GIVEN múltiples usuarios distintos autenticándose desde la misma IP pública (red compartida)
- WHEN cada uno hace like 1-2 intentos de login en un rango de 10 minutos, con la mayoría exitosos
- THEN ninguno MUST ser bloqueado por el límite de tasa (el límite generoso de 20 fallos evita falsos positivos por uso normal)

---

### Requirement: Mensaje de login no revela existencia de la cuenta

El sistema MUST responder con el mismo mensaje de error y el mismo status code (401, "Email o contraseña incorrectos") tanto si el email no está registrado como si el email existe pero la contraseña es incorrecta.

El sistema MUST NOT informar en la respuesta cuántos intentos fallidos lleva la cuenta ni cuántos restan antes del bloqueo.

El mensaje de "cuenta bloqueada" (403) se mantiene sin cambios — solo se muestra a quien ya conoce que la cuenta existe y su contraseña, tras exceder el límite de intentos.

#### Scenario: Login con email inexistente

- GIVEN un email que no está registrado en el sistema
- WHEN se envía `POST /api/auth/login` con ese email y cualquier password
- THEN el sistema MUST responder 401 con el mensaje "Email o contraseña incorrectos"

#### Scenario: Login con password incorrecta para email existente

- GIVEN un email registrado y una password incorrecta
- WHEN se envía `POST /api/auth/login`
- THEN el sistema MUST responder 401 con el mismo mensaje "Email o contraseña incorrectos"

#### Scenario: Los dos casos anteriores son indistinguibles

- GIVEN las dos respuestas de los escenarios anteriores
- WHEN se comparan status code y cuerpo de la respuesta
- THEN MUST ser idénticos, sin ninguna diferencia que permita inferir si el email existe

#### Scenario: Cuenta bloqueada sigue mostrando su mensaje propio

- GIVEN una cuenta con `bloqueado = true`
- WHEN se intenta login con esa cuenta (password correcta o incorrecta)
- THEN el sistema MUST responder 403 "Tu cuenta está bloqueada. Contactá al administrador."
