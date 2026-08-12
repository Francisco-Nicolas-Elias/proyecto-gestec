const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('gestec_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });
  } catch {
    throw new Error('Sin conexión con el servidor. Verificá tu red e intentá nuevamente.');
  }

  if (res.status === 401) {
    // Solo cerrar sesión si había un token activo (sesión expirada).
    // Si no había token, es un request sin autenticación (ej: login con credenciales
    // incorrectas) — en ese caso lanzar el mensaje real del backend sin redirigir.
    if (token && localStorage.getItem('gestec_token') === token) {
      localStorage.removeItem('gestec_token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? (body as any).message ?? 'Error 401');
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
  const token = localStorage.getItem('gestec_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new Error('Sin conexión con el servidor. Verificá tu red e intentá nuevamente.');
  }
  if (res.status === 401) {
    if (localStorage.getItem('gestec_token') === token) {
      localStorage.removeItem('gestec_token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
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
