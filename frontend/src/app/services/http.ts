const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('gestec_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    localStorage.removeItem('gestec_token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem('gestec_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  if (res.status === 401) {
    localStorage.removeItem('gestec_token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Error ${res.status}`);
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
