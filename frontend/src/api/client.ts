// Centralized API client — all calls go through Next.js rewrites to the Django backend.
// next.config.js rewrites /api/* → http://localhost:8000/api/*

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface ApiResult<T> {
  data: T | null
  error: string | null
  status: number
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(path, { ...options, headers })
  let data: T | null = null
  let error: string | null = null

  try {
    const json = await res.json()
    if (res.ok) {
      data = json
    } else {
      error = json.detail || json.error || Object.values(json).flat().join(' ')
    }
  } catch {
    if (!res.ok) error = res.statusText
  }

  return { data, error, status: res.status }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}
