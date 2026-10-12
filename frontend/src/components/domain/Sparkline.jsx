import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { Activity } from 'lucide-react'

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Responsive latency graph based strictly on actual health-check measurements.
 * Displays interactive inspection points, real min/avg/max/latest stats, and never fabricates data.
 */
export default function Sparkline({ values = [], history = [], unit = 'ms', height = 76 }) {
  const gid = useId()
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // Normalize data points from history or values
  const points = (history.length > 0 ? history : values.map((v) => ({ latencyMs: v, at: null })))
    .filter((p) => p && typeof p.latencyMs === 'number' && Number.isFinite(p.latencyMs))

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-slate-400">
        <Activity className="size-4 animate-spin text-slate-500" aria-hidden />
        <span>Awaiting health check measurement…</span>
      </div>
    )
  }

  const rawValues = points.map((p) => p.latencyMs)
  const min = Math.min(...rawValues)
  const max = Math.max(...rawValues)
  const avg = Math.round(rawValues.reduce((a, b) => a + b, 0) / rawValues.length)
  const latest = rawValues[rawValues.length - 1]

  // Single measurement display: show real point immediately with live beacon
  if (points.length === 1) {
    const pt = points[0]
    return (
      <figure className="m-0 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping-soft rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-xs text-slate-300">
              Initial measurement: <strong className="text-white">{latest} {unit}</strong>
            </span>
          </div>
          {pt.at && <span className="font-mono text-[11px] text-slate-500">{formatTime(pt.at)}</span>}
        </div>
        <figcaption className="text-right font-mono text-[10.5px] text-slate-400">
          Live baseline established · recording session timeline
        </figcaption>
      </figure>
    )
  }

  // 2+ samples: Full responsive SVG line graph with interactive points
  const w = 280
  const padY = 8
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = max === min ? height / 2 : padY + (1 - (p.latencyMs - min) / span) * (height - padY * 2)
    return { x, y, ...p }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${w},${height} L0,${height} Z`
  const last = coords[coords.length - 1]
  const hovered = hoveredIndex != null ? coords[hoveredIndex] : null

  return (
    <figure className="m-0 select-none">
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${height}`}
          className="h-20 w-full overflow-visible"
          role="img"
          aria-label={`Real response time graph over ${points.length} measurements: min ${min} ${unit}, avg ${avg} ${unit}, max ${max} ${unit}, latest ${latest} ${unit}`}
        >
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`${gid}-stroke`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          {/* Reference gridlines */}
          <line x1="0" y1={padY} x2={w} y2={padY} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 3" />
          <line x1="0" y1={height - padY} x2={w} y2={height - padY} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 3" />

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gid}-fill)`} />

          {/* Main response curve */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={`url(#${gid}-stroke)`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Latest measurement pulse */}
          <circle cx={last.x} cy={last.y} r="8" fill="#22d3ee" opacity="0.25" className="animate-ping-soft" />
          <circle cx={last.x} cy={last.y} r="3.5" fill="#22d3ee" stroke="#070b16" strokeWidth="1.5" />

          {/* Interactive touch/hover hit targets */}
          {coords.map((c, i) => (
            <g key={i}>
              <circle
                cx={c.x}
                cy={c.y}
                r="10"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {hoveredIndex === i && (
                <circle cx={c.x} cy={c.y} r="4.5" fill="#ffffff" stroke="#818cf8" strokeWidth="2" />
              )}
            </g>
          ))}
        </svg>

        {/* Hover inspection tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-md border border-white/15 bg-midnight/95 px-2 py-0.5 font-mono text-[11px] text-white shadow-lg backdrop-blur"
            style={{ left: `${(hovered.x / w) * 100}%` }}
          >
            <span>{hovered.latencyMs} {unit}</span>
            {hovered.at && <span className="ml-1.5 text-slate-400">({formatTime(hovered.at)})</span>}
          </div>
        )}
      </div>

      {/* Real telemetry metrics summary */}
      <figcaption className="mt-3 flex items-center justify-between border-t border-edge/60 pt-2 font-mono text-[11px] text-slate-400">
        <span>min: <strong className="text-slate-200">{min}{unit}</strong></span>
        <span>avg: <strong className="text-slate-200">{avg}{unit}</strong></span>
        <span>max: <strong className="text-slate-200">{max}{unit}</strong></span>
        <span>latest: <strong className="text-cyan-300">{latest}{unit}</strong></span>
      </figcaption>
    </figure>
  )
}
