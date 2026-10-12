import { useBackendStatus } from '../../context/BackendStatusContext'

const phases = {
  online: { dot: 'bg-emerald-400', ping: true, label: 'API online' },
  offline: { dot: 'bg-rose-400', ping: false, label: 'API offline' },
  checking: { dot: 'bg-amber-400', ping: true, label: 'Checking API…' },
}

function Dot({ p, size = 'size-2' }) {
  return (
    <span className={`relative flex ${size}`} aria-hidden>
      {p.ping && <span className={`absolute inline-flex size-full animate-ping-soft rounded-full ${p.dot}`} />}
      <span className={`relative ${size} rounded-full ${p.dot} shadow-[0_0_10px_currentColor]`} />
    </span>
  )
}

/** `compact` renders just the status dot (for tight spaces); the text stays available to screen readers. */
export default function BackendPill({ compact = false, className = '' }) {
  const { phase, latencyMs } = useBackendStatus()
  const p = phases[phase]

  if (compact) {
    return (
      <span role="status" className={`inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] ${className}`}>
        <Dot p={p} size="size-2.5" />
        <span className="sr-only">{p.label}</span>
      </span>
    )
  }
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-slate-200 ${className}`}
    >
      <Dot p={p} />
      {p.label}
      {phase === 'online' && latencyMs != null && <span className="font-mono tabular-nums text-slate-400">{latencyMs}ms</span>}
    </span>
  )
}
