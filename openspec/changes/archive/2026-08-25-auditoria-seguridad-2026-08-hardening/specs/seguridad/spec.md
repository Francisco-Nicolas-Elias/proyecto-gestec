# Delta for Seguridad

## ADDED Requirements

### Requirement: Rate limiting en endpoints de registro y recuperación de contraseña

El sistema MUST limitar la cantidad de requests por dirección IP a `POST /api/auth/registro`, `POST /api/auth/recuperar-password`, `POST /api/auth/reset-password` y `GET /api/auth/verificar/:token` a 10 cada 15 minutos.

Este límite es independiente del rate limiting ya existente en `POST /api/auth/login` (20 cada 10 minutos) — cada endpoint tiene su propio contador.

Al superar el límite, el sistema MUST responder con status 429 antes de ejecutar cualquier lógica de negocio del endpoint (no debe llegar a crear registros pendientes, enviar emails, ni consultar tokens).

#### Scenario: Ráfaga de registros desde la misma IP

- GIVEN una IP que realizó 10 requests a `POST /api/auth/registro` en los últimos 15 minutos
- WHEN esa misma IP realiza un request adicional a cualquiera de los 4 endpoints
- THEN el sistema MUST responder 429 sin ejecutar la lógica del endpoint

#### Scenario: Uso normal de una IP compartida (NAT institucional)

- GIVEN varios usuarios distintos registrándose o recuperando su contraseña desde la misma IP pública de la institución
- WHEN cada uno hace 1-2 requests en un rango de 15 minutos
- THEN ninguno MUST ser bloqueado por el límite (10 requests es suficientemente generoso para uso normal simultáneo)

#### Scenario: Verificación de email no bloqueada por el propio flujo de registro

- GIVEN un usuario que se registró exitosamente y hace clic en el link de verificación de su email
- WHEN el frontend llama `GET /api/auth/verificar/:token`
- THEN esa request MUST contarse en el límite propio de `/verificar/:token`, no en el de `/registro`, y MUST ser aceptada en el uso normal
