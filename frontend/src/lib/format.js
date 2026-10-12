import { env } from '../config/env.js'

const EMPTY = '—'

export function formatCurrency(value, currency = env.currency) {
  if (value === null || value === undefined || value === '') return EMPTY
  const n = Number(value)
  if (!Number.isFinite(n)) return EMPTY
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return n.toFixed(2)
  }
}

function toDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateTime(iso) {
  const d = toDate(iso)
  return d ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d) : EMPTY
}

export function formatDate(iso) {
  const d = toDate(iso)
  return d ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d) : EMPTY
}

export function formatRelative(iso) {
  const d = toDate(iso)
  if (!d) return EMPTY
  const seconds = Math.round((d.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const steps = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'second')
}

export function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

export function humanize(text) {
  if (!text) return EMPTY
  const s = String(text).replace(/[_-]+/g, ' ').trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
