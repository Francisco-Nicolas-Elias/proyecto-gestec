const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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

    // Login fallido (credenciales incorrectas) y el chequeo de sesión al montar la app
    // (/auth/me sin cookie válida, esperado si todavía no se inició sesión) son 401
    // normales que el propio caller maneja — no deben disparar el redirect automático.
    if (path === '/auth/login' || path === '/auth/me') {
      throw new Error(msg);
    }

    localStorage.removeItem('usuario');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detalles = (body as any).detalles as Array<{ campo: string; mensaje: string }> | undefined;
    const msg = detalles?.length
      ? detalles[0].mensaje
      : ((body as any).error ?? (body as any).message ?? `Error ${res.status}`);
    const err = new Error(msg) as any;
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', credentials: 'include', body: formData });
  } catch {
    throw new Error('Sin conexión con el servidor. Verificá tu red e intentá nuevamente.');
  }
  if (res.status === 401) {
    localStorage.removeItem('usuario');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? (body as any).message ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path: string) => request<void>(path, { method: 'DELETE' });
