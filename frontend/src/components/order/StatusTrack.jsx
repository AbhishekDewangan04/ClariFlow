import { motion } from 'motion/react'
import { Ban, Check, ClipboardList, Cog, PackageCheck, Truck } from 'lucide-react'
import { Card } from '../ui/Card'
import { toneOf } from '../domain/StatusBadge'
import { humanize } from '../../lib/format'
import { ease } from '../../lib/motion'

// ClariFlow can't see the backend's real status list. This maps common words onto a generic
// four-stage journey, and says so. Unrecognised statuses get no position (nothing is invented).
const STAGES = [
  { label: 'Placed', icon: ClipboardList, words: ['placed', 'created', 'pending', 'new', 'received', 'open'] },
  { label: 'Processing', icon: Cog, words: ['processing', 'confirmed', 'paid', 'packed', 'packing', 'preparing'] },
  { label: 'Shipped', icon: Truck, words: ['shipped', 'dispatched', 'in_transit', 'out_for_delivery'] },
  { label: 'Delivered', icon: PackageCheck, words: ['delivered', 'completed', 'complete', 'fulfilled'] },
]
const ENDED = ['cancelled', 'canceled', 'failed', 'rejected', 'refunded', 'returned']

export default function StatusTrack({ status, order }) {
  const { key } = toneOf(status)
  const current = STAGES.findIndex((s) => s.words.includes(key))
  const ended = ENDED.includes(key)
  const unknown = current === -1 && !ended
  const progress = current > 0 ? current / (STAGES.length - 1) : 0

  const createdStr = order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const updatedStr = order?.updatedAt ? new Date(order.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Card reveal className="p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">Shipment timeline</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">Live order lifecycle</span>
      </div>

      <ol className={`relative grid grid-cols-4 ${ended ? 'opacity-45' : ''}`}>
        <span className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 rounded-full bg-white/10" aria-hidden />
        <motion.span
          className="absolute left-[12.5%] top-5 h-0.5 origin-left rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.7)]"
          style={{ width: '75%' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 1, ease, delay: 0.3 }}
          aria-hidden
        />
        {STAGES.map(({ label, icon: Icon }, i) => {
          const done = current > i
          const here = current === i
          const reached = done || here

          // Step colors matching reference: Placed (purple), Processing (indigo), Shipped (cyan), Delivered (emerald)
          const badgeStyles = [
            reached ? 'border-purple-400/50 bg-purple-500/20 text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.5)]' : 'border-white/10 bg-midnight text-slate-500',
            reached ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-200 shadow-[0_0_16px_rgba(99,102,241,0.5)]' : 'border-white/10 bg-midnight text-slate-500',
            reached ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.5)]' : 'border-white/10 bg-midnight text-slate-500',
            reached ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.6)]' : 'border-white/10 bg-midnight text-slate-500',
          ]

          let stepTime = null
          if (i === 0 && createdStr) stepTime = createdStr
          else if (i === current && updatedStr) stepTime = updatedStr
          else if (i === 3 && current === 3 && updatedStr) stepTime = updatedStr

          return (
            <li key={label} className="relative flex flex-col items-center gap-2 text-center" aria-current={here ? 'step' : undefined}>
              <span
                className={`relative grid size-10 place-items-center rounded-full border transition-all ${badgeStyles[i]}`}
              >
                {here && <span className="absolute inset-0 animate-ping-soft rounded-full bg-indigo-400/30" aria-hidden />}
                {done ? <Check className="relative size-4" aria-hidden /> : <Icon className="relative size-4" aria-hidden />}
              </span>
              <div>
                <span className={`block text-xs font-semibold ${here ? 'text-white' : done ? 'text-slate-200' : 'text-slate-500'}`}>
                  {label}
                  <span className="sr-only">{here ? ' (current stage)' : done ? ' (completed)' : ' (not reached)'}</span>
                </span>
                {stepTime && (
                  <span className="mt-0.5 block text-[10.5px] font-mono text-slate-400">
                    {stepTime}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {ended && (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3.5 py-2.5 text-sm text-rose-200">
          <Ban className="size-4 shrink-0" aria-hidden /> This order ended as “{humanize(status)}”.
        </p>
      )}
      {unknown && (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-300">
          “{status ? humanize(status) : 'Unknown'}” doesn't match a standard stage, so no position is shown.
        </p>
      )}
    </Card>
  )
}
