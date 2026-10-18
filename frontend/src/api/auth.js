import { env } from '../config/env.js'
import { ApiError } from '../lib/apiClient.js'

const BASE = env.apiBaseUrl

export async function request(path, options = {}) {
  const { allow401 = false, ...fetchOptions } = options
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include', // send the HTTP-only cookie
      ...fetchOptions,
    })
    // 401 is the normal, expected response when logged out for endpoints that allow it
    if (allow401 && res.status === 401) {
      return { user: null }
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.error || body?.message || `Request failed (${res.status})`
      let kind = 'client'
      if (res.status === 401) kind = 'unauthorized'
      else if (res.status === 429) kind = 'rate_limited'
      else if (res.status >= 500) kind = 'server'
      throw new ApiError(msg, { status: res.status, kind })
    }
    return body
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Unable to connect to the server. Please check your internet connection or try again later.', {
      kind: 'network',
      status: null,
    })
  }
}

/** POST /api/auth/login → { user } */
export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/** POST /api/auth/logout */
export async function logout() {
  return request('/api/auth/logout', { method: 'POST' })
}

/** GET /api/auth/me → { user } | { user: null } */
export async function getMe() {
  return request('/api/auth/me', { allow401: true })
}

/** PATCH /api/auth/profile → { user } */
export async function updateProfile({ name }) {
  return request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

/** GET /api/admin/users → { users } */
export async function getUsers() {
  return request('/api/admin/users')
}

/** POST /api/admin/users → { user } */
export async function createUser(payload) {
  return request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** PATCH /api/admin/users/:id/role → { user } */
export async function updateUserRole(id, role) {
  return request(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

/** DELETE /api/admin/users/:id → { user } */
export async function deleteUser(id) {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' })
}

/** PATCH /api/orders/:orderNumber/status → { orderNumber, status, updatedAt } */
export async function updateOrderStatus(orderNumber, status) {
  return request(`/api/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/** GET /api/admin/audit-logs?page=1&limit=20&action=... → { logs, total, page, limit, totalPages } */
export async function getAuditLogs({ page = 1, limit = 20, action = '' } = {}) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  if (action && action !== 'ALL') params.set('action', action)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request(`/api/admin/audit-logs${qs}`)
}

