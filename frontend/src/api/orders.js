import { env } from '../config/env.js'
import { ApiError, getJson } from '../lib/apiClient.js'

/**
 * @typedef {Object} Order
 * @property {string} orderNumber
 * @property {string|null} customerName
 * @property {string|null} status        Free text from the backend; no fixed set is assumed.
 * @property {number|string|null} totalAmount  Prisma Decimal values arrive as strings.
 * @property {string|null} createdAt     ISO date
 * @property {string|null} updatedAt     ISO date
 */

/** Accepts a flat object (or one wrapped in `order` / `data`) and keeps only known fields. */
export function normalizeOrder(payload) {
  const raw = payload?.order ?? payload?.data ?? payload
  if (!raw || typeof raw !== 'object' || raw.orderNumber == null) {
    throw new ApiError('The API returned an unexpected response for this order.', { kind: 'invalid' })
  }
  return {
    orderNumber: String(raw.orderNumber),
    customerName: raw.customerName ?? null,
    status: raw.status ?? null,
    totalAmount: raw.totalAmount ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

/** GET /api/orders/:orderNumber */
export async function getOrder(orderNumber, { signal } = {}) {
  const body = await getJson(`${env.apiBaseUrl}/api/orders/${encodeURIComponent(orderNumber)}`, { signal })
  return normalizeOrder(body)
}
