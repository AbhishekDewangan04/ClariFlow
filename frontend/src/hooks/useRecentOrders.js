import { useCallback, useSyncExternalStore } from 'react'

// Orders the user has actually opened on this device (real API responses).
// Stored in localStorage; nothing here is sent anywhere.
const KEY = 'clariflow:recent-orders:v1'
const MAX = 8
const EMPTY = []

let cache = null
const listeners = new Set()

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getSnapshot() {
  if (cache === null) cache = read()
  return cache
}

function write(next) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable: keep the in-memory copy for this session */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function recordOrderView(order) {
  const entry = { ...order, viewedAt: new Date().toISOString() }
  write([entry, ...getSnapshot().filter((o) => o.orderNumber !== order.orderNumber)].slice(0, MAX))
}

export function useRecentOrders() {
  const orders = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const remove = useCallback((orderNumber) => write(getSnapshot().filter((o) => o.orderNumber !== orderNumber)), [])
  const clear = useCallback(() => write([]), [])
  return { orders, remove, clear }
}
