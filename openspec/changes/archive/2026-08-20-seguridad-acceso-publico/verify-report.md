# Verify Report: Rate limiting y no-enumeración en login

## Método

Backend corriendo localmente (`pnpm dev`). Se creó un usuario temporal (`test.ratelimit.temp@ies21.edu.ar`) vía script directo de Prisma, se ejecutaron requests reales contra `POST /api/auth/login` con `curl`/`fetch`, y se eliminó el usuario al finalizar. El backend se reinició una vez a mitad de la verificación para resetear el store en memoria del rate limiter y así poder probar limpiamente el escenario de `skipSuccessfulRequests`.

## Resultados por escenario

### Rate limiting por IP

- **Ráfaga de intentos fallidos**: se automatizaron 21 requests fallidas seguidas desde la misma IP. La request 21 devolvió **429** con el mensaje configurado, sin necesidad de tocar la cuenta. ✅
- **Login exitoso no cuenta**: se intercalaron 3 logins exitosos entre 19 fallos (contra un email inexistente, para no disparar el bloqueo de cuenta). El fallo #20 posterior a los 3 éxitos siguió devolviendo **401** normal (no 429), confirmando que los 3 éxitos no sumaron al contador. El fallo #21 inmediatamente después sí devolvió 429. ✅
- **NAT/IP compartida**: no se pudo probar con múltiples IPs reales distintas (limitación del entorno de test local, todas las requests salen de `127.0.0.1`). Verificado por diseño: `skipSuccessfulRequests` + límite de 20/10min hace que el uso normal (mayoría de logins exitosos) de una IP compartida no se vea afectado. ⚠️ No verificado end-to-end con múltiples clientes reales.

### No-enumeración de usuarios

- **Email inexistente vs password incorrecta**: ambos casos devolvieron exactamente `401` + `{"error":"Email o contraseña incorrectos"}`, sin ninguna diferencia observable. ✅
- **Cuenta bloqueada**: tras alcanzar 10 intentos fallidos reales sobre la cuenta de prueba, un intento posterior con la contraseña correcta devolvió `403` "Tu cuenta está bloqueada. Contactá al administrador." — comportamiento sin cambios respecto a antes. ✅
- **Conteo de intentos fallidos interno**: se confirmó que sigue incrementando y bloqueando a los 10 intentos, solo cambió el mensaje expuesto al cliente. ✅

### Frontend

- Revisado `Login.tsx`: el manejo de errores por texto (`msg.includes(...)`) no rompe con el nuevo mensaje unificado — cae consistentemente en la rama que resalta el campo email (el mensaje contiene la palabra "email"). ⚠️ No se verificó visualmente en navegador, solo por inspección de código (no se levantó el frontend en esta sesión).

## Caveats

- No se probó el rate limit con tráfico real multi-IP (solo simulable localmente desde una única IP).
- El comportamiento visual del formulario de login (a qué campo se le pinta el error) no se verificó interactivamente en el navegador.

## Limpieza

- Usuario de prueba `test.ratelimit.temp@ies21.edu.ar` eliminado de la base de datos.
- Backend de desarrollo detenido, puerto 3000 liberado.
