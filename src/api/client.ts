import type { ApiSuccess } from '../types'

const PRODUCTION_API_URL = 'https://cedar-payroll-backend.vercel.app'

function resolveApiUrl() {
  const configured = String(import.meta.env.VITE_API_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const isLocalhost =
    !configured || /localhost|127\.0\.0\.1/i.test(configured)

  if (import.meta.env.PROD && isLocalhost) {
    return PRODUCTION_API_URL
  }

  return configured || 'http://localhost:3000'
}

export const API_URL = resolveApiUrl()
export const TOKEN_KEY = 'cedar.access_token'
export const COMPANY_KEY = 'cedar.company_id'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return null
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...authHeader(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> | undefined),
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register')
    if (!isAuthRoute) {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  const body = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(
      Array.isArray(body?.message)
        ? String(body.message[0] ?? `Request failed (${response.status})`)
        : typeof body?.message === 'object' && body?.message
          ? String(body.message.message ?? `Request failed (${response.status})`)
          : String(body?.message ?? `Request failed (${response.status})`),
      response.status,
    )
  }

  return body as T
}

export function get<T>(path: string) {
  return api<ApiSuccess<T>>(path)
}

export function post<T>(path: string, body?: unknown) {
  return api<ApiSuccess<T>>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function put<T>(path: string, body?: unknown) {
  return api<ApiSuccess<T>>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function patch<T>(path: string, body?: unknown) {
  return api<ApiSuccess<T>>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function del<T>(path: string) {
  return api<ApiSuccess<T>>(path, { method: 'DELETE' })
}

export async function download(path: string, filename: string) {
  const blob = await fetchBlob(path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function fetchBlob(path: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: authHeader(),
  })
  if (!response.ok) {
    const body = await parseBody(response)
    throw new ApiError(body?.message ?? 'Download failed', response.status)
  }
  return response.blob()
}

export const assetUrl = (path?: string | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
