# Design: Rate limiting y no-enumeración en login

## Middleware de rate limiting

`backend/src/middlewares/rateLimit.middleware.ts` (nuevo):

```ts
import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});
```

- `keyGenerator` por defecto usa `req.ip`, que ya respeta `app.set('trust proxy', ...)` si está configurado (a revisar en el deploy — si Apache hace de reverse proxy, `trust proxy` debe estar en `1` para que `req.ip` sea la IP real del cliente y no la del proxy).
- `skipSuccessfulRequests: true` es la pieza clave para NAT: una IP compartida con usuarios que loguean bien no acumula contador.
- El middleware corta la request **antes** de `validate(loginSchema)` y del controller, por eso se aplica primero en la cadena de la ruta.

## Endpoint

`POST /api/auth/login` (sin cambios en firma request/response, salvo el mensaje de error):

```
router.post('/login', loginRateLimiter, validate(loginSchema), login);
```

Response en 429 (paquete la genera automáticamente vía `message`):
```json
{ "message": "Demasiados intentos. Probá de nuevo en unos minutos." }
```

## Cambio en `loginService`

Reemplazar el bloque actual (que distingue usuario inexistente vs password incorrecta y expone intentos restantes) por:

```ts
export async function loginService(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (usuario?.bloqueado) throw new AppError(403, 'Tu cuenta está bloqueada. Contactá al administrador.');

  const valid = usuario ? await bcrypt.compare(password, usuario.password) : false;

  if (!usuario || !valid) {
    if (usuario) {
      const intentos = usuario.intentosFallidos + 1;
      if (intentos >= 10) {
        await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: intentos, bloqueado: true } });
        await addLogService(
          `Cuenta bloqueada automáticamente por ${intentos} intentos fallidos de inicio de sesión`,
          'Administracion', usuario.nombre, usuario.rol, usuario.id,
        );
      } else {
        await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: intentos } });
      }
    }
    throw new AppError(401, 'Email o contraseña incorrectos');
  }

  if (usuario.intentosFallidos > 0) {
    await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: 0 } });
  }

  // resto sin cambios: firmar JWT, devolver token + usuario
}
```

Decisiones clave de este bloque:
- El chequeo de `bloqueado` va **antes** de validar la contraseña: cualquier intento de login a una cuenta bloqueada (password correcta o no) devuelve directamente 403. Esta fue la implementación original en la primera versión de este change; se cambió brevemente a chequear `bloqueado` *después* de la contraseña para cerrar un vector de enumeración adicional, pero eso rompía la UX para el caso real más común — un usuario que se olvidó la contraseña y falla 10+ veces nunca se enteraba de que su cuenta estaba bloqueada (su única salida era "recuperar contraseña" a ciegas). Ante ese trade-off, se decidió explícitamente priorizar la UX: se acepta que alguien pueda probar un email al azar y enterarse de si esa cuenta existe y está bloqueada (sin obtener ninguna credencial ni acceso), a cambio de que el usuario real siempre sepa por qué no puede entrar.
- `usuario ? await bcrypt.compare(...) : false` evita hacer una query condicional rara y mantiene el timing lo más parecido posible entre "no existe" y "existe pero password mal" (bcrypt.compare sigue corriendo en ambos casos reales; no se hace timing-safe perfecto pero no empeora lo que había).
- El incremento de `intentosFallidos` y el bloqueo automático a los 10 intentos se mantienen intactos, solo dejan de reflejarse en el mensaje de respuesta.

## Frontend

No requiere cambios: `Login.tsx` ya muestra el `message` que venga del backend como toast de error genérico. Verificar que no haya lógica que dependa del texto específico "no está registrado" (a chequear en Apply).
