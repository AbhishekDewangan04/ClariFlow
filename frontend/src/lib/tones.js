// The backend's status values aren't enumerated anywhere ClariFlow can see, so this only
// recognises common words. Anything else renders neutrally with its own text.
export const TONE_BY_STATUS = {
  delivered: 'success', completed: 'success', complete: 'success', fulfilled: 'success', paid: 'success', resolved: 'success',
  shipped: 'info', in_transit: 'info', out_for_delivery: 'info', dispatched: 'info', confirmed: 'info', open: 'info',
  pending: 'warning', processing: 'warning', on_hold: 'warning', created: 'warning', placed: 'warning', packed: 'warning',
  cancelled: 'danger', canceled: 'danger', failed: 'danger', rejected: 'danger',
}

export const TONES = {
  success: { pill: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25', dot: 'bg-emerald-400' },
  info: { pill: 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/25', dot: 'bg-cyan-400' },
  warning: { pill: 'bg-amber-400/10 text-amber-300 ring-amber-400/25', dot: 'bg-amber-400' },
  danger: { pill: 'bg-rose-400/10 text-rose-300 ring-rose-400/25', dot: 'bg-rose-400' },
  neutral: { pill: 'bg-white/[0.06] text-slate-300 ring-white/15', dot: 'bg-slate-400' },
}

export function toneOf(status) {
  const key = String(status ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return { key, tone: TONE_BY_STATUS[key] ?? 'neutral' }
}

