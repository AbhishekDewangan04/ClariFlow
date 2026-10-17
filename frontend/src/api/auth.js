import { env } from '../config/env.js'
import { ApiError } from '../lib/apiClient.js'

const BASE = env.apiBaseUrl

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include', // send the HTTP-only cookie
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.error || body?.message || `Request failed (${res.status})`
    throw new ApiError(msg, { status: res.status, kind: res.status === 401 ? 'unauthorized' : 'client' })
  }
  return body
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

/** GET /api/auth/me → { user } | 401 */
export async function getMe() {
  return request('/api/auth/me')
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

