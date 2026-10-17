/**
 * lifecycle.js — Role-aware order lifecycle transitions.
 *
 * Roles:
 *   admin   – full access to all valid transitions
 *   manager – forward progression + CANCELLED (from non-DELIVERED)
 *   staff   – PROCESSING / IN_TRANSIT → SHIPPED only
 */

export const VALID_STATUSES = ['PROCESSING', 'IN_TRANSIT', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export const STATUS_LABELS = {
  PROCESSING: 'Processing',
  IN_TRANSIT: 'In Transit',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

/**
 * Returns allowed next statuses for the given role and current status.
 * Unauthenticated users (falsy role) have no transition capabilities (read-only).
 *
 * @param {'admin'|'manager'|'staff'|null|undefined} role
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function getAllowedTransitions(role, currentStatus) {
  if (!role) return []
  const from = (currentStatus || '').toUpperCase()

  return VALID_STATUSES.filter((to) => {
    if (to === from) return false
    if (role === 'admin') return true
    if (from === 'DELIVERED') return false
    if (to === 'CANCELLED') return role === 'manager'
    if (role === 'staff') {
      return (from === 'PROCESSING' || from === 'IN_TRANSIT') && to === 'SHIPPED'
    }
    if (role === 'manager') {
      const progression = ['PROCESSING', 'IN_TRANSIT', 'SHIPPED', 'DELIVERED']
      const fromIdx = progression.indexOf(from)
      const toIdx = progression.indexOf(to)
      return fromIdx !== -1 && toIdx > fromIdx
    }
    return false
  })
}
