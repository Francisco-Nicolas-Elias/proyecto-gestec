# Verify Report: Hardening de auth y validación de catálogo

## Rate limiting en endpoints de auth

- **Scenario "Ráfaga de registros desde la misma IP"**: verificado con `curl` en loop contra `POST /api/auth/registro` con 11 emails de prueba distintos — los primeros 10 respondieron 201, el 11vo respondió 429. ✅
- **Scenario "Uso normal de una IP compartida"**: no se pudo simular tráfico multi-usuario real en local; se infiere del `max: 10` (igual patrón ya validado para `loginRateLimiter` con `max: 20`) que el límite es suficientemente generoso. Pendiente de observación real en producción.
- Datos de prueba (`RegistroPendiente` con emails `noexiste_test_audit_*@ies21.edu.ar`) borrados al finalizar.

## Validación Zod en catálogo de Admin

Probado contra los 5 recursos representativos (`areas`, `ubicaciones`) con un usuario admin temporal (creado y borrado en el mismo verify):

- **Body inválido**: `POST /admin/areas` sin `nombre` → 400 `"Datos inválidos"`. `POST /admin/ubicaciones` sin `piso` → 400 con detalle `{"campo":"piso","mensaje":"Required"}`. ✅
- **Campo no declarado ignorado**: `POST /admin/areas` con `{ nombre, campoExtraNoDeclarado }` → 201, el área se creó normalmente sin el campo extra. ✅
- **Body válido**: confirmado en el mismo request anterior (el área se creó con `nombre` correcto). ✅
- `tipos-componente`, `marcas`, `proveedores` no se probaron individualmente por `curl` (mismo schema `validate()` genérico ya verificado en `areas`/`ubicaciones` — mismo middleware, distinto schema Zod trivial) — **pendiente la prueba manual desde el navegador real de los 5 CRUDs completos** (tasks 3.4/3.5), a cargo del usuario en su revisión manual.
- Datos de prueba (usuario admin temporal, área de prueba) borrados al finalizar.

## Compilación

`pnpm exec tsc --noEmit` en `backend/` sin errores tras los cambios.

## Verificación manual del usuario

Confirmado por el usuario en navegador real: los 5 CRUDs de catálogo de Admin funcionan normalmente con datos válidos, y el flujo de registro/recuperación de contraseña (un intento cada uno) sigue funcionando tras agregar el rate limiter.

## Caveats

- El límite de `max: 10` en 15 min es una estimación razonable basada en el patrón ya validado de login; no hay forma de confirmar en el entorno de desarrollo local que sea el valor óptimo para el uso real de la institución — ajustar si en producción se observan falsos positivos o abuso real.
