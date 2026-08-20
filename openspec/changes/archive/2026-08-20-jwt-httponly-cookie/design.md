# Design: JWT en cookie httpOnly

## Backend

### `backend/src/app.ts`

```ts
import cookieParser from 'cookie-parser';
// ...
app.use(cookieParser());
```
(agregar antes de `express.json()`, junto al resto de middlewares base)

### `backend/src/controllers/auth.controller.ts`

```ts
const COOKIE_NAME = 'gestec_token';
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8h, igual a JWT_EXPIRES_IN por defecto

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const { token, usuario } = await loginService(email, password);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
    });
    res.json({ usuario });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Sesión cerrada' });
}
```

`loginService` en `auth.service.ts` NO cambia — sigue devolviendo `{ token, usuario }`, el controller es quien decide dónde va el token (cookie en vez de body).

### `backend/src/routes/auth.routes.ts`

```ts
router.post('/logout', logout);
```
(no requiere `authenticate` — limpiar una cookie que puede no existir/estar vencida es idempotente y no necesita verificar sesión válida)

### `backend/src/middlewares/auth.middleware.ts`

```ts
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.gestec_token;

  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no configurado');
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email, rol: payload.rol as any, nombre: payload.nombre };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

## Frontend

### `frontend/src/app/services/http.ts`

```ts
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });
  } catch {
    throw new Error('Sin conexión con el servidor. Verificá tu red e intentá nuevamente.');
  }

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as any).error ?? (body as any).message ?? 'Error 401';

    // /auth/login (credenciales incorrectas) y /auth/me (chequeo de sesión al montar,
    // sin cookie válida) son 401 normales que maneja el propio caller — no redirigir.
    if (path === '/auth/login' || path === '/auth/me') {
      throw new Error(msg);
    }

    localStorage.removeItem('usuario');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  // resto sin cambios (manejo de !res.ok, 204, json)
}
```

**Nota de una vuelta de verificación**: la primera versión de este diseño solo excluía `/auth/login` del redirect automático. Como `AuthContext` ahora llama a `/auth/me` siempre al montar (no solo cuando había un token cacheado), un 401 esperado de `/auth/me` (nadie logueado todavía) disparaba `window.location.href = '/login'` — lo que remonta toda la app, vuelve a llamar `/auth/me`, 401 de nuevo, redirect de nuevo: loop infinito de recargas. Se detectó en la verificación manual en navegador y se corrigió agregando `/auth/me` a la misma excepción que `/auth/login`.

`uploadFile` recibe el mismo tratamiento: sacar el header `Authorization`, agregar `credentials: 'include'`.

### `frontend/src/app/services/apiClient.ts`

```ts
export const login = async (email: string, password: string): Promise<Usuario> => {
  const data = await http.post<{ usuario: Usuario }>('/auth/login', { email, password });
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
  return data.usuario;
};

export const logout = async (): Promise<void> => {
  await http.post('/auth/logout', {});
  localStorage.removeItem('usuario');
};
```

### `frontend/src/app/components/AuthContext.tsx`

```ts
useEffect(() => {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    setUsuario(getCurrentUser());
    setLoading(false);
    return;
  }

  http
    .get<Usuario>('/auth/me')
    .then((user) => setUsuario(user))
    .catch(() => {
      localStorage.removeItem('usuario');
    })
    .finally(() => setLoading(false));
}, []);
```

Se elimina el comentario `RIESGO XSS` (ya resuelto) y toda referencia a `gestec_token`.

## Verificación local

Se puede probar todo el flujo end-to-end con `curl -c cookies.txt` / `curl -b cookies.txt` (o el frontend real) contra el backend local:
1. Login → confirmar `Set-Cookie` en la respuesta y que el body no trae `token`.
2. Request a `/auth/me` reusando la cookie → 200 con el usuario.
3. Request a `/auth/me` sin cookie → 401.
4. Logout → confirmar `Set-Cookie` que expira la cookie; `/auth/me` posterior con esa cookie → 401.
5. Los 3 roles, en el navegador real: login, navegar, refrescar la página, logout.
